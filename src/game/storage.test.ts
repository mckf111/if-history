import { beforeEach, describe, expect, it } from 'vitest'
import { createGame } from './engine'
import { clearGame, loadAnnals, loadGame, saveGame } from './storage'

describe('本地存档', () => {
  beforeEach(() => localStorage.clear())

  it('保存并恢复完整随机状态', () => {
    const state = createGame(1644)
    saveGame(state)
    expect(loadGame()).toEqual(state)
    clearGame()
    expect(loadGame()).toBeUndefined()
  })

  it('忽略损坏或未知版本的存档', () => {
    localStorage.setItem('what-if-history.autosave.v2', '{坏掉')
    expect(loadGame()).toBeUndefined()
    localStorage.setItem('what-if-history.autosave.v2', JSON.stringify({ saveVersion: 9 }))
    expect(loadGame()).toBeUndefined()
    localStorage.setItem('what-if-history.autosave.v2', JSON.stringify({ saveVersion: 2, status: 'playing' }))
    expect(loadGame()).toBeUndefined()
    expect(loadAnnals()).toEqual([])
  })

  it('不迁移旧局，但保留独立的史鉴数据', () => {
    localStorage.setItem('what-if-history.autosave.v1', JSON.stringify({ saveVersion: 1, turn: 5 }))
    localStorage.setItem('what-if-history.annals.v1', JSON.stringify([{ seed: 1, endingId: 'standoff', endingTitle: '南北对峙', completedAt: '2026-01-01T00:00:00.000Z' }]))
    expect(loadGame()).toBeUndefined()
    expect(loadAnnals()).toHaveLength(1)
  })

  it('拒绝引用无效事件或缺少人物的 v2 存档', () => {
    const base = createGame(1644)
    localStorage.setItem('what-if-history.autosave.v2', JSON.stringify({ ...base, currentEventIds: ['missing-a', 'missing-b'] }))
    expect(loadGame()).toBeUndefined()
    localStorage.setItem('what-if-history.autosave.v2', JSON.stringify({ ...base, people: {} }))
    expect(loadGame()).toBeUndefined()
    localStorage.setItem('what-if-history.autosave.v2', JSON.stringify({ ...base, reports: [null] }))
    expect(loadGame()).toBeUndefined()
    localStorage.setItem('what-if-history.autosave.v2', JSON.stringify({ ...base, pending: [null] }))
    expect(loadGame()).toBeUndefined()
  })
})
