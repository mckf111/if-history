import { nightReportEntries } from '../engine/audit'
import { useScreenEntry } from './useScreenEntry'
import type { PlayerCommand, SimState } from '../types'

interface NightReportProps {
  state: SimState
  dispatch: (cmd: PlayerCommand) => void
}

const DAY_NAMES: Record<number, string> = { 16: '十六', 17: '十七', 18: '十八' }

/** 晨报：夜里你听得见的动静。听不见的，天亮也不会告诉你。 */
export default function NightReport({ state, dispatch }: NightReportProps) {
  const entries = nightReportEntries(state, state.day)
  const nextIsNode = state.day === 18
  const headingRef = useScreenEntry<HTMLHeadingElement>()
  const echoes = entries.filter((entry) => entry.kind !== 'ambient')

  return (
    <main className="sim-shell sim-report">
      <div className="sim-report-moon" aria-hidden="true"><span>夜</span></div>
      <article className="sim-report-sheet">
        <p className="sim-kicker">三月{DAY_NAMES[state.day]}夜 · 城中耳报</p>
        <h1 ref={headingRef} tabIndex={-1}>{echoes.length > 0 ? '刻下的字，开始自己走路' : '这一夜，纸面还没有回声'}</h1>
        <p className="sim-report-date">你伏在刻坊阁楼的窗边，听了一宿梆子、脚步和压低的议论。</p>
        <ul className="sim-report-list">
          {entries.map((entry, index) => (
            <li key={entry.id} className={entry.kind === 'ambient' ? 'ambient' : 'echo'}>
              <span className="sim-report-index">{String(index + 1).padStart(2, '0')}</span>
              <span>{entry.text}</span>
            </li>
          ))}
        </ul>
        <p className="sim-report-whisper">
          街面上听得见的，就这些。文书到没到、人心动没动，要么去探，要么等它自己长出动静。
        </p>
        <div className="sim-row sim-report-actions">
          <button
            type="button"
            className="sim-btn sim-btn-primary sim-btn-hero"
            onClick={() => dispatch({ t: 'confirm-report' })}
          >
            {nextIsNode ? '天亮了——三月十九' : `天亮了——过三月${DAY_NAMES[state.day + 1] ?? ''}`}
          </button>
        </div>
      </article>
    </main>
  )
}
