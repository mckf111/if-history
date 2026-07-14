import { describe, expect, it } from 'vitest'
import { buildFeedbackMailto, FEEDBACK_EMAIL } from './feedback'

describe('玩家反馈邮件', () => {
  it('为结局反馈预填版本、种子和问题模板', () => {
    const url = new URL(buildFeedbackMailto(1644))

    expect(url.protocol).toBe('mailto:')
    expect(url.pathname).toBe(FEEDBACK_EMAIL)
    expect(url.searchParams.get('subject')).toBe('[城破前夜反馈][v0.5][种子 1644]')
    expect(url.searchParams.get('body')).toContain('本局种子：1644')
    expect(url.searchParams.get('body')).toContain('卡住或没看懂的地方：')
    expect(url.searchParams.get('body')).toContain('设备与浏览器：')
  })

  it('首页反馈入口不虚构本局种子', () => {
    const url = new URL(buildFeedbackMailto())

    expect(url.searchParams.get('subject')).toBe('[城破前夜反馈][v0.5]')
    expect(url.searchParams.get('body')).toContain('本局种子（如有）：')
  })
})
