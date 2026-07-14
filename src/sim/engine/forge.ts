import { CLAIMS_BY_ID, DOC_TEMPLATES_BY_ID, GRADE_NAMES, NPCS_BY_ID } from '../content'
import { appendAudit } from './audit'
import { applyBelief, credulity } from './belief'
import { rollPercent } from './rng'
import { addSuspicion } from './suspicion'
import { spendSlot } from './actions'
import type { DocState, ForgeGrade, InventoryPart, NpcId, PlayerCommand, SimState } from '../types'

// 伪造系统：质量四档（粗/工/精/神），识破判定沿旧引擎胜算公式形状：
//   识破率 = 底数 + 精明×k − 质量×k − 想信程度×k，夹在 10–90，种子掷骰，骰值终局公开。

const DETECT_BASE = 35
const DETECT_PER_ACUMEN = 15
const DETECT_PER_GRADE = 15
const DETECT_PER_CREDULITY = 10
const EXPOSED_SUSPICION = 2

export function detectionChance(doc: DocState, inspectorId: NpcId): number {
  if (doc.authentic) return 0
  const inspector = NPCS_BY_ID[inspectorId]
  if (!inspector) return 0
  const chance = DETECT_BASE
    + inspector.acumen * DETECT_PER_ACUMEN
    - (doc.grade ?? 0) * DETECT_PER_GRADE
    - credulity(inspectorId, doc.claimIds) * DETECT_PER_CREDULITY
  return Math.round(Math.max(10, Math.min(90, chance)))
}

/** 质量结算：缺要件必为「粗」；否则受最差要件（短板）+ 工时 + 技艺抬升 */
export function forgeGrade(
  templateId: string,
  parts: InventoryPart[],
  effortSlots: 1 | 2,
  craft: number,
): ForgeGrade {
  const template = DOC_TEMPLATES_BY_ID[templateId]
  if (!template) return 0
  const required: Array<{ refId: string }> = []
  if (template.requiredParts.sealRefId) required.push({ refId: template.requiredParts.sealRefId })
  if (template.requiredParts.handRefId) required.push({ refId: template.requiredParts.handRefId })
  if (template.requiredParts.paperRefId) required.push({ refId: template.requiredParts.paperRefId })

  let bottleneck = 3
  for (const requirement of required) {
    const part = parts.find((candidate) => candidate.refId === requirement.refId)
    if (!part) return 0 // 缺印的火票就是废纸
    bottleneck = Math.min(bottleneck, part.quality)
  }
  const score = bottleneck + (effortSlots === 2 ? 1 : 0) + (craft >= 2 ? 1 : 0)
  return Math.max(0, Math.min(3, score)) as ForgeGrade
}

