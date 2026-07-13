import { describe, expect, it } from 'vitest'
import { buildChronicle } from './chronicle'
import { createSim } from './engine'
import { settleNode } from './node'
import { addSuspicion } from './suspicion'

describe('编年史生成', () => {
  it('三层齐全：事实全取，记载与流传各两条', () => {
    const settled = settleNode(createSim(11))
    const chronicle = settled.chronicle!
    expect(chronicle.filter((entry) => entry.layer === 'fact').length).toBeGreaterThanOrEqual(3)
    expect(chronicle.filter((entry) => entry.layer === 'record')).toHaveLength(2)
    expect(chronicle.filter((entry) => entry.layer === 'legend')).toHaveLength(2)
    // 事实层必含城破骨架
    expect(chronicle.some((entry) => entry.id === 'ct-fact-fall')).toBe(true)
  })

  it('同一终态同一随机态，编年史逐字相同', () => {
    const settled = settleNode(createSim(13))
    const again = buildChronicle({ ...settled, rngState: settled.node ? settled.rngState : settled.rngState })
    // settleNode 内部已生成 chronicle；用相同输入重跑 buildChronicle 需要相同前置 rngState。
    // 直接验证：同种子两次完整结算，编年史一致。
    const settledTwin = settleNode(createSim(13))
    expect(JSON.stringify(settledTwin.chronicle)).toBe(JSON.stringify(settled.chronicle))
    expect(again.entries.length).toBeGreaterThan(0)
  })

  it('史实对照一律以「架空推演：」开头', () => {
    const settled = settleNode(createSim(17))
    for (const entry of settled.chronicle!) {
      if (entry.divergence) expect(entry.divergence.startsWith('架空推演：')).toBe(true)
    }
  })

  it('处决局走「无名之刃」族，同样三层齐全', () => {
    const doomed = addSuspicion(createSim(19), 10, [])
    const chronicle = doomed.chronicle!
    expect(chronicle.filter((entry) => entry.layer === 'fact').length).toBeGreaterThanOrEqual(2)
    expect(chronicle.filter((entry) => entry.layer === 'record').length).toBe(2)
    expect(chronicle.filter((entry) => entry.layer === 'legend').length).toBe(2)
    expect(chronicle.some((entry) => entry.id.startsWith('ct-fact-executed'))).toBe(true)
  })
})
