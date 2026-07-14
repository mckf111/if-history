import { describe, expect, it } from 'vitest'
import { createSim } from './engine'
import { deriveHumanFates } from './humanFates'
import { addSuspicion } from './suspicion'
import type { AuditEntry, LeverId, NodeOutcome, SimState, VowId } from '../types'

const LEVERS: NodeOutcome['levers'] = [
  { lever: 'gate', chance: 0, roll: undefined, tipped: false, resolution: 'untouched' },
  { lever: 'roster', chance: 100, roll: undefined, tipped: true, resolution: 'guaranteed' },
  { lever: 'chunsheng', chance: 100, roll: undefined, tipped: true, resolution: 'guaranteed' },
]

function audit(
  id: string,
  kind: AuditEntry['kind'],
  text: string,
  actionId?: string,
): AuditEntry {
  return {
    id,
    day: 18,
    phase: kind === 'npc-act' ? 'night' : 'node',
    kind,
    actor: kind === 'lever' ? 'history' : 'qian-sili',
    actionId,
    causeIds: [],
    text,
    visibleToPlayer: true,
  }
}

function completed(vow: VowId | null = 'save-chunsheng'): SimState {
  const state = createSim(7)
  return {
    ...state,
    vow,
    status: 'complete',
    phase: 'node',
    node: { familyId: 'shui-dun', levers: LEVERS, pillars: [] },
    npcs: {
      ...state.npcs,
      'qian-sili': { ...state.npcs['qian-sili'], flags: ['qian-burned-graft-pages'] },
      douzi: { ...state.npcs.douzi, flags: ['douzi-printed-names'] },
      'wu-qiniang': { ...state.npcs['wu-qiniang'], flags: ['wu-ready-to-run'] },
      chunsheng: { ...state.npcs.chunsheng, flags: ['chun-tried-escape'] },
    },
    audit: [
      audit('a-qian', 'npc-act', '钱司吏烧了册页。', 'na-qian-hide'),
      audit('a-douzi', 'npc-act', '豆子印了名单。', 'na-douzi-print'),
      audit('a-boat', 'npc-act', '吴七娘把船调向水门。', 'na-wu-hide-boat'),
      audit('a-chun', 'npc-act', '春生翻营失败。', 'na-chun-brace'),
      audit('a-gate', 'lever', '三条胡同没有被撬离原路。'),
      audit('a-roster', 'lever', '完整名册已经不复存在。'),
      audit('a-chun-result', 'lever', '春生的船路已经坐实。'),
    ],
  }
}

