import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateChance, createGame, currentEvents, resolveTurn, riskLabel, validateTurnPlan } from './game/engine'
import { PEOPLE_BY_ID } from './game/people'
import { SOURCES_BY_ID } from './game/sources'
import { EDICT_BUDGET, availableActorIds, edictCost, eventRegion } from './game/strategy'
import { clearGame, loadAnnals, loadGame, saveGame, type AnnalEntry } from './game/storage'
import type { ChoiceDefinition, EventDefinition, GameState, MetricKey, PlayerOrder, ReportEntry } from './game/types'

const ACT_NAMES = ['煤山未尽', '南都重建', '江淮决战']
const METRICS: Array<{ key: MetricKey; label: string; glyph: string }> = [
  { key: 'legitimacy', label: '国本', glyph: '玺' },
  { key: 'supply', label: '饷道', glyph: '粮' },
  { key: 'command', label: '兵权', glyph: '令' },
  { key: 'people', label: '民生', glyph: '民' },
  { key: 'court', label: '朝局', glyph: '衡' },
]

interface DraftOrder {
  choiceId?: string
  actorId?: string
}

const REGION_POSITIONS = {
  beijing: { x: 21, y: 23 },
  canal: { x: 34, y: 43 },
  huaian: { x: 45, y: 64 },
  nanjing: { x: 56, y: 74 },
  jianghuai: { x: 69, y: 66 },
  coast: { x: 83, y: 77 },
}

function metricLabel(value: number): string {
  if (value < 20) return '崩坏'
  if (value < 40) return '动摇'
  if (value < 60) return '可支'
  if (value < 78) return '稳固'
  return '振兴'
}

function playSeal(enabled: boolean) {
  if (!enabled) return
  const context = new window.AudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(115, context.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(48, context.currentTime + 0.18)
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.26)
  oscillator.addEventListener('ended', () => void context.close())
}

function HistoryMap({ state, events, selectedId, onSelect }: {
  state: GameState
  events: EventDefinition[]
  selectedId: string
  onSelect: (eventId: string) => void
}) {
  const progress = Math.min(1, state.turn / 11)
  const markerX = 132 + progress * 358
  const markerY = 78 + Math.sin(progress * Math.PI) * 120
  return (
    <section className="map-panel" aria-label="天下态势图">
      <div className="panel-heading"><span>天下态势</span><small>两处军情，诏令只有两道</small></div>
      <div className="map-stage">
        <svg viewBox="0 0 620 360" className="history-map" role="img" aria-label="从北京至南京及江淮的局势舆图">
          <defs>
            <filter id="rough"><feTurbulence baseFrequency="0.018" numOctaves="2" seed="9"/><feDisplacementMap in="SourceGraphic" scale="2"/></filter>
            <linearGradient id="river" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#66746e"/><stop offset="1" stopColor="#283d3a"/></linearGradient>
          </defs>
          <path className="land-wash" d="M77 44C163 11 246 29 302 70c74 54 96 19 161 50 64 31 116 117 60 183-53 62-166 34-220 28-82-10-142 15-205-34-65-50-79-193-21-253Z"/>
          <path className="river" d="M55 239c74-18 135 20 199 18 91-3 130-52 211-34 50 11 76 45 119 52"/>
          <path className="canal" d="M142 72c31 45 49 83 75 117 27 35 54 54 92 75"/>
          <path className="route" d="M132 78C184 121 213 184 309 262c72 58 125-4 181-9"/>
          <g className="map-node" transform="translate(132 78)"><circle r="6"/><text x="13" y="5">北京</text></g>
          <g className="map-node" transform="translate(204 151)"><circle r="5"/><text x="11" y="4">运河</text></g>
          <g className="map-node" transform="translate(267 226)"><circle r="5"/><text x="11" y="4">淮安</text></g>
          <g className="map-node" transform="translate(343 273)"><circle r="6"/><text x="13" y="5">南京</text></g>
          <g className="map-node" transform="translate(422 243)"><circle r="5"/><text x="12" y="5">江淮</text></g>
          <g className="map-node" transform="translate(503 281)"><circle r="5"/><text x="10" y="4">海疆</text></g>
          <g className="imperial-marker" transform={`translate(${markerX} ${markerY})`}><circle r="13"/><text textAnchor="middle" y="4">玺</text></g>
        </svg>
        {events.map((event, index) => {
          const position = REGION_POSITIONS[eventRegion(event)]
          return (
            <button
              key={event.id}
              className={`crisis-marker ${selectedId === event.id ? 'selected' : ''}`}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              onClick={() => onSelect(event.id)}
              aria-pressed={selectedId === event.id}
            >
              <span>{index === 0 ? '主' : '急'}</span><b>{event.title}</b>
            </button>
          )
        })}
      </div>
      <p className="map-caption">第 {state.turn + 1} 回合 · 点击军情标记切换御案</p>
    </section>
  )
}

