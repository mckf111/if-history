import { NPCS_BY_ID, NPC_ACTIONS, OUTCOME_FAMILIES, PILLARS } from '../content'
import { appendAudit } from './audit'
import { beliefOf } from './belief'
import { buildChronicle } from './chronicle'
import { rollPercent } from './rng'
import type { LeverId, NodeOutcome, PillarState, SimState } from '../types'

// 节点日结算。主节点「城破」无条件发生——历史的惯性不归你撬。
// 玩家没有碰过的撬点胜率为 0；倒一部分柱后进入 10 + 权重（夹 10–90）的种子骰。
// 同一撬点的柱全部倒下即视为准备周全，确定兑现，不让终局暗骰否认三天经营。
// 已经发生的确定行动直接兑现，不能被后续骰子否认。

const LEVER_ORDER: LeverId[] = ['gate', 'roster', 'chunsheng']

export type LeverOutlook = '尚无成算' | '初见成算' | '成算已过半' | '已成定局'

export interface LeverPreview {
  lever: LeverId
  fallen: number
  total: number
  outlook: LeverOutlook
  settledBy?: 'pillars' | 'action'
}

const LEVER_TEXT: Record<LeverId, { guaranteed: string; prepared: string; tipped: string; held: string; untouched: string }> = {
  gate: {
    guaranteed: '守门的人已经把约定做成了行动。这里没有骰子可以反悔。',
    prepared: '守门人的判断、退路与恐惧都已被撬动。三根柱全倒，这份周全准备不再交给终局骰反悔。',
    tipped: '外城西门以约而开：拒马先撤，坊巷得全。历史在这一门上让了半步。',
    held: '外城门在乱中被打开，如同它在史书里那样。你垫在门缝里的东西，没能撑住。',
    untouched: '外城门在乱中被打开，如同它在史书里那样。这扇门上没有你的手印——历史按原样把它推开了。',
  },
  roster: {
    guaranteed: '册页已经烧毁或公开，完整名册不复存在。这里没有骰子可以把纸灰装订回去。',
    prepared: '管册者的命令、恐惧与坊间抄页彼此咬合。三根柱全倒，这份周全准备不再交给终局骰反悔。',
    tipped: '匠籍名册没能完整落到征发者手里——烧的烧，散的散，贴上墙的贴上墙。',
    held: '名册完整移交。你动过的手脚，没能动到装订线上。',
    untouched: '名册完整移交。每一个名字都还钉在原处，包括你的——你没碰过这本册子，它也没放过你。',
  },
  chunsheng: {
    guaranteed: '春生已经踏上出城的路。这里没有骰子可以把人重新押回营册。',
    prepared: '营册、船路与春生自己的胆气都已备齐。三根柱全倒，这份周全准备不再交给终局骰反悔。',
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
  const leverPillars = PILLARS.filter((pillar) => pillar.leverId === lever)
  const fallen = pillars.filter((pillarState) => {
    const def = PILLARS.find((pillar) => pillar.id === pillarState.id)
    return def?.leverId === lever && pillarState.status === 'fallen'
  })
  if (fallen.length === 0) return 0
  if (leverPillars.every((pillar) => fallen.some((pillarState) => pillarState.id === pillar.id))) return 100
  let chance = 10
  for (const pillarState of fallen) {
    const def = PILLARS.find((pillar) => pillar.id === pillarState.id)
    if (def?.leverId === lever && pillarState.status === 'fallen') chance += def.weight
  }
  return Math.round(Math.max(10, Math.min(90, chance)))
}

/** 结算前估势：与节点结算共用柱态、胜算和确定性人物行动，不掷骰也不改种子。 */
export function deriveLeverPreviews(state: SimState): LeverPreview[] {
  const pillars = derivePillars(state)
  return LEVER_ORDER.map((lever) => {
    const own = PILLARS.filter((pillar) => pillar.leverId === lever)
    const fallen = pillars.filter((pillarState) => {
      const definition = PILLARS.find((pillar) => pillar.id === pillarState.id)
      return definition?.leverId === lever && pillarState.status === 'fallen'
    }).length
    const guaranteedByAction = guaranteedLeverAudits(state, lever).length > 0
    const chance = guaranteedByAction ? 100 : leverChance(pillars, lever)
    const outlook: LeverOutlook = chance === 100
      ? '已成定局'
      : chance === 0
        ? '尚无成算'
        : chance < 60
          ? '初见成算'
          : '成算已过半'
    return {
      lever,
      fallen,
      total: own.length,
      outlook,
      settledBy: guaranteedByAction ? 'action' : chance === 100 ? 'pillars' : undefined,
    }
  })
}

function guaranteedLeverAudits(state: SimState, lever: LeverId) {
  return NPC_ACTIONS.filter((action) => action.effects?.guaranteesLever === lever)
    .flatMap((action) => {
      if (!state.npcs[action.npcId]?.flags.includes(`fired-${action.id}`)) return []
      const audit = [...state.audit].reverse().find((entry) => entry.kind === 'npc-act' && entry.actionId === action.id)
      return audit ? [audit] : []
    })
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
  throw new Error('三个撬点没有匹配到结果族。')
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
    const guaranteedActions = guaranteedLeverAudits(working, lever)
    const pillarCauseIds = pillars
      .filter((pillarState) => PILLARS.find((pillar) => pillar.id === pillarState.id)?.leverId === lever && pillarState.status === 'fallen')
      .flatMap((pillarState) => pillarState.causeAuditIds)

    let chance: number
    let roll: number | undefined
    let tipped: boolean
    let resolution: NodeOutcome['levers'][number]['resolution']
    let variant: keyof (typeof LEVER_TEXT)[LeverId]
    let actor: SimState['audit'][number]['actor']
    let causeIds: string[]

    if (guaranteedActions.length > 0) {
      chance = 100
      tipped = true
      resolution = 'guaranteed'
      variant = 'guaranteed'
      actor = guaranteedActions[0].actor
      causeIds = guaranteedActions.map((entry) => entry.id)
    } else {
      chance = leverChance(pillars, lever)
      causeIds = pillarCauseIds
      if (chance === 0) {
        tipped = false
        resolution = 'untouched'
        variant = 'untouched'
        actor = 'history'
      } else if (chance === 100) {
        tipped = true
        resolution = 'guaranteed'
        variant = 'prepared'
        actor = 'player'
      } else {
        const rolled = rollPercent(working.rngState)
        working = { ...working, rngState: rolled.rngState }
        roll = rolled.roll
        tipped = roll <= chance
        resolution = 'chance'
        variant = tipped ? 'tipped' : 'held'
        actor = 'player'
      }
    }

    working = appendAudit(working, {
      phase: 'node',
      kind: 'lever',
      actor,
      chance,
      roll,
      causeIds,
      text: LEVER_TEXT[lever][variant],
      visibleToPlayer: true,
    }).state
    levers.push({ lever, chance, roll, tipped, resolution })
  }

  const familyId = pickFamily(levers)
  working = { ...working, node: { familyId, levers, pillars } }
  const { entries, rngState } = buildChronicle(working)
  return { ...working, rngState, chronicle: entries, phase: 'node', status: 'complete' }
}