export function applyForge(state: SimState, cmd: Extract<PlayerCommand, { t: 'forge' }>): SimState {
  if (state.playerLocation !== 'keji-shop') throw new Error('刻刀和案子都在铺子里。')
  const template = DOC_TEMPLATES_BY_ID[cmd.templateId]
  if (!template) throw new Error('没有这种式样的文书。')
  if (cmd.claimIds.length === 0 || cmd.claimIds.length > 2) throw new Error('一张文书写一两件事，贪多必露。')
  for (const claimId of cmd.claimIds) {
    const claim = CLAIMS_BY_ID[claimId]
    if (!claim) throw new Error('这句话没处落笔。')
    if (!template.carriableClaimKinds.includes(claim.kind)) {
      throw new Error(`${template.name}装不下这样的话。`)
    }
  }
  const parts: InventoryPart[] = []
  for (const partId of cmd.partIds) {
    const part = state.inventory.parts.find((candidate) => candidate.id === partId)
    if (!part) throw new Error('要用的部件不在袖袋里。')
    parts.push(part)
  }
  const requiredRefs = [
    template.requiredParts.sealRefId,
    template.requiredParts.handRefId,
    template.requiredParts.paperRefId,
  ].filter((refId): refId is string => Boolean(refId))
  if (parts.length !== requiredRefs.length
    || requiredRefs.some((refId) => !parts.some((part) => part.refId === refId))
    || parts.some((part) => !requiredRefs.includes(part.refId))) {
    throw new Error(`${template.name}的要件没有配齐。`)
  }

  const grade = forgeGrade(cmd.templateId, parts, cmd.effortSlots, state.craft)
  const craftImproved = state.craft < 2
  const docId = `doc-${state.docSeq + 1}`
  const doc: DocState = {
    id: docId,
    templateId: cmd.templateId,
    claimIds: [...cmd.claimIds],
    authentic: false,
    grade,
    parts: {
      sealPartId: parts.find((part) => part.kind === 'seal')?.id,
      handPartId: parts.find((part) => part.kind === 'hand-sample')?.id,
      paperPartId: parts.find((part) => part.kind === 'paper' || part.kind === 'blank-form')?.id,
    },
    holder: 'player',
    exposed: false,
    createdDay: state.day,
  }

  // 纸按张消耗，印模与笔迹样本可复用；一刀纸不再被误当成单张纸。
  const consumedIds = new Set(
    parts.filter((part) => part.kind === 'paper' || part.kind === 'blank-form').map((part) => part.id),
  )
  let next: SimState = {
    ...state,
    craft: craftImproved ? 2 : state.craft,
    docSeq: state.docSeq + 1,
    docs: { ...state.docs, [docId]: doc },
    inventory: {
      ...state.inventory,
      parts: state.inventory.parts.flatMap((part) => {
        if (!consumedIds.has(part.id)) return [part]
        const usesLeft = part.usesLeft ?? 1
        return usesLeft > 1 ? [{ ...part, usesLeft: usesLeft - 1 }] : []
      }),
      docIds: [...state.inventory.docIds, docId],
    },
  }
  const materialCauseIds = cmd.partIds.flatMap((partId) => {
    const entry = [...state.audit].reverse().find((candidate) => candidate.kind === 'collect' && candidate.itemId === partId)
    return entry ? [entry.id] : []
  })
  next = appendAudit(next, {
    slot: state.slot,
    phase: 'action',
    kind: 'forge',
    actor: 'player',
    docId,
    causeIds: [...new Set(materialCauseIds)],
    text: `灯下${cmd.effortSlots === 2 ? '两个时辰' : '一个时辰'}，一张${template.name}成了。手艺：${GRADE_NAMES[grade]}。${grade === 0 ? '你自己都看得出破绽。' : ''}${craftImproved ? '这一刀刻完，手上熟了一层；往后的文书成色会抬一档。' : ''}`,
    visibleToPlayer: true,
  }).state
  return spendSlot(next, cmd.effortSlots)
}

export function applyAlter(state: SimState, cmd: Extract<PlayerCommand, { t: 'alter' }>): SimState {
  if (state.playerLocation !== 'keji-shop') throw new Error('改笔也得回铺子里动。')
  const doc = state.docs[cmd.docId]
  if (!doc || doc.holder !== 'player') throw new Error('这张文书不在你手里。')
  const claim = CLAIMS_BY_ID[cmd.addClaimId]
  const template = DOC_TEMPLATES_BY_ID[doc.templateId]
  if (!claim || !template) throw new Error('这句话没处落笔。')
  if (!template.carriableClaimKinds.includes(claim.kind)) throw new Error(`${template.name}装不下这样的话。`)
  if (doc.claimIds.includes(cmd.addClaimId)) throw new Error('这句话已经写在上面了。')
  if (doc.claimIds.length >= 2) throw new Error('这张文书已经写满了，再添就只剩破绽。')

  const grade = Math.max(0, (doc.grade ?? 0) - 1) as DocState['grade']
  const updated: DocState = { ...doc, claimIds: [...doc.claimIds, cmd.addClaimId], grade, authentic: false }
  let next: SimState = { ...state, docs: { ...state.docs, [doc.id]: updated } }
  next = appendAudit(next, {
    slot: state.slot,
    phase: 'action',
    kind: 'alter',
    actor: 'player',
    docId: doc.id,
    claimId: cmd.addClaimId,
    causeIds: latestDocCauseIds(state, doc.id),
    text: `你在${template.name}上添了一笔。刮补的痕迹藏不干净，成色降了一档。`,
    visibleToPlayer: true,
  }).state
  return spendSlot(next)
}

export function applyDestroy(state: SimState, cmd: Extract<PlayerCommand, { t: 'destroy' }>): SimState {
  const doc = state.docs[cmd.docId]
  if (!doc || doc.holder !== 'player') throw new Error('这张文书不在你手里。')
  const template = DOC_TEMPLATES_BY_ID[doc.templateId]
  const updated: DocState = { ...doc, holder: 'destroyed', route: undefined }
  return appendAudit(
    {
      ...state,
      docs: { ...state.docs, [doc.id]: updated },
      inventory: { ...state.inventory, docIds: state.inventory.docIds.filter((id) => id !== doc.id) },
    },
    {
      slot: state.slot,
      phase: 'action',
      kind: 'destroy',
      actor: 'player',
      docId: doc.id,
      causeIds: latestDocCauseIds(state, doc.id),
      text: `${template?.name ?? '那张纸'}进了灶膛。灰烬不会指认任何人。`,
      visibleToPlayer: true,
    },
  ).state
}

