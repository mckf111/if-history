import {
  CLAIMS,
  COLLECTABLES,
  COMMAND_LIMIT,
  DOC_TEMPLATES,
  LOCATIONS,
  NPCS,
  NPCS_BY_ID,
  OBSERVABLES,
  SLOTS_PER_DAY,
  START_CRAFT,
  START_LOCATION,
  START_SILVER,
} from '../content'
import {
  apCost,
  applyCollect,
  applyMove,
  applyObserve,
  applyProbe,
  applyRest,
  presentNpcIds,
  syncNpcLocations,
} from './actions'
import { applyAlter, applyDestroy, applyDispatch, applyForge } from './forge'
import { hasObserved, knowsSecret } from './knowledge'
import { settleNode } from './node'
import { runNightTick } from './propagate'
import { normalizeSeed } from './rng'
import type { NpcState, PlayerCommand, SimDay, SimState } from '../types'

// 引擎门面：UI 只调用 createSim / applyCommand / legalCommands，绝不直接改状态。

export function createSim(seed: number): SimState {
  const normalized = normalizeSeed(seed)
  const npcs: Record<string, NpcState> = {}
  for (const def of NPCS) {
    npcs[def.id] = {
      location: def.schedule['16-0'] ?? START_LOCATION,
      beliefs: { ...def.initialBeliefs } as NpcState['beliefs'],
      bonds: {},
      alive: true,
      arrested: false,
      flags: [],
    }
  }
  return {
    saveVersion: 4,
    seed: normalized,
    rngState: normalized,
    day: 16,
    slot: 0,
    phase: 'action',
    status: 'playing',
    playerLocation: START_LOCATION,
    craft: START_CRAFT,
    suspicion: 0,
    suspicionFired: [],
    inventory: { silver: START_SILVER, parts: [], docIds: [] },
    knowledge: { knownSecrets: {}, beliefSightings: [], seenObservables: [] },
    npcs,
    docs: {},
    docSeq: 0,
    audit: [],
    auditSeq: 0,
    commands: [],
  }
}

/** 玩家命令唯一入口：校验 → 分派 → 记录命令 → 时段耗尽转入夜间 */
export function applyCommand(state: SimState, cmd: PlayerCommand): SimState {
  if (state.status !== 'playing') throw new Error('这一局已经结束了。')
  if (state.commands.length >= COMMAND_LIMIT) throw new Error('这一局的路已经走到头了。')

  let next = dispatch(state, cmd)
  next = { ...next, commands: [...next.commands, cmd] }

  // 白天四个时段花完 → 夜幕落下
  if (next.phase === 'action' && next.slot >= SLOTS_PER_DAY && next.status === 'playing') {
    next = runNight(next)
  }
  return next
}

function dispatch(state: SimState, cmd: PlayerCommand): SimState {
  switch (cmd.t) {
    case 'move':
      requirePhase(state, 'action')
      return applyMove(state, cmd.to)
    case 'observe':
      requirePhase(state, 'action')
      requireSlot(state, cmd)
      return applyObserve(state, cmd.observableId)
    case 'probe':
      requirePhase(state, 'action')
      requireSlot(state, cmd)
      return applyProbe(state, cmd.npcId)
    case 'collect':
      requirePhase(state, 'action')
      requireSlot(state, cmd)
      return applyCollect(state, cmd.collectableId)
    case 'rest':
      requirePhase(state, 'action')
      requireSlot(state, cmd)
      return applyRest(state)
    case 'confirm-report':
      requirePhase(state, 'night-report')
      return confirmReport(state)
    case 'forge':
      requirePhase(state, 'action')
      requireSlot(state, cmd)
      return applyForge(state, cmd)
    case 'alter':
      requirePhase(state, 'action')
      requireSlot(state, cmd)
      return applyAlter(state, cmd)
    case 'destroy':
      requirePhase(state, 'action')
      return applyDestroy(state, cmd)
    case 'dispatch':
      requirePhase(state, 'action')
      requireSlot(state, cmd)
      return applyDispatch(state, cmd)
    default: {
      const never: never = cmd
      throw new Error(`未知命令：${JSON.stringify(never)}`)
    }
  }
}

function requirePhase(state: SimState, phase: SimState['phase']) {
  if (state.phase !== phase) throw new Error('此刻做不了这件事。')
}

