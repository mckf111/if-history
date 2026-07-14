import type { SimDay } from '../types'

export { CLAIMS, CLAIMS_BY_ID } from './claims'
export { NPCS, NPCS_BY_ID } from './npcs'
export {
  LOCATIONS, LOCATIONS_BY_ID,
  OBSERVABLES, OBSERVABLES_BY_ID,
  COLLECTABLES, COLLECTABLES_BY_ID, PART_NAMES_BY_REF_ID,
} from './locations'
export { SIM_SOURCES, SIM_SOURCES_BY_ID } from './sources'
export { DOC_TEMPLATES, DOC_TEMPLATES_BY_ID, GRADE_NAMES } from './docTemplates'
export { NPC_ACTIONS, NPC_ACTIONS_BY_ID } from './npcActions'
export { PILLARS, PILLARS_BY_ID, OUTCOME_FAMILIES, EXECUTED_FAMILY } from './pillars'
export { CHRONICLE_TEMPLATES } from './chronicleTemplates'

// ── 全局常量 ──────────────────────────────────────────

export const DAYS: SimDay[] = [16, 17, 18]
export const SLOTS_PER_DAY = 4
export const SLOT_NAMES = ['晨', '午', '暮', '夜前'] as const

/** 嫌疑阈值：4 盘查 / 7 搜查 / 10 缉拿 */
export const SUSPICION_THRESHOLDS = [4, 7, 10] as const
export const SUSPICION_MAX = 10

export const START_SILVER = 3
export const START_CRAFT = 1
export const START_LOCATION = 'keji-shop'

/** 存档命令总上限（重放校验防滥用）；正常流程远低于此值。 */
export const COMMAND_LIMIT = 1000

/** 免费移动保护阈值：达到后仍可用耗时动作推进到终局，不会形成死档。 */
export const FREE_MOVE_LIMIT = 400

/** 每夜每人传闻处理上限（防传播指数化，M2 使用） */
export const NIGHT_RUMOR_CAP = 2

// ── 每夜时局（不可干预的历史大钟，晨报可见） ──────────

export const AMBIENT_NIGHT: Record<SimDay, { id: string; text: string }> = {
  16: {
    id: 'ambient-16',
    text: '夜里有快马进城，说居庸关外火光连天。巡更的梆子比往日敲得密。',
  },
  17: {
    id: 'ambient-17',
    text: '沙河方向烽火彻夜。各门加了岗，进出翻检担子，城里的米价一夜翻了一倍。',
  },
  18: {
    id: 'ambient-18',
    text: '日晡以后，外城陷落的消息沿街压过来。守城的兵里有人卸了号衣混进人堆。再亮一次天，就是三月十九。',
  },
}
