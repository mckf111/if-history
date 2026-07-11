import { describe, expect, it } from 'vitest'
import { advanceStory, canChoose, createStory, inspectClue, isStoryChoiceAvailable, resolveStoryChoice, storyAftermath, validateStoryState } from './engine'

function inspectTwo(state: ReturnType<typeof createStory>) {
  const first = inspectClue(state, state.chapter === 1 ? 'red-cord' : state.chapter === 2 ? 'broken-tail' : 'official-seal')
  return inspectClue(first, state.chapter === 1 ? 'dead-hands' : state.chapter === 2 ? 'paper-fibers' : 'women-line')
}

function inspectAll(state: ReturnType<typeof createStory>) {
  const ids = state.chapter === 1
    ? ['red-cord', 'dead-hands', 'silver']
    : state.chapter === 2
      ? ['broken-tail', 'paper-fibers', 'boat-noise']
      : ['official-seal', 'women-line', 'inked-hands']
  return ids.reduce((next, id) => inspectClue(next, id), state)
}

describe('story engine', () => {
  it('requires observation before a choice', () => {
    const state = createStory(42)
    expect(canChoose(state)).toBe(false)
    expect(() => resolveStoryChoice(state, 'cut-mark')).toThrow('至少看清')
    expect(canChoose(inspectTwo(state))).toBe(true)
  })

  it('carries a choice into the next chapter', () => {
    const chosen = resolveStoryChoice(inspectTwo(createStory(7)), 'cut-mark')
    expect(chosen.flags).toContain('marked-corpse-tag')
    expect(storyAftermath(chosen).debt).toContain('赵四')
    const next = advanceStory(chosen)
    expect(next.chapter).toBe(2)
    expect(next.inspectedClueIds).toEqual([])
  })

  it('builds different endings from the final decision', () => {
    let state = resolveStoryChoice(inspectTwo(createStory(9)), 'cut-mark')
    state = advanceStory(state)
    state = resolveStoryChoice(inspectTwo(state), 'tell-cut')
    state = advanceStory(state)
    const publicProof = resolveStoryChoice(inspectTwo(state), 'show-proof')
    const burned = resolveStoryChoice(inspectTwo(state), 'burn-both')
    expect(publicProof.ending?.id).toBe('open-gate')
    expect(burned.ending?.id).toBe('burned-proof')
    expect(advanceStory(publicProof).phase).toBe('complete')
  })

  it('is deterministic for the same seed and choices', () => {
    const play = () => {
      let state = resolveStoryChoice(inspectClue(inspectTwo(createStory(1644)), 'silver'), 'sell-name')
      state = advanceStory(state)
      state = resolveStoryChoice(inspectTwo(state), 'lie-for-clue')
      state = advanceStory(state)
      return resolveStoryChoice(inspectClue(inspectTwo(state), 'inked-hands'), 'open-first')
    }
    expect(play()).toEqual(play())
  })

  it('completes every three-choice route', () => {
    const chapterOne = ['refuse-name', 'cut-mark', 'sell-name']
    const chapterTwo = ['tell-cut', 'keep-quiet', 'lie-for-clue']
    const chapterThree = ['show-proof', 'open-first', 'burn-both']
    const endings = new Set<string>()
    let completedRoutes = 0
    for (const one of chapterOne) for (const two of chapterTwo) for (const three of chapterThree) {
      let state = resolveStoryChoice(inspectAll(createStory(1644)), one)
      state = advanceStory(state)
      state = resolveStoryChoice(inspectAll(state), two)
      state = advanceStory(state)
      if (!isStoryChoiceAvailable(state, three)) continue
      state = resolveStoryChoice(inspectAll(state), three)
      expect(storyAftermath(state).consequence.length).toBeGreaterThan(20)
      state = advanceStory(state)
      expect(state.phase).toBe('complete')
      endings.add(state.ending!.id)
      completedRoutes += 1
    }
    expect(completedRoutes).toBe(24)
    expect(endings).toEqual(new Set(['open-gate', 'printed-names', 'burned-proof']))
  })

  it('lets characters close debts and block actions', () => {
    let state = resolveStoryChoice(inspectAll(createStory(88)), 'cut-mark')
    expect(state.debts).toContain('zhao-life-debt')
    state = advanceStory(state)
    state = resolveStoryChoice(inspectAll(state), 'tell-cut')
    state = advanceStory(state)
    expect(isStoryChoiceAvailable(state, 'open-first')).toBe(false)
    state = resolveStoryChoice(inspectAll(state), 'show-proof')
    expect(state.debts).not.toContain('zhao-life-debt')
    expect(state.settledDebts).toContain('zhao-life-debt')
  })

  it('rejects legacy and malformed saves', () => {
    expect(validateStoryState({ saveVersion: 2 })).toBe(false)
    expect(validateStoryState({ ...createStory(1), characters: {} })).toBe(false)
    expect(validateStoryState({ ...createStory(1), choices: [{ chapter: 1, choiceId: 'impossible' }] })).toBe(false)
    expect(validateStoryState({ ...createStory(1), phase: 'complete' })).toBe(false)
    expect(validateStoryState({ ...createStory(1), phase: 'aftermath' })).toBe(false)
    expect(validateStoryState({ ...createStory(1), inspectedClueIds: ['fake-a', 'fake-b'] })).toBe(false)
    expect(validateStoryState({ ...createStory(1), inspectedClueIds: ['red-cord', 'red-cord'] })).toBe(false)
    expect(validateStoryState({ ...createStory(1), flags: ['forged-state'] })).toBe(false)
    let complete = resolveStoryChoice(inspectAll(createStory(5)), 'cut-mark')
    complete = advanceStory(complete)
    complete = resolveStoryChoice(inspectAll(complete), 'keep-quiet')
    complete = advanceStory(complete)
    complete = advanceStory(resolveStoryChoice(inspectAll(complete), 'show-proof'))
    expect(validateStoryState({ ...complete, ending: { ...complete.ending!, id: 'burned-proof' } })).toBe(false)
    expect(validateStoryState(JSON.parse(JSON.stringify(createStory(1))))).toBe(true)
  })
})
