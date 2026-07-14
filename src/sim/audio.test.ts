import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDIO_PREF_KEY, DEFAULT_AUDIO_PREFERENCES, loadAudioPreferences, playAudioCue, saveAudioPreferences } from './audio'

describe('声音偏好', () => {
  beforeEach(() => localStorage.clear())

  afterEach(() => vi.unstubAllGlobals())

  it('没有偏好时使用克制的默认音量', () => {
    expect(loadAudioPreferences()).toEqual(DEFAULT_AUDIO_PREFERENCES)
  })

  it('往返保存并夹住非法音量', () => {
    saveAudioPreferences({ muted: true, volume: 7 })
    expect(loadAudioPreferences()).toEqual({ muted: true, volume: 1 })
    expect(JSON.parse(localStorage.getItem(AUDIO_PREF_KEY)!)).toEqual({ muted: true, volume: 1 })
  })

  it('坏偏好不影响游戏', () => {
    localStorage.setItem(AUDIO_PREF_KEY, '{坏')
    expect(loadAudioPreferences()).toEqual(DEFAULT_AUDIO_PREFERENCES)
  })

  it('浏览器拒绝创建音频环境时不阻断玩法', () => {
    vi.stubGlobal('AudioContext', class {
      constructor() {
        throw new DOMException('blocked', 'NotAllowedError')
      }
    })

    expect(() => playAudioCue('paper', DEFAULT_AUDIO_PREFERENCES)).not.toThrow()
  })
})
