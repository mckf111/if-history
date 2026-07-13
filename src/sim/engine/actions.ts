import {
  COLLECTABLES_BY_ID,
  FREE_MOVE_LIMIT,
  LOCATIONS_BY_ID,
  NPCS,
  NPCS_BY_ID,
  OBSERVABLES_BY_ID,
  SLOTS_PER_DAY,
} from '../content'
import { appendAudit } from './audit'
import { hasObserved, knowsSecret, learnSecret, markObserved, sightBelief } from './knowledge'
import { addSuspicion } from './suspicion'
import type { BeliefLevel, ClaimId, NpcId, PlayerCommand, SimState } from '../types'

// 白天动词（全部纯函数）。时段规则：slot 记「今日已花费时段数」0..4；
// 耗时动作要求 slot < 4；花完第 4 段由引擎门面转入夜间结算。

export function apCost(cmd: PlayerCommand): 0 | 1 | 2 {
  switch (cmd.t) {
    case 'choose-vow':
    case 'move':
    case 'destroy':
    case 'confirm-report':
    case 'dispatch': // 托信是一句话的事；真正的成本在刻和部件上
      return 0
    case 'forge':
      return cmd.effortSlots
    default:
      return 1
  }
}

/** 依行踪表同步在场人物位置（被捕/身故者不动） */
export function syncNpcLocations(state: SimState): SimState {
  const slotKey = `${state.day}-${Math.min(state.slot, SLOTS_PER_DAY - 1)}`
  const npcs = { ...state.npcs }
  for (const def of NPCS) {
    const current = npcs[def.id]
    if (!current || !current.alive || current.arrested) continue
    const target = def.schedule[slotKey]
    if (target && target !== current.location) npcs[def.id] = { ...current, location: target }
  }
  return { ...state, npcs }
}

/** 此刻与玩家同处一地、可交谈的人物 */
export function presentNpcIds(state: SimState): NpcId[] {
  return NPCS.filter((def) => {
    const npc = state.npcs[def.id]
    return npc && npc.alive && !npc.arrested && npc.location === state.playerLocation
  }).map((def) => def.id)
}

/** 花掉一个时段并同步人物行踪 */
export function spendSlot(state: SimState, count: 1 | 2 = 1): SimState {
  return syncNpcLocations({ ...state, slot: state.slot + count })
}

export function applyMove(state: SimState, to: string): SimState {
  if (!Object.hasOwn(LOCATIONS_BY_ID, to)) throw new Error('城里没有这个去处。')
  if (state.playerLocation === to) throw new Error('你已在此处。')
  if (state.commands.filter((command) => command.t === 'move').length >= FREE_MOVE_LIMIT) {
    throw new Error('你已经绕城太久。先做一件要紧事，让时辰继续往前走。')
  }
  return { ...state, playerLocation: to }
}

export function applyObserve(state: SimState, observableId: string): SimState {
  const observable = OBSERVABLES_BY_ID[observableId]
  if (!observable) throw new Error('这件东西已经不在眼前。')
  if (observable.locationId !== state.playerLocation) throw new Error('这件东西不在这里。')
  if (hasObserved(state, observableId)) throw new Error('你已看过这件东西。')

  let next = markObserved(state, observableId)
  next = appendAudit(next, {
    slot: state.slot,
    phase: 'action',
    kind: 'observe',
    actor: 'player',
    causeIds: [],
    text: `【${observable.label}】${observable.detail}`,
    visibleToPlayer: true,
  }).state
  return spendSlot(next)
}

