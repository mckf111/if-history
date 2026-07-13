import type { PlayerCommand, SimState, VowId } from '../types'
import { useScreenEntry } from './useScreenEntry'

interface PrologueScreenProps {
  state: SimState
  dispatch: (cmd: PlayerCommand) => void
}

const VOWS: Array<{ id: VowId; mark: string; title: string; stake: string; cost: string }> = [
  {
    id: 'save-chunsheng', mark: '人', title: '先把春生带回来',
    stake: '弟弟明晨就要随运夫营出城。', cost: '你可能顾不上名册和街坊。',
  },
  {
    id: 'protect-roster', mark: '册', title: '先让匠户从册上消失',
    stake: '新旧主人都能按匠籍抓走一整条街的人。', cost: '烧掉一册纸，也可能烧掉活命的凭据。',
  },
  {
    id: 'protect-neighborhood', mark: '门', title: '先保三条胡同',
    stake: '城门一乱，最先遭殃的是没有门路的人。', cost: '守门人的退路，要拿别人的秘密去换。',
  },
]

export default function PrologueScreen({ state, dispatch }: PrologueScreenProps) {
  const headingRef = useScreenEntry<HTMLHeadingElement>()
  return (
    <main className="sim-prologue">
      <div className="sim-prologue-sky" aria-hidden="true">
        <span className="sim-moon" />
        <span className="sim-wall-line line-one" />
        <span className="sim-wall-line line-two" />
      </div>
      <section className="sim-prologue-sheet">
        <p className="sim-kicker">三月十六 · 晨 · 距外城陷落十二个时辰</p>
        <h1 ref={headingRef} tabIndex={-1}>城会破。你先保住什么？</h1>
        <div className="sim-prologue-copy">
          <p>何师傅把催了三遍的牌记推到你刀边。远处第一声炮响时，门缝下又塞进一截红绳——春生托人送来的。</p>
          <p>你没有兵，也没有官身。你只有一把刻刀，和让白纸黑字走进人心的本事。</p>
        </div>

        <div className="sim-vow-grid" aria-label="选择这一局最想守住的事">
          {VOWS.map((vow) => (
            <button
              key={vow.id}
              type="button"
              className="sim-vow-card"
              onClick={() => dispatch({ t: 'choose-vow', vow: vow.id })}
            >
              <span className="sim-vow-seal" aria-hidden="true">{vow.mark}</span>
              <span className="sim-vow-copy">
                <strong>{vow.title}</strong>
                <span>{vow.stake}</span>
                <small>代价：{vow.cost}</small>
              </span>
              <span className="sim-vow-arrow" aria-hidden="true">落印</span>
            </button>
          ))}
        </div>

        <p className="sim-prologue-rule">
          誓愿不会暗中给你加成。它只会在史书合上时，问你一句：当初想保的人和事，究竟保住了吗？
          <span>本局种子 {state.seed}</span>
        </p>
      </section>
    </main>
  )
}
