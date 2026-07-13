import { describe, expect, it } from 'vitest'
import { CLAIMS, LOCATIONS, NPCS, SIM_SOURCES_BY_ID } from './content'
import { validateContent } from './engine/validate'

describe('内容完整性', () => {
  it('内容 linter 全部通过', () => {
    expect(validateContent()).toEqual([])
  })

  it('M1 内容规模符合纵切规格', () => {
    expect(NPCS.length).toBeGreaterThanOrEqual(4)
    expect(LOCATIONS.length).toBe(6)
    expect(CLAIMS.length).toBeGreaterThanOrEqual(15)
  })

  it('架空来源特例存在，且不伪造史源', () => {
    const counterfactual = SIM_SOURCES_BY_ID['counterfactual']
    expect(counterfactual).toBeDefined()
    expect(counterfactual.url).toBe('#historical-boundary')
  })

  it('每个人物的欲望与恐惧都机制承重（各挂至少一条断言）', () => {
    for (const npc of NPCS) {
      expect(npc.desireClaimIds.length, `${npc.id} 的欲望没有挂断言`).toBeGreaterThan(0)
      expect(npc.fearClaimIds.length, `${npc.id} 的恐惧没有挂断言`).toBeGreaterThan(0)
    }
  })
})
