import {
  AMBIENT_NIGHT,
  CLAIMS,
  DOC_TEMPLATES_BY_ID,
  NIGHT_RUMOR_CAP,
  NPCS,
  NPCS_BY_ID,
  NPC_ACTIONS,
} from '../content'
import { appendAudit } from './audit'
import { applyBelief, beliefOf } from './belief'
import { inspectByNpc } from './forge'
import { rollPercent, pickIndex } from './rng'
import { addSuspicion } from './suspicion'
import type { DocState, NpcId, SimState } from '../types'

// 夜间传播 tick。确定性铁律：一切遍历按内容表数组序；随机只走 rngState。
// 步骤：时局大钟 → 文书在途（带信人私心）→ 流言衰减一跳 → 人物自主行动。

const BIAS_CHANCE_SELL = 40
const BIAS_CHANCE_ALTER = 35
const BIAS_CHANCE_POCKET = 35

export function runNightTick(state: SimState): SimState {
  // 1) 时局大钟：不可干预的历史在头顶滚动
  const ambient = AMBIENT_NIGHT[state.day]
  const ambientLogged = appendAudit(state, {
    phase: 'night',
    kind: 'ambient',
    actor: 'history',
    causeIds: [],
    text: ambient.text,
    visibleToPlayer: true,
  })
  let working = ambientLogged.state
  const nightCauseId = ambientLogged.auditId

  // 2) 文书在途：带信人先过一遍私心，再送达验看
  working = docTransit(working, nightCauseId)
  if (working.status !== 'playing') return working

  // 3) 流言衰减一跳（只走 rumor / logistics 类断言）
  working = rumorDrift(working, state, nightCauseId)

  // 4) 人物自主行动：信念过阈即触发，每局一次
  working = npcNightActions(working, nightCauseId)
  return working
}

