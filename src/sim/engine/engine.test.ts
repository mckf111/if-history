import { describe, expect, it } from 'vitest'
import { applyCommand, createSim, legalCommands } from './engine'
import { replay, validateSimState } from './validate'
import type { PlayerCommand, SimState } from '../types'

function run(state: SimState, ...cmds: PlayerCommand[]): SimState {
  return cmds.reduce((current, cmd) => applyCommand(current, cmd), state)
}

/** 一条会走完三天的固定命令序列（观察/探查/采集/休整混合） */
const FULL_WALK: PlayerCommand[] = [
  // 三月十六：铺子里探东家、看现场，去纸铺备料
  { t: 'probe', npcId: 'master-he' },
  { t: 'observe', observableId: 'ob-worktable' },
  { t: 'collect', collectableId: 'col-scrap-seal' },
  { t: 'move', to: 'zhipu' },
  { t: 'observe', observableId: 'ob-paper-stock' },
  { t: 'confirm-report' },
  // 三月十七：夜宿纸铺附近，一早买纸、看货单、抽花押，回铺歇脚
  { t: 'collect', collectableId: 'col-paper-guan' },
  { t: 'observe', observableId: 'ob-qian-receipt' },
  { t: 'collect', collectableId: 'col-hand-qian' },
  { t: 'move', to: 'keji-shop' },
  { t: 'rest' },
  { t: 'confirm-report' },
  // 三月十八：门口看看，剩下的时辰躲风头
  { t: 'move', to: 'chengmen' },
  { t: 'observe', observableId: 'ob-pay-notice' },
  { t: 'observe', observableId: 'ob-gate-bar' },
  { t: 'move', to: 'keji-shop' },
  { t: 'rest' },
  { t: 'rest' },
  { t: 'confirm-report' },
]

