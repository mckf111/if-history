import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { applyCommand, createSim } from '../engine/engine'
import type { SimState, VowId } from '../types'
import GuidePanel, { derivePlayerGuidance, shouldOpenGuide } from './GuidePanel'
import HomeScreen from './HomeScreen'
import PlayScreen from './PlayScreen'
import PrologueScreen from './PrologueScreen'

function chooseVow(vow: VowId): SimState {
  return applyCommand(createSim(1644), { t: 'choose-vow', vow })
}

describe('游戏内新手引导', () => {
  it.each([
    ['save-chunsheng', '先把春生带回来', '城门汛地'],
    ['protect-roster', '先让匠户从册上消失', '兵马司'],
    ['protect-neighborhood', '先保三条胡同', '城门汛地'],
  ] as const)('誓愿 %s 在开局给出具体目标和可到达地点', (vow, goal, place) => {
    const state = chooseVow(vow)
    const guidance = derivePlayerGuidance(state)

    expect(guidance.goal).toBe(goal)
    expect(guidance.nextStep).toContain(place)
    expect(guidance.focus).toBe('map')
    expect(shouldOpenGuide(state)).toBe(true)
    expect(shouldOpenGuide(state, true)).toBe(false)
    expect(guidance.nextStep).not.toContain('右侧')
  })

  it('到达建议地点后改为指出该点谁或查什么，不再让玩家继续找路', () => {
    const state = applyCommand(chooseVow('save-chunsheng'), { t: 'move', to: 'chengmen' })
    const guidance = derivePlayerGuidance(state)

    expect(guidance.nextStep).toContain('姚春生')
    expect(guidance.nextStep).toContain('探问')
    expect(guidance.focus).toBe('people')
    expect(shouldOpenGuide(state)).toBe(false)
  })

  it('采取第一项耗时行动后不再自动打断，但玩法册仍完整解释界面', () => {
    let state = applyCommand(chooseVow('protect-roster'), { t: 'move', to: 'yamen' })
    state = applyCommand(state, { t: 'observe', observableId: 'ob-roster-chest' })

    expect(shouldOpenGuide(state)).toBe(false)

    const html = renderToStaticMarkup(<GuidePanel state={state} onClose={() => undefined} />)
    for (const term of ['这一局怎样才算有结果', '时辰', '嫌疑', '银两', '外城图', '袖中', '人物册', '工作台']) {
      expect(html).toContain(term)
    }
    expect(html.indexOf('现在先做')).toBeLessThan(html.indexOf('每样东西各管一件事'))
    expect(html).toContain('<details class="sim-guide-terms-wrap"')
  })

  it('材料在身但人不在铺子时，先引导回铺而不是要求打开不存在的工作台', () => {
    const started = chooseVow('save-chunsheng')
    const awayWithParts: SimState = {
      ...started,
      playerLocation: 'chengmen',
      commands: [...started.commands, { t: 'probe', npcId: 'master-he' }],
      knowledge: {
        ...started.knowledge,
        knownSecrets: { 'master-he': ['he-scrap-seal'] },
        seenObservables: ['ob-paper-stock'],
      },
      inventory: {
        ...started.inventory,
        parts: [{
          id: 'col-paper-min', kind: 'paper', refId: 'paper-min', quality: 1,
          contraband: false, usesLeft: 2,
        }],
      },
    }

    const guidance = derivePlayerGuidance(awayWithParts)
    expect(guidance.nextStep).toContain('回何记刻字铺')
    expect(guidance.nextStep).not.toMatch(/^打开「上工作台」/)
    expect(guidance.focus).toBe('map')
  })

  it('首页、序章和主游戏把目标与玩法连成一条线', () => {
    const home = renderToStaticMarkup(
      <HomeScreen hasSave={false} saveComplete={false} onStart={() => undefined} onContinue={() => undefined} />,
    )
    expect(home).toContain('开始游戏')
    expect(home).toContain('先选一个最想保住的人或事')

    const fresh = createSim(1644)
    const prologue = renderToStaticMarkup(<PrologueScreen state={fresh} dispatch={() => undefined} />)
    expect(prologue).toContain('这一局的目的')
    expect(prologue).toContain('城破改不了')

    const started = chooseVow('save-chunsheng')
    const play = renderToStaticMarkup(
      <PlayScreen state={started} dispatch={() => undefined} onAbandon={() => undefined} />,
    )
    expect(play).toContain('先看懂这一局')
    expect(play).toContain('本局要守住')
    expect(play).toContain('看完整玩法')

    const returningPlayer = renderToStaticMarkup(
      <PlayScreen state={started} dispatch={() => undefined} onAbandon={() => undefined} guideSeen />,
    )
    expect(returningPlayer).not.toContain('先看懂这一局')
  })
})