function docTransit(state: SimState, nightCauseId: string): SimState {
  let working = state
  for (const docId of Object.keys(state.docs)) {
    const doc = working.docs[docId]
    if (!doc || !doc.route || doc.holder === 'player' || doc.holder === 'destroyed') continue
    const courierId = doc.holder as NpcId
    const courier = NPCS_BY_ID[courierId]
    const courierState = working.npcs[courierId]
    if (!courier || !courierState || !courierState.alive || courierState.arrested) continue

    let targetId = doc.route.targetNpcId
    let extraReaderId: NpcId | undefined
    const dispatched = [...working.audit]
      .reverse()
      .find((entry) => entry.kind === 'dispatch' && entry.docId === docId)
    let transitCauseId = dispatched?.id ?? nightCauseId

    // 带信人的私心掷骰（骰值入账，终局公开）
    if (courier.carryBias) {
      const { rngState, roll } = rollPercent(working.rngState)
      working = { ...working, rngState }
      const biasChance = courier.carryBias === 'sell'
        ? BIAS_CHANCE_SELL
        : courier.carryBias === 'alter'
          ? BIAS_CHANCE_ALTER
          : BIAS_CHANCE_POCKET
      const biased = roll <= biasChance
      let biasLogged = false

      if (biased && courier.carryBias === 'pocket') {
        // 昧下：信从此消失在渡口的夜里
        const pocketed: DocState = { ...doc, route: undefined }
        working = { ...working, docs: { ...working.docs, [docId]: pocketed } }
        working = appendAudit(working, {
          phase: 'night',
          kind: 'betray',
          actor: courierId,
          docId,
          chance: biasChance,
          roll,
          causeIds: [transitCauseId],
          text: `渡口的灯亮到后半夜。你托出去的那封信，没有任何回音。`,
          visibleToPlayer: true,
        }).state
        continue
      }
      if (biased && courier.carryBias === 'sell') {
        // 转卖：信送到了「信里说的那个人」手上——买主永远是最关心内容的人
        const subject = doc.claimIds
          .map((claimId) => CLAIMS.find((claim) => claim.id === claimId))
          .flatMap((claim) => claim?.aboutNpcIds ?? [])
          .find((npcId) => npcId !== courierId && working.npcs[npcId]?.alive)
        if (subject && subject !== targetId) {
          targetId = subject
          const betrayed = appendAudit(working, {
            phase: 'night',
            kind: 'betray',
            actor: courierId,
            docId,
            chance: biasChance,
            roll,
            causeIds: [transitCauseId],
            text: `夜里有人看见${courier.name}拐进了别家的门。你的信，换了个收信人。`,
            visibleToPlayer: true,
          })
          working = betrayed.state
          transitCauseId = betrayed.auditId
          biasLogged = true
        }
      }
      if (biased && courier.carryBias === 'alter') {
        // 加戏：多刷一份，贴到了坊口——总有一双多余的眼睛读到
        const candidates = NPCS.filter(
          (npc) => npc.id !== courierId && npc.id !== targetId && working.npcs[npc.id]?.alive,
        )
        if (candidates.length > 0) {
          const picked = pickIndex(working.rngState, candidates.length)
          working = { ...working, rngState: picked.rngState }
          extraReaderId = candidates[picked.index].id
          const betrayed = appendAudit(working, {
            phase: 'night',
            kind: 'betray',
            actor: courierId,
            docId,
            chance: biasChance,
            roll,
            causeIds: [transitCauseId],
            text: `有人把信里的话多刷了一份，贴在了坊口。墨迹未干，看热闹的先围了一圈。`,
            visibleToPlayer: true,
          })
          working = betrayed.state
          transitCauseId = betrayed.auditId
          biasLogged = true
          working = addSuspicion(working, 1, [transitCauseId], 'night')
          if (working.status !== 'playing') return working
        }
      }

      // 私心未发作、或发作却没有可改道对象，也要记骰：随机状态每推进一次，终局都能解释。
      if (!biased || !biasLogged) {
        const resisted = appendAudit(working, {
          phase: 'night',
          kind: 'carry',
          actor: courierId,
          docId,
          chance: biasChance,
          roll,
          causeIds: [transitCauseId],
          text: `${courier.name}掂量过那张纸，最终还是照你交代的路送了。`,
          visibleToPlayer: false,
        })
        working = resisted.state
        transitCauseId = resisted.auditId
      }
    }

    // 送达：换手，销路条，收信人验看
    const delivered: DocState = { ...working.docs[docId], holder: targetId, route: undefined }
    working = { ...working, docs: { ...working.docs, [docId]: delivered } }
    const carried = appendAudit(working, {
      phase: 'night',
      kind: 'carry',
      actor: courierId,
      target: targetId,
      docId,
      causeIds: [transitCauseId],
      // 送达有回音（递书的会捎话回来）；至于收信人信没信，那是他心里的事
      text: `${courier.name}捎回话来：东西已经送到${NPCS_BY_ID[targetId]?.name ?? targetId}手上了。`,
      visibleToPlayer: true,
    })
    working = carried.state
    working = inspectByNpc(working, docId, targetId, [carried.auditId], 'night')
    if (working.status !== 'playing') return working

    // 加戏的那一份：贴出去的抄件不经验看，按传闻入心
    if (extraReaderId) {
      const readerDoc = working.docs[docId]
      for (const claimId of readerDoc.claimIds) {
        working = applyBelief(working, extraReaderId, claimId, 1, [transitCauseId], 'night', '坊口的刷印帖子')
      }
    }
  }
  return working
}

