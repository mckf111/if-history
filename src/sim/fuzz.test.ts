import { describe, expect, it } from 'vitest'
import { applyCommand, createSim, legalCommands } from './engine/engine'
import { validateSimState } from './engine/validate'
import type { SimState } from './types'

// 随机漫游 fuzz：测试自备 LCG（与引擎随机互不相干），从 legalCommands 均匀抽样，
// 断言：不抛非预期错、必达终局、终态过重放校验、因果账闭合。

function testRng(state: number): { state: number; value: number } {
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0
  return { state: next, value: next / 4294967296 }
}

describe('随机漫游', () => {
  it('200 个种子随机走完全程：无死局、无崩溃、重放校验通过、因果闭合', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      let state: SimState = createSim(seed * 7919)
      let dice = (seed * 104729) >>> 0 || 1
      let steps = 0
      while (state.status === 'playing' && state.phase !== 'node' && steps < 300) {
        const options = legalCommands(state)
        expect(options.length, `种子 ${seed} 在第 ${steps} 步无路可走`).toBeGreaterThan(0)
        const rolled = testRng(dice)
        dice = rolled.state
        const cmd = options[Math.floor(rolled.value * options.length)]
        state = applyCommand(state, cmd)
        steps += 1
      }
      // 必达终局：节点日，或被缉拿
      expect(
        state.phase === 'node' || state.status === 'executed',
        `种子 ${seed} 走了 ${steps} 步仍未到终局（day=${state.day} slot=${state.slot} phase=${state.phase}）`,
      ).toBe(true)

      // 终态过重放防篡改校验（先序列化往返，模拟真实存档）
      const thawed = JSON.parse(JSON.stringify(state))
      expect(validateSimState(thawed), `种子 ${seed} 的终态未通过重放校验`).toBe(true)

      // 因果账闭合：每条 causeId 都能解引用；信念档位合法
      const auditIds = new Set(state.audit.map((entry) => entry.id))
      for (const entry of state.audit) {
        for (const causeId of entry.causeIds) {
          expect(auditIds.has(causeId), `种子 ${seed}：账目 ${entry.id} 的因 ${causeId} 无处可寻`).toBe(true)
        }
        if (entry.kind === 'belief') {
          expect(entry.causeIds.length, `种子 ${seed}：信念变化 ${entry.id} 没有因果`).toBeGreaterThan(0)
        }
      }

      // 文书不变量：毁掉的不在途，在途的必有带信人
      for (const doc of Object.values(state.docs)) {
        if (doc.holder === 'destroyed') expect(doc.route).toBeUndefined()
        if (doc.route) expect(doc.holder === 'player' || doc.holder === 'destroyed').toBe(false)
      }
    }
  }, 120000)
})
