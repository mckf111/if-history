export const FEEDBACK_EMAIL = 'mckf11111@gmail.com'
export const GAME_VERSION = '0.5'

export function buildFeedbackMailto(seed?: number) {
  const subject = [
    '[城破前夜反馈]',
    `[v${GAME_VERSION}]`,
    seed === undefined ? null : `[种子 ${seed}]`,
  ].filter((part): part is string => Boolean(part)).join('')
  const body = [
    '你好，我想反馈《城破前夜：刻下无名》的游玩体验。',
    '',
    `版本：v${GAME_VERSION}`,
    seed === undefined ? '本局种子（如有）：' : `本局种子：${seed}`,
    '',
    '是否完成一局：',
    '卡住或没看懂的地方：',
    '最喜欢或最有感觉的地方：',
    '设备与浏览器：',
  ].join('\n')
  const params = new URLSearchParams({ subject, body })

  return `mailto:${FEEDBACK_EMAIL}?${params.toString()}`
}
