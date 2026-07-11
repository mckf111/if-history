import { DYNAMIC_EVENTS } from './dynamicEvents'
import { MAIN_EVENTS } from './mainEvents'

export const EVENTS = [...MAIN_EVENTS, ...DYNAMIC_EVENTS]
export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((event) => [event.id, event]))

export const TURN_MAIN_EVENT_IDS = MAIN_EVENTS.map((event) => event.id)

export const DYNAMIC_EVENT_IDS_BY_ACT = {
  1: DYNAMIC_EVENTS.filter((event) => event.act === 1).map((event) => event.id),
  2: DYNAMIC_EVENTS.filter((event) => event.act === 2).map((event) => event.id),
  3: DYNAMIC_EVENTS.filter((event) => event.act === 3).map((event) => event.id),
} as const

