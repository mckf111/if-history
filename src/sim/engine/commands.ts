import { CLAIMS, COLLECTABLES, DOC_TEMPLATES, LOCATIONS, NPCS, OBSERVABLES } from '../content'
import type { PlayerCommand, VowId } from '../types'

const LOCATION_IDS = new Set(LOCATIONS.map((item) => item.id))
const OBSERVABLE_IDS = new Set(OBSERVABLES.map((item) => item.id))
const NPC_IDS = new Set(NPCS.map((item) => item.id))
const COLLECTABLE_IDS = new Set(COLLECTABLES.map((item) => item.id))
const CLAIM_IDS = new Set(CLAIMS.map((item) => item.id))
const TEMPLATE_IDS = new Set(DOC_TEMPLATES.map((item) => item.id))
const VOW_IDS = new Set<VowId>(['save-chunsheng', 'protect-roster', 'protect-neighborhood'])

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function isKnownString(value: unknown, ids: Set<string>): value is string {
  return typeof value === 'string' && ids.has(value)
}

function isUniqueKnownStrings(value: unknown, ids: Set<string>, min: number, max: number): value is string[] {
  return Array.isArray(value)
    && value.length >= min
    && value.length <= max
    && value.every((item) => isKnownString(item, ids))
    && new Set(value).size === value.length
}

/**
 * 命令是重放校验的根：字段、类型、枚举和重复项全部逐类检查。
 * 这里只验证命令形状；“人物此刻是否在场”等动态规则仍由引擎处理。
 */
export function isPlayerCommand(value: unknown): value is PlayerCommand {
  if (!isRecord(value) || typeof value.t !== 'string') return false

  switch (value.t) {
    case 'choose-vow':
      return hasExactKeys(value, ['t', 'vow']) && typeof value.vow === 'string' && VOW_IDS.has(value.vow as VowId)
    case 'move':
      return hasExactKeys(value, ['t', 'to']) && isKnownString(value.to, LOCATION_IDS)
    case 'observe':
      return hasExactKeys(value, ['t', 'observableId']) && isKnownString(value.observableId, OBSERVABLE_IDS)
    case 'probe':
      return hasExactKeys(value, ['t', 'npcId']) && isKnownString(value.npcId, NPC_IDS)
    case 'collect':
      return hasExactKeys(value, ['t', 'collectableId']) && isKnownString(value.collectableId, COLLECTABLE_IDS)
    case 'forge':
      return hasExactKeys(value, ['t', 'templateId', 'claimIds', 'partIds', 'effortSlots'])
        && isKnownString(value.templateId, TEMPLATE_IDS)
        && isUniqueKnownStrings(value.claimIds, CLAIM_IDS, 1, 2)
        && isUniqueKnownStrings(value.partIds, COLLECTABLE_IDS, 1, 3)
        && (value.effortSlots === 1 || value.effortSlots === 2)
    case 'alter':
      return hasExactKeys(value, ['t', 'docId', 'addClaimId'])
        && typeof value.docId === 'string'
        && isKnownString(value.addClaimId, CLAIM_IDS)
    case 'destroy':
      return hasExactKeys(value, ['t', 'docId']) && typeof value.docId === 'string'
    case 'dispatch':
      return hasExactKeys(value, ['t', 'docId', 'courierId', 'targetNpcId'])
        && typeof value.docId === 'string'
        && isKnownString(value.courierId, NPC_IDS)
        && isKnownString(value.targetNpcId, NPC_IDS)
    case 'rest':
    case 'confirm-report':
      return hasExactKeys(value, ['t'])
    default:
      return false
  }
}

export function assertPlayerCommand(value: unknown): asserts value is PlayerCommand {
  if (!isPlayerCommand(value)) throw new Error('规则外命令已拒绝。')
}
