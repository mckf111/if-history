import { DYNAMIC_EVENT_IDS_BY_ACT, EVENTS, EVENTS_BY_ID, TURN_MAIN_EVENT_IDS } from './content'
import { PEOPLE, PEOPLE_BY_ID, createPeopleState } from './people'
import type {
  Act,
  ChoiceDefinition,
  Effect,
  Ending,
  GameState,
  MetricKey,
  PlayerDecision,
  ReportEntry,
  ResourceKey,
} from './types'

const METRIC_KEYS: MetricKey[] = ['legitimacy', 'supply', 'command', 'people', 'court']
const RESOURCE_KEYS: ResourceKey[] = ['treasury', 'couriers']

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function actForTurn(turn: number): Act {
  return (turn < 4 ? 1 : turn < 8 ? 2 : 3) as Act
}

function nextRandom(rngState: number): { rngState: number; value: number } {
  const next = (Math.imul(rngState, 1664525) + 1013904223) >>> 0
  return { rngState: next, value: next / 4294967296 }
}

function applyEffect(state: GameState, effect?: Effect): GameState {
  if (!effect) return state

  const metrics = { ...state.metrics }
  for (const key of METRIC_KEYS) {
    metrics[key] = clamp(metrics[key] + (effect.metrics?.[key] ?? 0), 0, 100)
  }

  const resources = { ...state.resources }
  for (const key of RESOURCE_KEYS) {
    resources[key] = Math.max(0, resources[key] + (effect.resources?.[key] ?? 0))
  }

  const people = { ...state.people }
  for (const [id, change] of Object.entries(effect.relations ?? {})) {
    const current = people[id]
    if (current) people[id] = { ...current, relation: clamp(current.relation + change, -30, 30) }
  }

  const flags = new Set(state.flags)
  effect.removeFlags?.forEach((flag) => flags.delete(flag))
  effect.addFlags?.forEach((flag) => flags.add(flag))

  return { ...state, metrics, resources, people, flags: [...flags] }
}

function spendCost(state: GameState, choice: ChoiceDefinition): GameState {
  const resources = { ...state.resources }
  for (const key of RESOURCE_KEYS) resources[key] -= choice.cost?.[key] ?? 0
  return { ...state, resources }
}

export function canAfford(state: GameState, choice: ChoiceDefinition): boolean {
  return RESOURCE_KEYS.every((key) => state.resources[key] >= (choice.cost?.[key] ?? 0))
}

export function calculateChance(state: GameState, choice: ChoiceDefinition, actorId?: string): number | undefined {
  if (!choice.check) return undefined
  let chance = choice.check.baseChance

  for (const [key, weight] of Object.entries(choice.check.metricWeights ?? {})) {
    chance += (state.metrics[key as MetricKey] - 50) * weight
  }

  if (choice.check.actorSkill && actorId) {
    const person = PEOPLE_BY_ID[actorId]
    const personState = state.people[actorId]
    if (person && personState?.alive) {
      chance += person.skills[choice.check.actorSkill] - 10
      chance += personState.relation * 0.2
    }
  }

  return Math.round(clamp(chance, 10, 90))
}

export function riskLabel(chance?: number): string {
  if (chance === undefined) return '后果明确'
  if (chance < 32) return '孤注一掷'
  if (chance < 48) return '凶险'
  if (chance < 66) return '成败难料'
  return '较有把握'
}

function pickDynamicEvent(state: GameState): { state: GameState; eventId: string } {
  const pool = DYNAMIC_EVENT_IDS_BY_ACT[state.act]
  const unseen = pool.filter((id) => !state.seenDynamics.includes(id))
  const candidates = unseen.length > 0 ? unseen : [...pool]
  const random = nextRandom(state.rngState)
  const eventId = candidates[Math.floor(random.value * candidates.length)]
  return {
    state: { ...state, rngState: random.rngState, seenDynamics: [...state.seenDynamics, eventId] },
    eventId,
  }
}

function prepareTurn(state: GameState): GameState {
  const withAct = { ...state, act: actForTurn(state.turn) }
  const picked = pickDynamicEvent(withAct)
  return {
    ...picked.state,
    eventIndex: 0,
    currentEventIds: [TURN_MAIN_EVENT_IDS[state.turn], picked.eventId],
  }
}

