import { describe, expect, it } from 'vitest'
import { applyCommand, createSim } from './engine'
import { detectionChance, forgeGrade, inspectByNpc } from './forge'
import type { InventoryPart, PlayerCommand, SimState } from '../types'

function run(state: SimState, ...cmds: PlayerCommand[]): SimState {
  return cmds.reduce((current, cmd) => applyCommand(current, cmd), state)
}

function part(id: string, kind: InventoryPart['kind'], refId: string, quality: 0 | 1 | 2): InventoryPart {
  return { id, kind, refId, quality, contraband: false }
}

/** LCG 首步对种子是仿射的，线性种子族会产生线性骰值带；测试用整数散列打散 */
function scramble(seed: number): number {
  let x = Math.imul(seed, 2654435761) >>> 0
  x ^= x >>> 16
  x = Math.imul(x, 0x45d9f3b) >>> 0
  x ^= x >>> 16
  return x >>> 0 || 1
}

/** 备齐火票要件：探东家拿废戳版，去纸铺买官纸，回铺 */
const PREP_HUOPIAO: PlayerCommand[] = [
  { t: 'probe', npcId: 'master-he' },
  { t: 'collect', collectableId: 'col-scrap-seal' },
  { t: 'move', to: 'zhipu' },
  { t: 'observe', observableId: 'ob-paper-stock' },
  { t: 'collect', collectableId: 'col-paper-guan' },
  { t: 'confirm-report' },
  { t: 'move', to: 'keji-shop' },
]

