import { EXECUTED_FAMILY, NPCS_BY_ID, OUTCOME_FAMILIES, PILLARS_BY_ID } from '../content'
import { chronicleFamilyId } from '../engine/chronicle'
import type { AuditEntry, ChronicleLayer, SimState } from '../types'

interface EndScreenProps {
  state: SimState
  onRestart: () => void
  onHome: () => void
}

const LAYER_TITLES: Record<ChronicleLayer, { title: string; sub: string }> = {
  fact: { title: '事实层', sub: '那一夜实际发生的事' },
  record: { title: '记载层', sub: '被写下来的——和被漏掉的' },
  legend: { title: '流传层', sub: '百年之后，史书与口碑怎么说' },
}

const LEVER_NAMES: Record<string, string> = { gate: '门', roster: '册', chunsheng: '人' }

/** 复盘只取改变过世界的账目 */
const REPLAY_KINDS = new Set<AuditEntry['kind']>([
  'forge', 'dispatch', 'carry', 'betray', 'inspect', 'belief', 'npc-act', 'suspicion', 'search', 'arrest', 'pillar', 'lever',
])

export default function EndScreen({ state, onRestart, onHome }: EndScreenProps) {
  const executed = state.status === 'executed'
  const familyId = chronicleFamilyId(state)
  const family = [...OUTCOME_FAMILIES, EXECUTED_FAMILY].find((candidate) => candidate.id === familyId)
  const replay = state.audit.filter((entry) => REPLAY_KINDS.has(entry.kind))
  const labelOf = new Map(state.audit.map((entry) => [entry.id, entry] as const))

  return (
    <div className="sim-shell sim-end">
      <div className="sim-report-sheet">
        <p className="sim-kicker">{executed ? '这一局，在站笼前结束' : '三月十九 · 破晓'}</p>
        <h2>{family?.title ?? familyId}</h2>
        <p className="sim-report-date">{family?.boundary}</p>

        {!executed && state.node ? (
          <>
            <h3 style={{ letterSpacing: '.2em', color: 'var(--cinnabar)' }}>撬点清账 —— 天意，还是人事？</h3>
            <ul className="sim-report-list">
              {state.node.levers.map((lever) => (
                <li key={lever.lever} className={lever.tipped ? '' : 'quiet'}>
                  <b>【{LEVER_NAMES[lever.lever]}】</b>
                  胜算 {lever.chance}%，史骰 {lever.roll} —— {lever.tipped ? '撬动了。' : '没能撬动。'}
                  <div className="sim-quiet">
                    {state.node!.pillars
                      .filter((pillar) => PILLARS_BY_ID[pillar.id]?.leverId === lever.lever)
                      .map((pillar) => {
                        const def = PILLARS_BY_ID[pillar.id]
                        return (
                          <div key={pillar.id}>
                            {pillar.status === 'fallen' ? '▣' : '□'} {def.title}
                            （{NPCS_BY_ID[def.npcId]?.name}·{pillar.status === 'fallen' ? '柱倒' : '柱立'}·权重{def.weight}）
                          </div>
                        )
                      })}
                  </div>
                </li>
              ))}
            </ul>
            <p className="sim-quiet">
              主节点「城破」没有骰子——它不归你撬。撬点的胜算从一成起步，每倒一根柱加它的权重；同种子同选择，骰值必然相同。
            </p>
          </>
        ) : null}

        <h3 style={{ letterSpacing: '.2em', color: 'var(--cinnabar)', marginTop: 24 }}>你刻出来的编年史</h3>
        {(['fact', 'record', 'legend'] as const).map((layer) => {
          const entries = (state.chronicle ?? []).filter((entry) => entry.layer === layer)
          if (entries.length === 0) return null
          return (
            <section key={layer} style={{ marginBottom: 18 }}>
              <h4 style={{ margin: '0 0 4px', letterSpacing: '.14em' }}>
                {LAYER_TITLES[layer].title}
                <span className="sim-quiet" style={{ marginLeft: 10 }}>{LAYER_TITLES[layer].sub}</span>
              </h4>
              <ul className="sim-report-list">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    {entry.text}
                    {entry.divergence ? <div className="sim-quiet">〔史据与边界〕{entry.divergence}</div> : null}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        <details style={{ marginTop: 20 }}>
          <summary style={{ cursor: 'pointer', letterSpacing: '.2em', color: 'var(--cinnabar)' }}>
            因果复盘 —— 每一步是怎么变成历史的
          </summary>
          <ul className="sim-report-list" style={{ marginTop: 12 }}>
            {replay.map((entry) => {
              const cause = entry.causeIds.map((id) => labelOf.get(id)).find(Boolean)
              return (
                <li key={entry.id} className={entry.visibleToPlayer ? '' : 'quiet'}>
                  <span className="sim-quiet">三月{entry.day === 16 ? '十六' : entry.day === 17 ? '十七' : '十八'}{entry.phase === 'night' ? '夜' : entry.phase === 'node' ? '·十九晓' : ''}</span>
                  　{entry.text}
                  {entry.chance !== undefined ? (
                    <span className="sim-quiet">（判 {entry.chance}%，骰 {entry.roll}）</span>
                  ) : null}
                  {cause ? <div className="sim-quiet">↳ 起因：{cause.text.slice(0, 40)}{cause.text.length > 40 ? '……' : ''}</div> : null}
                </li>
              )
            })}
          </ul>
          <p className="sim-quiet">
            灰字是你当时看不见的暗流。所有骰子此刻公开：同一颗种子、同一串选择，历史必然重演。
          </p>
        </details>

        <div className="sim-row" style={{ marginTop: 22 }}>
          <button type="button" className="sim-btn sim-btn-primary" onClick={onRestart}>
            换一个杠杆，再试一次历史
          </button>
          <button type="button" className="sim-btn" onClick={onHome}>
            回门面
          </button>
        </div>
        <p className="sim-quiet" style={{ marginTop: 10 }}>
          这一局的编年史已收进「史鉴」。攒齐五种结局的人，才算真的认识了这三天。
        </p>
      </div>
    </div>
  )
}
