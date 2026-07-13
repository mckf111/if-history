import { nightReportEntries } from '../engine/audit'
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

  return (
    <div className="sim-shell sim-report">
      <div className="sim-report-sheet">
        <h2>夜话</h2>
        <p className="sim-report-date">三月{DAY_NAMES[state.day]}夜 —— 你在阁楼上听了一宿的动静。</p>
        <ul className="sim-report-list">
          {entries.map((entry) => (
            <li key={entry.id} className={entry.kind === 'ambient' ? '' : 'quiet'}>
              {entry.text}
            </li>
          ))}
        </ul>
        <p className="sim-quiet">
          街面上听得见的，就这些。文书到没到、人心动没动，要么去探，要么等它自己长出动静。
        </p>
        <div className="sim-row" style={{ marginTop: 18 }}>
          <button
            type="button"
            className="sim-btn sim-btn-primary"
            onClick={() => dispatch({ t: 'confirm-report' })}
          >
            {nextIsNode ? '天亮了——三月十九' : `天亮了——过三月${DAY_NAMES[state.day + 1] ?? ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
