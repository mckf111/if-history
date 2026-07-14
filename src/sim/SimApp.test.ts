import { describe, expect, it } from 'vitest'
import { createSim } from './engine/engine'
import { needsImportConfirmation } from './SimApp'

describe('读入存档的覆盖边界', () => {
  it('页面有对局或首页背后有自动存档时都必须先确认', () => {
    const state = createSim(1644)

    expect(needsImportConfirmation(null, undefined)).toBe(false)
    expect(needsImportConfirmation(state, undefined)).toBe(true)
    expect(needsImportConfirmation(null, state)).toBe(true)
  })
})
