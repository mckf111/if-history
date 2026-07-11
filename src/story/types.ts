export type Chapter = 1 | 2 | 3
export type StoryPhase = 'scene' | 'aftermath' | 'complete'
export type CharacterId = 'xiaoman' | 'master-he' | 'douzi' | 'zhao-si' | 'wu-qiniang' | 'chunsheng'

export interface CharacterState {
  trust: number
  alive: boolean
}

export interface StoryChoiceRecord {
  chapter: Chapter
  choiceId: string
}

export interface StoryEnding {
  id: 'printed-names' | 'open-gate' | 'burned-proof'
  title: string
  subtitle: string
  paragraphs: string[]
  historyShift: string
}

export interface StoryState {
  saveVersion: 3
  seed: number
  rngState: number
  chapter: Chapter
  phase: StoryPhase
  inspectedClueIds: string[]
  characters: Record<CharacterId, CharacterState>
  flags: string[]
  debts: string[]
  settledDebts: string[]
  choices: StoryChoiceRecord[]
  ending?: StoryEnding
}

export interface StoryLine {
  speaker?: CharacterId
  text: string
}

export interface StoryClue {
  id: string
  label: string
  detail: string
}

export interface StoryChoice {
  id: string
  title: string
  action: string
  sacrifice: string
  requiredClueId: string
}

export interface StoryScene {
  chapter: Chapter
  title: string
  eyebrow: string
  date: string
  location: string
  opening: string[]
  lines: StoryLine[]
  clues: StoryClue[]
  question: string
  choices: StoryChoice[]
  sourceNote: string
  boundary: string
  sources: Array<{ title: string; url: string }>
}

export interface StoryAftermath {
  title: string
  lead: string
  lines: StoryLine[]
  consequence: string
  debt: string
  nextHook: string
}