export function createGame(seed: number): GameState {
  const normalizedSeed = (seed >>> 0) || 1644
  const state: GameState = {
    saveVersion: 1,
    seed: normalizedSeed,
    rngState: normalizedSeed,
    turn: 0,
    act: 1,
    eventIndex: 0,
    metrics: { legitimacy: 47, supply: 36, command: 31, people: 39, court: 34 },
    resources: { treasury: 5, couriers: 4 },
    people: createPeopleState(),
    flags: [],
    seenDynamics: [],
    currentEventIds: [],
    pending: [],
    reports: [{ id: 'opening', turn: 0, title: '煤山急报', body: '史书原本在这里合上。今夜，它没有。', tone: 'neutral' }],
    decisions: [],
    status: 'playing',
  }
  return prepareTurn(state)
}

export function currentEvent(state: GameState) {
  return EVENTS_BY_ID[state.currentEventIds[state.eventIndex]]
}

function resolvePending(state: GameState, turn: number): GameState {
  let working = state
  const remaining = []

  for (const pending of state.pending) {
    if (pending.resolveTurn > turn) {
      remaining.push(pending)
      continue
    }

    const event = EVENTS_BY_ID[pending.eventId]
    const choice = event?.choices.find((item) => item.id === pending.choiceId)
    if (!event || !choice?.check) continue

    const chance = calculateChance(working, choice, pending.actorId) ?? 50
    const random = nextRandom(working.rngState)
    const roll = Math.floor(random.value * 100) + 1
    const succeeded = roll <= chance
    working = { ...working, rngState: random.rngState }
    working = applyEffect(working, succeeded ? choice.check.success : choice.check.failure)

    const report: ReportEntry = {
      id: pending.id,
      turn,
      title: `${event.title} · 回报`,
      body: succeeded ? choice.check.successText : choice.check.failureText,
      tone: succeeded ? 'good' : 'bad',
      chance,
      roll,
      sourceEventId: event.id,
    }
    working = { ...working, reports: [...working.reports, report] }
  }

  return { ...working, pending: remaining }
}

export function buildEnding(state: GameState): Ending {
  const average = METRIC_KEYS.reduce((sum, key) => sum + state.metrics[key], 0) / METRIC_KEYS.length
  const has = (flag: string) => state.flags.includes(flag)
  let id: Ending['id']

  if ((state.metrics.supply < 24 || state.metrics.command < 24) && (has('sea-fallback') || has('naval-base'))) {
    id = 'maritime-exile'
  } else if (state.metrics.legitimacy < 24 || state.metrics.court < 20) {
    id = 'court-collapse'
  } else if (state.metrics.command < 29 || has('garrison-mutiny')) {
    id = 'warlord-court'
  } else if (average >= 68 && state.metrics.command >= 58 && (has('central-army') || has('joint-front') || has('northern-victory'))) {
    id = 'revival'
  } else if (average >= 54 && state.metrics.supply >= 45) {
    id = 'standoff'
  } else {
    id = 'southern-court'
  }

  const endings: Record<Ending['id'], Omit<Ending, 'narrative'>> = {
    revival: { id: 'revival', title: '中兴之基', subtitle: '大明没有得救，但终于重新拥有了能够自救的国家机器。' },
    standoff: { id: 'standoff', title: '南北对峙', subtitle: '长江不再只是逃亡的终点，而成了两种秩序的边界。' },
    'southern-court': { id: 'southern-court', title: '江南续命', subtitle: '朝廷活了下来，却仍在用时间换制度、用土地换时间。' },
    'warlord-court': { id: 'warlord-court', title: '军镇挟天子', subtitle: '诏书仍从南京发出，真正被服从的命令却来自各营辕门。' },
    'court-collapse': { id: 'court-collapse', title: '朝局自裂', subtitle: '敌军尚未入城，互不承认的朝廷已经让国家失去共同现实。' },
    'maritime-exile': { id: 'maritime-exile', title: '海疆余火', subtitle: '南京失守后，印玺、档案和一部分军民登船向东南退去。' },
  }

  const narrative = [
    state.metrics.people >= 60
      ? '地方把朝廷视为可以合作的秩序，流民和乡兵逐渐成为恢复生产与守土的力量。'
      : state.metrics.people < 30
        ? '百姓记住的不是年号，而是摊派、闭城和被放弃的北岸；征兵征粮都越来越像另一场劫掠。'
        : '民间仍在观望：既不愿为旧朝殉死，也不愿轻易接受新的征服者。',
    has('audited-council') || has('open-ledgers') || has('authenticated-orders')
      ? '留下来的账册、回执与合议程序，使政令第一次比某位权臣活得更久。'
      : '许多决策仍依赖皇帝和少数重臣亲自维系，一旦人员离散，制度也随之断裂。',
    has('joint-front')
      ? '明顺之间脆弱的共同战线迫使清军分兵；旧仇没有消失，却不再替敌人决定战略。'
      : has('northern-buffer')
        ? '关宁军在北方维持着暧昧缓冲，既牵制清军，也随时可能成为新的边患。'
        : '北方没有形成稳定支点，南朝每一次北望都必须从零开始。',
  ]

  return { ...endings[id], narrative }
}

