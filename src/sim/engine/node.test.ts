import { describe, expect, it } from 'vitest'
import { applyBelief } from './belief'
import { applyCommand, createSim } from './engine'
import { derivePillars, leverChance, settleNode } from './node'
import { mergeCodexFromRun } from './codex'
import { runNightTick } from './propagate'
import type { LeverId, SimState } from '../types'

/** 测试铺垫：把某人对某断言直接抬到指定档位（单步±2，分步走） */
function lift(state: SimState, npcId: string, claimId: string, target: 1 | 2 | 3): SimState {
  let working = state
  for (let guard = 0; guard < 4; guard += 1) {
    const current = working.npcs[npcId]?.beliefs[claimId] ?? 0
    if (current >= target) break
    working = applyBelief(working, npcId, claimId, Math.min(2, target - current), [], 'night', '测试铺垫')
  }
  return working
}

/** 把三个撬点的柱全部撬倒（胜率顶到 90） */
function fellAllPillars(state: SimState): SimState {
  let working = state
  working = lift(working, 'sun-bazong', 'c-city-falls', 2)
  working = lift(working, 'wu-qiniang', 'c-sun-family-boat', 2)
  working = lift(working, 'sun-bazong', 'c-scapegoat-list', 2)
  working = lift(working, 'qian-sili', 'c-roster-burn-order', 2)
  working = lift(working, 'qian-sili', 'c-audit-coming', 2)
  working = lift(working, 'douzi', 'c-roster-copied', 2)
  working = lift(working, 'sun-bazong', 'c-chun-sick', 2)
  working = lift(working, 'wu-qiniang', 'c-boat-hire', 2)
  working = lift(working, 'chunsheng', 'c-chun-sick', 2)
  return working
}

function fellLeverPillars(state: SimState, levers: LeverId[]): SimState {
  let working = state
  if (levers.includes('gate')) {
    working = lift(working, 'sun-bazong', 'c-city-falls', 2)
    working = lift(working, 'wu-qiniang', 'c-sun-family-boat', 2)
    working = lift(working, 'sun-bazong', 'c-scapegoat-list', 2)
  }
  if (levers.includes('roster')) {
    working = lift(working, 'qian-sili', 'c-roster-burn-order', 2)
    working = lift(working, 'qian-sili', 'c-audit-coming', 2)
    working = lift(working, 'douzi', 'c-roster-copied', 2)
  }
  if (levers.includes('chunsheng')) {
    working = lift(working, 'sun-bazong', 'c-chun-sick', 2)
    working = lift(working, 'wu-qiniang', 'c-boat-hire', 2)
    working = lift(working, 'chunsheng', 'c-chun-sick', 2)
  }
  return working
}