describe('伪造与验看', () => {
  it('质量结算：缺要件必为粗，短板决定上限，工时抬一档', () => {
    const seal = part('p1', 'seal', 'seal-huopiao', 1)
    const paper = part('p2', 'paper', 'paper-guan', 1)
    expect(forgeGrade('dt-huopiao', [paper], 1, 1)).toBe(0) // 缺印的火票就是废纸
    expect(forgeGrade('dt-huopiao', [seal, paper], 1, 1)).toBe(1) // 工
    expect(forgeGrade('dt-huopiao', [seal, paper], 2, 1)).toBe(2) // 精
    const goodPaper = part('p3', 'blank-form', 'paper-guan', 2)
    expect(forgeGrade('dt-huopiao', [seal, goodPaper], 2, 1)).toBe(2) // 仍被废戳版卡住
    expect(forgeGrade('dt-huopiao', [seal, paper], 1, 2)).toBe(2) // 手熟后再抬一档
  })

  it('第一张刻完才手熟，第二张同等文书成色抬一档', () => {
    const ready = run(createSim(1644), ...PREP_HUOPIAO)
    const first = applyCommand(ready, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 1,
    })
    const second = applyCommand(first, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-scapegoat-list'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 1,
    })

    expect(first.docs['doc-1'].grade).toBe(1)
    expect(first.craft).toBe(2)
    expect(first.audit.at(-1)?.text).toContain('往后的文书成色会抬一档')
    expect(second.docs['doc-2'].grade).toBe(2)
    expect(second.craft).toBe(2)
  })

  it('识破率：精明抬升、质量压低、想信的人查得松，两头夹在 10-90', () => {
    const doc = {
      id: 'doc-1', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      authentic: false, grade: 1 as const, parts: {}, holder: 'player' as const, exposed: false, createdDay: 16 as const,
    }
    // 孙把总（精明2）想信「饷银将至」：35 + 30 - 15 - 10 = 40
    expect(detectionChance(doc, 'sun-bazong')).toBe(40)
    // 钱司吏（精明3）不关心这句：35 + 45 - 15 = 65
    expect(detectionChance(doc, 'qian-sili')).toBe(65)
    // 苏婆婆（精明0）不识字：35 - 15 = 20
    expect(detectionChance(doc, 'su-popo')).toBe(20)
    // 真件永不识破
    expect(detectionChance({ ...doc, authentic: true }, 'qian-sili')).toBe(0)
  })

  it('刻一张火票：耗纸留印，文书入袖，账目可见', () => {
    const ready = run(createSim(1644), ...PREP_HUOPIAO)
    const forged = applyCommand(ready, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 2,
    })
    expect(forged.inventory.docIds).toEqual(['doc-1'])
    expect(forged.docs['doc-1'].grade).toBe(2)
    expect(forged.inventory.parts.map((p) => p.id)).toEqual(['col-scrap-seal', 'col-paper-guan'])
    expect(forged.inventory.parts.find((p) => p.id === 'col-paper-guan')?.usesLeft).toBe(1)
    expect(forged.docs['doc-1'].createdDay).toBe(17)
    expect(forged.slot).toBe(2) // 两个时辰
  })

  it('世界物件只取得一次：纸用完或被没收后也不会在原处重生', () => {
    const ready = run(createSim(1644), ...PREP_HUOPIAO)
    let state = applyCommand(ready, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 1,
    })
    state = applyCommand(state, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-scapegoat-list'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 1,
    })
    expect(state.inventory.parts.some((item) => item.id === 'col-paper-guan')).toBe(false)
    state = applyCommand(state, { t: 'move', to: 'zhipu' })
    expect(() => applyCommand(state, { t: 'collect', collectableId: 'col-paper-guan' }))
      .toThrow('这样东西已经离开原处，不会再长回来。')
  })

  it('伪造讲规矩：不在铺子不行，型制装不下的话不行', () => {
    const ready = run(createSim(2), ...PREP_HUOPIAO, { t: 'move', to: 'dukou' })
    expect(() => applyCommand(ready, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 1,
    })).toThrow('刻刀和案子都在铺子里。')
    const home = applyCommand(ready, { t: 'move', to: 'keji-shop' })
    expect(() => applyCommand(home, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-prince-south'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 1,
    })).toThrow('火票装不下这样的话。')
  })

  it('添改降一档成色，毁证不耗时辰', () => {
    const ready = run(createSim(3), ...PREP_HUOPIAO)
    let state = applyCommand(ready, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 2,
    })
    state = applyCommand(state, { t: 'alter', docId: 'doc-1', addClaimId: 'c-abandon-outer' })
    expect(state.docs['doc-1'].claimIds).toEqual(['c-pay-coming', 'c-abandon-outer'])
    expect(state.docs['doc-1'].grade).toBe(1)
    const slotBefore = state.slot
    state = applyCommand(state, { t: 'destroy', docId: 'doc-1' })
    expect(state.slot).toBe(slotBefore)
    expect(state.docs['doc-1'].holder).toBe('destroyed')
    expect(state.inventory.docIds).toEqual([])
  })

  it('伪件未被识破时，当夜留下玩家可见的采信回响', () => {
    const ready = run(createSim(5), ...PREP_HUOPIAO)
    const forged = applyCommand(ready, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 2,
    })
    let accepted: SimState['audit'][number] | undefined
    for (let seed = 1; seed <= 30 && !accepted; seed += 1) {
      const after = inspectByNpc({ ...forged, rngState: scramble(seed) }, 'doc-1', 'sun-bazong', [], 'night')
      accepted = after.audit.find((entry) => entry.kind === 'inspect'
        && entry.roll !== undefined
        && entry.roll > entry.chance!)
    }

    expect(accepted?.visibleToPlayer).toBe(true)
    expect(accepted?.text).toContain('把文书收下了')
  })

  it('验看：识破则曝光加嫌疑，未破则断言入心（轻信者一步两档）', () => {
    const ready = run(createSim(5), ...PREP_HUOPIAO)
    const forged = applyCommand(ready, {
      t: 'forge', templateId: 'dt-huopiao', claimIds: ['c-pay-coming'],
      partIds: ['col-scrap-seal', 'col-paper-guan'], effortSlots: 2,
    })
    // 直接调验看（绕开带信人私心），跨多种子验证两条路径都有且自洽
    let sawDetected = false
    let sawBelieved = false
    for (let seed = 1; seed <= 30; seed += 1) {
      const state = { ...forged, rngState: scramble(seed) }
      const after = inspectByNpc(state, 'doc-1', 'sun-bazong', [], 'night')
      const entry = after.audit.find((e) => e.kind === 'inspect' && e.roll !== undefined)!
      expect(entry.chance).toBe(25) // 35 + 30 - 30(精) - 10(想信) = 25
      const detected = entry.roll! <= entry.chance!
      if (detected) {
        sawDetected = true
        expect(after.docs['doc-1'].exposed).toBe(true)
        expect(after.suspicion).toBeGreaterThan(forged.suspicion)
      } else {
        sawBelieved = true
        // 初始 1（半哄着自己）→ 轻信 +2 → 3 笃信
        expect(after.npcs['sun-bazong'].beliefs['c-pay-coming']).toBe(3)
        const beliefEntry = after.audit.find((e) => e.kind === 'belief' && e.actor === 'sun-bazong')!
        expect(beliefEntry.causeIds.length).toBeGreaterThan(0)
      }
    }
    expect(sawDetected).toBe(true)
    expect(sawBelieved).toBe(true)
  })
})
