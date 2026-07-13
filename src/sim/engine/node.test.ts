import { describe, expect, it } from 'vitest'
import { applyBelief } from './belief'
import { applyCommand, createSim } from './engine'
import { derivePillars, leverChance, settleNode } from './node'
import { mergeCodexFromRun } from './codex'
import type { SimState } from '../types'

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

  it('胜算 = 10 + 倒柱权重之和，夹在 10-90', () => {
    const fresh = createSim(2)
    expect(leverChance(derivePillars(fresh), 'gate')).toBe(10)
    const all = fellAllPillars(fresh)
    expect(leverChance(derivePillars(all), 'gate')).toBe(90) // 25+35+30=90，加底数后被夹
    expect(leverChance(derivePillars(all), 'chunsheng')).toBe(90)
  })

  it('四个结果族全部可达，且开骰入账', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 80 && seen.size < 4; seed += 1) {
      const scrambled = ((seed * 2654435761) >>> 0) || 1
      // 一半种子全撬（利于全门之约/水遁），一半不撬（利于册劫/乱夜）
      const base = createSim(scrambled)
      const prepared = seed % 2 === 0 ? fellAllPillars(base) : base
      const settled = settleNode(prepared)
      expect(settled.status).toBe('complete')
      expect(settled.node?.levers).toHaveLength(3)
      for (const lever of settled.node!.levers) {
        expect(lever.chance).toBeGreaterThanOrEqual(10)
        expect(lever.chance).toBeLessThanOrEqual(90)
        expect(lever.roll).toBeGreaterThanOrEqual(1)
        expect(lever.roll).toBeLessThanOrEqual(100)
      }
      // 开骰传统：lever 账目公开 chance/roll
      const leverAudits = settled.audit.filter((entry) => entry.kind === 'lever')
      expect(leverAudits).toHaveLength(3)
      expect(leverAudits.every((entry) => entry.chance !== undefined && entry.roll !== undefined)).toBe(true)
      seen.add(settled.node!.familyId)
    }
    expect([...seen].sort()).toEqual(['ce-jie', 'luan-ye', 'quan-men', 'shui-dun'])
  })

  it('结果族级联讲优先级：门与人齐撬是全门之约，只救人是水遁', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const settled = settleNode(fellAllPillars(createSim(((seed * 7919) >>> 0) || 1)))
      const tipped = Object.fromEntries(settled.node!.levers.map((lever) => [lever.lever, lever.tipped]))
      const family = settled.node!.familyId
      if (tipped.gate && tipped.chunsheng) expect(family).toBe('quan-men')
      else if (tipped.chunsheng) expect(family).toBe('shui-dun')
      else if (!tipped.gate && !tipped.roster) expect(family).toBe('ce-jie')
      else expect(family).toBe('luan-ye')
    }
  })

  it('史鉴合并：去重、点亮、档案累积', () => {
    const settled = settleNode(fellAllPillars(createSim(97)))
    const empty = { version: 1 as const, litLinks: [], chronicles: [], dossiers: {} }
    const once = mergeCodexFromRun(empty, settled, '2026-07-13')
    expect(once.chronicles).toHaveLength(1)
    expect(once.litLinks.some((link) => link.startsWith('lever:'))).toBe(true)
    // 同一局再合并一次：不重复收录
    const twice = mergeCodexFromRun(once, settled, '2026-07-14')
    expect(twice.chronicles).toHaveLength(1)
  })
})
