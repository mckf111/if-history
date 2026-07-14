import { describe, expect, it } from 'vitest'
import { COLLECTABLES_BY_ID } from '../content'
import type { LeverId, PlayerCommand, SimState, VowId } from '../types'
import { applyCommand, createSim, legalCommands } from './engine'

function createWithSilver(seed: number, silver: number): SimState {
  const state = createSim(seed)
  return { ...state, inventory: { ...state.inventory, silver } }
}

function runLegal(state: SimState, commands: PlayerCommand[]): SimState {
  return commands.reduce((current, command) => {
    expect(legalCommands(current)).toContainEqual(command)
    return applyCommand(current, command)
  }, state)
}

function finishWithRest(state: SimState): SimState {
  let working = state
  for (let guard = 0; guard < 20 && working.status === 'playing'; guard += 1) {
    const command: PlayerCommand = working.phase === 'night-report' ? { t: 'confirm-report' } : { t: 'rest' }
    working = runLegal(working, [command])
  }
  return working
}

function paperMinPrep(vow: VowId): PlayerCommand[] {
  return [
    { t: 'choose-vow', vow },
    { t: 'move', to: 'zhipu' },
    { t: 'collect', collectableId: 'col-paper-min' },
    { t: 'rest' }, { t: 'rest' }, { t: 'rest' },
    { t: 'confirm-report' },
    { t: 'move', to: 'keji-shop' },
  ]
}

function oneOrderRoute(vow: VowId, claimId: string, targetNpcId: string): PlayerCommand[] {
  return [
    ...paperMinPrep(vow),
    {
      t: 'forge', templateId: 'dt-jietie', claimIds: [claimId],
      partIds: ['col-paper-min'], effortSlots: 1,
    },
    { t: 'dispatch', docId: 'doc-1', courierId: 'douzi', targetNpcId },
  ]
}

function twoLogisticsRoutes(vow: VowId, claimId: string, targetNpcId: string): PlayerCommand[] {
  return [
    ...paperMinPrep(vow),
    {
      t: 'forge', templateId: 'dt-sixin', claimIds: [claimId],
      partIds: ['col-paper-min'], effortSlots: 1,
    },
    { t: 'dispatch', docId: 'doc-1', courierId: 'douzi', targetNpcId },
    {
      t: 'forge', templateId: 'dt-sixin', claimIds: [claimId],
      partIds: ['col-paper-min'], effortSlots: 1,
    },
    { t: 'move', to: 'nanpeng' },
    { t: 'dispatch', docId: 'doc-2', courierId: 'douzi', targetNpcId },
  ]
}

function copiedRosterRoute(): PlayerCommand[] {
  return [
    ...paperMinPrep('protect-roster'),
    {
      t: 'forge', templateId: 'dt-sixin', claimIds: ['c-roster-copied'],
      partIds: ['col-paper-min'], effortSlots: 1,
    },
    { t: 'move', to: 'yamen' },
    { t: 'dispatch', docId: 'doc-1', courierId: 'zhao-si', targetNpcId: 'douzi' },
    { t: 'move', to: 'keji-shop' },
    {
      t: 'forge', templateId: 'dt-sixin', claimIds: ['c-roster-copied'],
      partIds: ['col-paper-min'], effortSlots: 1,
    },
    { t: 'move', to: 'nanpeng' },
    { t: 'dispatch', docId: 'doc-2', courierId: 'zhao-si', targetNpcId: 'douzi' },
  ]
}

function sicknessRoute(): PlayerCommand[] {
  return [
    { t: 'choose-vow', vow: 'save-chunsheng' },
    { t: 'move', to: 'zhipu' },
    { t: 'observe', observableId: 'ob-paper-stock' },
    { t: 'collect', collectableId: 'col-paper-guan' },
    { t: 'move', to: 'chengmen' },
    { t: 'observe', observableId: 'ob-xunfang' },
    { t: 'collect', collectableId: 'col-seal-ying' },
    { t: 'confirm-report' },
    { t: 'move', to: 'keji-shop' },
    {
      t: 'forge', templateId: 'dt-bingdie', claimIds: ['c-chun-sick'],
      partIds: ['col-seal-ying', 'col-paper-guan'], effortSlots: 1,
    },
    { t: 'dispatch', docId: 'doc-1', courierId: 'douzi', targetNpcId: 'chunsheng' },
  ]
}

