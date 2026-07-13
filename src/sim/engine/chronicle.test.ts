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
    const fall = chronicle.find((entry) => entry.id === 'ct-fact-fall')
    expect(fall?.text).toContain('十八日日晡')
    expect(fall?.sourceId).toBe('mingshi-benji')
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

  it('处决事实从真实日期、地点和当前证据派生，不写死阁楼与罪名', () => {
    const doomed = addSuspicion({ ...createSim(29), day: 18, playerLocation: 'dukou' }, 10, [])
    const facts = doomed.chronicle!.filter((entry) => entry.layer === 'fact').map((entry) => entry.text).join('\n')
    expect(facts).toContain('三月十八')
    expect(facts).toContain('东便门渡口')
    expect(facts).toContain('次日内城陷落')
    expect(facts).not.toContain('三月十七')
    expect(facts).not.toContain('踹开阁楼')
  })
})
