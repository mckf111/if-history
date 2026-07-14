import { describe, expect, it } from 'vitest'
import { createSim } from './engine/engine'
import { endingCue, needsImportConfirmation } from './SimApp'

describe('读入存档的覆盖边界', () => {
  it('页面有对局或首页背后有自动存档时都必须先确认', () => {
    const state = createSim(1644)

    expect(needsImportConfirmation(null, undefined)).toBe(false)
    expect(needsImportConfirmation(state, undefined)).toBe(true)
    expect(needsImportConfirmation(null, state)).toBe(true)
  })
})

describe('结局音效判定', () => {
  it('誓愿兑现走上行音效，失守与处决走下行音效', () => {
    const base = createSim(1644)
    const completed = {
      ...base,
      vow: 'save-chunsheng' as const,
      status: 'complete' as const,
      phase: 'node' as const,
      node: {
        familyId: 'shui-dun',
        pillars: [],
        levers: [
          { lever: 'gate' as const, chance: 0, tipped: false, resolution: 'untouched' as const },
          { lever: 'roster' as const, chance: 0, tipped: false, resolution: 'untouched' as const },
          { lever: 'chunsheng' as const, chance: 100, tipped: true, resolution: 'guaranteed' as const },
        ],
      },
    }

    expect(endingCue(completed)).toBe('ending-success')
    expect(endingCue({
      ...completed,
      node: {
        ...completed.node,
        levers: completed.node.levers.map((lever) => lever.lever === 'chunsheng' ? { ...lever, tipped: false } : lever),
      },
    })).toBe('ending-failure')
    expect(endingCue({ ...completed, status: 'executed' })).toBe('ending-failure')
  })
})
