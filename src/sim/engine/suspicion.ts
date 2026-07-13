import { LOCATIONS_BY_ID, SUSPICION_MAX, SUSPICION_THRESHOLDS } from '../content'
import { appendAudit } from './audit'
import { buildChronicle } from './chronicle'
import { rollPercent } from './rng'
import type { SimState } from '../types'

// 嫌疑系统：0–10。阈值 4 盘查（警告）/ 7 搜查（违禁部件按骰没收）/ 10 缉拿（处决，失败即内容）。
// 每个阈值一局只触发一次（suspicionFired 去重）。

const SEARCH_CONFISCATE_CHANCE = 60

/**
 * 唯一抬嫌疑入口。会推进 rngState（搜查掷骰），并把触发的阈值事件写入因果账。
 * phase 标注这笔嫌疑发生在白天还是夜里，晨报可见性据此决定。
 */
export function addSuspicion(
  state: SimState,
  amount: number,
  causeIds: string[],
  phase: 'action' | 'night' = 'action',
): SimState {
  if (amount === 0 || state.status !== 'playing') return state
  const before = state.suspicion
  const after = Math.max(0, Math.min(SUSPICION_MAX, before + amount))
  if (after === before) return state

  let next: SimState = { ...state, suspicion: after }
  if (amount > 0) {
    const logged = appendAudit(next, {
      slot: phase === 'action' ? state.slot : undefined,
      phase,
      kind: 'suspicion',
      actor: 'player',
      causeIds,
      text: `坊间的眼睛多了一双。（嫌疑 ${before} → ${after}）`,
      visibleToPlayer: true,
    })
    next = logged.state
    for (const threshold of SUSPICION_THRESHOLDS) {
      if (before < threshold && after >= threshold && !next.suspicionFired.includes(threshold)) {
        next = fireThreshold({ ...next, suspicionFired: [...next.suspicionFired, threshold] }, threshold, phase, logged.auditId)
        if (next.status !== 'playing') break
      }
    }
  }
  return next
}

function fireThreshold(state: SimState, threshold: number, phase: 'action' | 'night', causeId: string): SimState {
  if (threshold === 4) {
    return appendAudit(state, {
      phase,
      kind: 'question',
      actor: 'player',
      causeIds: [causeId],
      text: '巡城的马快在铺子外头站了半晌，问东问西。有人开始记你的行止了。',
      visibleToPlayer: true,
    }).state
  }
  if (threshold === 7) {
    return runSearch(state, phase, causeId)
  }
  // threshold === 10：缉拿。局终，但故事不终——处决也进编年史（失败即内容）。
  const location = LOCATIONS_BY_ID[state.playerLocation]?.name ?? '街巷'
  const forgedDocs = Object.values(state.docs).filter((doc) => !doc.authentic)
  const carriesContraband = state.inventory.parts.some((part) => part.contraband)
  const accusation = forgedDocs.length > 0
    ? `他们从往来账与文书上追出了${forgedDocs.length}份伪件。`
    : carriesContraband
      ? '他们从袖袋夹层里搜出了官面禁物。'
      : '他们拿不出伪件，只把这些天反复盘问、四处走动的行迹写成了罪状。'
  const arrested = appendAudit(
    { ...state, status: 'executed' as const, phase: 'epilogue' as const },
    {
      phase,
      kind: 'arrest',
      actor: 'player',
      causeIds: [causeId],
      text: `兵马司的人在${location}拿住了你。${accusation}乱世不等复审，你被按进了站笼。`,
      visibleToPlayer: true,
    },
  ).state
  const { entries, rngState } = buildChronicle(arrested)
  return { ...arrested, rngState, chronicle: entries }
}

/** 搜查：袖中每件违禁部件各掷一次骰，掷中即没收。骰值入账，终局公开。 */
function runSearch(state: SimState, phase: 'action' | 'night', causeId: string): SimState {
  let next = appendAudit(state, {
    phase,
    kind: 'search',
    actor: 'player',
    causeIds: [causeId],
    text: '两名兵役拦住你，翻了你的袖袋和背篓。',
    visibleToPlayer: true,
  })
  let working = next.state
  const searchAuditId = next.auditId
  const kept: typeof working.inventory.parts = []
  for (const part of working.inventory.parts) {
    if (!part.contraband) {
      kept.push(part)
      continue
    }
    const { rngState, roll } = rollPercent(working.rngState)
    working = { ...working, rngState }
    const confiscated = roll <= SEARCH_CONFISCATE_CHANCE
    next = appendAudit(working, {
      phase,
      kind: 'search',
      actor: 'player',
      causeIds: [searchAuditId],
      chance: SEARCH_CONFISCATE_CHANCE,
      roll,
      text: confiscated
        ? `他们从夹层里摸出了那件东西（${part.refId}），当场收走。`
        : `夹层里的东西（${part.refId}）贴着你的手心，没被摸到。`,
      visibleToPlayer: true,
    })
    working = next.state
    if (!confiscated) kept.push(part)
  }
  return { ...working, inventory: { ...working.inventory, parts: kept } }
}
