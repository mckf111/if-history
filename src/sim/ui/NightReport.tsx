import { NPCS_BY_ID } from '../content'
import { nightReportEntries } from '../engine/audit'
import { nightAdvice, summarizeNightReport } from '../engine/nightReport'
import LeverPreviewPanel from './LeverPreviewPanel'
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
  const labelOf = new Map(state.audit.map((entry) => [entry.id, entry] as const))
  const { deliveryCount, actionCount, dangerCount } = summarizeNightReport(entries)
  const advice = nightAdvice(entries)

  return (
    <main className="sim-shell sim-report">
      <div className="sim-report-moon" aria-hidden="true"><span>夜</span></div>
      <article className="sim-report-sheet">
        {state.day === 17 ? <img className="sim-report-art" src="./art/night-woodcut.webp" alt="" decoding="async" /> : null}
        <p className="sim-kicker">三月{DAY_NAMES[state.day]}夜 · 城中耳报</p>
        <h1 ref={headingRef} tabIndex={-1}>{echoes.length > 0 ? '刻下的字，开始自己走路' : '这一夜，纸面还没有回声'}</h1>
        <p className="sim-report-date">你伏在刻坊阁楼的窗边，听了一宿梆子、脚步和压低的议论。</p>
        <div className="sim-report-summary" aria-label="今夜变化摘要">
          <span><b>{deliveryCount}</b> 次送信动静</span>
          <span><b>{actionCount}</b> 项人物行动</span>
          <span className={dangerCount > 0 ? 'danger' : ''}><b>{dangerCount}</b> 次风声逼近</span>
        </div>
        <ul className="sim-report-list">
          {entries.map((entry, index) => {
            const causes = entry.causeIds
              .map((id) => labelOf.get(id))
              .filter((cause) => cause?.visibleToPlayer || cause?.actor === 'player')
              .slice(0, 2)
            const actor = entry.actor !== 'player' && entry.actor !== 'history' ? NPCS_BY_ID[entry.actor] : undefined
            return (
              <li key={entry.id} className={entry.kind === 'ambient' ? 'ambient' : 'echo'}>
                <span className="sim-report-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <small className="sim-report-kind">{reportKind(entry.kind)}{actor ? ` · ${actor.name}` : ''}</small>
                  <p>{entry.text}</p>
                  {causes.length > 0 ? (
                    <div className="sim-report-causes">
                      <span>因何而起</span>
                      {causes.map((cause) => <small key={cause!.id}>{cause!.text}</small>)}
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
        {nextIsNode ? <LeverPreviewPanel state={state} /> : null}
        <div className="sim-report-whisper">
          <strong>天亮后怎么判断</strong>
          <p>{advice}</p>
          <small>街面上听不见的暗流不会提前泄露；终局会把全部因果摊开。</small>
        </div>
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

function reportKind(kind: SimState['audit'][number]['kind']): string {
  if (kind === 'belief') return '人心'
  if (kind === 'npc-act') return '行动'
  if (kind === 'carry' || kind === 'betray' || kind === 'inspect') return '送信'
  if (kind === 'suspicion' || kind === 'question' || kind === 'search' || kind === 'arrest') return '风声'
  return '街谈'
}
