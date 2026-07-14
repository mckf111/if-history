import { describe, expect, it } from 'vitest'
import { applyCommand, createSim, legalCommands } from './engine'
import type { LeverId, PlayerCommand, SimState, VowId } from '../types'

function run(state: SimState, commands: PlayerCommand[]): SimState {
  return commands.reduce((current, command) => {
    expect(legalCommands(current)).toContainEqual(command)
    return applyCommand(current, command)
  }, state)
}

function witnessCommands(activeLevers: LeverId[], vow: VowId): PlayerCommand[] {
  const uses = (lever: LeverId) => activeLevers.includes(lever)
  return [
    { t: 'choose-vow', vow },
    { t: 'move', to: 'zhipu' },
    { t: 'collect', collectableId: 'col-paper-min' },
    { t: 'observe', observableId: 'ob-paper-stock' },
    { t: 'collect', collectableId: 'col-paper-guan' },
    { t: 'move', to: 'chengmen' },
    { t: 'observe', observableId: 'ob-xunfang' },
    { t: 'confirm-report' },

    { t: 'collect', collectableId: 'col-seal-ying' },
    { t: 'move', to: 'keji-shop' },
    { t: 'rest' },
    { t: 'rest' },
    { t: 'rest' },
    { t: 'confirm-report' },

    {
      t: 'forge', templateId: 'dt-jietie', claimIds: ['c-scapegoat-list'],
      partIds: ['col-paper-min'], effortSlots: 1,
    },
    { t: 'move', to: 'nanpeng' },
    uses('gate')
      ? { t: 'dispatch', docId: 'doc-1', courierId: 'douzi', targetNpcId: 'sun-bazong' }
      : { t: 'destroy', docId: 'doc-1' },
    { t: 'move', to: 'keji-shop' },
    {
      t: 'forge', templateId: 'dt-jietie', claimIds: ['c-audit-coming'],
      partIds: ['col-paper-min'], effortSlots: 1,
    },
    uses('roster')
      ? { t: 'dispatch', docId: 'doc-2', courierId: 'douzi', targetNpcId: 'qian-sili' }
      : { t: 'destroy', docId: 'doc-2' },
    {
      t: 'forge', templateId: 'dt-bingdie', claimIds: ['c-chun-sick'],
      partIds: ['col-seal-ying', 'col-paper-guan'], effortSlots: 1,
    },
    uses('chunsheng')
      ? { t: 'dispatch', docId: 'doc-3', courierId: 'douzi', targetNpcId: 'chunsheng' }
      : { t: 'destroy', docId: 'doc-3' },
    { t: 'rest' },
    { t: 'confirm-report' },
  ]
}

