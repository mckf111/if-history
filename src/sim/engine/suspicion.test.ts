import { describe, expect, it } from 'vitest'
import { applyCommand, createSim } from './engine'
import { addSuspicion } from './suspicion'
import type { PlayerCommand, SimState } from '../types'

function run(state: SimState, ...cmds: PlayerCommand[]): SimState {
  return cmds.reduce((current, cmd) => applyCommand(current, cmd), state)
}

describe('嫌疑系统', () => {
  it('阈值 4 触发盘查，且一局只触发一次', () => {
    const state = createSim(1)
    const crossed = addSuspicion(state, 5, [])
    expect(crossed.suspicion).toBe(5)
    expect(crossed.suspicionFired).toContain(4)
    expect(crossed.audit.filter((entry) => entry.kind === 'question')).toHaveLength(1)
    // 降下去再升回来，不再重复盘查
    const again = addSuspicion(addSuspicion(crossed, -3, []), 4, [])
    expect(again.audit.filter((entry) => entry.kind === 'question')).toHaveLength(1)
  })

  it('阈值 7 搜查：违禁部件按公开骰值没收', () => {
    // 先经正路拿到违禁的废戳版
    const armed = run(
      createSim(2026),
      { t: 'probe', npcId: 'master-he' },
      { t: 'collect', collectableId: 'col-scrap-seal' },
    )
    expect(armed.inventory.parts.some((part) => part.contraband)).toBe(true)
    const searched = addSuspicion(armed, 7, [])
    const rolls = searched.audit.filter((entry) => entry.kind === 'search' && entry.roll !== undefined)
    expect(rolls).toHaveLength(1)
    const [entry] = rolls
    const confiscated = entry.roll! <= entry.chance!
    expect(searched.inventory.parts.some((part) => part.id === 'col-scrap-seal')).toBe(!confiscated)
  })

  it('阈值 10 缉拿：局终，处决入账并生成编年史，后续命令拒绝', () => {
    const state = createSim(3)
    const doomed = addSuspicion(state, 10, [])
    expect(doomed.status).toBe('executed')
    expect(doomed.phase).toBe('epilogue')
    expect(doomed.audit.some((entry) => entry.kind === 'arrest')).toBe(true)
    // 失败即内容：处决也生成完整三层编年史
    expect(doomed.chronicle?.some((entry) => entry.layer === 'fact')).toBe(true)
    expect(doomed.chronicle?.some((entry) => entry.layer === 'legend')).toBe(true)
    expect(() => applyCommand(doomed, { t: 'rest' })).toThrow('这一局已经结束了。')
  })

  it('走正门也能作死：一路跟踪盘问官面人物直至被缉拿', () => {
    let state = createSim(9)
    // 钱司吏走到哪跟到哪（移动免费），贴脸盘问：每问嫌疑 +1，问到第十次进站笼
    for (let guard = 0; guard < 60 && state.status === 'playing'; guard += 1) {
      if (state.phase === 'night-report') {
        state = applyCommand(state, { t: 'confirm-report' })
        continue
      }
      if (state.phase !== 'action') break
      const qianLocation = state.npcs['qian-sili'].location
      if (state.playerLocation !== qianLocation) {
        state = applyCommand(state, { t: 'move', to: qianLocation })
        continue
      }
      state = applyCommand(state, { t: 'probe', npcId: 'qian-sili' })
    }
    expect(state.status).toBe('executed')
    expect(state.suspicion).toBe(10)
  })
})
