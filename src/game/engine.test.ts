import { describe, expect, it } from 'vitest'
import { currentEvent, buildEnding, calculateChance, canAfford, createGame, resolveDecision, validateContent } from './engine'
import type { GameState } from './types'

function playToEnd(seed: number, offset = 0): GameState {
  let state = createGame(seed)
  let step = 0
  while (state.status === 'playing') {
    const event = currentEvent(state)
    const affordable = event.choices.filter((choice) => canAfford(state, choice))
    expect(affordable.length).toBeGreaterThan(0)
    const choice = affordable[(step + offset) % affordable.length]
    state = resolveDecision(state, {
      eventId: event.id,
      choiceId: choice.id,
      actorId: choice.actorIds?.[0],
    })
    step += 1
    expect(step).toBeLessThanOrEqual(24)
  }
  return state
}

describe('历史推演引擎', () => {
  it('内容引用完整且每幕有足够事件', () => {
    expect(validateContent()).toEqual([])
  })

  it('一局恰好处理十二回合、二十四份奏案', () => {
    const state = playToEnd(1644)
    expect(state.turn).toBe(12)
    expect(state.decisions).toHaveLength(24)
    expect(state.ending).toBeDefined()
  })

  it('同一种子与选择序列产生完全相同的历史', () => {
    expect(playToEnd(20260711, 1)).toEqual(playToEnd(20260711, 1))
    expect(playToEnd(20260711, 1).reports.some((report) => report.roll !== undefined)).toBe(true)
  })

  it('序列化读取不会改变下一次判定', () => {
    const original = createGame(991644)
    const cloned = JSON.parse(JSON.stringify(original)) as GameState
    const event = currentEvent(original)
    const choice = event.choices[0]
    const decision = { eventId: event.id, choiceId: choice.id, actorId: choice.actorIds?.[0] }
    expect(resolveDecision(original, decision)).toEqual(resolveDecision(cloned, decision))
  })

  it('资源不足与执行者要求会阻止无效命令', () => {
    let state = createGame(8)
    state = { ...state, resources: { treasury: 0, couriers: 0 } }
    const event = currentEvent(state)
    const costly = event.choices.find((choice) => (choice.cost?.treasury ?? 0) > 0 || (choice.cost?.couriers ?? 0) > 0)
    if (costly) expect(canAfford(state, costly)).toBe(false)

    const actorChoice = event.choices.find((choice) => choice.actorIds?.length)
    if (actorChoice) {
      expect(() => resolveDecision(state, { eventId: event.id, choiceId: actorChoice.id })).toThrow('指定执行者')
      expect(calculateChance(state, actorChoice, actorChoice.actorIds?.[0])).toBeGreaterThanOrEqual(10)
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