describe('合法玩家命令的结局见证', () => {
  it('七个正常结果族都有固定种子与固定合法命令见证', () => {
    const witnesses: Array<{ family: string; seed: number; levers: LeverId[]; vow: VowId }> = [
      { family: 'ce-jie', seed: 1, levers: [], vow: 'protect-neighborhood' },
      { family: 'san-xiang', seed: 9, levers: ['gate'], vow: 'protect-neighborhood' },
      { family: 'hui-ce', seed: 3, levers: ['roster'], vow: 'protect-roster' },
      { family: 'shui-dun', seed: 9, levers: ['chunsheng'], vow: 'save-chunsheng' },
      { family: 'wu-ji', seed: 16, levers: ['gate', 'roster'], vow: 'protect-roster' },
      { family: 'quan-men', seed: 16, levers: ['gate', 'chunsheng'], vow: 'protect-neighborhood' },
      { family: 'san-yin', seed: 98, levers: ['gate', 'roster', 'chunsheng'], vow: 'save-chunsheng' },
    ]
    for (const witness of witnesses) {
      const settled = run(createSim(witness.seed), witnessCommands(witness.levers, witness.vow))
      expect(settled.status).toBe('complete')
      expect(settled.node?.familyId).toBe(witness.family)
    }
  })

  it('失败结果也能由固定合法命令走到，不靠直接抬嫌疑', () => {
    const commands: PlayerCommand[] = [
      { t: 'choose-vow', vow: 'protect-roster' },
      { t: 'move', to: 'yamen' },
      { t: 'probe', npcId: 'qian-sili' },
      { t: 'probe', npcId: 'qian-sili' },
      { t: 'observe', observableId: 'ob-huopiao' },
      { t: 'collect', collectableId: 'col-blank-huopiao' },
      { t: 'confirm-report' },
      { t: 'move', to: 'chengmen' },
      { t: 'observe', observableId: 'ob-xunfang' },
      { t: 'collect', collectableId: 'col-seal-ying' },
      { t: 'probe', npcId: 'sun-bazong' },
      { t: 'probe', npcId: 'sun-bazong' },
    ]
    const executed = run(createSim(9), commands)
    expect(executed.status).toBe('executed')
    expect(executed.phase).toBe('epilogue')
    expect(executed.audit.some((entry) => entry.kind === 'arrest')).toBe(true)
  })

  it('门撬点三柱全倒后确定兑现，不被隐藏终局骰否定', () => {
    const commands: PlayerCommand[] = [
      { t: 'choose-vow', vow: 'protect-neighborhood' },
      { t: 'move', to: 'zhipu' },
      { t: 'collect', collectableId: 'col-paper-min' },
      { t: 'move', to: 'keji-shop' },
      {
        t: 'forge', templateId: 'dt-sixin', claimIds: ['c-city-falls'],
        partIds: ['col-paper-min'], effortSlots: 1,
      },
      { t: 'move', to: 'nanpeng' },
      { t: 'dispatch', docId: 'doc-1', courierId: 'douzi', targetNpcId: 'zhao-si' },
      { t: 'move', to: 'keji-shop' },
      {
        t: 'forge', templateId: 'dt-sixin', claimIds: ['c-sun-family-boat'],
        partIds: ['col-paper-min'], effortSlots: 1,
      },
      { t: 'dispatch', docId: 'doc-2', courierId: 'douzi', targetNpcId: 'wu-qiniang' },
      { t: 'move', to: 'zhipu' },
      { t: 'observe', observableId: 'ob-paper-stock' },
      { t: 'confirm-report' },
      { t: 'collect', collectableId: 'col-paper-guan' },
      { t: 'move', to: 'keji-shop' },
      { t: 'probe', npcId: 'master-he' },
      { t: 'collect', collectableId: 'col-scrap-seal' },
      { t: 'move', to: 'chengmen' },
      { t: 'observe', observableId: 'ob-xunfang' },
      { t: 'confirm-report' },
      { t: 'collect', collectableId: 'col-seal-ying' },
      { t: 'move', to: 'keji-shop' },
      {
        t: 'forge', templateId: 'dt-bingdie', claimIds: ['c-sun-family-boat'],
        partIds: ['col-seal-ying', 'col-paper-guan'], effortSlots: 1,
      },
      { t: 'dispatch', docId: 'doc-3', courierId: 'douzi', targetNpcId: 'wu-qiniang' },
      {
        t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-scapegoat-list'],
        partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 1,
      },
      { t: 'dispatch', docId: 'doc-4', courierId: 'douzi', targetNpcId: 'sun-bazong' },
      { t: 'rest' },
      { t: 'confirm-report' },
    ]
    const settled = run(createSim(44), commands)
    expect(settled.node?.pillars
      .filter((pillar) => pillar.id.startsWith('p-gate-'))
      .every((pillar) => pillar.status === 'fallen')).toBe(true)
    expect(settled.node?.levers.find((lever) => lever.lever === 'gate')).toEqual({
      lever: 'gate', chance: 100, roll: undefined, tipped: true, resolution: 'guaranteed',
    })
  })
})
