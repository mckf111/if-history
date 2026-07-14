import { describe, expect, it } from 'vitest'
import { CLAIMS_BY_ID } from '../content'
import { documentBodyLines } from './DocScroll'

describe('文书正文语体', () => {
  it('同一句断言落在不同型制里不会逐字相同', () => {
    const templateIds = ['dt-huopiao', 'dt-sitie', 'dt-cepage', 'dt-bingdie', 'dt-sixin', 'dt-jietie']
    const bodies = templateIds.map((templateId) => documentBodyLines({
      templateId,
      claimIds: ['c-pay-coming'],
    }).join(''))

    expect(new Set(bodies).size).toBe(templateIds.length)
    expect(bodies[0]).toContain('奉兵马司票谕')
    expect(bodies[4]).toContain('只说与你')
    expect(bodies[5]).toContain('告诸坊众')
    expect(bodies.every((body) => body.includes(CLAIMS_BY_ID['c-pay-coming'].text))).toBe(true)
  })
})
