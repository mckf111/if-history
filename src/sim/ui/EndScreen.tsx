import { useState } from 'react'
import { EXECUTED_FAMILY, NPCS_BY_ID, OUTCOME_FAMILIES, PILLARS_BY_ID } from '../content'
import { chronicleFamilyId } from '../engine/chronicle'
import { deriveHumanFates } from '../engine/humanFates'
import SourceLink from './SourceLink'
import { useScreenEntry } from './useScreenEntry'
import type { AuditEntry, ChronicleLayer, CodexState, LeverId, NodeOutcome, SimState, VowId } from '../types'

interface EndScreenProps {
  state: SimState
  codex: CodexState
  onRetrySeed: () => void
  onRestart: () => void
  onHome: () => void
}

const LAYER_TITLES: Record<ChronicleLayer, { title: string; sub: string }> = {
  fact: { title: '事实层', sub: '那一夜实际发生的事' },
  record: { title: '记载层', sub: '被写下来的，和被漏掉的' },
  legend: { title: '流传层', sub: '百年之后，史书与口碑怎么说' },
}

const LEVER_NAMES: Record<LeverId, { mark: string; title: string; baseline: string }> = {
  gate: { mark: '门', title: '三条胡同', baseline: '门在乱中打开' },
  roster: { mark: '册', title: '匠籍名册', baseline: '名册完整落入新主之手' },
  chunsheng: { mark: '人', title: '姚春生', baseline: '随运夫营转输出城' },
}

const VOWS: Record<VowId, { lever: LeverId; promise: string }> = {
  'save-chunsheng': { lever: 'chunsheng', promise: '把春生带回来' },
  'protect-roster': { lever: 'roster', promise: '让匠户从册上消失' },
  'protect-neighborhood': { lever: 'gate', promise: '保住三条胡同' },
}

/** 复盘只取改变过世界的账目。 */
const REPLAY_KINDS = new Set<AuditEntry['kind']>([
  'forge', 'alter', 'dispatch', 'carry', 'betray', 'inspect', 'belief', 'npc-act',
  'suspicion', 'search', 'arrest', 'pillar', 'lever',
])

