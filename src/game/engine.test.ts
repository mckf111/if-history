import { describe, expect, it } from 'vitest'
import { buildEnding, calculateChance, createGame, currentEvents, resolveTurn, validateContent, validateTurnPlan } from './engine'
import { availableActorIds } from './strategy'
import type { GameState, PlayerOrder, TurnPlan } from './types'

function choosePlan(state: GameState, offset = 0): TurnPlan {
  const orders: PlayerOrder[] = []
  const events = currentEvents(state)

  for (const [eventIndex, event] of events.entries()) {
    const choices = [...event.choices.slice((offset + eventIndex) % event.choices.length), ...event.choices.slice(0, (offset + eventIndex) % event.choices.length)]
    let chosen: PlayerOrder | undefined

    for (const choice of choices) {
      for (const actorId of availableActorIds(state, event, choice)) {
        const candidate = { eventId: event.id, choiceId: choice.id, actorId }
        if (!validateTurnPlan(state, { orders: [...orders, candidate] })) {
          chosen = candidate
          break
        }
      }
      if (chosen) break
    }

    if (chosen) orders.push(chosen)
  }

  expect(orders.length).toBeGreaterThan(0)
  return { orders }
}

function playToEnd(seed: number, offset = 0): GameState {
  let state = createGame(seed)
  let turns = 0
  while (state.status === 'playing') {
    state = resolveTurn(state, choosePlan(state, offset + turns))
    turns += 1
    expect(turns).toBeLessThanOrEqual(12)
  }
  return state
}

describe('历史推演引擎', () => {
  it('内容引用完整且每幕有足够事件', () => {
    expect(validateContent()).toEqual([])
  })

  it('一局恰好十二回合，并让每份奏案得到命令或失控记录', () => {
    const state = playToEnd(1644)
    expect(state.turn).toBe(12)
    expect(state.decisions.length + state.neglects.length).toBe(24)
    expect(state.ending).toBeDefined()
  })

  it('同一种子与部署序列产生完全相同的历史', () => {
    expect(playToEnd(20260711, 1)).toEqual(playToEnd(20260711, 1))
    expect(playToEnd(20260711, 1).reports.some((report) => report.roll !== undefined)).toBe(true)
  })

  it('序列化读取不会改变下一回合', () => {
    const original = createGame(991644)
    const cloned = JSON.parse(JSON.stringify(original)) as GameState
    const plan = choosePlan(original)
    expect(resolveTurn(original, plan)).toEqual(resolveTurn(cloned, plan))
  })

  it('拒绝空部署、重复人物和超额资源', () => {
    const state = createGame(8)
    expect(validateTurnPlan(state, { orders: [] })).toContain('至少')

    const events = currentEvents(state)
    const firstChoice = events[0].choices[0]
    const actorId = availableActorIds(state, events[0], firstChoice)[0]
    const repeatedActor = events[1].choices.find((choice) => availableActorIds(state, events[1], choice).includes(actorId))
    if (repeatedActor) {
      expect(validateTurnPlan(state, { orders: [
        { eventId: events[0].id, choiceId: firstChoice.id, actorId },
        { eventId: events[1].id, choiceId: repeatedActor.id, actorId },
      ] })).toContain('只能承接')
    }

    const poor = { ...state, resources: { treasury: 0, couriers: 0 } }
    const costly = events.flatMap((event) => event.choices.map((choice) => ({ event, choice }))).find(({ choice }) => (choice.cost?.treasury ?? 0) + (choice.cost?.couriers ?? 0) > 0)
    if (costly) {
      const executor = availableActorIds(poor, costly.event, costly.choice)[0]
      expect(validateTurnPlan(poor, { orders: [{ eventId: costly.event.id, choiceId: costly.choice.id, actorId: executor }] })).toContain('资源不足')
    }
  })

  it('拒绝重复奏案、超额诏令和非法人物', () => {
    const state = { ...createGame(8), currentEventIds: ['coal-hill', 'refugee-gate'] }
    const [coalHill, refugeeGate] = currentEvents(state)
    expect(validateTurnPlan(state, { orders: [
      { eventId: coalHill.id, choiceId: coalHill.choices[0].id, actorId: 'wang-chengen' },
      { eventId: coalHill.id, choiceId: coalHill.choices[1].id, actorId: 'wang-chengen' },
    ] })).toContain('同一份奏案')
    expect(validateTurnPlan(state, { orders: [
      { eventId: coalHill.id, choiceId: coalHill.choices[0].id, actorId: 'wang-chengen' },
      { eventId: refugeeGate.id, choiceId: refugeeGate.choices[1].id, actorId: 'li-mingrui' },
    ] })).toContain('诏令不足')
    expect(validateTurnPlan(state, { orders: [
      { eventId: coalHill.id, choiceId: coalHill.choices[0].id, actorId: 'wu-sangui' },
    ] })).toContain('不能执行')
  })

  it('结算不会修改输入状态', () => {
    const state = createGame(1644)
    const before = JSON.stringify(state)
    resolveTurn(state, choosePlan(state))
    expect(JSON.stringify(state)).toBe(before)
  })

  it('未处理奏案只触发一次失控效果', () => {
    const state = createGame(1644)
    const event = currentEvents(state)[0]
    const choice = event.choices.find((item) => availableActorIds(state, event, item).length > 0)!
    const actorId = availableActorIds(state, event, choice)[0]
    const next = resolveTurn(state, { orders: [{ eventId: event.id, choiceId: choice.id, actorId }] })
    expect(next.neglects).toHaveLength(1)
    expect(next.reports.filter((report) => report.id.startsWith('neglect-'))).toHaveLength(1)
  })

  it('人物仍会影响延迟判定的胜算', () => {
    const state = createGame(1644)
    const checked = currentEvents(state).flatMap((event) => event.choices.map((choice) => ({ event, choice }))).find(({ choice }) => choice.check)
    expect(checked).toBeDefined()
    if (checked) {
      const actorId = availableActorIds(state, checked.event, checked.choice)[0]
      expect(calculateChance(state, checked.choice, actorId)).toBeGreaterThanOrEqual(10)
    }
  })

  it('六类国运都有明确可达条件', () => {
    const base = createGame(1644)
    const ending = (metrics: GameState['metrics'], flags: string[] = []) => buildEnding({ ...base, metrics, flags })
    expect(ending({ legitimacy: 80, supply: 80, command: 80, people: 80, court: 80 }, ['central-army']).id).toBe('revival')
    expect(ending({ legitimacy: 60, supply: 60, command: 60, people: 60, court: 60 }).id).toBe('standoff')
    expect(ending({ legitimacy: 46, supply: 44, command: 45, people: 46, court: 45 }).id).toBe('southern-court')
    expect(ending({ legitimacy: 50, supply: 44, command: 20, people: 45, court: 44 }).id).toBe('warlord-court')
    expect(ending({ legitimacy: 18, supply: 50, command: 50, people: 45, court: 44 }).id).toBe('court-collapse')
    expect(ending({ legitimacy: 50, supply: 18, command: 50, people: 45, court: 44 }, ['sea-fallback']).id).toBe('maritime-exile')
  })
})