export function applyProbe(state: SimState, npcId: NpcId): SimState {
  const def = NPCS_BY_ID[npcId]
  if (!def) throw new Error('你不认识这个人。')
  if (!presentNpcIds(state).includes(npcId)) throw new Error('这个人此刻不在这里。')

  // 按序解锁下一条底细；都探完了就只剩闲话
  const nextSecret = def.secrets.find((secret) => !knowsSecret(state, npcId, secret.id))
  let next = state
  let text: string
  if (nextSecret) {
    next = learnSecret(next, npcId, nextSecret.id)
    text = `【${def.name}】${nextSecret.text}`
  } else {
    text = `【${def.name}】他没什么新鲜话，只顾着自己的营生。`
  }

  // 顺带一眼：他此刻最上心的那桩信念（快照，可能过时）
  const npcState = next.npcs[npcId]
  if (npcState) {
    let topClaim: ClaimId | undefined
    let topLevel: BeliefLevel = 0
    for (const [claimId, level] of Object.entries(npcState.beliefs)) {
      if (level > topLevel) {
        topLevel = level
        topClaim = claimId
      }
    }
    if (topClaim && topLevel > 0) {
      next = sightBelief(next, { npcId, claimId: topClaim, level: topLevel, day: state.day, slot: state.slot })
    }
  }

  next = appendAudit(next, {
    slot: state.slot,
    phase: 'action',
    kind: 'probe',
    actor: 'player',
    target: npcId,
    causeIds: [],
    text,
    visibleToPlayer: true,
  }).state

  const heat = def.probeSuspicion ?? 0
  if (heat > 0) next = addSuspicion(next, heat, [], 'action')
  if (next.status !== 'playing') return next
  return spendSlot(next)
}

export function applyCollect(state: SimState, collectableId: string): SimState {
  const def = COLLECTABLES_BY_ID[collectableId]
  if (!def) throw new Error('这里没有这样东西。')
  if (def.locationId !== state.playerLocation) throw new Error('这样东西不在这里。')
  if (state.removedWorldItemIds.includes(collectableId)) throw new Error('这样东西已经离开原处，不会再长回来。')
  if (def.requiresObservedId && !hasObserved(state, def.requiresObservedId)) {
    throw new Error('你还没看清门道，下不了手。')
  }
  if (def.requiresSecret && !knowsSecret(state, def.requiresSecret.npcId, def.requiresSecret.secretId)) {
    throw new Error('你还不知道这样东西在哪里。')
  }
  if (state.inventory.silver < def.costSilver) throw new Error('银钱不够。')

  let next: SimState = {
    ...state,
    inventory: {
      ...state.inventory,
      silver: state.inventory.silver - def.costSilver,
      parts: [
        ...state.inventory.parts,
        {
          id: def.id,
          kind: def.part.kind,
          refId: def.part.refId,
          quality: def.part.quality,
          contraband: def.contraband,
          usesLeft: def.part.uses,
        },
      ],
    },
    removedWorldItemIds: [...state.removedWorldItemIds, collectableId],
  }
  next = appendAudit(next, {
    slot: state.slot,
    phase: 'action',
    kind: 'collect',
    actor: 'player',
    itemId: def.id,
    causeIds: [],
    text: `你把【${def.label}】收进了袖袋。${def.contraband ? '这东西被搜出来，是要命的。' : ''}`,
    visibleToPlayer: true,
  }).state
  if (def.suspicion > 0) next = addSuspicion(next, def.suspicion, [], 'action')
  if (next.status !== 'playing') return next
  return spendSlot(next)
}

export function applyRest(state: SimState): SimState {
  // 避风头只在自家铺子有效——街面上晃悠不叫避风头
  const cooled = state.suspicion > 0 && state.playerLocation === 'keji-shop'
  let next = appendAudit(state, {
    slot: state.slot,
    phase: 'action',
    kind: 'rest',
    actor: 'player',
    causeIds: [],
    text: cooled
      ? '你窝在阁楼上没露面，只听街上的动静。风声小了些。'
      : state.suspicion > 0
        ? '你在街边耗了一个时辰。风声没小——要避风头，得回自己的铺子。'
        : '你靠着门板打了个盹。城里的更声一阵近，一阵远。',
    visibleToPlayer: true,
  }).state
  if (cooled) next = { ...next, suspicion: Math.max(0, next.suspicion - 1) }
  return spendSlot(next)
}