describe('模拟核心', () => {
  it('三天十二时段走完抵达节点日并完成结算', () => {
    const state = run(createSim(1644), ...FULL_WALK)
    expect(state.day).toBe(18)
    expect(state.phase).toBe('node')
    expect(state.status).toBe('complete')
    expect(state.node).toBeDefined()
    expect(state.chronicle?.length).toBeGreaterThan(0)
    // 三夜时局各入账一条
    const ambient = state.audit.filter((entry) => entry.kind === 'ambient')
    expect(ambient.map((entry) => entry.day)).toEqual([16, 17, 18])
  })

  it('同种子同命令序列产生完全相同的历史', () => {
    const first = run(createSim(20260713), ...FULL_WALK)
    const second = run(createSim(20260713), ...FULL_WALK)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('存档序列化往返后继续推进，结果不变', () => {
    const half = run(createSim(7), ...FULL_WALK.slice(0, 6))
    const thawed = JSON.parse(JSON.stringify(half)) as SimState
    const a = run(half, ...FULL_WALK.slice(6))
    const b = run(thawed, ...FULL_WALK.slice(6))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('结算不修改输入状态', () => {
    const state = createSim(99)
    const snapshot = JSON.stringify(state)
    applyCommand(state, { t: 'probe', npcId: 'master-he' })
    expect(JSON.stringify(state)).toBe(snapshot)
  })

  it('观察与探查产生知识：底细、观察记录、信念快照', () => {
    const state = run(
      createSim(3),
      { t: 'probe', npcId: 'master-he' },
      { t: 'observe', observableId: 'ob-he-ledger' },
    )
    expect(state.knowledge.knownSecrets['master-he']).toEqual(['he-scrap-seal'])
    expect(state.knowledge.seenObservables).toContain('ob-he-ledger')
    // 何师傅半信城要破，探查时应留下信念快照
    expect(state.knowledge.beliefSightings.some(
      (sighting) => sighting.npcId === 'master-he' && sighting.claimId === 'c-city-falls',
    )).toBe(true)
  })

  it('采集讲前置：不知道底细就下不了手', () => {
    const fresh = createSim(5)
    expect(() => applyCommand(fresh, { t: 'collect', collectableId: 'col-scrap-seal' }))
      .toThrow('你还不知道这样东西在哪里。')
    const probed = run(fresh, { t: 'probe', npcId: 'master-he' })
    const collected = applyCommand(probed, { t: 'collect', collectableId: 'col-scrap-seal' })
    expect(collected.inventory.parts.map((part) => part.id)).toEqual(['col-scrap-seal'])
    expect(collected.inventory.parts[0].contraband).toBe(true)
  })

  it('非法命令一律拒绝', () => {
    const state = createSim(11)
    expect(() => applyCommand(state, { t: 'move', to: 'keji-shop' })).toThrow('你已在此处。')
    expect(() => applyCommand(state, { t: 'move', to: 'no-such-place' })).toThrow('规则外命令已拒绝。')
    expect(() => applyCommand(state, { t: 'observe', observableId: 'ob-paper-stock' })).toThrow('这件东西不在这里。')
    expect(() => applyCommand(state, { t: 'probe', npcId: 'qian-sili' })).toThrow('这个人此刻不在这里。')
    expect(() => applyCommand(state, { t: 'confirm-report' })).toThrow('此刻做不了这件事。')
    // 四个时段花完自动入夜，白天动词全部封死
    const nightfall = run(state, { t: 'rest' }, { t: 'rest' }, { t: 'rest' }, { t: 'rest' })
    expect(nightfall.phase).toBe('night-report')
    expect(() => applyCommand(nightfall, { t: 'rest' })).toThrow('此刻做不了这件事。')
  })

  it('规则外命令在执行与重放前都被严格拒绝', () => {
    const state = createSim(11)
    const malformed: unknown[] = [
      { t: 'move', to: 'toString' },
      { t: 'rest', extra: true },
      {
        t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
        partIds: ['col-scrap-seal'], effortSlots: -100,
      },
      {
        t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming', 'c-pay-coming'],
        partIds: ['col-scrap-seal'], effortSlots: 1,
      },
    ]
    for (const command of malformed) {
      expect(() => applyCommand(state, command as PlayerCommand)).toThrow('规则外命令已拒绝。')
      const forgedState = { ...state, commands: [command] }
      expect(validateSimState(forgedState)).toBe(false)
    }
  })

  it('免费移动达到保护阈值后仍可用耗时动作推进，不形成死档', () => {
    let state = createSim(23)
    for (let index = 0; index < 400; index += 1) {
      state = applyCommand(state, { t: 'move', to: index % 2 === 0 ? 'zhipu' : 'keji-shop' })
    }
    expect(legalCommands(state).some((command) => command.t === 'move')).toBe(false)
    expect(legalCommands(state).some((command) => command.t === 'rest')).toBe(true)
    expect(() => applyCommand(state, { t: 'rest' })).not.toThrow()
  })

  it('legalCommands 列出的每条命令都真的能执行', () => {
    let state = createSim(42)
    for (let step = 0; step < 40 && state.status === 'playing' && state.phase !== 'node'; step += 1) {
      const options = legalCommands(state)
      expect(options.length).toBeGreaterThan(0)
      // 挑最后一条执行（耗时动作靠后），保证枚举与校验一致且必然走到终局
      state = applyCommand(state, options[options.length - 1])
    }
    expect(state.phase).toBe('node')
  })

  it('重放校验接受真档、拒绝篡改档', () => {
    const genuine = run(createSim(1644), ...FULL_WALK.slice(0, 12))
    expect(validateSimState(JSON.parse(JSON.stringify(genuine)))).toBe(true)

    const bumpSilver = JSON.parse(JSON.stringify(genuine)) as SimState
    bumpSilver.inventory.silver = 999
    expect(validateSimState(bumpSilver)).toBe(false)

    const heatUp = JSON.parse(JSON.stringify(genuine)) as SimState
    heatUp.suspicion = 5
    expect(validateSimState(heatUp)).toBe(false)

    const fakeBelief = JSON.parse(JSON.stringify(genuine)) as SimState
    fakeBelief.npcs['sun-bazong'].beliefs['c-scapegoat-list'] = 3
    expect(validateSimState(fakeBelief)).toBe(false)

    const extraCommand = JSON.parse(JSON.stringify(genuine)) as SimState
    extraCommand.commands.push({ t: 'rest' })
    expect(validateSimState(extraCommand)).toBe(false)

    const wrongVersion = JSON.parse(JSON.stringify(genuine)) as { saveVersion: number }
    wrongVersion.saveVersion = 3
    expect(validateSimState(wrongVersion)).toBe(false)
  })

  it('replay 与逐步执行完全一致', () => {
    const stepwise = run(createSim(8), ...FULL_WALK)
    const replayed = replay(8, FULL_WALK)
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(stepwise))
  })
})