describe('节点日结算', () => {
  it('支撑柱确定性推导：信念区间决定立倒', () => {
    const fresh = createSim(1)
    const pillars = derivePillars(fresh)
    // 开局全部立着（孙把总 c-city-falls 初始 1，仍在 max:1 区间内）
    expect(pillars.every((pillar) => pillar.status === 'standing')).toBe(true)
    const shaken = lift(fresh, 'sun-bazong', 'c-city-falls', 2)
    const after = derivePillars(shaken)
    expect(after.find((pillar) => pillar.id === 'p-gate-blind')?.status).toBe('fallen')
  })

  it('未碰过的撬点胜算为 0；倒柱后才按 10 + 权重结算', () => {
    const fresh = createSim(2)
    expect(leverChance(derivePillars(fresh), 'gate')).toBe(0)
    const all = fellAllPillars(fresh)
    expect(leverChance(derivePillars(all), 'gate')).toBe(90) // 25+35+30=90，加底数后被夹
    expect(leverChance(derivePillars(all), 'chunsheng')).toBe(90)
  })

  it('七个正常结果族全部可达；只有概率结算才开骰', () => {
    const seen = new Set<string>()
    const preparations: LeverId[][] = [
      [], ['gate'], ['roster'], ['chunsheng'],
      ['gate', 'roster'], ['gate', 'chunsheng'], ['roster', 'chunsheng'],
      ['gate', 'roster', 'chunsheng'],
    ]
    for (const levers of preparations) {
      for (let seed = 1; seed <= 180; seed += 1) {
        const scrambled = ((seed * 2654435761) >>> 0) || 1
        const settled = settleNode(fellLeverPillars(createSim(scrambled), levers))
        expect(settled.status).toBe('complete')
        for (const lever of settled.node!.levers) {
          if (lever.resolution === 'chance') {
            expect(lever.roll).toBeGreaterThanOrEqual(1)
            expect(lever.roll).toBeLessThanOrEqual(100)
          } else {
            expect(lever.roll).toBeUndefined()
          }
        }
        seen.add(settled.node!.familyId)
      }
    }
    expect([...seen].sort()).toEqual(['ce-jie', 'hui-ce', 'quan-men', 'san-xiang', 'san-yin', 'shui-dun', 'wu-ji'])
  })

  it('结果族级联按三撬点组合给出对应结局', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const settled = settleNode(fellAllPillars(createSim(((seed * 7919) >>> 0) || 1)))
      const tipped = Object.fromEntries(settled.node!.levers.map((lever) => [lever.lever, lever.tipped]))
      const family = settled.node!.familyId
      if (tipped.gate && tipped.roster && tipped.chunsheng) expect(family).toBe('san-yin')
      else if (tipped.gate && tipped.chunsheng) expect(family).toBe('quan-men')
      else if (tipped.chunsheng) expect(family).toBe('shui-dun')
      else if (tipped.gate && tipped.roster) expect(family).toBe('wu-ji')
      else if (tipped.roster) expect(family).toBe('hui-ce')
      else if (tipped.gate) expect(family).toBe('san-xiang')
      else expect(family).toBe('ce-jie')
    }
  })

  it('零行动不会生成玩家促成的成功，也不消耗撬点骰', () => {
    let state = createSim(1972)
    for (let day = 16; day <= 18; day += 1) {
      for (let slot = 0; slot < 4; slot += 1) state = applyCommand(state, { t: 'rest' })
      state = applyCommand(state, { t: 'confirm-report' })
    }
    expect(state.node?.levers.every((lever) => !lever.tipped && lever.chance === 0 && lever.roll === undefined)).toBe(true)
    const leverAudits = state.audit.filter((entry) => entry.kind === 'lever')
    expect(leverAudits.every((entry) => entry.actor === 'history' && entry.roll === undefined)).toBe(true)
  })

  it('已经烧掉的册页直接保证册撬点，终局骰不能否认', () => {
    let state = createSim(3)
    state = lift(state, 'qian-sili', 'c-audit-coming', 2)
    state = runNightTick(state)
    expect(state.npcs['qian-sili'].flags).toContain('qian-burned-graft-pages')
    const settled = settleNode(state)
    const roster = settled.node?.levers.find((lever) => lever.lever === 'roster')
    expect(roster).toMatchObject({ tipped: true, chance: 100, resolution: 'guaranteed' })
    expect(roster?.roll).toBeUndefined()
  })

  it('史鉴合并：去重、点亮、档案累积', () => {
    const settled = settleNode(fellAllPillars(createSim(97)))
    const empty = { version: 2 as const, litLinks: [], chronicles: [], dossiers: {} }
    const once = mergeCodexFromRun(empty, settled, '2026-07-13')
    expect(once.chronicles).toHaveLength(1)
    expect(once.litLinks.some((link) => link.startsWith('lever:'))).toBe(true)
    // 同一局再合并一次：不重复收录
    const twice = mergeCodexFromRun(once, settled, '2026-07-14')
    expect(twice.chronicles).toHaveLength(1)
  })
})
