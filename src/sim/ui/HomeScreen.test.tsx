import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildFeedbackMailto } from './feedback'
import HomeScreen from './HomeScreen'

describe('首页联系入口', () => {
  it('明确区分游玩反馈和商务合作', () => {
    const html = renderToStaticMarkup(
      <HomeScreen
        hasSave={false}
        saveComplete={false}
        onStart={() => undefined}
        onContinue={() => undefined}
      />,
    )

    expect(html).toContain('游玩反馈：发送邮件')
    expect(html).toContain('商务合作')
    expect(html).toContain(buildFeedbackMailto().replaceAll('&', '&amp;'))
  })
})
