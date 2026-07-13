import { beforeEach, describe, expect, it } from 'vitest'
import { applyCommand, createSim } from './engine/engine'
import { CODEX_KEY, SIM_SAVE_KEY, loadCodex, loadSim, saveCodex, saveSim } from './storage'
import type { SimState } from './types'

describe('存储', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('单局存档往返，且不碰旧版键', () => {
    localStorage.setItem('what-if-history.story.v3', '{"legacy":true}')
    localStorage.setItem('what-if-history.autosave.v2', '{"older":true}')
    const state = applyCommand(createSim(1644), { t: 'probe', npcId: 'master-he' })
    saveSim(state)
    const loaded = loadSim()
    expect(loaded).toBeDefined()
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(state))
    expect(localStorage.getItem('what-if-history.story.v3')).toBe('{"legacy":true}')
    expect(localStorage.getItem('what-if-history.autosave.v2')).toBe('{"older":true}')
  })

  it('篡改档与损坏档一律拒收', () => {
    const state = createSim(7)
    saveSim(state)
    const tampered = JSON.parse(localStorage.getItem(SIM_SAVE_KEY)!) as SimState
    tampered.suspicion = 9
    localStorage.setItem(SIM_SAVE_KEY, JSON.stringify(tampered))
    expect(loadSim()).toBeUndefined()
    localStorage.setItem(SIM_SAVE_KEY, '{{{不是JSON')
    expect(loadSim()).toBeUndefined()
  })

  it('史鉴独立存取，坏档回退空册', () => {
    expect(loadCodex().chronicles).toEqual([])
    saveCodex({
      version: 2,
      litLinks: ['a1->a2'],
      chronicles: [{ seed: 1, familyId: 'f', entries: [], savedAt: '2026-07-13' }],
      dossiers: {},
    })
    expect(loadCodex().litLinks).toEqual(['a1->a2'])
    localStorage.setItem(CODEX_KEY, '[]')
    expect(loadCodex().chronicles).toEqual([])
  })

  it('史鉴深校验拒绝坏条目与坏人物档案', () => {
    localStorage.setItem(CODEX_KEY, JSON.stringify({
      version: 2,
      litLinks: [],
      chronicles: [{ seed: 1, familyId: 'ce-jie', entries: [null], savedAt: '2026-07-13' }],
      dossiers: {},
    }))
    expect(loadCodex().chronicles).toEqual([])

    localStorage.setItem(CODEX_KEY, JSON.stringify({
      version: 2,
      litLinks: [],
      chronicles: [],
      dossiers: { 'master-he': 7 },
    }))
    expect(loadCodex().dossiers).toEqual({})
  })
})
