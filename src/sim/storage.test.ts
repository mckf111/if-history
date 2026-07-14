import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyCommand, createSim } from './engine/engine'
import {
  CODEX_KEY,
  SIM_SAVE_KEY,
  clearSim,
  exportSim,
  importSim,
  loadCodex,
  loadCodexResult,
  loadSim,
  loadSimResult,
  saveCodex,
  saveSim,
} from './storage'
import type { SimState } from './types'

describe('存储', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('单局存档往返，且不碰旧版键', () => {
    localStorage.setItem('what-if-history.story.v3', '{"legacy":true}')
    localStorage.setItem('what-if-history.autosave.v2', '{"older":true}')
    localStorage.setItem('what-if-history.sim.v5', '{"previousSim":true}')
    localStorage.setItem('what-if-history.sim.v6', '{"previousSim":true}')
    const state = applyCommand(createSim(1644), { t: 'probe', npcId: 'master-he' })
    expect(saveSim(state)).toEqual({ ok: true })
    const loaded = loadSim()
    expect(loaded).toBeDefined()
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(state))
    expect(loadSimResult()).toEqual({ status: 'loaded', state })
    expect(localStorage.getItem('what-if-history.story.v3')).toBe('{"legacy":true}')
    expect(localStorage.getItem('what-if-history.autosave.v2')).toBe('{"older":true}')
    expect(localStorage.getItem('what-if-history.sim.v5')).toBe('{"previousSim":true}')
    expect(localStorage.getItem('what-if-history.sim.v6')).toBe('{"previousSim":true}')
    expect(clearSim()).toEqual({ ok: true })
    expect(loadSimResult()).toEqual({ status: 'empty' })
    expect(localStorage.getItem('what-if-history.story.v3')).toBe('{"legacy":true}')
    expect(localStorage.getItem('what-if-history.autosave.v2')).toBe('{"older":true}')
    expect(localStorage.getItem('what-if-history.sim.v5')).toBe('{"previousSim":true}')
    expect(localStorage.getItem('what-if-history.sim.v6')).toBe('{"previousSim":true}')
  })

  it('篡改档与损坏档一律拒收', () => {
    const state = createSim(7)
    saveSim(state)
    const tampered = JSON.parse(localStorage.getItem(SIM_SAVE_KEY)!) as SimState
    tampered.suspicion = 9
    localStorage.setItem(SIM_SAVE_KEY, JSON.stringify(tampered))
    expect(loadSim()).toBeUndefined()
    expect(loadSimResult()).toEqual({ status: 'invalid-save' })
    localStorage.setItem(SIM_SAVE_KEY, '{{{不是JSON')
    expect(loadSim()).toBeUndefined()
    expect(loadSimResult()).toEqual({ status: 'invalid-json' })
  })

  it('空档与存储不可用有不同结果', () => {
    expect(loadSimResult()).toEqual({ status: 'empty' })

    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(loadSimResult()).toEqual({ status: 'storage-unavailable' })
    expect(loadCodexResult()).toEqual({ status: 'storage-unavailable' })
    getItem.mockRestore()
  })

  it('写入、清除和序列化失败均返回可判断结果', () => {
    const state = createSim(1644)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(saveSim(state)).toEqual({ ok: false, reason: 'storage-unavailable' })
    expect(saveCodex({ version: 2, litLinks: [], chronicles: [], dossiers: {} }))
      .toEqual({ ok: false, reason: 'storage-unavailable' })
    setItem.mockRestore()

    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(clearSim()).toEqual({ ok: false, reason: 'storage-unavailable' })
    removeItem.mockRestore()

    const cyclic = state as SimState & { cyclic?: unknown }
    cyclic.cyclic = cyclic
    expect(saveSim(cyclic)).toEqual({ ok: false, reason: 'serialization-failed' })
    expect(exportSim(cyclic)).toEqual({ ok: false, reason: 'serialization-failed' })
  })

  it('导出与导入只处理文本，并以重放校验拒绝坏档', () => {
    const state = applyCommand(createSim(1644), { t: 'probe', npcId: 'master-he' })
    const exported = exportSim(state)
    expect(exported.ok).toBe(true)
    if (!exported.ok) throw new Error('测试存档应能导出')
    expect(exported.text).toContain('"saveVersion": 7')
    expect(importSim(exported.text)).toEqual({ ok: true, state })
    expect(localStorage.getItem(SIM_SAVE_KEY)).toBeNull()

    expect(importSim('{坏掉')).toEqual({ ok: false, reason: 'invalid-json' })
    const tampered = { ...state, suspicion: state.suspicion + 1 }
    expect(importSim(JSON.stringify(tampered))).toEqual({ ok: false, reason: 'invalid-save' })
    const previousVersion = { ...state, saveVersion: 6 }
    expect(importSim(JSON.stringify(previousVersion))).toEqual({ ok: false, reason: 'invalid-save' })
  })

  it('史鉴独立存取，坏档回退空册', () => {
    expect(loadCodex().chronicles).toEqual([])
    expect(loadCodexResult()).toEqual({ status: 'empty' })
    expect(saveCodex({
      version: 2,
      litLinks: ['a1->a2'],
      chronicles: [{ seed: 1, familyId: 'f', entries: [], savedAt: '2026-07-13' }],
      dossiers: {},
    })).toEqual({ ok: true })
    expect(loadCodex().litLinks).toEqual(['a1->a2'])
    expect(loadCodexResult()).toEqual({ status: 'loaded', codex: loadCodex() })
    localStorage.setItem(CODEX_KEY, '[]')
    expect(loadCodex().chronicles).toEqual([])
    expect(loadCodexResult()).toEqual({ status: 'invalid-save' })
    localStorage.setItem(CODEX_KEY, '{坏掉')
    expect(loadCodexResult()).toEqual({ status: 'invalid-json' })
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
