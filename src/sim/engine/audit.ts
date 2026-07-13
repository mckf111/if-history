import type { AuditEntry, SimState } from '../types'

type AuditDraft = Omit<AuditEntry, 'id' | 'day'> & { day?: AuditEntry['day'] }

/**
 * 因果账唯一写入口。id 用确定性自增序号；day 缺省取当前游戏日。
 * 返回新状态与本条 id，便于调用方把它挂进后续条目的 causeIds。
 */
export function appendAudit(state: SimState, draft: AuditDraft): { state: SimState; auditId: string } {
  const auditId = `a${state.auditSeq + 1}`
  const entry: AuditEntry = { ...draft, id: auditId, day: draft.day ?? state.day }
  return {
    state: { ...state, audit: [...state.audit, entry], auditSeq: state.auditSeq + 1 },
    auditId,
  }
}

/** 某一夜里、玩家看得见的账目（晨报数据源） */
export function nightReportEntries(state: SimState, day: AuditEntry['day']): AuditEntry[] {
  return state.audit.filter((entry) => entry.phase === 'night' && entry.day === day && entry.visibleToPlayer)
}

/** 因果连线数据（终局复盘与史鉴用） */
export function causalEdges(audit: AuditEntry[]): Array<{ from: string; to: string }> {
  const edges: Array<{ from: string; to: string }> = []
  for (const entry of audit) {
    for (const causeId of entry.causeIds) edges.push({ from: causeId, to: entry.id })
  }
  return edges
}
