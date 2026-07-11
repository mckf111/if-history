import { EVENTS_BY_ID } from './content'
import { PEOPLE } from './people'
import type { GameState } from './types'

const AUTOSAVE_KEY = 'what-if-history.autosave.v2'
const LEGACY_AUTOSAVE_KEY = 'what-if-history.autosave.v1'
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
    const parsed = JSON.parse(raw) as Partial<GameState>
    return isGameState(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function isGameState(value: Partial<GameState>): value is GameState {
  const metricKeys = ['legitimacy', 'supply', 'command', 'people', 'court'] as const
  const resourceKeys = ['treasury', 'couriers'] as const
  const metricsValid = Boolean(value.metrics) && metricKeys.every((key) => typeof value.metrics?.[key] === 'number')
  const resourcesValid = Boolean(value.resources) && resourceKeys.every((key) => typeof value.resources?.[key] === 'number')
  const eventsValid = Array.isArray(value.currentEventIds)
    && value.currentEventIds.every((id) => typeof id === 'string')
    && value.currentEventIds.every((id) => Boolean(EVENTS_BY_ID[id]))
    && (value.status === 'complete' ? value.currentEventIds.length === 0 : value.currentEventIds.length === 2)
  const peopleValid = Boolean(value.people) && PEOPLE.every((person) => {
    const state = value.people?.[person.id]
    return typeof state?.alive === 'boolean' && typeof state.relation === 'number'
  })
  const pendingValid = Array.isArray(value.pending) && value.pending.every((item) => item && typeof item.id === 'string' && typeof item.resolveTurn === 'number' && typeof item.eventId === 'string' && typeof item.choiceId === 'string')
  const reportsValid = Array.isArray(value.reports) && value.reports.every((item) => item && typeof item.id === 'string' && typeof item.turn === 'number' && typeof item.title === 'string' && typeof item.body === 'string' && ['good', 'bad', 'neutral'].includes(item.tone))
  const decisionsValid = Array.isArray(value.decisions) && value.decisions.every((item) => item && typeof item.turn === 'number' && typeof item.eventId === 'string' && typeof item.choiceId === 'string')
  const neglectsValid = Array.isArray(value.neglects) && value.neglects.every((item) => item && typeof item.turn === 'number' && typeof item.eventId === 'string')
  return value.saveVersion === 2
    && typeof value.seed === 'number'
    && typeof value.rngState === 'number'
    && typeof value.turn === 'number'
    && typeof value.act === 'number'
    && metricsValid
    && resourcesValid
    && peopleValid
    && Array.isArray(value.flags)
    && Array.isArray(value.seenDynamics)
    && eventsValid
    && pendingValid
    && reportsValid
    && decisionsValid
    && neglectsValid
    && (value.status === 'playing' || value.status === 'complete')
}

export function clearGame(): void {
  localStorage.removeItem(AUTOSAVE_KEY)
  localStorage.removeItem(LEGACY_AUTOSAVE_KEY)
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
