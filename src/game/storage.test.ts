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
    localStorage.setItem('what-if-history.autosave.v1', '{坏掉')
    expect(loadGame()).toBeUndefined()
    localStorage.setItem('what-if-history.autosave.v1', JSON.stringify({ saveVersion: 9 }))
    expect(loadGame()).toBeUndefined()
    expect(loadAnnals()).toEqual([])
  })
})

