import { validateStoryState } from './engine'
import type { StoryState } from './types'

const STORY_SAVE_KEY = 'what-if-history.story.v3'

export function saveStory(state: StoryState) {
  localStorage.setItem(STORY_SAVE_KEY, JSON.stringify(state))
}

export function loadStory(): StoryState | undefined {
  try {
    const raw = localStorage.getItem(STORY_SAVE_KEY)
    if (!raw) return undefined
    const parsed: unknown = JSON.parse(raw)
    return validateStoryState(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function clearStory() {
  localStorage.removeItem(STORY_SAVE_KEY)
}
