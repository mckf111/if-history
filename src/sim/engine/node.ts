import { NPCS_BY_ID, OUTCOME_FAMILIES, PILLARS } from '../content'
import { appendAudit } from './audit'
import { beliefOf } from './belief'
import { buildChronicle } from './chronicle'
import { rollPercent } from './rng'
import type { LeverId, NodeOutcome, PillarState, SimState } from '../types'

// 节点日结算。主节点「城破」无条件发生——历史的惯性不归你撬。
// 三个撬点各掷一次种子骰：胜率 = 10 + 倒柱权重之和（夹 10–90）。
// 骰值全部入账，终局公开（沿旧引擎「结局页开骰」传统）。

const LEVER_ORDER: LeverId[] = ['gate', 'roster', 'chunsheng']

const LEVER_TEXT: Record<LeverId, { tipped: string; held: string; untouched: string }> = {
  gate: {
    tipped: '外城西门以约而开：拒马先撤，坊巷得全。历史在这一门上让了半步。',
    held: '外城门在乱中被打开，如同它在史书里那样。你垫在门缝里的东西，没能撑住。',
    untouched: '外城门在乱中被打开，如同它在史书里那样。这扇门上没有你的手印——历史按原样把它推开了。',
  },
  roster: {
    tipped: '匠籍名册没能完整落到征发者手里——烧的烧，散的散，贴上墙的贴上墙。',
    held: '名册完整移交。你动过的手脚，没能动到装订线上。',
    untouched: '名册完整移交。每一个名字都还钉在原处，包括你的——你没碰过这本册子，它也没放过你。',
  },
  chunsheng: {
    tipped: '水门开栅，粮船出城。春生腕上的红绳结，过了栅栏。',
    held: '运夫营拔营随军。你递出去的路引没能引到人——春生的名字随队伍出了城。',
    untouched: '运夫营拔营随军。春生的名字随队伍出了城，人没能回头。你这三天，没为他刻过一刀。',
  },
}

export function derivePillars(state: SimState): PillarState[] {
  return PILLARS.map((pillar) => {
    const level = beliefOf(state, pillar.npcId, pillar.claimId)
    const holds = (pillar.holdsWhen.min === undefined || level >= pillar.holdsWhen.min)
      && (pillar.holdsWhen.max === undefined || level <= pillar.holdsWhen.max)
    const lastBelief = [...state.audit]
      .reverse()
      .find((entry) => entry.kind === 'belief' && entry.actor === pillar.npcId && entry.claimId === pillar.claimId)
    return {
      id: pillar.id,
      status: holds ? 'standing' : 'fallen',
      causeAuditIds: lastBelief ? [lastBelief.id] : [],
    } satisfies PillarState
  })
}

export function leverChance(pillars: PillarState[], lever: LeverId): number {
  let chance = 10
  for (const pillarState of pillars) {
    const def = PILLARS.find((pillar) => pillar.id === pillarState.id)
    if (def?.leverId === lever && pillarState.status === 'fallen') chance += def.weight
  }
  return Math.round(Math.max(10, Math.min(90, chance)))
}

function pickFamily(levers: NodeOutcome['levers']): string {
  const tipped: Partial<Record<LeverId, boolean>> = {}
  for (const lever of levers) tipped[lever.lever] = lever.tipped
  const sorted = [...OUTCOME_FAMILIES].sort((a, b) => a.priority - b.priority)
  for (const family of sorted) {
    const requires = family.requires.leverTipped ?? {}
    const satisfied = (Object.entries(requires) as Array<[LeverId, boolean]>).every(
      ([lever, expected]) => tipped[lever] === expected,
    )
    if (satisfied) return family.id
  }
  return sorted[sorted.length - 1].id
}

/** 三月十九破晓：清点支撑柱 → 三处撬点掷骰 → 结果族 → 编年史 */
export function settleNode(state: SimState): SimState {
  let working = state
  const pillars = derivePillars(working)

  for (const pillarState of pillars) {
    const def = PILLARS.find((pillar) => pillar.id === pillarState.id)!
    const npc = NPCS_BY_ID[def.npcId]
    working = appendAudit(working, {
      phase: 'node',
      kind: 'pillar',
      actor: def.npcId,
      claimId: def.claimId,
      causeIds: pillarState.causeAuditIds,
      text: `「${def.title}」——${pillarState.status === 'standing' ? `柱仍立。${npc?.name ?? def.npcId}的心思没被撬动。` : `柱已倒。${npc?.name ?? def.npcId}信了他不该信、或不再信他该信的东西。`}`,
      visibleToPlayer: true,
    }).state
  }

  const levers: NodeOutcome['levers'] = []
  for (const lever of LEVER_ORDER) {
    const chance = leverChance(pillars, lever)
    const { rngState, roll } = rollPercent(working.rngState)
    working = { ...working, rngState }
    const tipped = roll <= chance
    // 因果诚实：胜算停在底数，说明你根本没碰过这个撬点，文案不居功也不揽过
    const variant = tipped ? 'tipped' : chance <= 10 ? 'untouched' : 'held'
    working = appendAudit(working, {
      phase: 'node',
      kind: 'lever',
      actor: 'player',
      chance,
      roll,
      causeIds: pillars
        .filter((pillarState) => PILLARS.find((pillar) => pillar.id === pillarState.id)?.leverId === lever && pillarState.status === 'fallen')
        .flatMap((pillarState) => pillarState.causeAuditIds),
      text: LEVER_TEXT[lever][variant],
      visibleToPlayer: true,
    }).state
    levers.push({ lever, chance, roll, tipped })
  }

  const familyId = pickFamily(levers)
  working = { ...working, node: { familyId, levers, pillars } }
  const { entries, rngState } = buildChronicle(working)
  return { ...working, rngState, chronicle: entries, phase: 'node', status: 'complete' }
}
