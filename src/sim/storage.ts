import { validateSimState } from './engine/validate'
import type { ChronicleEntry, CodexState, SimState } from './types'

// 存储：单局自动存档 + 跨局史鉴。旧版存档原地保留，互不迁移。

export const SIM_SAVE_KEY = 'what-if-history.sim.v7'
export const CODEX_KEY = 'what-if-history.codex.v2'

export type StorageWriteResult =
  | { ok: true }
  | { ok: false; reason: 'serialization-failed' | 'storage-unavailable' }

export type SimImportResult =
  | { ok: true; state: SimState }
  | { ok: false; reason: 'invalid-json' | 'invalid-save' }

export type SimExportResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'serialization-failed' }

export type SimLoadResult =
  | { status: 'loaded'; state: SimState }
  | { status: 'empty' | 'invalid-json' | 'invalid-save' | 'storage-unavailable' }

export type CodexLoadResult =
  | { status: 'loaded'; codex: CodexState }
  | { status: 'empty' | 'invalid-json' | 'invalid-save' | 'storage-unavailable' }

function stringify(value: unknown, pretty = false): SimExportResult {
  try {
    const text = JSON.stringify(value, null, pretty ? 2 : undefined)
    return typeof text === 'string'
      ? { ok: true, text }
      : { ok: false, reason: 'serialization-failed' }
  } catch {
    return { ok: false, reason: 'serialization-failed' }
  }
}

function writeStorage(key: string, value: unknown): StorageWriteResult {
  const serialized = stringify(value)
  if (!serialized.ok) return serialized
  try {
    localStorage.setItem(key, serialized.text)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'storage-unavailable' }
  }
}

export function exportSim(state: SimState): SimExportResult {
  return stringify(state, true)
}

export function importSim(raw: string): SimImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }
  // 重放校验：结构或因果对不上的档一律不认
  return validateSimState(parsed)
    ? { ok: true, state: parsed }
    : { ok: false, reason: 'invalid-save' }
}

export function saveSim(state: SimState): StorageWriteResult {
  return writeStorage(SIM_SAVE_KEY, state)
}

export function loadSimResult(): SimLoadResult {
  try {
    const raw = localStorage.getItem(SIM_SAVE_KEY)
    if (raw === null) return { status: 'empty' }
    const imported = importSim(raw)
    return imported.ok
      ? { status: 'loaded', state: imported.state }
      : { status: imported.reason }
  } catch {
    return { status: 'storage-unavailable' }
  }
}

/** 兼容原调用方；需要区分空档、坏档和存储不可用时使用 loadSimResult。 */
export function loadSim(): SimState | undefined {
  const result = loadSimResult()
  return result.status === 'loaded' ? result.state : undefined
}

export function clearSim(): StorageWriteResult {
  try {
    localStorage.removeItem(SIM_SAVE_KEY)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'storage-unavailable' }
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

export function loadCodexResult(): CodexLoadResult {
  try {
    const raw = localStorage.getItem(CODEX_KEY)
    if (raw === null) return { status: 'empty' }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { status: 'invalid-json' }
    }
    return isCodexState(parsed)
      ? { status: 'loaded', codex: parsed }
      : { status: 'invalid-save' }
  } catch {
    return { status: 'storage-unavailable' }
  }
}

/** 兼容原调用方；史鉴不可读时仍回退空册。 */
export function loadCodex(): CodexState {
  const result = loadCodexResult()
  return result.status === 'loaded' ? result.codex : EMPTY_CODEX
}

export function saveCodex(codex: CodexState): StorageWriteResult {
  const trimmed: CodexState = {
    ...codex,
    chronicles: codex.chronicles.slice(0, CODEX_CHRONICLE_LIMIT),
  }
  return writeStorage(CODEX_KEY, trimmed)
}
