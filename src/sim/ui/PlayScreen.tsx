import { useMemo, useState } from 'react'
import {
  COLLECTABLES,
  COLLECTABLES_BY_ID,
  DOC_TEMPLATES,
  DOC_TEMPLATES_BY_ID,
  LOCATIONS_BY_ID,
  NPCS_BY_ID,
  OBSERVABLES,
  SLOT_NAMES,
  SLOTS_PER_DAY,
  SUSPICION_MAX,
  SUSPICION_THRESHOLDS,
} from '../content'
import { presentNpcIds } from '../engine/actions'
import { legalCommands, matchTemplateParts } from '../engine/engine'
import { hasObserved } from '../engine/knowledge'
import WorkbenchPanel from './WorkbenchPanel'
import DossierPanel from './DossierPanel'
import CityMap from './CityMap'
import DocScroll from './DocScroll'
import type { PlayerCommand, SimState } from '../types'

/** 今日心事：从状态派生的情境引导（纯 UI，不进引擎不进存档） */
function deriveHint(state: SimState): string | null {
  const probedAnyone = Object.keys(state.knowledge.knownSecrets).length > 0
  const observedAnything = state.knowledge.seenObservables.length > 0
  const hasParts = state.inventory.parts.length > 0
  const hasDocs = state.inventory.docIds.length > 0
  const sentAnything = Object.values(state.docs).some((doc) => doc.holder !== 'player' && doc.holder !== 'destroyed')
  const canForgeSomething = DOC_TEMPLATES.some((template) => matchTemplateParts(state, template.id) !== null)

  if (state.day === 16 && !probedAnyone) return '跟人说话不花钱，只花时辰——探问是一切门道的起点。'
  if (!observedAnything) return '先看清，再动刀。现场的东西看过才知道门道，也才敢下手。'
  if (!hasParts && !hasDocs) return '伪造要有料：印、纸、笔迹。观察和探问会告诉你哪里能弄到。'
  if (!hasDocs && !canForgeSomething) return '要件还不齐——缺印的火票就是废纸。再去城里转转。'
  if (!hasDocs && canForgeSomething) return '料齐了。回铺子上工作台，落刀。'
  if (hasDocs) return '刻好的文书要托人送出去才算数。带信的人各有脚程，也各有私心——翻翻人物册。'
  if (state.day === 18) return '今夜之后就是三月十九。还没落地的心思，今天是最后的机会。'
  if (sentAnything) return '信在路上。夜里自见分晓——晨报只报街面上听得见的。'
  return null
}

interface PlayScreenProps {
  state: SimState
  dispatch: (cmd: PlayerCommand) => void
  onAbandon: () => void
}

type Overlay = 'none' | 'workbench' | 'dossier' | `send:${string}`