/** 流言：信到半信以上就会顺着关系网走一跳，档位衰减一级；每人每夜至多听进两条 */
function rumorDrift(state: SimState, nightStart: SimState, nightCauseId: string): SimState {
  let working = state
  const heard: Record<NpcId, number> = {}
  const adjacency = buildAdjacency()

  for (const source of NPCS) {
    const sourceState = nightStart.npcs[source.id]
    if (!sourceState || !sourceState.alive || sourceState.arrested) continue
    for (const claim of CLAIMS) {
      if (claim.kind !== 'rumor' && claim.kind !== 'logistics') continue
      const level = beliefOf(nightStart, source.id, claim.id)
      if (level < 2) continue
      for (const neighborId of adjacency[source.id] ?? []) {
        const neighbor = working.npcs[neighborId]
        if (!neighbor || !neighbor.alive || neighbor.arrested) continue
        if ((heard[neighborId] ?? 0) >= NIGHT_RUMOR_CAP) continue
        const current = beliefOf(working, neighborId, claim.id)
        const ceiling = (level - 1) as 0 | 1 | 2 | 3
        if (current >= ceiling) continue
        const sourceCause = [...nightStart.audit]
          .reverse()
          .find((entry) => entry.kind === 'belief' && entry.actor === source.id && entry.claimId === claim.id)
        working = applyBelief(
          working,
          neighborId,
          claim.id,
          Math.min(2, ceiling - current),
          [sourceCause?.id ?? nightCauseId],
          'night',
          `${source.name}那里传来的话`,
        )
        heard[neighborId] = (heard[neighborId] ?? 0) + 1
      }
    }
  }
  return working
}

/** 关系网视为无向：任何一方认的边，夜话都走得通 */
function buildAdjacency(): Record<NpcId, NpcId[]> {
  const adjacency: Record<NpcId, Set<NpcId>> = {}
  for (const npc of NPCS) adjacency[npc.id] = new Set()
  for (const npc of NPCS) {
    for (const edge of npc.edges) {
      adjacency[npc.id]?.add(edge.to)
      adjacency[edge.to]?.add(npc.id)
    }
  }
  // Set 插入序确定（内容表序），转数组保持稳定
  return Object.fromEntries(Object.entries(adjacency).map(([id, set]) => [id, [...set]]))
}

function npcNightActions(state: SimState, nightCauseId: string): SimState {
  let working = state
  for (const action of NPC_ACTIONS) {
    const npcState = working.npcs[action.npcId]
    if (!npcState || !npcState.alive || npcState.arrested) continue
    const firedFlag = `fired-${action.id}`
    if (npcState.flags.includes(firedFlag)) continue
    if (beliefOf(working, action.npcId, action.when.claimId) < action.when.min) continue

    // 找到触发这条信念的最近一笔账，作为因果链的上游
    const beliefCause = [...working.audit]
      .reverse()
      .find((entry) => entry.kind === 'belief' && entry.actor === action.npcId && entry.claimId === action.when.claimId)

    const flags = [...npcState.flags, firedFlag]
    const withExtra = action.effects?.npcFlag ? [...flags, action.effects.npcFlag] : flags
    working = {
      ...working,
      npcs: { ...working.npcs, [action.npcId]: { ...npcState, flags: withExtra } },
    }
    const acted = appendAudit(working, {
      phase: 'night',
      kind: 'npc-act',
      actor: action.npcId,
      actionId: action.id,
      claimId: action.when.claimId,
      causeIds: [beliefCause?.id ?? nightCauseId],
      text: action.text,
      visibleToPlayer: action.visibleToPlayer,
    })
    working = acted.state

    if (action.effects?.bonds) {
      const npcs = { ...working.npcs }
      for (const bond of action.effects.bonds) {
        const from = npcs[bond.from]
        if (!from) continue
        const current = from.bonds[bond.to] ?? 0
        const next = Math.max(-2, Math.min(2, current + bond.delta))
        npcs[bond.from] = { ...from, bonds: { ...from.bonds, [bond.to]: next } }
      }
      working = { ...working, npcs }
    }
    if (action.effects?.removesWorldItemIds?.length) {
      const removed = new Set(working.removedWorldItemIds)
      for (const itemId of action.effects.removesWorldItemIds) removed.add(itemId)
      working = {
        ...working,
        removedWorldItemIds: [...removed],
        inventory: {
          ...working.inventory,
          parts: working.inventory.parts.filter((part) => !removed.has(part.id)),
        },
      }
    }
    if (action.effects?.suspicion) {
      working = addSuspicion(working, action.effects.suspicion, [acted.auditId], 'night')
      if (working.status !== 'playing') return working
    }
  }
  return working
}
