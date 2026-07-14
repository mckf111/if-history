import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NPCS_BY_ID } from '../content'
import { applyCommand, createSim } from '../engine/engine'
import NightReport from './NightReport'
import PlayScreen from './PlayScreen'
import WorkbenchPanel from './WorkbenchPanel'

function renderPlay(state = createSim(1644)) {
  return renderToStaticMarkup(<PlayScreen state={state} dispatch={() => undefined} onAbandon={() => undefined} />)
}

describe('v0.4 行动安全网', () => {
  it('HUD 直接写出嫌疑阈值，并在搜查线后给出预警', () => {
    const html = renderPlay({ ...createSim(1644), suspicion: 7 })

    expect(html).toContain('4 盘查 · 7 搜查 · 10 缉拿')
    expect(html).toContain('已到搜查线；再升到 10 就会被缉拿')
  })

  it('灰掉的采集按钮说明先做什么或还差多少银', () => {
    const home = renderPlay(createSim(1644))
    expect(home).toContain('未解锁：先探何师傅')

    const atPaperShop = applyCommand(createSim(1644), { t: 'move', to: 'zhipu' })
    const shortOfSilver = { ...atPaperShop, inventory: { ...atPaperShop.inventory, silver: 0 } }
    const paperShop = renderPlay(shortOfSilver)
    expect(paperShop).toContain('银不够，还差 1 两')
    expect(paperShop).toContain('先细看「架上的官用连四纸」')
  })

  it('探尽的人明确显示已无新话，撬点估势显示柱数和定性档', () => {
    const fresh = createSim(1644)
    const exhausted = {
      ...fresh,
      knowledge: {
        ...fresh.knowledge,
        knownSecrets: {
          ...fresh.knowledge.knownSecrets,
          'master-he': NPCS_BY_ID['master-he'].secrets.map((secret) => secret.id),
        },
      },
    }
    const html = renderPlay(exhausted)

    expect(html).toContain('已无新话可探')
    expect(html).toContain('已探尽')
    expect(html).toContain('三处撬点')
    expect(html).toContain('已倒 0/3 柱')
    expect(html).toContain('尚无成算')
  })

  it('第三夜传播结束后，在最终结算按钮前再次显示最新估势', () => {
    let state = applyCommand(createSim(1644), { t: 'choose-vow', vow: 'protect-roster' })
    for (const day of [16, 17, 18]) {
      for (let slot = 0; slot < 4; slot += 1) state = applyCommand(state, { t: 'rest' })
      if (day < 18) state = applyCommand(state, { t: 'confirm-report' })
    }
    const html = renderToStaticMarkup(<NightReport state={state} dispatch={() => undefined} />)

    expect(html).toContain('结算前估势')
    expect(html).toContain('已倒 0/3 柱')
    expect(html).toContain('天亮了——三月十九')
  })

  it('工作台缺件提示同时说明可去哪里找', () => {
    const html = renderToStaticMarkup(
      <WorkbenchPanel state={createSim(1644)} dispatch={() => undefined} onClose={() => undefined} />,
    )

    expect(html).toContain('火票戳（何记刻字铺可找）')
    expect(html).toContain('官纸（宣南纸铺或兵马司廊房可找）')
  })
})