function StateRail({ state }: { state: GameState }) {
  return (
    <aside className="state-rail">
      <div className="panel-heading"><span>国势</span><small>只见征兆，不见天数</small></div>
      <div className="metric-list">
        {METRICS.map(({ key, label, glyph }) => {
          const value = state.metrics[key]
          return (
            <div className={`metric metric-${metricLabel(value)}`} key={key} title={`${label}：${metricLabel(value)}`}>
              <span className="metric-glyph">{glyph}</span>
              <span><b>{label}</b><small>{metricLabel(value)}</small></span>
              <i style={{ '--level': `${value}%` } as React.CSSProperties} />
            </div>
          )
        })}
      </div>
      <div className="resources">
        <div><span>内帑</span><strong>{'●'.repeat(state.resources.treasury) || '无'}</strong></div>
        <div><span>驿骑</span><strong>{'◆'.repeat(state.resources.couriers) || '无'}</strong></div>
      </div>
      <div className="pending-box">
        <span>在途诏令</span><strong>{state.pending.length}</strong>
        <small>{state.pending.length ? '结果将在后续回合抵达' : '暂无等待执行的命令'}</small>
      </div>
    </aside>
  )
}

function ChoiceSlip({ event, choice, state, selected, actorId, onSelect }: {
  event: EventDefinition
  choice: ChoiceDefinition
  state: GameState
  selected: boolean
  actorId?: string
  onSelect: () => void
}) {
  const chance = calculateChance(state, choice, actorId)
  return (
    <button className={`choice-slip ${selected ? 'selected' : ''}`} onClick={onSelect} aria-pressed={selected}>
      <span className="choice-number" aria-hidden="true">令</span>
      <span className="choice-copy"><b>{choice.title}</b><span>{choice.summary}</span><small>{choice.consequenceHint}</small></span>
      <span className="choice-tags">
        <em>{'诏'.repeat(edictCost(event, choice))}</em>
        <i>{actorId ? riskLabel(chance) : choice.check ? '待定人选' : '后果明确'}</i>
        {selected ? <small>再点撤回</small> : null}
      </span>
      {(choice.cost?.treasury || choice.cost?.couriers) ? <span className="choice-cost">{choice.cost.treasury ? `内帑 ${choice.cost.treasury}` : ''} {choice.cost.couriers ? `驿骑 ${choice.cost.couriers}` : ''}</span> : null}
    </button>
  )
}

