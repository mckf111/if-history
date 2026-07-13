import { describe, expect, it } from 'vitest'
import { applyBelief, beliefOf } from './belief'
import { applyCommand, createSim } from './engine'
import { runNightTick } from './propagate'
import type { PlayerCommand, SimState } from '../types'

function run(state: SimState, ...cmds: PlayerCommand[]): SimState {
  return cmds.reduce((current, cmd) => applyCommand(current, cmd), state)
}

/** LCG 首步对种子是仿射的，线性种子族会产生线性骰值带；测试用整数散列打散 */
function scramble(seed: number): number {
  let x = Math.imul(seed, 2654435761) >>> 0
  x ^= x >>> 16
  x = Math.imul(x, 0x45d9f3b) >>> 0
  x ^= x >>> 16
  return x >>> 0 || 1
}

/** 走到手里有一张针对孙把总的假火票、且赵四在场可托信 */
function armedState(seed: number): SimState {
  return run(
    createSim(scramble(seed)),
    // 三月十六：备料
    { t: 'probe', npcId: 'master-he' },
    { t: 'collect', collectableId: 'col-scrap-seal' },
    { t: 'move', to: 'zhipu' },
    { t: 'observe', observableId: 'ob-paper-stock' },
    { t: 'collect', collectableId: 'col-paper-guan' },
    { t: 'confirm-report' },
    // 三月十七：回铺开刻（两个时辰）；暮时赵四在难民棚，去那儿投书
    { t: 'move', to: 'keji-shop' },
    {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 2,
    },
    { t: 'move', to: 'nanpeng' },
  )
}

describe('夜间传播', () => {
  it('投书全链路：托信→夜里过私心→送达或改道，因果账闭合', () => {
    let sawDeliver = false
    let sawBetray = false
    for (let seed = 1; seed <= 40; seed += 1) {
      let state = armedState(seed)
      // 指名送钱司吏；但信里写的是孙把总——赵四若起私心，就会把信卖给正主
      state = applyCommand(state, { t: 'dispatch', docId: 'doc-1', courierId: 'zhao-si', targetNpcId: 'qian-sili' })
      // 烧完剩下的时辰入夜
      while (state.status === 'playing' && state.phase === 'action') {
        state = applyCommand(state, { t: 'rest' })
      }
      if (state.status !== 'playing') continue
      const doc = state.docs['doc-1']
      // 文书要么送到了某人手里，要么被昧下在带信人手里；绝不悬在途中
      expect(doc.route).toBeUndefined()
      expect(doc.holder === 'player').toBe(false)
      if (state.audit.some((entry) => entry.kind === 'betray')) {
        sawBetray = true
        expect(doc.holder).toBe('sun-bazong') // 卖给正主
      } else if (doc.holder === 'qian-sili') {
        sawDeliver = true // 照送
      }
      // 传播不变量：每次信念变化必有因果账且档位合法
      for (const entry of state.audit) {
        if (entry.kind !== 'belief') continue
        expect(entry.causeIds.length).toBeGreaterThan(0)
        expect(entry.to).toBeGreaterThanOrEqual(0)
        expect(entry.to).toBeLessThanOrEqual(3)
      }
    }
    expect(sawDeliver).toBe(true)
    expect(sawBetray).toBe(true)
  })

  it('转卖的信落在「信里说的那个人」手上', () => {
    // 赵四的私心是卖：卖给最关心内容的人。找一个转卖发生的种子验证语义。
    let verified = false
    for (let seed = 1; seed <= 60 && !verified; seed += 1) {
      let state = armedState(seed)
      // 指名送给钱司吏——但信里写的是孙把总的饷银
      state = applyCommand(state, { t: 'dispatch', docId: 'doc-1', courierId: 'zhao-si', targetNpcId: 'qian-sili' })
      while (state.status === 'playing' && state.phase === 'action') {
        state = applyCommand(state, { t: 'rest' })
      }
      if (state.status !== 'playing') continue
      const betrayed = state.audit.some((entry) => entry.kind === 'betray' && entry.actor === 'zhao-si')
      if (betrayed) {
        expect(state.docs['doc-1'].holder).toBe('sun-bazong')
        verified = true
      }
    }
    expect(verified).toBe(true)
  })

  it('流言衰减一跳：半信以上才传，接收方至多到源头减一档', () => {
    let state = createSim(7)
    // 手动把苏婆婆对「开门不杀」抬到笃信（单步至多 ±2，分两步走）
    state = applyBelief(state, 'su-popo', 'c-mercy-order', 2, [], 'night', '测试铺垫')
    state = applyBelief(state, 'su-popo', 'c-mercy-order', 1, [], 'night', '测试铺垫')
    expect(beliefOf(state, 'su-popo', 'c-mercy-order')).toBe(3)
    const after = runNightTick(state)
    // 苏婆婆的邻居：豆子、吴七娘（关系网无向）
    expect(beliefOf(after, 'douzi', 'c-mercy-order')).toBeLessThanOrEqual(2)
    expect(beliefOf(after, 'wu-qiniang', 'c-mercy-order')).toBeGreaterThan(0)
    // 传谣也记账
    const rumorEntries = after.audit.filter((entry) => entry.kind === 'belief' && entry.text.includes('传来的话'))
    expect(rumorEntries.length).toBeGreaterThan(0)
  })

  it('人物自主行动：信念过阈触发一次，绝不重复', () => {
    let state = createSim(11)
    state = applyBelief(state, 'qian-sili', 'c-audit-coming', 2, [], 'night', '测试铺垫')
    const firstNight = runNightTick(state)
    const fired = firstNight.audit.filter((entry) => entry.kind === 'npc-act' && entry.actor === 'qian-sili')
    expect(fired).toHaveLength(1)
    expect(firstNight.npcs['qian-sili'].flags).toContain('qian-burned-graft-pages')
    // 第二夜不再触发
    const secondNight = runNightTick(firstNight)
    const refired = secondNight.audit.filter((entry) => entry.kind === 'npc-act' && entry.actor === 'qian-sili')
    expect(refired).toHaveLength(1)
  })

  it('夜话推动人物行动：假饷银入耳，孙把总稳军心', () => {
    let sawChain = false
    for (let seed = 1; seed <= 40 && !sawChain; seed += 1) {
      let state = armedState(seed)
      state = applyCommand(state, { t: 'dispatch', docId: 'doc-1', courierId: 'zhao-si', targetNpcId: 'sun-bazong' })
      while (state.status === 'playing' && state.phase === 'action') {
        state = applyCommand(state, { t: 'rest' })
      }
      if (state.status !== 'playing') continue
      if (beliefOf(state, 'sun-bazong', 'c-pay-coming') >= 2) {
        const acted = state.audit.find((entry) => entry.kind === 'npc-act' && entry.actor === 'sun-bazong')
        expect(acted).toBeDefined()
        expect(state.npcs['sun-bazong'].flags).toContain('sun-holding-line')
        // 因果链能一路回溯到验看
        expect(acted!.causeIds.length).toBeGreaterThan(0)
        sawChain = true
      }
    }
    expect(sawChain).toBe(true)
  })
})
