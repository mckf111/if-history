import {
  COLLECTABLES_BY_ID,
  GRADE_NAMES,
  NPCS_BY_ID,
} from '../content'
import { apCost } from './actions'
import { credulity } from './belief'
import { detectionChance, forgeGrade } from './forge'
import type { DocState, ForgeGrade, PlayerCommand, SimState } from '../types'

export type PreviewFactorKind = 'quality' | 'suspicion' | 'courier' | 'recipient' | 'commitment'
export type PreviewFactorTone = 'positive' | 'neutral' | 'warning'

export interface PreviewFactor {
  kind: PreviewFactorKind
  tone: PreviewFactorTone
  text: string
}

export interface CommandPreview {
  cost: {
    slots: 0 | 1 | 2
    silver: number
  }
  factors: PreviewFactor[]
}

/**
 * 把既有规则转成行动前的定性信息。这里只读取状态，不掷骰、不推进随机种子，
 * 也不返回精确识破率或最终结果。合法性由引擎门面统一判断。
 */
export function buildCommandPreview(state: SimState, cmd: PlayerCommand): CommandPreview {
  const collectable = cmd.t === 'collect' ? COLLECTABLES_BY_ID[cmd.collectableId] : undefined
  const preview: CommandPreview = {
    cost: {
      slots: apCost(cmd),
      silver: collectable?.costSilver ?? 0,
    },
    factors: [],
  }

  switch (cmd.t) {
    case 'choose-vow':
      preview.factors.push(commitment('誓愿一旦立下，本局不能更换。'))
      break
    case 'probe': {
      const heat = NPCS_BY_ID[cmd.npcId]?.probeSuspicion ?? 0
      if (heat > 0) preview.factors.push(suspicion(`探问会增加 ${heat} 点嫌疑。`))
      break
    }
    case 'collect':
      if (collectable?.suspicion) {
        preview.factors.push(suspicion(`取得这件东西会增加 ${collectable.suspicion} 点嫌疑。`))
      }
      if (collectable?.contraband) {
        preview.factors.push(suspicion('这是违禁物，被搜出时会成为定罪凭据。'))
      }
      break
    case 'forge': {
      const parts = state.inventory.parts.filter((part) => cmd.partIds.includes(part.id))
      const grade = forgeGrade(cmd.templateId, parts, cmd.effortSlots, state.craft)
      preview.factors.push(qualityFactor(grade, '预计文书成色'))
      break
    }
    case 'alter': {
      const doc = state.docs[cmd.docId]
      const grade = Math.max(0, (doc?.grade ?? 0) - 1) as ForgeGrade
      preview.factors.push(qualityFactor(grade, '添改后的文书成色'))
      preview.factors.push(commitment('添改会留下刮补痕迹，文书成色必降一档。'))
      break
    }
    case 'destroy':
      preview.factors.push(commitment('烧毁后无法取回，这份文书也不能再投送。'))
      break
    case 'dispatch': {
      const doc = state.docs[cmd.docId]
      if (doc) {
        preview.factors.push(qualityFactor(doc.grade ?? 0, '当前文书成色'))
        preview.factors.push(courierFactor(state, cmd.courierId))
        preview.factors.push(recipientFactor(state, doc, cmd.targetNpcId))
      }
      preview.factors.push(commitment('文书交出后不能收回，将在夜间送达并接受验看。'))
      break
    }
    case 'rest':
      if (state.suspicion > 0 && state.playerLocation === 'keji-shop') {
        preview.factors.push({ kind: 'suspicion', tone: 'positive', text: '留在自家铺子避风头，会降低 1 点嫌疑。' })
      } else if (state.suspicion > 0) {
        preview.factors.push(suspicion('在外面耗时不能降低嫌疑；要避风头得回铺子。'))
      }
      break
    case 'confirm-report':
      preview.factors.push(commitment(state.day === 18
        ? '读完这份晨报后，将进入最终结算。'
        : '读完这份晨报后，将进入下一日。'))
      break
    case 'move':
    case 'observe':
      break
    default: {
      const never: never = cmd
      return never
    }
  }

  return preview
}

function qualityFactor(grade: ForgeGrade, prefix: string): PreviewFactor {
  return {
    kind: 'quality',
    tone: grade >= 2 ? 'positive' : grade === 1 ? 'neutral' : 'warning',
    text: `${prefix}为「${GRADE_NAMES[grade]}」品；成色越高，越难被识破。`,
  }
}

function courierFactor(state: SimState, courierId: string): PreviewFactor {
  const courier = NPCS_BY_ID[courierId]
  if (!knowsNpc(state, courierId)) {
    return {
      kind: 'courier',
      tone: 'neutral',
      text: `${courier?.name ?? courierId}的私心尚未摸清；先探问，才能判断他会不会改路。`,
    }
  }
  switch (courier?.carryBias) {
    case 'sell':
      return { kind: 'courier', tone: 'warning', text: `${courier.name}重利，可能把信转给更关心信中内容的人。` }
    case 'alter':
      return { kind: 'courier', tone: 'warning', text: `${courier.name}爱把事情做大，可能多刷一份，使消息外泄。` }
    case 'pocket':
      return { kind: 'courier', tone: 'warning', text: `${courier.name}先保自己的退路，可能把信留在手里而不送达。` }
    default:
      return { kind: 'courier', tone: 'neutral', text: `${courier?.name ?? courierId}没有已知会改变送信路线的私心。` }
  }
}

function recipientFactor(state: SimState, doc: DocState, recipientId: string): PreviewFactor {
  const recipient = NPCS_BY_ID[recipientId]
  if (doc.authentic) {
    return {
      kind: 'recipient',
      tone: 'positive',
      text: `${recipient?.name ?? recipientId}收到的是真件，没有伪造识破风险。`,
    }
  }
  if (!knowsNpc(state, recipientId)) {
    return {
      kind: 'recipient',
      tone: 'neutral',
      text: `${recipient?.name ?? recipientId}的验看习惯和心事尚未摸清；先去探他，才看得清验看风险。`,
    }
  }

  const chance = detectionChance(doc, recipientId)
  const risk = chance <= 30 ? '较低' : chance <= 60 ? '相当' : '较高'
  const tone: PreviewFactorTone = chance <= 30 ? 'positive' : chance <= 60 ? 'neutral' : 'warning'
  const wantsIt = credulity(recipientId, doc.claimIds)
  const motive = wantsIt >= 2
    ? '信里的话同时撞中了他的欲望与恐惧'
    : wantsIt === 1
      ? '信里有一句正合他的心事'
      : '信里的话并不特别合他的心事'
  return {
    kind: 'recipient',
    tone,
    text: `${recipient?.name ?? recipientId}的验看风险${risk}；${motive}。若被识破，嫌疑会上升。`,
  }
}

function knowsNpc(state: SimState, npcId: string): boolean {
  return (state.knowledge.knownSecrets[npcId] ?? []).length > 0
}

function suspicion(text: string): PreviewFactor {
  return { kind: 'suspicion', tone: 'warning', text }
}

function commitment(text: string): PreviewFactor {
  return { kind: 'commitment', tone: 'warning', text }
}