describe('起始银两', () => {
  it('三两买不起全部安全材料，但可用违禁营戳换银钱', () => {
    expect(createSim(1).inventory.silver).toBe(3)
    expect(Object.values(COLLECTABLES_BY_ID)
      .reduce((total, collectable) => total + collectable.costSilver, 0)).toBe(4)

    const riskyPrep: PlayerCommand[] = [
      { t: 'move', to: 'zhipu' },
      { t: 'collect', collectableId: 'col-paper-min' },
      { t: 'observe', observableId: 'ob-paper-stock' },
      { t: 'collect', collectableId: 'col-paper-guan' },
      { t: 'move', to: 'chengmen' },
      { t: 'observe', observableId: 'ob-xunfang' },
      { t: 'confirm-report' },
      { t: 'collect', collectableId: 'col-seal-ying' },
    ]
    const risky = runLegal(createSim(1), riskyPrep)
    expect(risky.inventory.silver).toBe(0)
    expect(risky.suspicion).toBe(3)
    expect(risky.inventory.parts.some((part) => part.id === 'col-seal-ying' && part.contraband)).toBe(true)

    const safePrep: PlayerCommand[] = [
      { t: 'move', to: 'zhipu' },
      { t: 'collect', collectableId: 'col-paper-min' },
      { t: 'observe', observableId: 'ob-paper-stock' },
      { t: 'collect', collectableId: 'col-paper-guan' },
      { t: 'observe', observableId: 'ob-qian-receipt' },
      { t: 'confirm-report' },
    ]
    const tight = runLegal(createWithSilver(1, 3), safePrep)
    expect(legalCommands(tight)).not.toContainEqual({ t: 'collect', collectableId: 'col-hand-qian' })
    const safe = runLegal(createWithSilver(1, 4), [...safePrep, { t: 'collect', collectableId: 'col-hand-qian' }])
    expect(safe.suspicion).toBe(1)
    expect(safe.inventory.parts.some((part) => part.contraband)).toBe(false)
  })

  it('3、4、5 两时三种誓愿各保留两条原理不同的合法路线', () => {
    const routes: Array<{ name: string; lever: LeverId; seed: number; commands: PlayerCommand[] }> = [
      { name: '门-问罪名单', lever: 'gate', seed: 9, commands: oneOrderRoute('protect-neighborhood', 'c-scapegoat-list', 'sun-bazong') },
      { name: '门-家眷船路', lever: 'gate', seed: 16, commands: twoLogisticsRoutes('protect-neighborhood', 'c-sun-family-boat', 'wu-qiniang') },
      { name: '册-查账恐惧', lever: 'roster', seed: 3, commands: oneOrderRoute('protect-roster', 'c-audit-coming', 'qian-sili') },
      { name: '册-坊间抄页', lever: 'roster', seed: 425, commands: copiedRosterRoute() },
      { name: '人-病牒出营', lever: 'chunsheng', seed: 9, commands: sicknessRoute() },
      { name: '人-粮船名目', lever: 'chunsheng', seed: 16, commands: twoLogisticsRoutes('save-chunsheng', 'c-boat-hire', 'wu-qiniang') },
    ]
    for (const silver of [3, 4, 5]) {
      for (const route of routes) {
        const settled = finishWithRest(runLegal(createWithSilver(route.seed, silver), route.commands))
        expect(settled.node?.levers.find((lever) => lever.lever === route.lever)?.tipped, route.name).toBe(true)
      }
    }
  })
})
