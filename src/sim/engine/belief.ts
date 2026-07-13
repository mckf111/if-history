import { CLAIMS_BY_ID, NPCS_BY_ID } from '../content'
import { appendAudit } from './audit'
import type { BeliefLevel, ClaimId, NpcId, SimState } from '../types'

// 信念系统。规矩：
// 1) applyBelief 是唯一写信念入口，强制记因果账——每次"信了"都必须能回答"因为什么"。
// 2) 单次更新最多 ±2 档（轻信者 +2），杜绝 0→3 的瞬移；笃信要么靠两次来源，要么靠轻信加成。

export function beliefOf(state: SimState, npcId: NpcId, claimId: ClaimId): BeliefLevel {
  return state.npcs[npcId]?.beliefs[claimId] ?? 0
}

/** 想信程度：断言撞上此人的欲望或恐惧各计一分（恐惧=宁可信其有），封顶 2 */
export function credulity(npcId: NpcId, claimIds: ClaimId[]): number {
  const def = NPCS_BY_ID[npcId]
  if (!def) return 0
  let score = 0
  for (const claimId of claimIds) {
    if (def.desireClaimIds.includes(claimId)) score += 1
    if (def.fearClaimIds.includes(claimId)) score += 1
  }
  return Math.min(2, score)
}

function clampLevel(value: number): BeliefLevel {
  return Math.max(0, Math.min(3, value)) as BeliefLevel
}

/**
 * 唯一写信念入口。delta 为期望变化量（会被 ±2 步幅与 0..3 档位夹紧）。
 * 写入的同时记因果账；无变化则不记账不改状态。
 */
export function applyBelief(
  state: SimState,
  npcId: NpcId,
  claimId: ClaimId,
  delta: number,
  causeIds: string[],
  phase: 'action' | 'night' | 'node',
  reason: string,
): SimState {
  const npc = state.npcs[npcId]
  const claim = CLAIMS_BY_ID[claimId]
  if (!npc || !claim || !npc.alive) return state
  const from = beliefOf(state, npcId, claimId)
  const step = Math.max(-2, Math.min(2, delta))
  const to = clampLevel(from + step)
  if (to === from) return state

  const npcs = {
    ...state.npcs,
    [npcId]: { ...npc, beliefs: { ...npc.beliefs, [claimId]: to } },
  }
  const def = NPCS_BY_ID[npcId]
  return appendAudit(
    { ...state, npcs },
    {
      phase,
      kind: 'belief',
      actor: npcId,
      claimId,
      from,
      to,
      causeIds,
      text: `${def?.name ?? npcId}${to > from ? '信了几分' : '起了疑心'}：「${claim.text}」（${reason}）`,
      // 别人心里的变化，玩家看不见——要靠探查与观其行
      visibleToPlayer: false,
    },
  ).state
}
