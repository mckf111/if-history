import { useEffect, useMemo, useState } from 'react'
import { EVENTS_BY_ID } from './game/content'
import { calculateChance, canAfford, createGame, currentEvent, resolveDecision, riskLabel } from './game/engine'
import { PEOPLE_BY_ID } from './game/people'
import { SOURCES_BY_ID } from './game/sources'
import { clearGame, loadAnnals, loadGame, saveGame, type AnnalEntry } from './game/storage'
import type { ChoiceDefinition, GameState, MetricKey, PlayerDecision } from './game/types'

const ACT_NAMES = ['煤山未尽', '南都重建', '江淮决战']
const METRICS: Array<{ key: MetricKey; label: string; glyph: string }> = [
  { key: 'legitimacy', label: '国本', glyph: '玺' },
  { key: 'supply', label: '饷道', glyph: '粮' },
  { key: 'command', label: '兵权', glyph: '令' },
  { key: 'people', label: '民生', glyph: '民' },
  { key: 'court', label: '朝局', glyph: '衡' },
]

function metricLabel(value: number): string {
  if (value < 20) return '崩坏'
  if (value < 40) return '动摇'
  if (value < 60) return '可支'
  if (value < 78) return '稳固'
  return '振兴'
}

function playSeal(enabled: boolean) {
  if (!enabled) return
  const AudioContextClass = window.AudioContext
  const context = new AudioContextClass()
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

function HistoryMap({ turn }: { turn: number }) {
  const progress = Math.min(1, turn / 11)
  const markerX = 132 + progress * 358
  const markerY = 78 + Math.sin(progress * Math.PI) * 120
  return (
    <section className="map-panel" aria-label="天下态势图">
      <div className="panel-heading"><span>天下态势</span><small>诏令所及，并非疆界所至</small></div>
      <svg viewBox="0 0 620 360" className="history-map" role="img" aria-label="从北京至南京及江淮的局势舆图">
        <defs>
          <filter id="rough"><feTurbulence baseFrequency="0.018" numOctaves="2" seed="9"/><feDisplacementMap in="SourceGraphic" scale="2"/></filter>
          <linearGradient id="river" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#66746e"/><stop offset="1" stopColor="#283d3a"/></linearGradient>
        </defs>
        <path className="land-wash" d="M77 44C163 11 246 29 302 70c74 54 96 19 161 50 64 31 116 117 60 183-53 62-166 34-220 28-82-10-142 15-205-34-65-50-79-193-21-253Z"/>
        <path className="river" d="M55 239c74-18 135 20 199 18 91-3 130-52 211-34 50 11 76 45 119 52"/>
        <path className="canal" d="M142 72c31 45 49 83 75 117 27 35 54 54 92 75"/>
        <path className="route" d="M132 78C184 121 213 184 309 262c72 58 125-4 181-9"/>
        <g className={`map-node ${turn <= 1 ? 'active' : ''}`} transform="translate(132 78)"><circle r="8"/><text x="13" y="5">北京</text></g>
        <g className={`map-node ${turn >= 1 && turn <= 3 ? 'active' : ''}`} transform="translate(204 151)"><circle r="6"/><text x="11" y="4">运河</text></g>
        <g className={`map-node ${turn >= 2 && turn <= 4 ? 'active' : ''}`} transform="translate(267 226)"><circle r="6"/><text x="11" y="4">淮安</text></g>
        <g className={`map-node ${turn >= 4 && turn <= 8 ? 'active' : ''}`} transform="translate(343 273)"><circle r="8"/><text x="13" y="5">南京</text></g>
        <g className={`map-node ${turn >= 8 ? 'active' : ''}`} transform="translate(422 243)"><circle r="7"/><text x="12" y="5">江淮</text></g>
        <g className="map-node" transform="translate(503 281)"><circle r="5"/><text x="10" y="4">海疆</text></g>
        <g className="imperial-marker" transform={`translate(${markerX} ${markerY})`}><circle r="13"/><text textAnchor="middle" y="4">玺</text></g>
      </svg>
      <p className="map-caption">第 {turn + 1} 回合 · 御驾与政令的重心正在移动</p>
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

function ChoiceCard({ choice, index, state, selected, actorId, onSelect, onActor }: {
  choice: ChoiceDefinition
  index: number
  state: GameState
  selected: boolean
  actorId?: string
  onSelect: () => void
  onActor: (id: string) => void
}) {
  const affordable = canAfford(state, choice)
  const chance = calculateChance(state, choice, actorId)
  return (
    <article className={`choice-card ${selected ? 'selected' : ''} ${!affordable ? 'disabled' : ''}`}>
      <button className="choice-main" onClick={onSelect} disabled={!affordable} aria-pressed={selected}>
        <span className="choice-number">{['甲', '乙', '丙'][index]}</span>
        <span className="choice-copy"><b>{choice.title}</b><span>{choice.summary}</span><small>{choice.consequenceHint}</small></span>
        <span className="risk-tag">{choice.actorIds?.length && !actorId ? '须择使臣' : riskLabel(chance)}</span>
      </button>
      {selected && choice.actorIds?.length ? (
        <label className="actor-select">
          <span>命谁执行</span>
          <select value={actorId ?? ''} onChange={(event) => onActor(event.target.value)}>
            <option value="">请选择</option>
            {choice.actorIds.map((id) => <option key={id} value={id}>{PEOPLE_BY_ID[id].name} · {PEOPLE_BY_ID[id].title}</option>)}
          </select>
          {actorId && <small>{PEOPLE_BY_ID[actorId].stance}</small>}
        </label>
      ) : null}
      {(choice.cost?.treasury || choice.cost?.couriers) && (
        <div className="choice-cost">耗用 {choice.cost.treasury ? `内帑 ${choice.cost.treasury}` : ''} {choice.cost.couriers ? `驿骑 ${choice.cost.couriers}` : ''}</div>
      )}
    </article>
  )
}

function EventDesk({ state, sound, onDecision }: { state: GameState; sound: boolean; onDecision: (decision: PlayerDecision) => void }) {
  const event = currentEvent(state)
  const source = SOURCES_BY_ID[event.sourceId]
  const [selectedId, setSelectedId] = useState<string>()
  const [actorId, setActorId] = useState<string>()
  const [showSource, setShowSource] = useState(false)

  useEffect(() => {
    setSelectedId(undefined)
    setActorId(undefined)
    setShowSource(false)
  }, [event.id])

  const selected = event.choices.find((choice) => choice.id === selectedId)
  const canSeal = selected && canAfford(state, selected) && (!selected.actorIds?.length || Boolean(actorId))

  function seal() {
    if (!selected || !canSeal) return
    playSeal(sound)
    onDecision({ eventId: event.id, choiceId: selected.id, actorId })
  }

  return (
    <main className="event-desk">
      <div className="event-meta"><span>{event.date}</span><span>{event.category}</span><span>{state.eventIndex === 0 ? '本回合主奏' : '局势旁奏'}</span></div>
      <h2>{event.title}</h2>
      <p className="event-brief">{event.brief}</p>
      <p className="event-context">{event.context}</p>
      <div className="choices">
        {event.choices.map((choice, index) => (
          <ChoiceCard key={choice.id} choice={choice} index={index} state={state} selected={selectedId === choice.id} actorId={selectedId === choice.id ? actorId : undefined}
            onSelect={() => { setSelectedId(choice.id); setActorId(undefined) }} onActor={setActorId} />
        ))}
      </div>
      <div className="desk-actions">
        <button className="source-button" onClick={() => setShowSource((value) => !value)}>史据与边界</button>
        <button className="seal-button" disabled={!canSeal} onClick={seal}><span>落印</span><small>命令发出后不可撤回</small></button>
      </div>
      {showSource && (
        <div className="source-note" id="historical-boundary">
          <b>史实边界</b><p>{event.boundary}</p>
          {source.url.startsWith('#') ? <span>{source.title}</span> : <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>}
          <small>{source.note}</small>
        </div>
      )}
    </main>
  )
}

function Reports({ state }: { state: GameState }) {
  const reports = state.reports.slice(-4).reverse()
  return (
    <section className="reports-panel">
      <div className="panel-heading"><span>邸报</span><small>命令的回声</small></div>
      <div className="reports-list">
        {reports.map((report) => (
          <article className={`report ${report.tone}`} key={report.id}>
            <span>{report.tone === 'good' ? '○' : report.tone === 'bad' ? '×' : '·'}</span>
            <div><b>{report.title}</b><p>{report.body}</p></div>
          </article>
        ))}
      </div>
    </section>
  )
}

function GameView({ state, setState, sound, setSound, onExit }: {
  state: GameState
  setState: (state: GameState) => void
  sound: boolean
  setSound: (value: boolean) => void
  onExit: () => void
}) {
  function decide(decision: PlayerDecision) {
    const next = resolveDecision(state, decision)
    saveGame(next)
    setState(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="game-shell">
      <header className="game-header">
        <button className="wordmark" onClick={onExit}><span>如果历史</span><small>煤山未尽</small></button>
        <div className="chapter"><small>第 {state.act} 幕</small><strong>{ACT_NAMES[state.act - 1]}</strong><span>{state.turn + 1} / 12</span></div>
        <button className="sound-toggle" onClick={() => setSound(!sound)} aria-label={sound ? '关闭音效' : '开启音效'}>{sound ? '声：开' : '声：寂'}</button>
      </header>
      <div className="game-grid">
        <div className="left-column"><HistoryMap turn={state.turn} /><Reports state={state} /></div>
        <EventDesk state={state} sound={sound} onDecision={decide} />
        <StateRail state={state} />
      </div>
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
        <p>游戏中隐藏的执行判定现已公开。同一种子、同一条决策链会得到完全相同的结果。</p>
        {revealed.length ? revealed.map((report) => (
          <div className="roll-row" key={report.id}><span>{report.title}</span><b>胜算 {report.chance}%</b><em>史骰 {report.roll}</em><strong>{(report.roll ?? 101) <= (report.chance ?? 0) ? '成' : '败'}</strong></div>
        )) : <p>此局没有等待天意裁决的命令——所有后果都由政策直接造成。</p>}
      </section>
      <div className="ending-actions"><button onClick={onHome}>返回卷首</button><button className="primary" onClick={onRestart}>再开一条历史</button></div>
    </div>
  )
}

function Prologue({ onFinish }: { onFinish: () => void }) {
  const pages = [
    ['崇祯十七年，三月十九日。', '北京已破。你遣散皇后与子女，走上煤山。史书将在一根白绫之后，写下“大明亡”。'],
    ['但王承恩没有跪下领死。', '他割断白绫，只说了一句话：“陛下若求死，何必让天下替您陪葬。”'],
    ['你仍然是皇帝。', '可你下的旨，未必有人听；你信的人，未必有能力；你救下的每一处，都意味着另一处被放弃。'],
  ]
  const [page, setPage] = useState(0)
  return (
    <div className="prologue" role="dialog" aria-modal="true">
      <div className="prologue-ink" />
      <div className="prologue-copy"><small>{String(page + 1).padStart(2, '0')} / 03</small><h2>{pages[page][0]}</h2><p>{pages[page][1]}</p>
        <div><button onClick={onFinish}>跳过</button><button className="primary" onClick={() => page === pages.length - 1 ? onFinish() : setPage(page + 1)}>{page === pages.length - 1 ? '接过这道残命' : '继续'}</button></div>
      </div>
    </div>
  )
}

function Home({ saved, onContinue, onNew }: { saved?: GameState; onContinue: () => void; onNew: () => void }) {
  const [showAnnals, setShowAnnals] = useState(false)
  const annals: AnnalEntry[] = useMemo(() => loadAnnals(), [showAnnals])
  return (
    <div className="home-screen">
      <div className="home-sun" /><div className="home-mountains" />
      <main className="home-copy">
        <p className="eyebrow">一款关于命令、代价与偶然的历史推演游戏</p>
        <h1><span>如果历史</span><b>煤山未尽</b></h1>
        <p className="home-lead">如果崇祯没有自缢，大明就能得救吗？<br/>你拥有皇帝的名义，却没有上帝的视角。</p>
        <div className="home-actions">
          {saved && saved.status === 'playing' && <button className="primary" onClick={onContinue}>续写旧史 <small>第 {saved.turn + 1} 回合</small></button>}
          <button onClick={onNew}>{saved ? '另开新史' : '开始推演'}</button>
          <button onClick={() => setShowAnnals(!showAnnals)}>甲申史鉴 <small>{annals.length} 卷</small></button>
        </div>
        <div className="home-principles"><span>十二回合</span><span>有限信息</span><span>可复盘随机</span><span>六类国运</span></div>
      </main>
      <footer>史实给出约束，选择产生后果。建议佩戴耳机，20–40 分钟完成一局。</footer>
      {showAnnals && <div className="annals"><button onClick={() => setShowAnnals(false)}>收起 ×</button><h2>甲申史鉴</h2>{annals.length ? annals.map((entry) => <article key={`${entry.seed}-${entry.endingId}`}><b>{entry.endingTitle}</b><span>种子 {entry.seed}</span><small>{new Date(entry.completedAt).toLocaleDateString('zh-CN')}</small></article>) : <p>尚无成卷。历史正等着第一个不肯认命的人。</p>}</div>}
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

  if (state?.status === 'complete') return <EndingView state={state} onHome={home} onRestart={() => { clearGame(); newGame() }} />
  if (state) return <><GameView state={state} setState={(next) => { setState(next); setSaved(next) }} sound={sound} setSound={setSound} onExit={home} />{showPrologue && <Prologue onFinish={() => setShowPrologue(false)} />}</>
  return <Home saved={saved} onContinue={() => saved && setState(saved)} onNew={newGame} />
}
