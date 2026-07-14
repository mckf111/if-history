import { NPC_ACTIONS_BY_ID } from '../content'
import type { AuditEntry } from '../types'

export interface NightReportSummary {
  deliveryCount: number
  actionCount: number
  dangerCount: number
}

/** 只统计晨报已经看得见的动静，不倒推隐藏的人心。 */
export function summarizeNightReport(entries: AuditEntry[]): NightReportSummary {
  return {
    deliveryCount: entries.filter((entry) => entry.kind === 'carry' || entry.kind === 'betray' || entry.kind === 'inspect').length,
    actionCount: entries.filter((entry) => entry.kind === 'npc-act').length,
    dangerCount: entries.filter((entry) => entry.kind === 'suspicion' || entry.kind === 'search' || entry.kind === 'arrest').length,
  }
}

/** 建议只根据玩家当夜能听见的账目，不泄露 belief 暗流。 */
export function nightAdvice(entries: AuditEntry[]): string {
  if (entries.some((entry) => entry.kind === 'suspicion' || entry.kind === 'search' || entry.kind === 'arrest')) return '官面的眼睛已经靠近。如果文书同时被验看，先按已经暴露处理；继续冒险前，先算清嫌疑与剩余时辰。'
  const guaranteed = entries.some((entry) => entry.kind === 'npc-act'
    && Boolean(entry.actionId && NPC_ACTIONS_BY_ID[entry.actionId]?.effects?.guaranteesLever))
  if (guaranteed) return '有一件事已经从相信变成行动。它不会在终局被另一枚骰子推翻；下一步应把有限时辰留给别的誓愿。'
  if (entries.some((entry) => entry.kind === 'betray')) return '带信人的私心改了路线。先判断消息最终落到谁手里，再决定补信、换人，还是切断这条因果。'
  if (entries.some((entry) => entry.kind === 'npc-act')) return '有人已经把相信变成了行动，但这不等于终局必成。去人物册核对他做了什么，再看是否还需要第二个支点。'
  if (entries.some((entry) => entry.kind === 'carry' || entry.kind === 'inspect')) return '文书已有可见动静，但人心变化尚不可知。先核对它是否送到、是否被验看，再决定探问或等下一次行动。'
  return '这一夜还没有可听见的回声。检查文书是否真的离手、带信人是否合适；必要时换一条更短的因果。'
}
