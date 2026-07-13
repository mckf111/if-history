// 种子随机：32 位线性同余（复制自旧引擎 src/game/engine.ts 的 nextRandom，常量出自 Numerical Recipes）。
// 全部随机必须经由存档内 rngState；规则代码禁止 Math.random() 与时间戳。

export function nextRandom(rngState: number): { rngState: number; value: number } {
  const next = (Math.imul(rngState, 1664525) + 1013904223) >>> 0
  return { rngState: next, value: next / 4294967296 }
}

/** 掷 1–100 骰 */
export function rollPercent(rngState: number): { rngState: number; roll: number } {
  const { rngState: next, value } = nextRandom(rngState)
  return { rngState: next, roll: Math.floor(value * 100) + 1 }
}

/** 从 length 个元素里抽一个下标 */
export function pickIndex(rngState: number, length: number): { rngState: number; index: number } {
  const { rngState: next, value } = nextRandom(rngState)
  return { rngState: next, index: Math.min(length - 1, Math.floor(value * length)) }
}

/** 归一化新局种子：无符号 32 位，0 兜底为 1644（沿旧引擎手法） */
export function normalizeSeed(seed: number): number {
  return (seed >>> 0) || 1644
}
