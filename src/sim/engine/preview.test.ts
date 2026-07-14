import { describe, expect, it } from 'vitest'
import { applyCommand, createSim, previewCommand } from './engine'
import type { PlayerCommand, SimState } from '../types'

function run(state: SimState, ...commands: PlayerCommand[]): SimState {
  return commands.reduce((current, command) => applyCommand(current, command), state)
}

const PREP_HUOPIAO: PlayerCommand[] = [
  { t: 'probe', npcId: 'master-he' },
  { t: 'collect', collectableId: 'col-scrap-seal' },
  { t: 'move', to: 'zhipu' },
  { t: 'observe', observableId: 'ob-paper-stock' },
  { t: 'collect', collectableId: 'col-paper-guan' },
  { t: 'confirm-report' },
  { t: 'move', to: 'keji-shop' },
]

describe('行动预览', () => {
  it('为观察和采集显示已有规则中的时辰与银钱成本', () => {
    let state = createSim(1644)
    const observe = { t: 'observe', observableId: 'ob-worktable' } as const
    expect(previewCommand(state, observe)?.cost).toEqual({ slots: 1, silver: 0 })

    state = run(state, { t: 'move', to: 'zhipu' }, { t: 'observe', observableId: 'ob-paper-stock' })
    const collect = { t: 'collect', collectableId: 'col-paper-guan' } as const
    expect(previewCommand(state, collect)?.cost).toEqual({ slots: 1, silver: 2 })
  })

  it('制书预览复用实际成色规则，但不改变状态或随机种子', () => {
    const state = run(createSim(1644), ...PREP_HUOPIAO)
    const command = {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      // 部件排列不影响实际规则，也不应让合法命令失去预览。
      partIds: ['col-paper-guan', 'col-scrap-seal'], effortSlots: 2,
    } as const satisfies PlayerCommand
    const before = JSON.stringify(state)

    const preview = previewCommand(state, command)

    expect(preview?.cost).toEqual({ slots: 2, silver: 0 })
    expect(preview?.factors).toContainEqual({
      kind: 'quality', tone: 'positive', text: '预计文书成色为「精」品；成色越高，越难被识破。',
    })
    expect(JSON.stringify(state)).toBe(before)
  })

  it('没探过带信人与收信人时，预览不泄露他们的暗属性', () => {
    const ready = run(createSim(1644), ...PREP_HUOPIAO)
    let state = applyCommand(ready, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 2,
    })
    state = applyCommand(state, { t: 'move', to: 'nanpeng' })
    const command = { t: 'dispatch', docId: 'doc-1', courierId: 'zhao-si', targetNpcId: 'sun-bazong' } as const
    const rngBefore = state.rngState

    const preview = previewCommand(state, command)
    const text = preview?.factors.map((factor) => factor.text).join(' ') ?? ''

    expect(preview?.cost).toEqual({ slots: 0, silver: 0 })
    expect(text).toContain('私心尚未摸清')
    expect(text).toContain('验看习惯和心事尚未摸清')
    expect(text).toContain('先去探他，才看得清验看风险')
    expect(text).not.toContain('重利')
    expect(text).not.toContain('验看风险较低')
    expect(text).not.toMatch(/\d+%|chance|roll/i)
    expect(state.rngState).toBe(rngBefore)
  })

  it('探得底细后，投书才显示定性验看风险和带信人私心', () => {
    const ready = run(createSim(1644), ...PREP_HUOPIAO)
    let state = applyCommand(ready, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 2,
    })
    state = applyCommand(state, { t: 'move', to: 'nanpeng' })
    state = {
      ...state,
      knowledge: {
        ...state.knowledge,
        knownSecrets: {
          ...state.knowledge.knownSecrets,
          'zhao-si': ['zhao-paizi'],
          'sun-bazong': ['sun-boat-ask'],
        },
      },
    }
    const command = { t: 'dispatch', docId: 'doc-1', courierId: 'zhao-si', targetNpcId: 'sun-bazong' } as const
    const rngBefore = state.rngState

    const preview = previewCommand(state, command)
    const text = preview?.factors.map((factor) => factor.text).join(' ') ?? ''

    expect(text).toContain('重利')
    expect(text).toContain('验看风险较低')
    expect(text).not.toMatch(/\d+%|chance|roll/i)
    expect(state.rngState).toBe(rngBefore)
  })

  it('此刻不可执行的命令不生成预览', () => {
    const state = createSim(1644)
    expect(previewCommand(state, { t: 'move', to: 'keji-shop' })).toBeNull()
    expect(previewCommand(state, { t: 'confirm-report' })).toBeNull()
  })
})