export default function EndScreen({ state, codex, onRetrySeed, onRestart, onHome }: EndScreenProps) {
  const headingRef = useScreenEntry<HTMLHeadingElement>()
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const executed = state.status === 'executed'
  const familyId = chronicleFamilyId(state)
  const family = [...OUTCOME_FAMILIES, EXECUTED_FAMILY].find((candidate) => candidate.id === familyId)
  const replay = state.audit.filter((entry) => REPLAY_KINDS.has(entry.kind))
  const labelOf = new Map(state.audit.map((entry) => [entry.id, entry] as const))
  const humanFates = deriveHumanFates(state)
  const primaryFate = humanFates?.items[0]
  const vow = state.vow ? VOWS[state.vow] : null
  const vowedLever = vow ? state.node?.levers.find((lever) => lever.lever === vow.lever) : undefined
  const vowKept = Boolean(vowedLever?.tipped)
  const heroHeadline = executed ? humanFates?.heading : primaryFate?.headline
  const heroOutcome = executed ? humanFates?.intro : primaryFate?.outcome
  const collectibleFamilies = OUTCOME_FAMILIES.filter((candidate) => candidate.collectible !== false)
  const collectibleIds = new Set(collectibleFamilies.map((candidate) => candidate.id))
  const collectedFamilies = new Set(
    codex.chronicles.map((entry) => entry.familyId).filter((id) => collectibleIds.has(id)),
  )
  const newlyUnlocked = !codex.chronicles.some((entry) => entry.familyId === familyId)
  if (collectibleIds.has(familyId)) collectedFamilies.add(familyId)
  const copySummary = async () => {
    const summary = [
      '《城破前夜：刻下无名》',
      `史鉴题签：${family?.title ?? familyId}`,
      vow ? `开局之誓「${vow.promise}」：${vowKept ? '守住了' : '没能守住'}` : null,
      heroHeadline ? `人物结局：${heroHeadline}` : null,
      `本局种子：${state.seed}`,
      'https://mckf111.github.io/if-history/',
    ].filter((line): line is string => Boolean(line)).join('\n')
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(summary)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  return (
    <main className="sim-shell sim-end">
      <article className="sim-ending-card">
        <header className={`sim-ending-hero fate-${primaryFate?.result ?? 'unresolved'}`}>
          <img className="sim-ending-art" src="./art/ending-woodcut.webp" alt="" decoding="async" />
          <div className="sim-ending-title">
            <p className="sim-kicker">
              {executed ? '这一局，在站笼前结束' : '三月十九 · 昧爽 · 城破'}
              <span className="sim-family-tag">史鉴题签 · {family?.title ?? familyId}</span>
            </p>
            <h1 ref={headingRef} tabIndex={-1}>{heroHeadline ?? family?.title ?? familyId}</h1>
            <p>{heroOutcome ?? family?.boundary}</p>
          </div>
          <div className={`sim-vow-verdict ${vowKept ? 'kept' : 'broken'}`}>
            <span className="sim-vow-verdict-mark" aria-hidden="true">{vow ? LEVER_NAMES[vow.lever].mark : '誓'}</span>
            <div>
              <small>开局之誓 · {vow?.promise ?? '未立誓'}</small>
              <strong>{vowKept ? '你做到了。' : executed ? '你没能活着等到答案。' : '你没能守住它。'}</strong>
            </div>
          </div>
        </header>

        <div className="sim-ending-actions sim-ending-actions-top">
          <button type="button" className="sim-btn sim-btn-primary sim-btn-hero" onClick={onRetrySeed}>
            同种子重走 · 骰子不变
          </button>
          <button type="button" className="sim-btn" onClick={onRestart}>换一条因果 · 新种子</button>
          <button type="button" className="sim-btn" onClick={() => void copySummary()}>
            {copyStatus === 'copied' ? '结局摘要已复制' : copyStatus === 'failed' ? '浏览器未允许复制' : '复制结局摘要'}
          </button>
          <button type="button" className="sim-btn" onClick={onHome}>先把这一卷收进史鉴</button>
        </div>

        <section className={`sim-ending-codex${newlyUnlocked ? ' new' : ''}`} aria-label="史鉴收藏进度">
          <span>史鉴 已收 <b>{collectedFamilies.size}/{collectibleFamilies.length}</b></span>
          <strong>{newlyUnlocked ? `本局新增《${family?.title ?? familyId}》` : `《${family?.title ?? familyId}》已在史鉴`}</strong>
        </section>

        <nav className="sim-ending-nav" aria-label="结局区段导航">
          {humanFates ? <a href="#ending-fates">跳到人的命运</a> : null}
          {!executed && state.node ? <a href="#ending-levers">跳到三个撬点</a> : null}
          <a href="#ending-chronicle">跳到三层编年史</a>
          <a href="#ending-causes">跳到因果总账</a>
        </nav>

        {humanFates ? (
          <section id="ending-fates" className="sim-ending-section sim-human-fates" aria-labelledby="human-fates-title">
            <div className="sim-section-heading">
              <p className="sim-kicker">结算一 · 人的命运</p>
              <div>
                <h2 id="human-fates-title">你动的是纸，承受结果的是人</h2>
                <p className="sim-quiet">{humanFates.intro}</p>
              </div>
            </div>
            <div className="sim-fate-grid">
              {humanFates.items.map((item) => {
                const causes = item.sourceAuditIds
                  .map((id) => labelOf.get(id))
                  .filter((entry): entry is AuditEntry => Boolean(entry) && entry?.kind !== 'lever')
                return (
                  <article key={item.lever} className={`sim-fate-card ${item.result}${item.primary ? ' primary' : ''}`}>
                    <span className="sim-fate-subject">{item.primary ? '开局之誓 · ' : ''}{item.subject}</span>
                    <h3>{item.headline}</h3>
                    <p>{item.outcome}</p>
                    <details>
                      <summary>为什么会走到这里</summary>
                      <p>{item.reason}</p>
                      {causes.length > 0 ? (
                        <ul>
                          {causes.slice(0, 4).map((cause) => <li key={cause.id}>{cause.text}</li>)}
                        </ul>
                      ) : null}
                    </details>
                  </article>
                )
              })}
            </div>
            <p className="sim-outcome-family-note"><strong>史鉴题签 · {family?.title ?? familyId}</strong>{family?.boundary}</p>
          </section>
        ) : null}

        {!executed && state.node ? (
          <section id="ending-levers" className="sim-ending-section" aria-labelledby="lever-title">
            <div className="sim-section-heading">
              <p className="sim-kicker">结算二 · 三个局部撬点</p>
              <h2 id="lever-title">城破挡不住；下面三件事，由人心决定</h2>
            </div>
            <div className="sim-lever-grid">
              {state.node.levers.map((lever) => {
                const name = LEVER_NAMES[lever.lever]
                return (
                  <article key={lever.lever} className={`sim-lever-card ${lever.tipped ? 'tipped' : 'held'}`}>
                    <div className="sim-lever-seal" aria-hidden="true">{name.mark}</div>
                    <div className="sim-lever-copy">
                      <span>{name.title}</span>
                      <strong>{lever.tipped ? '偏离了原来的路' : name.baseline}</strong>
                      <p>{resolutionText(lever.resolution, lever.chance, lever.roll, lever.tipped)}</p>
                    </div>
                    <details>
                      <summary>看支撑它的三根柱</summary>
                      <ul>
                        {state.node!.pillars
                          .filter((pillar) => PILLARS_BY_ID[pillar.id]?.leverId === lever.lever)
                          .map((pillar) => {
                            const definition = PILLARS_BY_ID[pillar.id]
                            return (
                              <li key={pillar.id} className={pillar.status === 'fallen' ? 'fallen' : ''}>
                                <span>{pillar.status === 'fallen' ? '柱倒' : '柱立'}</span>
                                <b>{definition.title}</b>
                                <small>{NPCS_BY_ID[definition.npcId]?.name} · 权重 {definition.weight}</small>
                              </li>
                            )
                          })}
                      </ul>
                    </details>
                  </article>
                )
              })}
            </div>
            <p className="sim-method-note">
              未倒一柱，胜算就是零；倒柱后才从一成起算。三根柱全倒或确定性人物行动，都可直接保证结果。所有随机数来自存档种子，同种子同选择必然重演。
            </p>
          </section>
        ) : null}

        <section id="ending-chronicle" className="sim-ending-section" aria-labelledby="chronicle-title">
          <div className="sim-section-heading">
            <p className="sim-kicker">结算三 · 三层编年史</p>
            <h2 id="chronicle-title">你刻下的，不一定就是后来人读到的</h2>
          </div>
          <div className="sim-chronicle-grid">
            {(['fact', 'record', 'legend'] as const).map((layer) => {
              const entries = (state.chronicle ?? []).filter((entry) => entry.layer === layer)
              if (entries.length === 0) return null
              return (
                <section key={layer} className={`sim-chronicle-layer layer-${layer}`}>
                  <span className="sim-layer-mark" aria-hidden="true">{layer === 'fact' ? '实' : layer === 'record' ? '录' : '传'}</span>
                  <h3>{LAYER_TITLES[layer].title}</h3>
                  <p className="sim-quiet">{LAYER_TITLES[layer].sub}</p>
                  <ul>
                    {entries.map((entry) => (
                      <li key={entry.id}>
                        <p>{entry.text}</p>
                        {entry.divergence ? <small>〔史据与边界〕{entry.divergence}</small> : null}
                        <SourceLink sourceId={entry.sourceId} compact />
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        </section>

        <details id="ending-causes" className="sim-causal-replay">
          <summary>展开因果总账：每一步怎么变成历史</summary>
          <ol>
            {replay.map((entry) => {
              const causes = entry.causeIds.map((id) => labelOf.get(id)).filter((cause): cause is AuditEntry => Boolean(cause))
              return (
                <li key={entry.id} className={entry.visibleToPlayer ? '' : 'hidden-current'}>
                  <span className="sim-cause-time">三月{dayName(entry.day)}{entry.phase === 'night' ? '夜' : entry.phase === 'node' ? '·十九晓' : ''}</span>
                  <p>{entry.text}</p>
                  {entry.chance !== undefined ? (
                    <small>{entry.roll === undefined ? `判定 ${entry.chance}% · 不掷骰` : `判定 ${entry.chance}% · 骰值 ${entry.roll}`}</small>
                  ) : null}
                  {causes.length > 0 ? (
                    <div className="sim-cause-links">
                      {causes.map((cause) => <span key={cause.id}>↳ {cause.text}</span>)}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ol>
          <p className="sim-method-note">淡色条目是你当时看不见的暗流；终局才公开。这里展示全部直接起因，不再只挑第一条。</p>
        </details>

        <footer className="sim-ending-footer">
          <p>这一局已收进「史鉴」。七类正常结局与一种失败结局，都有不同的事实、记载和流传。</p>
          <div className="sim-ending-actions">
            <button type="button" className="sim-btn sim-btn-primary" onClick={onRestart}>另开一局</button>
            <button type="button" className="sim-btn" onClick={onHome}>回门面</button>
          </div>
        </footer>
      </article>
    </main>
  )
}

function resolutionText(resolution: NodeOutcome['levers'][number]['resolution'], chance: number, roll: number | undefined, tipped: boolean) {
  if (resolution === 'untouched') return '你没有倒下一根相关的柱：未触碰，不掷骰。'
  if (resolution === 'resisted') return '你的因果已经抵达这里，但没有倒下一根相关的柱：有过波澜，不掷骰。'
  if (resolution === 'guaranteed') return '周全准备或已经发生的人物行动已把结果坐实：确定发生，不掷骰。'
  return `胜算 ${chance}% · 骰值 ${roll ?? '—'}：${tipped ? '成了。' : '差了一步。'}`
}

function dayName(day: number) {
  return day === 16 ? '十六' : day === 17 ? '十七' : day === 18 ? '十八' : '十九'
}
