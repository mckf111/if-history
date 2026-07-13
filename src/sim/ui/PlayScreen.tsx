import { useMemo, useState } from 'react'
import {
  CLAIMS_BY_ID,
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
import CityMap from './CityMap'
import DocScroll from './DocScroll'
import DossierPanel from './DossierPanel'
import Modal from './Modal'
import SourceLink from './SourceLink'
import WorkbenchPanel from './WorkbenchPanel'
import { useScreenEntry } from './useScreenEntry'
import type { PlayerCommand, SimState, VowId } from '../types'

interface PlayScreenProps {
  state: SimState
  dispatch: (cmd: PlayerCommand) => void
  onAbandon: () => void
}

type Overlay = 'none' | 'workbench' | 'dossier' | `send:${string}` | `alter:${string}`

const VOW_FIRST_STEPS: Record<VowId, string> = {
  'save-chunsheng': '你答应先救春生。先探清运夫营、病牒和渡口的门道；一句谎要让营里、船上和春生自己都敢信。',
  'protect-roster': '你答应先护住匠户。去兵马司看册、探钱司吏；名册可以烧、可以缺页，也可以被所有人看见。',
  'protect-neighborhood': '你答应先保街坊。去城门摸清孙把总怕什么、缺什么；门若要有序地开，他得先有退路。',
}

/** 今日心事只解释当前状态，不向引擎偷偷加规则。 */
function deriveHint(state: SimState): string | null {
  const probedAnyone = Object.keys(state.knowledge.knownSecrets).length > 0
  const observedAnything = state.knowledge.seenObservables.length > 0
  const hasParts = state.inventory.parts.length > 0
  const hasDocs = state.inventory.docIds.length > 0
  const sentAnything = Object.values(state.docs).some((doc) => doc.holder !== 'player' && doc.holder !== 'destroyed')
  const canForgeSomething = DOC_TEMPLATES.some((template) => matchTemplateParts(state, template.id) !== null)
  const actedAfterVow = state.commands.some((command) => command.t !== 'choose-vow' && command.t !== 'move')

  if (state.day === 18) return sentAnything
    ? '最后一夜。信已经离手；还来得及补另一条因果，但别把所有希望压在同一个人身上。'
    : '今天日晡，外城必陷。还没送出去的纸，今夜之后就只剩灰。'
  if (!actedAfterVow && state.vow) return VOW_FIRST_STEPS[state.vow]
  if (sentAnything && !hasDocs) return '信在路上。晨报只告诉你街面听得见的；真正的人心变化，要再去探，或等到破晓清账。'
  if (!probedAnyone) return '跟人说话会花一个时辰。探问不只给底细，也会让你摸熟他每天的脚程。'
  if (!observedAnything) return '先看清，再动刀。现场的东西看过，才知道哪里能下手。'
  if (!hasParts && !hasDocs) return '伪造不是凭空写字：要纸、印或笔迹。观察和探问会告诉你它们在哪里。'
  if (!hasDocs && !canForgeSomething) return '要件还不齐。打开工作台能看见每种文书究竟缺什么。'
  if (!hasDocs && canForgeSomething) return '料齐了。回刻字铺上工作台；一句话更稳，两句话能串起更长的因果，也更贪心。'
  if (hasDocs) return '纸留在袖里不会改变任何人。找到肯带信的人，选一个真正需要相信这句话的收信人。'
  return null
}

export default function PlayScreen({ state, dispatch, onAbandon }: PlayScreenProps) {
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [hintMuted, setHintMuted] = useState(false)
  const headingRef = useScreenEntry<HTMLHeadingElement>()
  const options = useMemo(() => legalCommands(state), [state])
  const location = LOCATIONS_BY_ID[state.playerLocation]
  const present = presentNpcIds(state)
  const slotName = SLOT_NAMES[Math.min(state.slot, SLOTS_PER_DAY - 1)]
  const canAct = state.slot < SLOTS_PER_DAY
  const hint = hintMuted ? null : deriveHint(state)
  const remaining = Math.max(0, (18 - state.day) * SLOTS_PER_DAY + (SLOTS_PER_DAY - state.slot))
  const latestEcho = [...state.audit].reverse().find((entry) => entry.visibleToPlayer && entry.phase === 'action')
  const modalOpen = overlay !== 'none'

  const observablesHere = OBSERVABLES.filter((item) => item.locationId === state.playerLocation)
  const collectablesHere = COLLECTABLES.filter(
    (item) => item.locationId === state.playerLocation && !state.removedWorldItemIds.includes(item.id),
  )
  const canRun = (cmd: PlayerCommand) => options.some((option) => JSON.stringify(option) === JSON.stringify(cmd))

  return (
    <div className="sim-play-root">
      <div className="sim-shell sim-play-stage" inert={modalOpen || undefined}>
        <header className="sim-topbar">
          <div className="sim-date-block">
            <span className="sim-date">崇祯十七年三月<b>{numeral(state.day)}</b> · {slotName}</span>
            <span className="sim-countdown" aria-label={`距离外城陷落还剩 ${remaining} 个时辰`}><b>{remaining}</b> 时辰后外城陷</span>
          </div>
          <div className="sim-time-meter" aria-label={`今日四个时辰已用 ${state.slot} 个，还剩 ${Math.max(0, SLOTS_PER_DAY - state.slot)} 个`}>
            {Array.from({ length: SLOTS_PER_DAY }, (_, index) => (
              <i key={index} className={`sim-slot-dot${index < state.slot ? ' spent' : ''}`} aria-hidden="true" />
            ))}
          </div>
          <div className="sim-topbar-right">
            <span className="sim-heat" title={`盘查 ${SUSPICION_THRESHOLDS[0]} · 搜查 ${SUSPICION_THRESHOLDS[1]} · 缉拿 ${SUSPICION_THRESHOLDS[2]}`}>
              <span className="sim-heat-label">嫌疑 <b>{state.suspicion}/{SUSPICION_MAX}</b></span>
              <span className="sim-heat-ticks" aria-hidden="true">
                {Array.from({ length: SUSPICION_MAX }, (_, index) => {
                  const level = index + 1
                  const isMark = (SUSPICION_THRESHOLDS as readonly number[]).includes(level)
                  return <i key={level} className={`sim-heat-tick${level <= state.suspicion ? ' hot' : ''}${isMark ? ' mark' : ''}`} />
                })}
              </span>
            </span>
            <span className="sim-silver">银 {state.inventory.silver} 两</span>
            <button type="button" className="sim-btn sim-btn-ghost sim-btn-small" onClick={onAbandon}>离席</button>
          </div>
        </header>

        {hint ? (
          <aside className="sim-hint" role="note" aria-label="当前线索">
            <span className="sim-hint-mark" aria-hidden="true">忖</span>
            <span className="sim-hint-text">{hint}</span>
            <button type="button" className="sim-hint-close" onClick={() => setHintMuted(true)} aria-label="隐藏这条提示">收起</button>
          </aside>
        ) : null}

        {latestEcho ? (
          <div className="sim-action-echo" role="status">
            <span>刚才</span><p>{latestEcho.text}</p>
          </div>
        ) : null}

        <div className="sim-board">
          <main className="sim-panel sim-location-panel">
            <div className="sim-location-head">
              <div>
                <p className="sim-kicker">{slotName}时 · {present.length} 人在场</p>
                <h1 ref={headingRef} tabIndex={-1}>{location?.name ?? state.playerLocation}</h1>
                <p>{location?.brief}</p>
              </div>
              <span className="sim-location-mark" aria-hidden="true">{location?.name.slice(0, 1)}</span>
            </div>

            <section className="sim-play-section" aria-labelledby="people-title">
              <div className="sim-section-title"><h2 id="people-title">在场的人</h2><span>探问耗一个时辰</span></div>
              {present.length === 0 ? <p className="sim-empty">这个时辰，这里没有说得上话的人。</p> : (
                <ul className="sim-list">
                  {present.map((npcId) => {
                    const npc = NPCS_BY_ID[npcId]
                    return (
                      <li key={npcId} className="sim-item sim-person-item">
                        <span className="sim-seal" aria-hidden="true">{npc.mark}</span>
                        <div className="sim-item-main">
                          <div className="sim-item-title">{npc.name}<small>{npc.role}</small></div>
                          <div className="sim-item-sub">{npc.brief}</div>
                        </div>
                        <button type="button" className="sim-btn sim-btn-small" disabled={!canAct} onClick={() => dispatch({ t: 'probe', npcId })}>探问</button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="sim-play-section" aria-labelledby="observe-title">
              <div className="sim-section-title"><h2 id="observe-title">眼前可查</h2><span>细看耗一个时辰</span></div>
              {observablesHere.length === 0 ? <p className="sim-empty">这里没有值得细看的东西。</p> : (
                <ul className="sim-list">
                  {observablesHere.map((item) => {
                    const seen = hasObserved(state, item.id)
                    return (
                      <li key={item.id} className={`sim-item${seen ? ' done' : ''}`}>
                        <div className="sim-item-main">
                          <div className="sim-item-title">{item.label}</div>
                          <div className="sim-item-sub">{seen ? item.detail : '先看清门道，才知道下一步能做什么。'}</div>
                        </div>
                        {seen ? <span className="sim-done-mark">已查</span> : (
                          <button type="button" className="sim-btn sim-btn-small" disabled={!canAct} onClick={() => dispatch({ t: 'observe', observableId: item.id })}>细看</button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {collectablesHere.length > 0 ? (
              <section className="sim-play-section" aria-labelledby="collect-title">
                <div className="sim-section-title"><h2 id="collect-title">可以下手</h2><span>取得耗一个时辰</span></div>
                <ul className="sim-list">
                  {collectablesHere.map((item) => {
                    const available = canRun({ t: 'collect', collectableId: item.id })
                    return (
                      <li key={item.id} className="sim-item">
                        <div className="sim-item-main">
                          <div className="sim-item-title">{item.label}</div>
                          <div className="sim-item-sub">
                            {item.costSilver > 0 ? `价 ${item.costSilver} 两。` : '不要钱，要胆子。'}
                            {item.suspicion > 0 ? ` 嫌疑加 ${item.suspicion}。` : ''}
                            {item.contraband ? ' 违禁物，被搜出会要命。' : ''}
                          </div>
                        </div>
                        <button type="button" className="sim-btn sim-btn-small" disabled={!available || !canAct} onClick={() => dispatch({ t: 'collect', collectableId: item.id })}>收下</button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            <section className="sim-rest-block" aria-label="度过一个时辰">
              <div>
                <p className="sim-kicker">不做别的事</p>
                <strong>{state.playerLocation === 'keji-shop' ? '躲进阁楼，避一个时辰风头' : '在街边耗过一个时辰'}</strong>
                <span>{state.playerLocation === 'keji-shop' && state.suspicion > 0 ? '嫌疑会降一分。' : state.suspicion > 0 ? '在外面待着不会降低嫌疑。' : '让时间继续往前走。'}</span>
              </div>
              <button type="button" className="sim-btn" disabled={!canAct} onClick={() => dispatch({ t: 'rest' })}>等一时辰</button>
            </section>
          </main>

          <aside className="sim-side">
            <section className="sim-panel sim-map-panel" aria-labelledby="map-title">
              <div className="sim-flex-title"><h2 id="map-title">外城图</h2><span className="sim-quiet">移动不耗时</span></div>
              <CityMap state={state} dispatch={dispatch} />
              <p className="sim-map-note">探过底细的人，才会在图上留下行踪印记。</p>
            </section>

            <section className="sim-panel sim-inventory" aria-labelledby="inventory-title">
              <div className="sim-flex-title">
                <h2 id="inventory-title">袖中</h2>
                <button type="button" className="sim-btn sim-btn-small" onClick={() => setOverlay('dossier')}>人物册</button>
              </div>

              <div className="sim-inventory-block">
                <h3>制书要件</h3>
                {state.inventory.parts.length === 0 ? <p className="sim-empty">空空如也。观察、探问，再下手。</p> : (
                  <div>
                    {state.inventory.parts.map((part) => (
                      <span key={part.id} className={`sim-chip${part.contraband ? ' contraband' : ''}`}>
                        {COLLECTABLES_BY_ID[part.id]?.label ?? part.refId}
                        {part.usesLeft !== undefined ? <b>×{part.usesLeft}</b> : null}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {state.playerLocation === 'keji-shop' ? (
                <button type="button" className="sim-btn sim-btn-primary sim-workbench-call" disabled={!canAct} onClick={() => setOverlay('workbench')}>
                  <span>上工作台</span><small>看型制、缺件与可写的话</small>
                </button>
              ) : (
                <p className="sim-return-note">要制书或改笔，得回刻字铺。</p>
              )}

              <div className="sim-inventory-block">
                <h3>已经刻好的文书</h3>
                {state.inventory.docIds.length === 0 ? <p className="sim-empty">手上还没有能改变谁的纸。</p> : (
                  <ul className="sim-doc-list">
                    {state.inventory.docIds.map((docId) => {
                      const doc = state.docs[docId]
                      const canAlter = state.playerLocation === 'keji-shop' && options.some((cmd) => cmd.t === 'alter' && cmd.docId === docId)
                      return (
                        <li key={docId} className="sim-doc-card">
                          <DocScroll doc={doc} compact />
                          <div className="sim-doc-actions">
                            <button type="button" className="sim-btn sim-btn-small sim-btn-primary" onClick={() => setOverlay(`send:${docId}`)}>托人送出</button>
                            {canAlter ? <button type="button" className="sim-btn sim-btn-small" onClick={() => setOverlay(`alter:${docId}`)}>补写一笔</button> : null}
                            <button type="button" className="sim-btn sim-btn-small sim-btn-danger" onClick={() => dispatch({ t: 'destroy', docId })}>烧掉</button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>

            <p className="sim-seed-note">本局种子 {state.seed} · 同种子同选择，所有人心与判定逐字重演</p>
          </aside>
        </div>
      </div>

      {overlay === 'workbench' ? <WorkbenchPanel state={state} dispatch={dispatch} onClose={() => setOverlay('none')} /> : null}
      {overlay === 'dossier' ? <DossierPanel state={state} onClose={() => setOverlay('none')} /> : null}
      {overlay.startsWith('send:') ? (
        <SendPanel
          state={state}
          docId={overlay.slice(5)}
          options={options}
          dispatch={(cmd) => { dispatch(cmd); setOverlay('none') }}
          onClose={() => setOverlay('none')}
        />
      ) : null}
      {overlay.startsWith('alter:') ? (
        <AlterPanel
          state={state}
          docId={overlay.slice(6)}
          options={options}
          dispatch={(cmd) => { dispatch(cmd); setOverlay('none') }}
          onClose={() => setOverlay('none')}
        />
      ) : null}
    </div>
  )
}

function numeral(day: number) {
  return day === 16 ? '十六' : day === 17 ? '十七' : day === 18 ? '十八' : '十九'
}

interface CommandPanelProps {
  state: SimState
  docId: string
  options: PlayerCommand[]
  dispatch: (cmd: PlayerCommand) => void
  onClose: () => void
}

/** 托送从引擎给出的合法命令反推可选带信人与收信人。 */
function SendPanel({ state, docId, options, dispatch, onClose }: CommandPanelProps) {
  const sendable = options.filter(
    (cmd): cmd is Extract<PlayerCommand, { t: 'dispatch' }> => cmd.t === 'dispatch' && cmd.docId === docId,
  )
  const couriers = [...new Set(sendable.map((cmd) => cmd.courierId))]
  const [courierId, setCourierId] = useState<string | null>(couriers[0] ?? null)
  const targets = [...new Set(sendable.filter((cmd) => cmd.courierId === courierId).map((cmd) => cmd.targetNpcId))]
  const doc = state.docs[docId]
  const template = doc ? DOC_TEMPLATES_BY_ID[doc.templateId] : undefined

  return (
    <Modal title={`托送${template?.name ?? '文书'}`} eyebrow="纸一离手，今夜才见回声" closeLabel="收回" onClose={onClose}>
      {couriers.length === 0 ? (
        <div className="sim-empty-state">
          <span aria-hidden="true">空</span>
          <p>此刻身边没有肯带信的人。去找赵四、豆子或吴七娘；先探底细，人物册里会记下他们的脚程。</p>
        </div>
      ) : (
        <>
          <div className="sim-field">
            <span className="sim-field-label">壹 · 把纸交给谁</span>
            <div className="sim-options">
              {couriers.map((id) => {
                const npc = NPCS_BY_ID[id]
                return (
                  <button key={id} type="button" className={`sim-option${courierId === id ? ' picked' : ''}`} onClick={() => setCourierId(id)} aria-pressed={courierId === id}>
                    <b>{npc.name} · {npc.role}</b><span className="sub">{npc.stance}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="sim-field">
            <span className="sim-field-label">贰 · 最终送给谁</span>
            <div className="sim-options sim-options-grid">
              {targets.map((id) => {
                const npc = NPCS_BY_ID[id]
                return (
                  <button key={id} type="button" className="sim-option sim-target-option" onClick={() => courierId && dispatch({ t: 'dispatch', docId, courierId, targetNpcId: id })}>
                    <span className="sim-target-mark" aria-hidden="true">{npc.mark}</span>
                    <b>{npc.name}</b><span className="sub">{npc.role} · 信一出手，就不归你了。</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}

function AlterPanel({ state, docId, options, dispatch, onClose }: CommandPanelProps) {
  const doc = state.docs[docId]
  const template = doc ? DOC_TEMPLATES_BY_ID[doc.templateId] : undefined
  const alterable = options.filter(
    (cmd): cmd is Extract<PlayerCommand, { t: 'alter' }> => cmd.t === 'alter' && cmd.docId === docId,
  )

  return (
    <Modal title={`补写${template?.name ?? '文书'}`} eyebrow="多一句话，多一条因果，也多一道刮补痕" closeLabel="不改" onClose={onClose}>
      <p className="sim-modal-lede">补写耗一个时辰，成色永久降一档。文书最多承载两句话。</p>
      <div className="sim-options">
        {alterable.map((command) => {
          const claim = CLAIMS_BY_ID[command.addClaimId]
          return (
            <button key={command.addClaimId} type="button" className="sim-option" onClick={() => dispatch(command)}>
              <b>{claim?.text ?? command.addClaimId}</b>
              {claim ? <span className="sub">{claim.boundary}</span> : null}
              <SourceLink sourceId={claim?.sourceId} compact />
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
