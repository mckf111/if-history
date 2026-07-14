import { describe, expect, it } from 'vitest'
import { nightAdvice, summarizeNightReport } from './nightReport'
import type { AuditEntry, AuditKind } from '../types'

function entry(kind: AuditKind, actionId?: string): AuditEntry {
  return {
    id: `a-${kind}-${actionId ?? 'none'}`,
    day: 16,
    phase: 'night',
    kind,
    actor: 'history',
    actionId,
    causeIds: [],
    text: kind,
    visibleToPlayer: true,
  }
}

describe('夜报口径', () => {
  it('把送信动静、人物行动与危险分开统计', () => {
    const summary = summarizeNightReport([
      entry('carry'), entry('inspect'), entry('betray'), entry('npc-act'), entry('belief'), entry('search'),
    ])

    expect(summary).toEqual({ deliveryCount: 3, actionCount: 1, dangerCount: 1 })
  })

  it('建议不把可见送信误写成已知人心', () => {
    expect(nightAdvice([entry('carry')])).toContain('人心变化尚不可知')
    expect(nightAdvice([entry('npc-act')])).toContain('但这不等于终局必成')
    expect(nightAdvice([entry('npc-act', 'na-qian-hide')])).toContain('不会在终局被另一枚骰子推翻')
    expect(nightAdvice([entry('betray')])).toContain('私心改了路线')
    expect(nightAdvice([entry('search')])).toContain('官面的眼睛已经靠近')
  })

  it('送达或人物行动与暴露同时发生时，先提醒玩家处理危险', () => {
    expect(nightAdvice([entry('carry'), entry('inspect'), entry('suspicion')])).toContain('先按已经暴露处理')
    expect(nightAdvice([entry('npc-act', 'na-qian-hide'), entry('search')])).toContain('官面的眼睛已经靠近')
  })
})