function EventDesk({ event, state, draft, usedActorIds, onDraft }: {
  event: EventDefinition
  state: GameState
  draft: DraftOrder
  usedActorIds: Set<string>
  onDraft: (draft: DraftOrder) => void
}) {
  const [showSource, setShowSource] = useState(false)
  const source = SOURCES_BY_ID[event.sourceId]
  const selected = event.choices.find((choice) => choice.id === draft.choiceId)
  const actorIds = selected ? availableActorIds(state, event, selected) : []

  useEffect(() => setShowSource(false), [event.id])

  return (
    <main className="event-desk">
      <div className="event-meta"><span>{event.date}</span><span>{event.category}</span><span>{state.currentEventIds[0] === event.id ? '本回合主奏' : '局势旁奏'}</span></div>
      <h2>{event.title}</h2>
      <p className="event-brief">{event.brief}</p>
      <p className="event-context">{event.context}</p>
      <div className="choices">
        {event.choices.map((choice) => (
          <ChoiceSlip
            key={choice.id}
            event={event}
            choice={choice}
            state={state}
            selected={choice.id === draft.choiceId}
            actorId={choice.id === draft.choiceId ? draft.actorId : undefined}
            onSelect={() => onDraft(choice.id === draft.choiceId ? {} : { choiceId: choice.id })}
          />
        ))}
      </div>
      {selected ? (
        <section className="actor-dock">
          <div><b>谁来承旨</b><small>一人一回合只能办一件事</small></div>
          <div className="actor-tokens">
            {actorIds.map((id) => {
              const person = PEOPLE_BY_ID[id]
              const occupied = usedActorIds.has(id) && draft.actorId !== id
              return (
                <button key={id} disabled={occupied} className={draft.actorId === id ? 'selected' : ''} aria-pressed={draft.actorId === id} onClick={() => onDraft({ ...draft, actorId: id })}>
                  <span>{person.name.slice(-1)}</span><b>{person.name}</b><small>{occupied ? '另有差遣' : person.title}</small>
                </button>
              )
            })}
          </div>
          {draft.actorId ? <p>{PEOPLE_BY_ID[draft.actorId].stance}</p> : <p className="actor-warning">尚未派人，诏书只是案上的一张纸。</p>}
        </section>
      ) : null}
      <button className="source-button" onClick={() => setShowSource((value) => !value)}>史据与边界</button>
      {showSource ? (
        <div className="source-note">
          <b>史实边界</b><p>{event.boundary}</p>
          {source.url.startsWith('#') ? <span>{source.title}</span> : <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>}
          <small>{source.note}</small>
        </div>
      ) : null}
    </main>
  )
}