function requireSlot(state: SimState, cmd: PlayerCommand) {
  if (state.slot + apCost(cmd) > SLOTS_PER_DAY) throw new Error('今天的时辰不够了。')
}

/** 夜间结算：时局大钟 → 文书在途 → 流言衰减 → 人物自主行动 → 晨报待读 */
function runNight(state: SimState): SimState {
  const next = runNightTick(state)
  if (next.status !== 'playing') return next
  return { ...next, phase: 'night-report' }
}

/** 读罢晨报：进入新的一天；三月十八夜之后是节点日结算 */
function confirmReport(state: SimState): SimState {
  if (state.day === 18) {
    return settleNode(state)
  }
  const day = (state.day + 1) as SimDay
  return syncNpcLocations({ ...state, day, slot: 0, phase: 'action' })
}

/** UI 渲染依据：此刻全部合法命令 */
export function legalCommands(state: SimState): PlayerCommand[] {
  if (state.status !== 'playing') return []
  const commands: PlayerCommand[] = []
  if (state.phase === 'night-report') {
    commands.push({ t: 'confirm-report' })
    return commands
  }
  if (state.phase !== 'action') return commands

  for (const location of LOCATIONS) {
    if (location.id !== state.playerLocation) commands.push({ t: 'move', to: location.id })
  }
  if (state.slot < SLOTS_PER_DAY) {
    for (const observable of OBSERVABLES) {
      if (observable.locationId === state.playerLocation && !hasObserved(state, observable.id)) {
        commands.push({ t: 'observe', observableId: observable.id })
      }
    }
    for (const npcId of presentNpcIds(state)) {
      commands.push({ t: 'probe', npcId })
    }
    for (const collectable of COLLECTABLES) {
      if (collectable.locationId !== state.playerLocation) continue
      if (state.inventory.parts.some((part) => part.id === collectable.id)) continue
      if (collectable.requiresObservedId && !hasObserved(state, collectable.requiresObservedId)) continue
      if (collectable.requiresSecret && !knowsSecret(state, collectable.requiresSecret.npcId, collectable.requiresSecret.secretId)) continue
      if (state.inventory.silver < collectable.costSilver) continue
      commands.push({ t: 'collect', collectableId: collectable.id })
    }
    // 刻坊：凑齐要件的每种型制 × 可承载的每条断言（枚举单断言、一时辰方案；组合款由界面拼）
    if (state.playerLocation === 'keji-shop') {
      for (const template of DOC_TEMPLATES) {
        const partIds = matchTemplateParts(state, template.id)
        if (!partIds) continue
        for (const claim of CLAIMS) {
          if (!template.carriableClaimKinds.includes(claim.kind)) continue
          commands.push({ t: 'forge', templateId: template.id, claimIds: [claim.id], partIds, effortSlots: 1 })
        }
      }
    }
    commands.push({ t: 'rest' })
  }
  // 投书免时辰：手上的文书 × 在场可带信的人 × 任一活口收信人
  for (const docId of state.inventory.docIds) {
    for (const courierId of presentNpcIds(state)) {
      const courier = NPCS_BY_ID[courierId]
      if (!courier?.canCarry) continue
      for (const target of NPCS) {
        if (target.id === courierId) continue
        const targetState = state.npcs[target.id]
        if (!targetState?.alive || targetState.arrested) continue
        commands.push({ t: 'dispatch', docId, courierId, targetNpcId: target.id })
      }
    }
  }
  for (const docId of state.inventory.docIds) {
    commands.push({ t: 'destroy', docId })
  }
  return commands
}

/** 为某型制凑一套要件：每个要求的 refId 取袖中第一件匹配部件；缺件返回 null */
export function matchTemplateParts(state: SimState, templateId: string): string[] | null {
  const template = DOC_TEMPLATES.find((candidate) => candidate.id === templateId)
  if (!template) return null
  const needed = [
    template.requiredParts.sealRefId,
    template.requiredParts.handRefId,
    template.requiredParts.paperRefId,
  ].filter((refId): refId is string => Boolean(refId))
  const partIds: string[] = []
  for (const refId of needed) {
    const part = state.inventory.parts.find((candidate) => candidate.refId === refId)
    if (!part) return null
    partIds.push(part.id)
  }
  return partIds
}