function completeGame(state: GameState): GameState {
  const ending = buildEnding(state)
  return {
    ...state,
    status: 'complete',
    ending,
    currentEventIds: [],
    reports: [...state.reports, { id: 'ending', turn: 12, title: ending.title, body: ending.subtitle, tone: 'neutral' }],
  }
}

function advanceTurn(state: GameState): GameState {
  const nextTurn = state.turn + 1
  let working = resolvePending({ ...state, turn: nextTurn }, nextTurn)
  if (nextTurn >= TURN_MAIN_EVENT_IDS.length) return completeGame(working)
  working = prepareTurn(working)
  return working
}

export function resolveDecision(state: GameState, decision: PlayerDecision): GameState {
  if (state.status !== 'playing') throw new Error('这局历史已经收束。')
  const event = currentEvent(state)
  if (!event || event.id !== decision.eventId) throw new Error('这份奏案已经过期。')
  const choice = event.choices.find((item) => item.id === decision.choiceId)
  if (!choice) throw new Error('未找到这项决策。')
  if (!canAfford(state, choice)) throw new Error('可调用的资源不足。')
  if (choice.actorIds?.length && !decision.actorId) throw new Error('这项命令必须指定执行者。')
  if (decision.actorId && !choice.actorIds?.includes(decision.actorId)) throw new Error('此人不能执行这项命令。')

  let working = spendCost(state, choice)
  working = applyEffect(working, choice.immediate)
  const decisions = [...working.decisions, { turn: working.turn, ...decision }]
  const reports = [...working.reports, {
    id: `decision-${working.turn}-${event.id}`,
    turn: working.turn,
    title: `${event.title} · 已落印`,
    body: choice.summary,
    tone: 'neutral' as const,
    sourceEventId: event.id,
  }]
  working = { ...working, decisions, reports }

  if (choice.check) {
    working = {
      ...working,
      pending: [...working.pending, {
        id: `pending-${working.turn}-${event.id}`,
        resolveTurn: working.turn + choice.check.delay,
        eventId: event.id,
        choiceId: choice.id,
        actorId: decision.actorId,
      }],
    }
  }

  return working.eventIndex + 1 < working.currentEventIds.length
    ? { ...working, eventIndex: working.eventIndex + 1 }
    : advanceTurn(working)
}

export function validateContent(): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const event of EVENTS) {
    if (ids.has(event.id)) errors.push(`重复事件 ID：${event.id}`)
    ids.add(event.id)
    if (event.choices.length !== 3) errors.push(`${event.id} 必须有三个选择`)
    const choiceIds = new Set<string>()
    for (const choice of event.choices) {
      if (choiceIds.has(choice.id)) errors.push(`${event.id} 有重复选择 ID：${choice.id}`)
      choiceIds.add(choice.id)
      for (const actorId of choice.actorIds ?? []) {
        if (!PEOPLE_BY_ID[actorId]) errors.push(`${event.id}/${choice.id} 引用了不存在的人物 ${actorId}`)
      }
      if (choice.check && choice.check.delay < 1) errors.push(`${event.id}/${choice.id} 的延迟必须至少为一回合`)
    }
  }
  if (TURN_MAIN_EVENT_IDS.length !== 12) errors.push('主线事件必须恰好十二个')
  for (const act of [1, 2, 3] as const) {
    if (DYNAMIC_EVENT_IDS_BY_ACT[act].length < 5) errors.push(`第 ${act} 幕至少需要五个局势事件`)
  }
  for (const person of PEOPLE) {
    if (!person.name || !person.title) errors.push(`人物 ${person.id} 缺少显示信息`)
  }
  return errors
}
