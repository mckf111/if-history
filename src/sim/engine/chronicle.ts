import { CHRONICLE_TEMPLATES, EXECUTED_FAMILY, LOCATIONS_BY_ID } from '../content'
import { pickIndex } from './rng'
import type { ChronicleEntry, ChronicleTemplateDefinition, LeverId, SimState } from '../types'

// 编年史生成器：模板条件匹配 + 种子选取。
// 事实层取全部命中项（模板以 requires 互斥互补）；记载层与流传层各抽两条。
// 输出必须确定：同一终态同一 rngState，编年史逐字相同。

export function chronicleFamilyId(state: SimState): string {
  if (state.status === 'executed') return EXECUTED_FAMILY.id
  if (!state.node) throw new Error('终局缺少节点结算。')
  return state.node.familyId
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
      text: chronicleText(template, state),
      divergence: template.divergence,
      sourceAuditIds: leverAuditIds(template, state),
      sourceId: template.sourceId,
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
        text: chronicleText(template, state),
        divergence: template.divergence,
        sourceAuditIds: leverAuditIds(template, state),
        sourceId: template.sourceId,
      })
    }
  }

  return { entries, rngState }
}

function chronicleText(template: ChronicleTemplateDefinition, state: SimState): string {
  if (template.id === 'ct-fact-executed-1') {
    const day = state.day === 16 ? '十六' : state.day === 17 ? '十七' : '十八'
    const location = LOCATIONS_BY_ID[state.playerLocation]?.name ?? '街巷'
    const arrest = [...state.audit].reverse().find((entry) => entry.kind === 'arrest')
    return `三月${day}，兵马司在${location}拿获刻字铺代工姚小满。${arrest?.text ?? '乱世用刑，无人复审。'}`
  }
  if (template.id === 'ct-fact-executed-2') {
    const daysUntilFall = Math.max(1, 19 - state.day)
    return `${daysUntilFall === 1 ? '次日' : `${daysUntilFall}日后`}内城陷落。拿她的人、审她的人、看她热闹的人，各自逃命去了；只有她没能等到那一刻。`
  }
  return template.text
}
