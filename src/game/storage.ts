import type { GameState } from './types'

const AUTOSAVE_KEY = 'what-if-history.autosave.v1'
const ANNALS_KEY = 'what-if-history.annals.v1'

export interface AnnalEntry {
  seed: number
  endingId: string
  endingTitle: string
  completedAt: string
}

export function saveGame(state: GameState): void {
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state))
  if (state.status === 'complete' && state.ending) recordAnnal(state)
}

export function loadGame(): GameState | undefined {
  const raw = localStorage.getItem(AUTOSAVE_KEY)
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as GameState
    return parsed.saveVersion === 1 ? parsed : undefined
  } catch {
    return undefined
  }
}

export function clearGame(): void {
  localStorage.removeItem(AUTOSAVE_KEY)
}

export function loadAnnals(): AnnalEntry[] {
  try {
    return JSON.parse(localStorage.getItem(ANNALS_KEY) ?? '[]') as AnnalEntry[]
  } catch {
    return []
  }
}

function recordAnnal(state: GameState): void {
  if (!state.ending) return
  const existing = loadAnnals()
  const duplicate = existing.some((entry) => entry.seed === state.seed && entry.endingId === state.ending?.id)
  if (duplicate) return
  const next: AnnalEntry[] = [{ seed: state.seed, endingId: state.ending.id, endingTitle: state.ending.title, completedAt: new Date().toISOString() }, ...existing].slice(0, 20)
  localStorage.setItem(ANNALS_KEY, JSON.stringify(next))
}