export function applyDispatch(state: SimState, cmd: Extract<PlayerCommand, { t: 'dispatch' }>): SimState {
  const doc = state.docs[cmd.docId]
  if (!doc || doc.holder !== 'player') throw new Error('这张文书不在你手里。')
  const courier = NPCS_BY_ID[cmd.courierId]
  const courierState = state.npcs[cmd.courierId]
  if (!courier || !courierState) throw new Error('你不认识这个带信人。')
  if (!courier.canCarry) throw new Error('这个人不接带信的活。')
  if (!courierState.alive || courierState.arrested) throw new Error('这个人已经带不了信了。')
  if (courierState.location !== state.playerLocation) throw new Error('带信人不在眼前，东西交不出去。')
  const target = state.npcs[cmd.targetNpcId]
  if (!target || !target.alive || target.arrested) throw new Error('收信的人已经收不到信了。')
  if (cmd.targetNpcId === cmd.courierId) throw new Error('自己带给自己，算什么投书。')

  const updated: DocState = {
    ...doc,
    holder: cmd.courierId,
    route: { targetNpcId: cmd.targetNpcId, dispatchedDay: state.day },
  }
  let next: SimState = {
    ...state,
    docs: { ...state.docs, [doc.id]: updated },
    inventory: { ...state.inventory, docIds: state.inventory.docIds.filter((id) => id !== doc.id) },
  }
  const template = DOC_TEMPLATES_BY_ID[doc.templateId]
  next = appendAudit(next, {
    slot: state.slot,
    phase: 'action',
    kind: 'dispatch',
    actor: 'player',
    target: cmd.targetNpcId,
    docId: doc.id,
    causeIds: latestDocCauseIds(state, doc.id),
    text: `你把那张${template?.name ?? '文书'}交到${courier.name}手上，指名送给${NPCS_BY_ID[cmd.targetNpcId]?.name ?? cmd.targetNpcId}。信一出手，就不归你了。`,
    visibleToPlayer: true,
  }).state
  return next
}

function latestDocCauseIds(state: SimState, docId: string): string[] {
  const entry = [...state.audit]
    .reverse()
    .find((candidate) => candidate.docId === docId && ['forge', 'alter', 'dispatch', 'carry', 'betray', 'inspect'].includes(candidate.kind))
  return entry ? [entry.id] : []
}

/**
 * 验看：收信人查验文书。识破 → 文书作废曝光、嫌疑上身；
 * 未识破 → 文书上每条断言按「想信程度」入心。骰值入账，终局公开。
 */
export function inspectByNpc(
  state: SimState,
  docId: string,
  inspectorId: NpcId,
  causeIds: string[],
  phase: 'action' | 'night',
): SimState {
  const doc = state.docs[docId]
  const inspector = NPCS_BY_ID[inspectorId]
  if (!doc || !inspector) return state
  const chance = detectionChance(doc, inspectorId)

  let working = state
  let detected = false
  let inspectAuditId: string
  if (chance <= 0) {
    const logged = appendAudit(working, {
      phase,
      kind: 'inspect',
      actor: inspectorId,
      docId,
      causeIds,
      text: `${inspector.name}验过那份文书，没看出毛病。`,
      visibleToPlayer: false,
    })
    working = logged.state
    inspectAuditId = logged.auditId
  } else {
    const { rngState, roll } = rollPercent(working.rngState)
    working = { ...working, rngState }
    detected = roll <= chance
    const logged = appendAudit(working, {
      phase,
      kind: 'inspect',
      actor: inspectorId,
      docId,
      chance,
      roll,
      causeIds,
      text: detected
        ? `${inspector.name}把那张纸凑到灯下看了又看，冷笑一声：印色不对。`
        : `${inspector.name}验了印、对了格眼，把文书收下了。`,
      visibleToPlayer: true,
    })
    working = logged.state
    inspectAuditId = logged.auditId
  }

  if (detected) {
    const exposedDoc: DocState = { ...working.docs[docId], exposed: true, holder: inspectorId, route: undefined }
    working = { ...working, docs: { ...working.docs, [docId]: exposedDoc } }
    working = addSuspicion(working, EXPOSED_SUSPICION, [inspectAuditId], phase === 'night' ? 'night' : 'action')
    return working
  }

  const want = credulity(inspectorId, doc.claimIds)
  for (const claimId of doc.claimIds) {
    working = applyBelief(
      working,
      inspectorId,
      claimId,
      1 + (want > 0 ? 1 : 0),
      [inspectAuditId],
      phase,
      want > 0 ? '白纸黑字，正合心事' : '白纸黑字',
    )
  }
  return working
}
