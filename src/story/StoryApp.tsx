import { useEffect, useMemo, useState } from 'react'
import { CHARACTERS, buildScene } from './content'
import { advanceStory, canChoose, createStory, inspectClue, isStoryChoiceAvailable, resolveStoryChoice, storyAftermath } from './engine'
import { clearStory, loadStory, saveStory } from './storage'
import type { CharacterId, StoryChoice, StoryState } from './types'
import './story.css'

function CharacterName({ id }: { id: CharacterId }) {
  const person = CHARACTERS[id]
  return <span className={`story-speaker speaker-${id}`}><i>{person.mark}</i><b>{person.name}</b><small>{person.role}</small></span>
}

function Home({ saved, onStart, onContinue }: { saved?: StoryState; onStart: () => void; onContinue: () => void }) {
  const hasLegacy = Boolean(localStorage.getItem('what-if-history.autosave.v2'))
  return (
    <main className="story-home">
      <div className="story-home-grid" aria-hidden="true" />
      <section className="story-home-copy">
        <p className="story-kicker">如果历史 · 小人物卷一</p>
        <h1><span>刻下</span><b>无名</b></h1>
        <p className="story-home-lead">她替死人刻下名字。<br />后来，活人开始照着她的刀口行动。</p>
        <p className="story-home-premise">北京城破后的七天里，你不是皇帝，也不是将军。你只有一把刀，能改一个字的去处——以及决定谁先为它付代价。</p>
        <div className="story-home-actions">
          {saved ? <button className="story-primary" onClick={onContinue}>继续这一刀<small>第 {saved.chapter} 回 · {saved.phase === 'complete' ? '尘埃已定' : '尚未落定'}</small></button> : null}
          <button onClick={onStart}>{saved ? '另起一卷' : '拿起刻刀'}<small>三回合 · 约十五分钟</small></button>
        </div>
        {hasLegacy ? <p className="legacy-note">旧版“煤山未尽”存档仍在原处，新故事不会覆盖它。</p> : null}
      </section>
      <aside className="story-home-aside">
        <span>一个人的身份</span><i />
        <span>一船粮的去处</span><i />
        <span>一座营门的开合</span>
      </aside>
      <footer>史实规定时代如何运转；你决定谁被齿轮碾过。</footer>
    </main>
  )
}

function StoryHeader({ state, onHome, onRestart }: { state: StoryState; onHome: () => void; onRestart: () => void }) {
  return (
    <header className="story-header">
      <button className="story-wordmark" onClick={onHome}><span>如果历史</span><small>刻下无名</small></button>
      <div className="story-progress" aria-label={`第 ${state.chapter} 回，共三回`}>
        {[1, 2, 3].map((chapter) => <i key={chapter} className={chapter <= state.chapter ? 'filled' : ''} />)}
        <span>{state.chapter} / 3</span>
      </div>
      <button className="story-restart" onClick={onRestart}>重新刻过</button>
    </header>
  )
}

