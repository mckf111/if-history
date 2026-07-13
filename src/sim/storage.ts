import { validateSimState } from './engine/validate'
import type { ChronicleEntry, CodexState, SimState } from './types'

// 存储：单局自动存档 + 跨局史鉴。旧版存档原地保留，互不迁移。

export const SIM_SAVE_KEY = 'what-if-history.sim.v5'
export const CODEX_KEY = 'what-if-history.codex.v2'

export function saveSim(state: SimState) {
  try {
    localStorage.setItem(SIM_SAVE_KEY, JSON.stringify(state))
  } catch {
    // 存不进就算了：游戏照跑，只是刷新会丢
  }
}

export function loadSim(): SimState | undefined {
  try {
    const raw = localStorage.getItem(SIM_SAVE_KEY)
    if (!raw) return undefined
    const parsed: unknown = JSON.parse(raw)
    // 重放校验：结构或因果对不上的档一律不认
    return validateSimState(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function clearSim() {
  try {
    localStorage.removeItem(SIM_SAVE_KEY)
  } catch {
    // 同上
  }
}

const EMPTY_CODEX: CodexState = { version: 2, litLinks: [], chronicles: [], dossiers: {} }
const CODEX_CHRONICLE_LIMIT = 50

function isChronicleEntry(value: unknown): value is ChronicleEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entry = value as Partial<ChronicleEntry>
  return typeof entry.id === 'string'
    && (entry.layer === 'fact' || entry.layer === 'record' || entry.layer === 'legend')
    && typeof entry.text === 'string'
    && (entry.divergence === undefined || typeof entry.divergence === 'string')
    && (entry.sourceId === undefined || typeof entry.sourceId === 'string')
    && Array.isArray(entry.sourceAuditIds)
    && entry.sourceAuditIds.every((id) => typeof id === 'string')
}

function isCodexState(value: unknown): value is CodexState {
  if (!value || typeof value !== 'object') return false
  const codex = value as Partial<CodexState>
  return codex.version === 2
    && Array.isArray(codex.litLinks) && codex.litLinks.every((link) => typeof link === 'string')
    && Array.isArray(codex.chronicles)
    && codex.chronicles.every((entry) => entry
      && Number.isInteger(entry.seed)
      && typeof entry.familyId === 'string'
      && Array.isArray(entry.entries) && entry.entries.every(isChronicleEntry)
      && typeof entry.savedAt === 'string')
    && typeof codex.dossiers === 'object' && codex.dossiers !== null && !Array.isArray(codex.dossiers)
    && Object.values(codex.dossiers).every(
      (secrets) => Array.isArray(secrets) && secrets.every((secret) => typeof secret === 'string'),
    )
}

export function loadCodex(): CodexState {
  try {
    const raw = localStorage.getItem(CODEX_KEY)
    if (!raw) return EMPTY_CODEX
    const parsed: unknown = JSON.parse(raw)
    return isCodexState(parsed) ? parsed : EMPTY_CODEX
  } catch {
    return EMPTY_CODEX
  }
}

export function saveCodex(codex: CodexState) {
  try {
    const trimmed: CodexState = {
      ...codex,
      chronicles: codex.chronicles.slice(0, CODEX_CHRONICLE_LIMIT),
    }
    localStorage.setItem(CODEX_KEY, JSON.stringify(trimmed))
  } catch {
    // 同上
  }
}
