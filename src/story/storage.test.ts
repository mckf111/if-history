import { beforeEach, describe, expect, it } from 'vitest'
import { createStory } from './engine'
import { clearStory, loadStory, saveStory } from './storage'

describe('story storage', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a v3 story without touching the legacy save', () => {
    localStorage.setItem('what-if-history.autosave.v2', '{"legacy":true}')
    const story = createStory(1644)
    saveStory(story)
    expect(loadStory()).toEqual(story)
    expect(localStorage.getItem('what-if-history.autosave.v2')).toBe('{"legacy":true}')
  })

  it('ignores malformed story data and clears only its own key', () => {
    localStorage.setItem('what-if-history.story.v3', JSON.stringify({ saveVersion: 3 }))
    localStorage.setItem('what-if-history.autosave.v2', 'legacy')
    expect(loadStory()).toBeUndefined()
    clearStory()
    expect(localStorage.getItem('what-if-history.autosave.v2')).toBe('legacy')
  })
})