export default function PlayScreen({ state, dispatch, onAbandon }: PlayScreenProps) {
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [openingDismissed, setOpeningDismissed] = useState(false)
  const [hintMuted, setHintMuted] = useState(false)
  const options = useMemo(() => legalCommands(state), [state])
  const location = LOCATIONS_BY_ID[state.playerLocation]
  const present = presentNpcIds(state)
  const slotName = SLOT_NAMES[Math.min(state.slot, SLOTS_PER_DAY - 1)]
  const canAct = state.slot < SLOTS_PER_DAY
  const showOpening = state.commands.length === 0 && !openingDismissed
  const hint = hintMuted ? null : deriveHint(state)

  const observablesHere = OBSERVABLES.filter((item) => item.locationId === state.playerLocation)
  const collectablesHere = COLLECTABLES.filter((item) => item.locationId === state.playerLocation)
  const canRun = (cmd: PlayerCommand) => options.some((option) => JSON.stringify(option) === JSON.stringify(cmd))

  return (
    <div className="sim-shell">
      <header className="sim-topbar">
        <span className="sim-date">崇祯十七年三月<b>{numeral(state.day)}</b> · {slotName}</span>
        <span className="sim-slots" aria-label="今日时辰">
          {Array.from({ length: SLOTS_PER_DAY }, (_, index) => (
            <i key={index} className={`sim-slot-dot${index < state.slot ? ' spent' : ''}`} />
          ))}
          <span className="sim-slot-label">时辰</span>
        </span>
        <div className="sim-topbar-right">
          <span className="sim-heat" title={`盘查 ${SUSPICION_THRESHOLDS[0]} · 搜查 ${SUSPICION_THRESHOLDS[1]} · 缉拿 ${SUSPICION_THRESHOLDS[2]}`}>
            <span className="sim-heat-label">嫌疑</span>
            <span className="sim-heat-ticks">
              {Array.from({ length: SUSPICION_MAX }, (_, index) => {
                const level = index + 1
                const isMark = (SUSPICION_THRESHOLDS as readonly number[]).includes(level)
                return <i key={level} className={`sim-heat-tick${level <= state.suspicion ? ' hot' : ''}${isMark ? ' mark' : ''}`} />
              })}
            </span>
          </span>
          <span className="sim-silver">银 {state.inventory.silver} 两</span>
          <span className="sim-seed">种子 {state.seed}</span>
          <button type="button" className="sim-btn sim-btn-ghost sim-btn-small" onClick={onAbandon}>
            离席
          </button>
        </div>
      </header>

      {hint ? (
        <div className="sim-hint" role="note">
          <span className="sim-hint-mark">忖</span>
          <span className="sim-hint-text">{hint}</span>
          <button type="button" className="sim-hint-close" onClick={() => setHintMuted(true)} aria-label="不再提示">
            ✕
          </button>
        </div>
      ) : null}

      <div className="sim-board">
        <main className="sim-panel">
          {showOpening ? (
            <div className="sim-opening">
              <p className="sim-kicker">三月十六 · 晨 · 开场</p>
              <p>
                何师傅把一块催了三遍的牌记推到你面前：「小满，司里的活计今晚要交，你那把刀先别停。」
                他压低了声音：「外头不太平。纸铺的、递书的、渡口的……这两天什么人都在打听什么事。
                你出去走动，<b>多看，多问，少应承</b>。」
              </p>
              <p className="sim-quiet">
                三天，十二个时辰。先看清（细看现场的东西），再开口（探问在场的人），心里有数了，再动刀（回铺子上工作台）。
                你刻出去的每一个字，夜里都会自己走路。
              </p>
              <div className="sim-row">
                <button type="button" className="sim-btn sim-btn-small" onClick={() => setOpeningDismissed(true)}>
                  应了一声，拿起刻刀
                </button>
              </div>
            </div>
          ) : null}
          <h2>
            {location?.name ?? state.playerLocation}
            <span className="sim-quiet">{slotName}时</span>
          </h2>
          <p className="sim-loc-brief">{location?.brief}</p>

          <h3>在场的人</h3>
          {present.length === 0 ? <p className="sim-quiet">这个时辰，这里没有说得上话的人。</p> : (
            <ul className="sim-list">
              {present.map((npcId) => {
                const npc = NPCS_BY_ID[npcId]
                return (
                  <li key={npcId} className="sim-item">
                    <span className="sim-seal">{npc.mark}</span>
                    <div className="sim-item-main">
                      <div className="sim-item-title">{npc.name} · {npc.role}</div>
                      <div className="sim-item-sub">{npc.brief}</div>
                    </div>
                    <button
                      type="button"
                      className="sim-btn sim-btn-small"
                      disabled={!canAct}
                      onClick={() => dispatch({ t: 'probe', npcId })}
                    >
                      探问
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <h3>先看清</h3>
          <ul className="sim-list">
            {observablesHere.map((item) => {
              const seen = hasObserved(state, item.id)
              return (
                <li key={item.id} className={`sim-item${seen ? ' done' : ''}`}>
                  <div className="sim-item-main">
                    <div className="sim-item-title">{item.label}</div>
                    {seen ? <div className="sim-item-sub">{item.detail}</div> : null}
                  </div>
                  {seen ? null : (
                    <button
                      type="button"
                      className="sim-btn sim-btn-small"
                      disabled={!canAct}
                      onClick={() => dispatch({ t: 'observe', observableId: item.id })}
                    >
                      细看
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          {collectablesHere.length > 0 ? (
            <>
              <h3>可下手的东西</h3>
              <ul className="sim-list">
                {collectablesHere.map((item) => {
                  const owned = state.inventory.parts.some((part) => part.id === item.id)
                  const available = canRun({ t: 'collect', collectableId: item.id })
                  return (
                    <li key={item.id} className={`sim-item${owned ? ' done' : ''}`}>
                      <div className="sim-item-main">
                        <div className="sim-item-title">{item.label}</div>
                        <div className="sim-item-sub">
                          {item.costSilver > 0 ? `价 ${item.costSilver} 两。` : '不要钱，要胆子。'}
                          {item.suspicion > 0 ? ` 下手会招眼（嫌疑 +${item.suspicion}）。` : ''}
                          {item.contraband ? ' 属违禁物，被搜出是要命的。' : ''}
                          {owned ? ' —— 已在袖中。' : ''}
                        </div>
                      </div>
                      {owned ? null : (
                        <button
                          type="button"
                          className="sim-btn sim-btn-small"
                          disabled={!available || !canAct}
                          onClick={() => dispatch({ t: 'collect', collectableId: item.id })}
                        >
                          收下
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          ) : null}

          <h3>过一个时辰</h3>
          <div className="sim-row">
            <button type="button" className="sim-btn" disabled={!canAct} onClick={() => dispatch({ t: 'rest' })}>
              避避风头（嫌疑可降一分）
            </button>
            {state.playerLocation === 'keji-shop' ? (
              <button type="button" className="sim-btn sim-btn-primary" disabled={!canAct} onClick={() => setOverlay('workbench')}>
                上工作台，动刀
              </button>
            ) : null}
          </div>
        </main>

        <aside className="sim-side">
          <div className="sim-panel">
            <h2>城图<span className="sim-quiet">点一处，走过去</span></h2>
            <CityMap state={state} dispatch={dispatch} />
            <p className="sim-quiet" style={{ marginTop: 6 }}>
              图上只标你摸熟了脚程的人（探过底细才知道他此刻在哪）。
            </p>
          </div>

          <div className="sim-panel">
            <div className="sim-flex-title">
              <h2>袖中</h2>
              <button type="button" className="sim-btn sim-btn-small" onClick={() => setOverlay('dossier')}>
                翻人物册
              </button>
            </div>
            <h3>部件</h3>
            {state.inventory.parts.length === 0 ? <p className="sim-quiet">空空如也。伪造要先有料。</p> : (
              <div>
                {state.inventory.parts.map((part) => (
                  <span key={part.id} className={`sim-chip${part.contraband ? ' contraband' : ''}`}>
                    {COLLECTABLES_BY_ID[part.id]?.label ?? part.refId}
                  </span>
                ))}
              </div>
            )}
            <h3>文书</h3>
            {state.inventory.docIds.length === 0 ? <p className="sim-quiet">手上干干净净。</p> : (
              <ul className="sim-list">
                {state.inventory.docIds.map((docId) => {
                  const doc = state.docs[docId]
                  return (
                    <li key={docId} className="sim-doc-card">
                      <DocScroll doc={doc} compact />
                      <div className="sim-doc-actions">
                        <button type="button" className="sim-btn sim-btn-small sim-btn-primary" disabled={!canAct} onClick={() => setOverlay(`send:${docId}`)}>
                          托人送出
                        </button>
                        <button type="button" className="sim-btn sim-btn-small" onClick={() => dispatch({ t: 'destroy', docId })}>
                          烧掉
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {overlay === 'workbench' ? (
        <WorkbenchPanel state={state} dispatch={dispatch} onClose={() => setOverlay('none')} />
      ) : null}
      {overlay === 'dossier' ? (
        <DossierPanel state={state} onClose={() => setOverlay('none')} />
      ) : null}
      {overlay.startsWith('send:') ? (
        <SendPanel
          state={state}
          docId={overlay.slice(5)}
          options={options}
          dispatch={(cmd) => { dispatch(cmd); setOverlay('none') }}
          onClose={() => setOverlay('none')}
        />
      ) : null}
    </div>
  )
}

function numeral(day: number): string {
  return day === 16 ? '十六' : day === 17 ? '十七' : day === 18 ? '十八' : '十九'
}

interface SendPanelProps {
  state: SimState
  docId: string
  options: PlayerCommand[]
  dispatch: (cmd: PlayerCommand) => void
  onClose: () => void
}

/** 托送：从此刻合法的 dispatch 命令里挑带信人与收信人 */
function SendPanel({ state, docId, options, dispatch, onClose }: SendPanelProps) {
  const sendable = options.filter(
    (cmd): cmd is Extract<PlayerCommand, { t: 'dispatch' }> => cmd.t === 'dispatch' && cmd.docId === docId,
  )
  const couriers = [...new Set(sendable.map((cmd) => cmd.courierId))]
  const [courierId, setCourierId] = useState<string | null>(couriers[0] ?? null)
  const targets = [...new Set(sendable.filter((cmd) => cmd.courierId === courierId).map((cmd) => cmd.targetNpcId))]
  const doc = state.docs[docId]
  const template = doc ? DOC_TEMPLATES_BY_ID[doc.templateId] : undefined

  return (
    <div className="sim-drawer-backdrop" onClick={onClose}>
      <div className="sim-drawer" onClick={(event) => event.stopPropagation()}>
        <h2>
          托送{template?.name ?? '文书'}
          <button type="button" className="sim-btn sim-btn-small" onClick={onClose}>收回</button>
        </h2>
        {couriers.length === 0 ? (
          <p>此刻身边没有肯带信的人。带信的人也有自己的脚程——去找赵四、豆子或吴七娘。</p>
        ) : (
          <>
            <div className="sim-field">
              <span className="sim-field-label">托谁带</span>
              <div className="sim-options">
                {couriers.map((id) => {
                  const npc = NPCS_BY_ID[id]
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`sim-option${courierId === id ? ' picked' : ''}`}
                      onClick={() => setCourierId(id)}
                    >
                      {npc.name} · {npc.role}
                      <span className="sub">{npc.stance}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="sim-field">
              <span className="sim-field-label">送给谁</span>
              <div className="sim-options">
                {targets.map((id) => {
                  const npc = NPCS_BY_ID[id]
                  return (
                    <button
                      key={id}
                      type="button"
                      className="sim-option"
                      onClick={() => courierId && dispatch({ t: 'dispatch', docId, courierId, targetNpcId: id })}
                    >
                      送给 {npc.name}（{npc.role}）
                      <span className="sub">信一出手，就不归你了。夜里才见分晓。</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