function ClueDesk({ state, onInspect }: { state: StoryState; onInspect: (id: string) => void }) {
  const scene = buildScene(state)
  return (
    <aside className="clue-desk" aria-label="眼前的东西">
      <div className="story-section-heading"><span>先看清</span><small>{state.inspectedClueIds.length} / {scene.clues.length}</small></div>
      <p>小满不懂天下，但她懂手边的东西。至少看清两件，再动刀。</p>
      <div className="clue-list">
        {scene.clues.map((clue, index) => {
          const inspected = state.inspectedClueIds.includes(clue.id)
          return (
            <button key={clue.id} className={inspected ? 'inspected' : ''} onClick={() => onInspect(clue.id)} aria-expanded={inspected}>
              <span>0{index + 1}</span><b>{clue.label}</b>
              {inspected ? <p>{clue.detail}</p> : <small>仔细看看</small>}
            </button>
          )
        })}
      </div>
      <div className="story-boundary">
        <b>史实与推演</b>
        <p>{scene.sourceNote}</p><small>{scene.boundary}</small>
        <div className="story-sources">{scene.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div>
      </div>
    </aside>
  )
}

function ChoiceCard({ choice, enabled, disabledReason, onChoose }: { choice: StoryChoice; enabled: boolean; disabledReason?: string; onChoose: () => void }) {
  return (
    <button className="story-choice" onClick={onChoose} disabled={!enabled}>
      <span className="choice-cut" aria-hidden="true" />
      <b>{choice.title}</b>
      <p>{choice.action}</p>
      <small><i>代价</i>{choice.sacrifice}</small>
      {!enabled ? <em>{disabledReason}</em> : null}
    </button>
  )
}

function SceneView({ state, setState }: { state: StoryState; setState: (next: StoryState) => void }) {
  const scene = buildScene(state)
  const ready = canChoose(state)
  return (
    <div className="story-layout">
      <article className="scene-page narrative-page">
        <div className="scene-meta"><span>{scene.eyebrow}</span><span>{scene.date}</span><span>{scene.location}</span></div>
        <h2>{scene.title}</h2>
        <div className="scene-opening">{scene.opening.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        <div className="story-dialogue">
          {scene.lines.map((line, index) => (
            <div className="story-line" key={`${line.speaker}-${index}`}>
              {line.speaker ? <CharacterName id={line.speaker} /> : null}
              <p>{line.text}</p>
            </div>
          ))}
        </div>
      </article>
      <ClueDesk state={state} onInspect={(id) => setState(inspectClue(state, id))} />
      <section className={`decision-block decision-page ${ready ? 'ready' : ''}`} aria-live="polite">
        <p className="decision-question">{scene.question}</p>
        {ready ? (
          <div className="story-choices">
            {scene.choices.map((choice) => {
              const sawClue = state.inspectedClueIds.includes(choice.requiredClueId)
              const characterAllows = isStoryChoiceAvailable(state, choice.id)
              return <ChoiceCard key={choice.id} choice={choice} enabled={sawClue && characterAllows} disabledReason={!sawClue ? '还没看见支撑这个行动的东西' : '豆子已经拿着名单先动了，他不再把这个行动交给你'} onChoose={() => setState(resolveStoryChoice(state, choice.id))} />
            })}
          </div>
        ) : <div className="decision-locked"><span>刀还不能落</span><small>物件栏里还有东西没有看清。</small></div>}
      </section>
    </div>
  )
}

function AftermathView({ state, onAdvance }: { state: StoryState; onAdvance: () => void }) {
  const aftermath = storyAftermath(state)
  return (
    <main className="aftermath-page">
      <p className="story-kicker">这一刀落下以后</p>
      <h2>{aftermath.title}</h2>
      <p className="aftermath-lead">{aftermath.lead}</p>
      <div className="aftermath-lines">
        {aftermath.lines.map((line, index) => <div className="story-line" key={`${line.speaker}-${index}`}>{line.speaker ? <CharacterName id={line.speaker} /> : null}<p>{line.text}</p></div>)}
      </div>
      <div className="consequence-grid">
        <section><small>眼前发生的事</small><p>{aftermath.consequence}</p></section>
        <section><small>有人记住了</small><p>{aftermath.debt}</p></section>
      </div>
      <blockquote>{aftermath.nextHook}</blockquote>
      <button className="story-primary next-chapter" onClick={onAdvance}>{state.chapter === 3 ? '看这一笔如何留在历史里' : '让后果继续往前走'}</button>
    </main>
  )
}

function EndingView({ state, onRestart, onHome }: { state: StoryState; onRestart: () => void; onHome: () => void }) {
  const ending = state.ending!
  const route = state.choices.map((record) => {
    const replayState = { ...createStory(state.seed), chapter: record.chapter }
    const scene = buildScene(replayState)
    return scene.choices.find((choice) => choice.id === record.choiceId)?.title ?? record.choiceId
  })
  return (
    <main className="story-ending">
      <section className="ending-copy">
        <p className="story-kicker">小人物卷一 · 完</p>
        <h1>{ending.title}</h1>
        <p className="ending-subtitle">{ending.subtitle}</p>
        {ending.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="history-shift"><small>历史偏转</small><p>{ending.historyShift}</p></div>
      </section>
      <aside className="route-map">
        <span>你刻下的因果</span>
        {route.map((title, index) => <div key={`${title}-${index}`}><i>0{index + 1}</i><b>{title}</b>{index < route.length - 1 ? <em /> : null}</div>)}
        <p>你没有选择善恶。你选择了谁先付代价。</p>
        <div className="ending-buttons"><button className="story-primary" onClick={onRestart}>换一种刻法</button><button onClick={onHome}>回到卷首</button></div>
      </aside>
    </main>
  )
}

export default function StoryApp() {
  const [state, setState] = useState<StoryState | undefined>(() => loadStory())
  const [screen, setScreen] = useState<'home' | 'play'>(() => 'home')

  useEffect(() => {
    if (state) saveStory(state)
  }, [state])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [screen, state?.chapter, state?.phase])

  const title = useMemo(() => state ? `第 ${state.chapter} 回 · ${buildScene(state).title}` : '刻下无名', [state])
  useEffect(() => { document.title = `${title}｜如果历史` }, [title])

  const start = () => {
    clearStory()
    setState(createStory(Date.now() >>> 0))
    setScreen('play')
  }

  if (screen === 'home') return <Home saved={state} onStart={start} onContinue={() => setScreen('play')} />
  if (!state) return <Home onStart={start} onContinue={() => undefined} />
  if (state.phase === 'complete') return <EndingView state={state} onRestart={start} onHome={() => setScreen('home')} />

  return (
    <div className="story-shell">
      <StoryHeader state={state} onHome={() => setScreen('home')} onRestart={start} />
      {state.phase === 'scene'
        ? <SceneView state={state} setState={setState} />
        : <AftermathView state={state} onAdvance={() => setState(advanceStory(state))} />}
    </div>
  )
}
