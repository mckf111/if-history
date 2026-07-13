import { CHRONICLE_TEMPLATES, EXECUTED_FAMILY } from '../content'
import { pickIndex } from './rng'
import type { ChronicleEntry, ChronicleTemplateDefinition, LeverId, SimState } from '../types'

// 编年史生成器：模板条件匹配 + 种子选取。
// 事实层取全部命中项（模板以 requires 互斥互补）；记载层与流传层各抽两条。
// 输出必须确定：同一终态同一 rngState，编年史逐字相同。

export function chronicleFamilyId(state: SimState): string {
  if (state.status === 'executed') return EXECUTED_FAMILY.id
  return state.node?.familyId ?? 'luan-ye'
}

function requiresSatisfied(template: ChronicleTemplateDefinition, state: SimState): boolean {
  const requires = template.requires
  if (!requires) return true
  if (requires.leverTipped) {
    const levers = state.node?.levers
    if (!levers) return false
    for (const [lever, expected] of Object.entries(requires.leverTipped) as Array<[LeverId, boolean]>) {
      if (levers.find((entry) => entry.lever === lever)?.tipped !== expected) return false
    }
  }
  if (requires.npcFlag) {
    const npc = state.npcs[requires.npcFlag.npcId]
    if (!npc || !npc.flags.includes(requires.npcFlag.flag)) return false
  }
  return true
}

/** 事实层模板若与某撬点相关，把该撬点的开骰账目挂进 sourceAuditIds，供复盘回链 */
function leverAuditIds(template: ChronicleTemplateDefinition, state: SimState): string[] {
  if (!template.requires?.leverTipped) return []
  const leverEntries = state.audit.filter((entry) => entry.kind === 'lever')
  const order: LeverId[] = ['gate', 'roster', 'chunsheng']
  const ids: string[] = []
  for (const lever of Object.keys(template.requires.leverTipped) as LeverId[]) {
    const index = order.indexOf(lever)
    if (index >= 0 && leverEntries[index]) ids.push(leverEntries[index].id)
  }
  return ids
}

export function buildChronicle(state: SimState): { entries: ChronicleEntry[]; rngState: number } {
  const familyId = chronicleFamilyId(state)
  const matching = CHRONICLE_TEMPLATES.filter(
    (template) => template.familyIds.includes(familyId) && requiresSatisfied(template, state),
  )

  const entries: ChronicleEntry[] = []
  let rngState = state.rngState

  // 事实层：全取
  for (const template of matching.filter((template) => template.layer === 'fact')) {
    entries.push({
      id: template.id,
      layer: 'fact',
      text: template.text,
      divergence: template.divergence,
      sourceAuditIds: leverAuditIds(template, state),
    })
  }

  // 记载层与流传层：各抽两条（不放回）
  for (const layer of ['record', 'legend'] as const) {
    const pool = matching.filter((template) => template.layer === layer)
    const picked: ChronicleTemplateDefinition[] = []
    while (picked.length < Math.min(2, pool.length)) {
      const remaining = pool.filter((template) => !picked.includes(template))
      const result = pickIndex(rngState, remaining.length)
      rngState = result.rngState
      picked.push(remaining[result.index])
    }
    for (const template of picked) {
      entries.push({
        id: template.id,
        layer,
        text: template.text,
        divergence: template.divergence,
        sourceAuditIds: leverAuditIds(template, state),
      })
    }
  }

  return { entries, rngState }
}