function Reports({ state }: { state: GameState }) {
  return (
    <section className="reports-panel">
      <div className="panel-heading"><span>邸报</span><small>命令的回声</small></div>
      <div className="reports-list">
        {state.reports.slice(-5).reverse().map((report) => (
          <article className={`report ${report.tone}`} key={report.id}>
            <span>{report.tone === 'good' ? '○' : report.tone === 'bad' ? '×' : '·'}</span>
            <div><b>{report.title}</b><p>{report.body}</p></div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ResolutionOverlay({ reports, onClose }: { reports: ReportEntry[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const controls = [...dialogRef.current.querySelectorAll<HTMLElement>('button, a[href]')].filter((element) => !element.hasAttribute('disabled'))
      if (!controls.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="resolution-overlay" role="dialog" aria-modal="true" aria-labelledby="resolution-title">
      <div className="resolution-sheet" ref={dialogRef}>
        <div className="ending-seal">诏</div>
        <p className="eyebrow">本回合结算</p>
        <h2 id="resolution-title">诏令出京，后果入案</h2>
        <div className="resolution-list">
          {reports.map((report) => <article className={report.tone} key={report.id}><span>{report.tone === 'bad' ? '失' : report.tone === 'good' ? '成' : '令'}</span><div><b>{report.title}</b><p>{report.body}</p></div></article>)}
        </div>
        <button ref={closeRef} className="primary" onClick={onClose}>升殿议下一局</button>
      </div>
    </div>
  )
}

function GameView({ state, setState, sound, setSound, onExit, autoFocusCouncil }: {
  state: GameState
  setState: (state: GameState) => void
  sound: boolean
  setSound: (value: boolean) => void
  onExit: () => void
  autoFocusCouncil?: boolean
}) {
  const events = currentEvents(state)
  const [selectedId, setSelectedId] = useState(events[0].id)
  const [drafts, setDrafts] = useState<Record<string, DraftOrder>>({})
  const [resolution, setResolution] = useState<ReportEntry[]>()
  const firstCrisisRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setSelectedId(events[0].id)
    setDrafts({})
  }, [state.currentEventIds.join('|')])

  useEffect(() => {
    if (autoFocusCouncil) window.requestAnimationFrame(() => firstCrisisRef.current?.focus())
  }, [autoFocusCouncil])

  const selectedEvent = events.find((event) => event.id === selectedId) ?? events[0]
  const usedActorIds = new Set(Object.values(drafts).map((draft) => draft.actorId).filter(Boolean) as string[])
  const selectedChoices = events.flatMap((event) => {
    const choice = event.choices.find((item) => item.id === drafts[event.id]?.choiceId)
    return choice ? [{ event, choice }] : []
  })
  const pointsUsed = selectedChoices.reduce((sum, { event, choice }) => sum + edictCost(event, choice), 0)
  const treasuryUsed = selectedChoices.reduce((sum, { choice }) => sum + (choice.cost?.treasury ?? 0), 0)
  const couriersUsed = selectedChoices.reduce((sum, { choice }) => sum + (choice.cost?.couriers ?? 0), 0)
  const incomplete = selectedChoices.some(({ event }) => !drafts[event.id]?.actorId)
  const orders: PlayerOrder[] = events.flatMap((event) => {
    const draft = drafts[event.id]
    return draft?.choiceId && draft.actorId ? [{ eventId: event.id, choiceId: draft.choiceId, actorId: draft.actorId }] : []
  })
  const planError = incomplete
    ? '尚有诏令未派执行者。'
    : pointsUsed > EDICT_BUDGET
      ? '诏令点不足，请撤回或改选一道命令。'
      : treasuryUsed > state.resources.treasury
        ? '内帑不足。'
        : couriersUsed > state.resources.couriers
          ? '驿骑不足。'
          : validateTurnPlan(state, { orders })

  function sealTurn() {
    if (planError) return
    playSeal(sound)
    const next = resolveTurn(state, { orders })
    const newReports = next.reports.slice(state.reports.length)
    saveGame(next)
    setState(next)
    if (next.status === 'playing') setResolution(newReports)
  }

  function closeResolution() {
    setResolution(undefined)
    window.requestAnimationFrame(() => firstCrisisRef.current?.focus())
  }

  return (
    <div className="game-shell">
      <div className="game-content" inert={resolution ? true : undefined}>
      <header className="game-header">
        <button className="wordmark" onClick={onExit}><span>如果历史</span><small>煤山未尽</small></button>
        <div className="chapter"><small>第 {state.act} 幕</small><strong>{ACT_NAMES[state.act - 1]}</strong><span>{state.turn + 1} / 12</span></div>
        <div className="header-tools"><span className="edict-counter">诏令 {'◆'.repeat(Math.max(0, EDICT_BUDGET - pointsUsed))}<small>{pointsUsed}/{EDICT_BUDGET}</small></span><button className="sound-toggle" aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? '声：开' : '声：寂'}</button></div>
      </header>
      <div className="strategy-grid">
        <div className="map-column">
          <HistoryMap state={state} events={events} selectedId={selectedEvent.id} onSelect={setSelectedId} />
          <Reports state={state} />
        </div>
        <div className="crisis-column">
          <nav className="crisis-tabs" aria-label="本回合奏案">
            {events.map((event, index) => {
              const drafted = Boolean(drafts[event.id]?.choiceId && drafts[event.id]?.actorId)
              return <button key={event.id} ref={index === 0 ? firstCrisisRef : undefined} className={selectedEvent.id === event.id ? 'selected' : ''} aria-pressed={selectedEvent.id === event.id} onClick={() => setSelectedId(event.id)}><span>{index === 0 ? '主奏' : '旁奏'}</span><b>{event.title}</b><small>{drafted ? '已部署' : '失控风险'}</small></button>
            })}
          </nav>
          <EventDesk event={selectedEvent} state={state} draft={drafts[selectedEvent.id] ?? {}} usedActorIds={usedActorIds} onDraft={(draft) => setDrafts((current) => ({ ...current, [selectedEvent.id]: draft }))} />
        </div>
        <StateRail state={state} />
      </div>
      <footer className="command-bar">
        <div className="command-summary">
          {events.map((event) => {
            const draft = drafts[event.id]
            const choice = event.choices.find((item) => item.id === draft?.choiceId)
            return <button key={event.id} onClick={() => setSelectedId(event.id)} className={choice && draft?.actorId ? 'ready' : ''}><span>{choice ? choice.title : event.title}</span><small>{draft?.actorId ? PEOPLE_BY_ID[draft.actorId].name : choice ? '待派执行者' : '不处理将失控'}</small></button>
          })}
        </div>
        <div className="command-cost"><span>诏令 {pointsUsed}/{EDICT_BUDGET}</span><span>内帑 −{treasuryUsed}</span><span>驿骑 −{couriersUsed}</span></div>
        <div className={`command-status ${planError ? 'bad' : 'ready'}`} role="status" aria-live="polite">{planError ?? '部署已备，可落印。'}</div>
        <button className="seal-button" disabled={Boolean(planError)} onClick={sealTurn}><span>合议落印</span><small>{planError ? '检查御案部署' : `${orders.length} 道诏令同时发出`}</small></button>
      </footer>
      </div>
      {resolution ? <ResolutionOverlay reports={resolution} onClose={closeResolution} /> : null}
    </div>
  )
}

function EndingView({ state, onRestart, onHome }: { state: GameState; onRestart: () => void; onHome: () => void }) {
  const revealed = state.reports.filter((report) => report.chance !== undefined)
  return (
    <div className="ending-screen">
      <div className="ending-seal">史</div>
      <p className="eyebrow">甲申别史 · 种子 {state.seed}</p>
      <h1>{state.ending?.title}</h1>
      <h2>{state.ending?.subtitle}</h2>
      <div className="ending-narrative">{state.ending?.narrative.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      <div className="final-metrics">{METRICS.map(({ key, label }) => <div key={key}><span>{label}</span><b>{metricLabel(state.metrics[key])}</b><small>{state.metrics[key]}</small></div>)}</div>
      <section className="review-scroll">
        <h3>天意，还是人事？</h3>
        <p>游戏中隐藏的执行判定现已公开。同一种子、同一条部署链会得到完全相同的结果。</p>
        {revealed.length ? revealed.map((report) => <div className="roll-row" key={report.id}><span>{report.title}</span><b>胜算 {report.chance}%</b><em>史骰 {report.roll}</em><strong>{(report.roll ?? 101) <= (report.chance ?? 0) ? '成' : '败'}</strong></div>) : <p>此局没有等待天意裁决的命令——所有后果都由政策直接造成。</p>}
      </section>
      <div className="ending-actions"><button onClick={onHome}>返回卷首</button><button className="primary" onClick={onRestart}>再开一条历史</button></div>
    </div>
  )
}

function Prologue({ onFinish }: { onFinish: () => void }) {
  const pages = [
    ['崇祯十七年，三月十九日。', '北京已破。你遣散皇后与子女，走上煤山。史书将在一根白绫之后，写下“大明亡”。'],
    ['但王承恩没有跪下领死。', '他割断白绫，只说了一句话：“陛下若求死，何必让天下替您陪葬。”'],
    ['你仍然是皇帝。', '每回合只有两道诏令。你可以分头处置，也可以重押一处——但无人承接的危机会自行长出后果。'],
  ]
  const [page, setPage] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    skipRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onFinish()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const buttons = [...dialogRef.current.querySelectorAll<HTMLButtonElement>('button')]
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onFinish])

  return (
    <div className="prologue" role="dialog" aria-modal="true" aria-labelledby="prologue-title">
      <div className="prologue-ink" />
      <div className="prologue-copy" ref={dialogRef} aria-live="polite"><small>{String(page + 1).padStart(2, '0')} / 03</small><h2 id="prologue-title">{pages[page][0]}</h2><p>{pages[page][1]}</p><div><button ref={skipRef} onClick={onFinish}>跳过</button><button className="primary" onClick={() => page === pages.length - 1 ? onFinish() : setPage(page + 1)}>{page === pages.length - 1 ? '升殿议事' : '继续'}</button></div></div>
    </div>
  )
}

function Home({ saved, onContinue, onNew }: { saved?: GameState; onContinue: () => void; onNew: () => void }) {
  const [showAnnals, setShowAnnals] = useState(false)
  const annals: AnnalEntry[] = useMemo(() => loadAnnals(), [showAnnals])
  return (
    <div className="home-screen">
      <div className="home-sun"/><div className="home-mountains"/>
      <main className="home-copy">
        <p className="eyebrow">一款关于命令、代价与偶然的历史推演游戏</p>
        <h1><span>如果历史</span><b>煤山未尽</b></h1>
        <p className="home-lead">如果崇祯没有自缢，大明就能得救吗？<br/>两处危机，两道诏令。你救下的每一处，都让另一处更接近失控。</p>
        <div className="home-actions">
          {saved?.status === 'playing' ? <button className="primary" onClick={onContinue}>续写旧史 <small>第 {saved.turn + 1} 回合</small></button> : null}
          <button onClick={onNew}>{saved ? '另开新史' : '开始推演'}</button>
          <button onClick={() => setShowAnnals(!showAnnals)}>甲申史鉴 <small>{annals.length} 卷</small></button>
        </div>
        <div className="home-principles"><span>御前部署</span><span>人物差遣</span><span>有限信息</span><span>可复盘随机</span></div>
      </main>
      <footer>史实给出约束，部署产生后果。建议佩戴耳机，20–40 分钟完成一局。</footer>
      {showAnnals ? <div className="annals"><button onClick={() => setShowAnnals(false)}>收起 ×</button><h2>甲申史鉴</h2>{annals.length ? annals.map((entry) => <article key={`${entry.seed}-${entry.endingId}`}><b>{entry.endingTitle}</b><span>种子 {entry.seed}</span><small>{new Date(entry.completedAt).toLocaleDateString('zh-CN')}</small></article>) : <p>尚无成卷。历史正等着第一个不肯认命的人。</p>}</div> : null}
    </div>
  )
}

export default function App() {
  const [saved, setSaved] = useState<GameState | undefined>(() => loadGame())
  const [state, setState] = useState<GameState | undefined>()
  const [showPrologue, setShowPrologue] = useState(false)
  const [sound, setSound] = useState(true)

  function newGame() {
    const next = createGame(Date.now() >>> 0)
    saveGame(next)
    setSaved(next)
    setState(next)
    setShowPrologue(true)
  }

  function home() {
    setSaved(loadGame())
    setState(undefined)
    setShowPrologue(false)
  }

  if (state?.status === 'complete') return <EndingView state={state} onHome={home} onRestart={() => { clearGame(); newGame() }}/>
  if (state) return <><div inert={showPrologue ? true : undefined}><GameView state={state} setState={(next) => { setState(next); setSaved(next) }} sound={sound} setSound={setSound} onExit={home} autoFocusCouncil={!showPrologue}/></div>{showPrologue ? <Prologue onFinish={() => setShowPrologue(false)}/> : null}</>
  return <Home saved={saved} onContinue={() => saved && setState(saved)} onNew={newGame}/>
}
