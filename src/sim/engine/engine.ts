import {
  CLAIMS,
  COLLECTABLES,
  COMMAND_LIMIT,
  DOC_TEMPLATES,
  FREE_MOVE_LIMIT,
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
import { appendAudit } from './audit'
import { assertPlayerCommand } from './commands'
import { hasObserved, knowsSecret } from './knowledge'
import { settleNode } from './node'
import { runNightTick } from './propagate'
import { normalizeSeed } from './rng'
import { buildCommandPreview } from './preview'
import type { CommandPreview } from './preview'
import type { NpcState, PlayerCommand, SimDay, SimState } from '../types'

// 引擎门面：UI 只调用 createSim / applyCommand / legalCommands / previewCommand，绝不直接改状态。

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
    saveVersion: 7,
    seed: normalized,
    rngState: normalized,
    day: 16,
    slot: 0,
    phase: 'action',
    status: 'playing',
    vow: null,
    playerLocation: START_LOCATION,
    craft: START_CRAFT,
    suspicion: 0,
    suspicionFired: [],
    inventory: { silver: START_SILVER, parts: [], docIds: [] },
    removedWorldItemIds: [],
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
  assertPlayerCommand(cmd)
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
    case 'choose-vow':
      requirePhase(state, 'action')
      if (state.vow) throw new Error('你已经立过这一局的誓了。')
      return appendAudit(
        { ...state, vow: cmd.vow },
        {
          slot: state.slot,
          phase: 'action',
          kind: 'vow',
          actor: 'player',
          causeIds: [],
          text: cmd.vow === 'save-chunsheng'
            ? '你把春生的红绳结缠上刀柄：先把人带回来。'
            : cmd.vow === 'protect-roster'
              ? '你在废纸上写下自己的名字：先让匠户不再被一册纸钉死。'
              : '你推开门板，看了眼三条胡同：先让街坊熬过破城那一夜。',
          visibleToPlayer: true,
        },
      ).state
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

  if (!state.vow) {
    commands.push(
      { t: 'choose-vow', vow: 'save-chunsheng' },
      { t: 'choose-vow', vow: 'protect-roster' },
      { t: 'choose-vow', vow: 'protect-neighborhood' },
    )
  }

  const moveCount = state.commands.filter((command) => command.t === 'move').length
  if (moveCount < FREE_MOVE_LIMIT) {
    for (const location of LOCATIONS) {
      if (location.id !== state.playerLocation) commands.push({ t: 'move', to: location.id })
    }
  }
  if (state.slot < SLOTS_PER_DAY) {
    for (const observable of OBSERVABLES) {
      if (observable.locationId === state.playerLocation && !hasObserved(state, observable.id)) {
        commands.push({ t: 'observe', observableId: observable.id })
      }
    }
    for (const npcId of presentNpcIds(state)) {
      const npc = NPCS_BY_ID[npcId]
      if (npc?.secrets.some((secret) => !knowsSecret(state, npcId, secret.id))) {
        commands.push({ t: 'probe', npcId })
      }
    }
    for (const collectable of COLLECTABLES) {
      if (collectable.locationId !== state.playerLocation) continue
      if (state.removedWorldItemIds.includes(collectable.id)) continue
      if (collectable.requiresObservedId && !hasObserved(state, collectable.requiresObservedId)) continue
      if (collectable.requiresSecret && !knowsSecret(state, collectable.requiresSecret.npcId, collectable.requiresSecret.secretId)) continue
      if (state.inventory.silver < collectable.costSilver) continue
      commands.push({ t: 'collect', collectableId: collectable.id })
    }
    // 刻坊：枚举界面能提交的全部单/双断言与一/两时辰方案，测试与玩家使用同一能力面。
    if (state.playerLocation === 'keji-shop') {
      for (const template of DOC_TEMPLATES) {
        const partIds = matchTemplateParts(state, template.id)
        if (!partIds) continue
        const claimIds = CLAIMS
          .filter((claim) => template.carriableClaimKinds.includes(claim.kind))
          .map((claim) => claim.id)
        const selections: string[][] = claimIds.map((claimId) => [claimId])
        for (let first = 0; first < claimIds.length; first += 1) {
          for (let second = first + 1; second < claimIds.length; second += 1) {
            selections.push([claimIds[first], claimIds[second]])
          }
        }
        for (const selected of selections) {
          for (const effortSlots of [1, 2] as const) {
            if (state.slot + effortSlots <= SLOTS_PER_DAY) {
              commands.push({ t: 'forge', templateId: template.id, claimIds: selected, partIds, effortSlots })
            }
          }
        }
      }
      for (const docId of state.inventory.docIds) {
        const doc = state.docs[docId]
        const template = doc && DOC_TEMPLATES.find((candidate) => candidate.id === doc.templateId)
        if (!doc || !template || doc.claimIds.length >= 2) continue
        for (const claim of CLAIMS) {
          if (doc.claimIds.includes(claim.id) || !template.carriableClaimKinds.includes(claim.kind)) continue
          commands.push({ t: 'alter', docId, addClaimId: claim.id })
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

/** 合法行动的定性预览；规则外或此刻不可执行的命令不生成预览。 */
export function previewCommand(state: SimState, cmd: PlayerCommand): CommandPreview | null {
  const key = commandKey(cmd)
  const legal = legalCommands(state).some((candidate) => commandKey(candidate) === key)
  return legal ? buildCommandPreview(state, cmd) : null
}

/** 命令字段顺序无意义；制书所选断言与部件的排列也不改变规则。 */
function commandKey(cmd: PlayerCommand): string {
  const normalized = cmd.t === 'forge'
    ? { ...cmd, claimIds: [...cmd.claimIds].sort(), partIds: [...cmd.partIds].sort() }
    : cmd
  return JSON.stringify(normalized, Object.keys(normalized).sort())
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
    const part = state.inventory.parts.find((candidate) => candidate.refId === refId && (candidate.usesLeft ?? 1) > 0)
    if (!part) return null
    partIds.push(part.id)
  }
  return partIds
}
