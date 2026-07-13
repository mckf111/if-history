import type { BeliefLevel, ClaimId, NpcId, SimDay, SimState } from '../types'

// 玩家知识层：模拟真实状态对玩家部分隐藏；人物册只显示这里记下的东西。

export function learnSecret(state: SimState, npcId: NpcId, secretId: string): SimState {
  const known = state.knowledge.knownSecrets[npcId] ?? []
  if (known.includes(secretId)) return state
  return {
    ...state,
    knowledge: {
      ...state.knowledge,
      knownSecrets: { ...state.knowledge.knownSecrets, [npcId]: [...known, secretId] },
    },
  }
}

/** 记一笔信念目击快照——只是"那天看他像是信了"，之后可能过时 */
export function sightBelief(
  state: SimState,
  sighting: { npcId: NpcId; claimId: ClaimId; level: BeliefLevel; day: SimDay; slot: number },
): SimState {
  return {
    ...state,
    knowledge: {
      ...state.knowledge,
      beliefSightings: [...state.knowledge.beliefSightings, sighting],
    },
  }
}

export function markObserved(state: SimState, observableId: string): SimState {
  if (state.knowledge.seenObservables.includes(observableId)) return state
  return {
    ...state,
    knowledge: {
      ...state.knowledge,
      seenObservables: [...state.knowledge.seenObservables, observableId],
    },
  }
}

export function hasObserved(state: SimState, observableId: string): boolean {
  return state.knowledge.seenObservables.includes(observableId)
}

export function knowsSecret(state: SimState, npcId: NpcId, secretId: string): boolean {
  return (state.knowledge.knownSecrets[npcId] ?? []).includes(secretId)
}
