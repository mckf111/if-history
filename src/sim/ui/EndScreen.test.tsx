import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createSim } from '../engine/engine'
import { settleNode } from '../engine/node'
import EndScreen from './EndScreen'
import { buildFeedbackMailto } from './feedback'
import type { CodexState } from '../types'

const EMPTY_CODEX: CodexState = { version: 2, litLinks: [], chronicles: [], dossiers: {} }

describe('结局史鉴进度', () => {
  it('按七个可达正常结局计数，并高亮本局新解锁', () => {
    const state = settleNode(createSim(1644))
    const html = renderToStaticMarkup(
      <EndScreen
        state={state}
        codex={EMPTY_CODEX}
        onRetrySeed={() => undefined}
        onRestart={() => undefined}
        onHome={() => undefined}
      />,
    )

    expect(html).toContain('史鉴 已收 <b>1/7</b>')
    expect(html).toContain('本局新增《册劫》')
    expect(html).toContain('同种子重走 · 骰子不变')
    expect(html).toContain('换一条因果 · 新种子')
    expect(html).toContain('跳到人的命运')
    expect(html).toContain('复制结局摘要')
    expect(html).toContain('反馈这一局 · 打开邮件')
    expect(html).toContain(buildFeedbackMailto(1644).replaceAll('&', '&amp;'))
    expect(html).not.toContain('骰值 undefined')
    expect(html).not.toContain('判定 0% · 骰值')
    expect(html).toContain('判定 0% · 不掷骰')
  })
})