describe('人物化终局摘要', () => {
  it('按开局誓愿把对应人物放在首位，并保持纯派生', () => {
    const state = completed('save-chunsheng')
    const before = JSON.stringify(state)
    const summary = deriveHumanFates(state)!

    expect(summary.items.map((item) => item.lever)).toEqual(['chunsheng', 'gate', 'roster'])
    expect(summary.items.map((item) => item.primary)).toEqual([true, false, false])
    expect(summary.items.map((item) => item.result)).toEqual(['changed', 'baseline', 'changed'])
    expect(JSON.stringify(state)).toBe(before)
  })

  it('只翻译既有撬点，并用人物旗标补充已经发生的具体遭际', () => {
    const summary = deriveHumanFates(completed())!
    const chunsheng = summary.items.find((item) => item.lever === 'chunsheng')!
    const roster = summary.items.find((item) => item.lever === 'roster')!

    expect(chunsheng.outcome).toContain('翻营失败、挨了二十鞭')
    expect(chunsheng.outcome).toContain('粮船已经调向水门')
    expect(chunsheng.sourceAuditIds).toEqual(['a-chun-result', 'a-chun', 'a-boat'])
    expect(roster.outcome).toContain('钱司吏烧了吃空额的册页')
    expect(roster.outcome).toContain('豆子又把半页名单印上坊墙')
    expect(roster.sourceAuditIds).toEqual(['a-roster', 'a-qian', 'a-douzi'])
    expect(summary.items.every((item) => item.outcome.startsWith('架空推演：'))).toBe(true)
  })

  it('每项都给出能回指因果账的原因文本', () => {
    const summary = deriveHumanFates(completed())!
    const gate = summary.items.find((item) => item.lever === 'gate')!
    const roster = summary.items.find((item) => item.lever === 'roster')!
    const chunsheng = summary.items.find((item) => item.lever === 'chunsheng')!

    expect(gate.reason).toContain('一根未倒')
    expect(gate.reason).toContain('未掷骰')
    expect(gate.reason).toContain('三条胡同没有被撬离原路')
    expect(gate.sourceAuditIds).toEqual(['a-gate'])
    expect(roster.reason).toContain('周全准备或已经发生的人物行动')
    expect(roster.reason).toContain('完整名册已经不复存在')
    expect(chunsheng.reason).toContain('春生的船路已经坐实')
  })

  it.each([
    [true, '不再需要靠那一句谎活命'],
    [false, '那一刀救不了她'],
  ] as const)('自抹名断言在名册结果为 %s 时得到显性回响', (tipped, expected) => {
    const state = completed()
    state.docs = {
      'doc-self-erase': {
        id: 'doc-self-erase',
        templateId: 'dt-cepage',
        claimIds: ['c-xiaoman-not-listed'],
        authentic: false,
        grade: 1,
        parts: {},
        holder: 'destroyed',
        exposed: false,
        createdDay: 17,
      },
    }
    state.audit = [
      ...state.audit,
      {
        id: 'a-self-erase', day: 17, phase: 'action', kind: 'forge', actor: 'player',
        docId: 'doc-self-erase', causeIds: [], text: '姚小满把自己从一页假册上抹掉。', visibleToPlayer: true,
      },
    ]
    state.node = {
      ...state.node!,
      levers: state.node!.levers.map((lever) => lever.lever === 'roster' ? { ...lever, tipped } : lever),
    }

    const roster = deriveHumanFates(state)!.items.find((item) => item.lever === 'roster')!
    expect(roster.outcome).toContain(expected)
    expect(roster.sourceAuditIds).toContain('a-self-erase')
  })

  it('机率结算的人物原因保留胜算、骰值与结果', () => {
    const state = completed()
    state.node = {
      ...state.node!,
      levers: state.node!.levers.map((lever) => lever.lever === 'gate'
        ? { ...lever, chance: 45, roll: 62, resolution: 'chance' as const }
        : lever),
    }

    const gate = deriveHumanFates(state)!.items.find((item) => item.lever === 'gate')!
    expect(gate.reason).toContain('胜算 45% · 骰值 62')
    expect(gate.reason).toContain('结果仍回到原路')
  })

  it.each<[VowId, LeverId]>([
    ['save-chunsheng', 'chunsheng'],
    ['protect-roster', 'roster'],
    ['protect-neighborhood', 'gate'],
  ])('誓愿 %s 对应 %s 为首项', (vow, lever) => {
    expect(deriveHumanFates(completed(vow))?.items[0]).toMatchObject({ lever, primary: true })
  })

  it('处决局明确写成未结算，不替玩家编造三项结果', () => {
    const doomed = addSuspicion({ ...createSim(19), vow: 'protect-roster' }, 10, [])
    const arrest = doomed.audit.find((entry) => entry.kind === 'arrest')!
    const summary = deriveHumanFates(doomed)!

    expect(summary.heading).toContain('姚小满')
    expect(summary.intro).toContain('不替未结算状态编造结果')
    expect(summary.items.map((item) => item.lever)).toEqual(['roster', 'gate', 'chunsheng'])
    expect(summary.items.every((item) => item.result === 'unresolved')).toBe(true)
    expect(summary.items.every((item) => item.outcome.includes('本局没有结算'))).toBe(true)
    expect(summary.items.every((item) => item.reason.includes(arrest.text))).toBe(true)
    expect(summary.items.every((item) => item.sourceAuditIds.includes(arrest.id))).toBe(true)
  })

  it('游玩中或缺少节点结算时不生成终局摘要', () => {
    expect(deriveHumanFates(createSim(1))).toBeNull()
    expect(deriveHumanFates({ ...createSim(1), status: 'complete' })).toBeNull()
  })
})
