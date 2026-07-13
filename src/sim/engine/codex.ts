import { chronicleFamilyId } from './chronicle'
import type { CodexState, SimState } from '../types'

// 史鉴：跨局收藏。点亮的因果连线（谁因信了什么而动）、收集的编年史、补全的人物档案。
// 纯函数：savedAt 由调用方（存储层）注入，规则层不碰时钟。

export function mergeCodexFromRun(codex: CodexState, state: SimState, savedAt: string): CodexState {
  if (state.status === 'playing') return codex
  const familyId = chronicleFamilyId(state)

  const litLinks = new Set(codex.litLinks)
  for (const entry of state.audit) {
    if (entry.kind === 'npc-act' && entry.claimId) litLinks.add(`act:${entry.actor}:${entry.claimId}`)
    if (entry.kind === 'betray') litLinks.add(`betray:${entry.actor}`)
  }
  for (const lever of state.node?.levers ?? []) {
    litLinks.add(`lever:${lever.lever}:${lever.tipped ? 'tipped' : 'held'}`)
  }
  litLinks.add(`family:${familyId}`)

  const dossiers: CodexState['dossiers'] = { ...codex.dossiers }
  for (const [npcId, secrets] of Object.entries(state.knowledge.knownSecrets)) {
    dossiers[npcId] = [...new Set([...(dossiers[npcId] ?? []), ...secrets])]
  }

  const alreadyCollected = codex.chronicles.some(
    (entry) => entry.seed === state.seed && entry.familyId === familyId,
  )
  const chronicles = alreadyCollected
    ? codex.chronicles
    : [
        { seed: state.seed, familyId, entries: state.chronicle ?? [], savedAt },
        ...codex.chronicles,
      ]

  return { version: 1, litLinks: [...litLinks], chronicles, dossiers }
}
