export type MetricKey = 'legitimacy' | 'supply' | 'command' | 'people' | 'court'
export type ResourceKey = 'treasury' | 'couriers'
export type SkillKey = 'statecraft' | 'military' | 'integrity' | 'intrigue'
export type Act = 1 | 2 | 3

export interface Metrics {
  legitimacy: number
  supply: number
  command: number
  people: number
  court: number
}

export interface Resources {
  treasury: number
  couriers: number
}

export interface Effect {
  metrics?: Partial<Metrics>
  resources?: Partial<Resources>
  relations?: Record<string, number>
  addFlags?: string[]
  removeFlags?: string[]
}

export interface CheckDefinition {
  baseChance: number
  metricWeights?: Partial<Record<MetricKey, number>>
  actorSkill?: SkillKey
  delay: number
  success: Effect
  failure: Effect
  successText: string
  failureText: string
}

export interface ChoiceDefinition {
  id: string
  title: string
  summary: string
  consequenceHint: string
  cost?: Partial<Resources>
  immediate?: Effect
  actorIds?: string[]
  check?: CheckDefinition
}

export interface EventDefinition {
  id: string
  act: Act
  title: string
  date: string
  category: string
  brief: string
  context: string
  sourceId: string
  boundary: string
  choices: ChoiceDefinition[]
}

export interface SourceDefinition {
  id: string
  title: string
  url: string
  note: string
}

export interface PersonDefinition {
  id: string
  name: string
  title: string
  stance: string
  skills: Record<SkillKey, number>
}

export interface PersonState {
  relation: number
  alive: boolean
}

export interface PendingResolution {
  id: string
  resolveTurn: number
  eventId: string
  choiceId: string
  actorId?: string
}

export interface ReportEntry {
  id: string
  turn: number
  title: string
  body: string
  tone: 'good' | 'bad' | 'neutral'
  chance?: number
  roll?: number
  sourceEventId?: string
}

export interface DecisionEntry {
  turn: number
  eventId: string
  choiceId: string
  actorId?: string
}

export type EndingId =
  | 'revival'
  | 'standoff'
  | 'southern-court'
  | 'warlord-court'
  | 'court-collapse'
  | 'maritime-exile'

export interface Ending {
  id: EndingId
  title: string
  subtitle: string
  narrative: string[]
}

export interface GameState {
  saveVersion: 1
  seed: number
  rngState: number
  turn: number
  act: Act
  eventIndex: number
  metrics: Metrics
  resources: Resources
  people: Record<string, PersonState>
  flags: string[]
  seenDynamics: string[]
  currentEventIds: string[]
  pending: PendingResolution[]
  reports: ReportEntry[]
  decisions: DecisionEntry[]
  status: 'playing' | 'complete'
  ending?: Ending
}

export interface PlayerDecision {
  eventId: string
  choiceId: string
  actorId?: string
}

