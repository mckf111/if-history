import { EXECUTED_FAMILY, NPCS, NPCS_BY_ID, NPC_ACTIONS, OUTCOME_FAMILIES } from '../content'
import Modal from './Modal'
import SourceLink from './SourceLink'
import type { CodexState } from '../types'

interface CodexPanelProps {
  codex: CodexState
  onClose: () => void
}

const KNOWN_FAMILIES = [...OUTCOME_FAMILIES, EXECUTED_FAMILY]
const COLLECTIBLE_FAMILIES = KNOWN_FAMILIES.filter((family) => family.collectible !== false)
const COLLECTIBLE_FAMILY_IDS = new Set(COLLECTIBLE_FAMILIES.map((family) => family.id))

/** 史鉴：跨局收藏馆。因果连线逐局点亮，编年史逐局收集，人物档案逐局补全。 */
export default function CodexPanel({ codex, onClose }: CodexPanelProps) {
  const lit = new Set(codex.litLinks)
  const collectedFamilies = new Set(
    codex.chronicles.map((entry) => entry.familyId).filter((familyId) => COLLECTIBLE_FAMILY_IDS.has(familyId)),
  )

  return (
    <Modal title="史鉴" eyebrow="跨局因果档案" onClose={onClose} wide>
        <p className="sim-quiet">失败也是知识。这里记着你在每一局里验证过的因果，跨局不灭。</p>

        <h3 style={{ letterSpacing: '.2em', color: 'var(--cinnabar)' }}>结局收藏（{collectedFamilies.size}/{COLLECTIBLE_FAMILIES.length}）</h3>
        <div>
          {COLLECTIBLE_FAMILIES.map((family) => (
            <span
              key={family.id}
              className="sim-chip"
              style={collectedFamilies.has(family.id) ? { borderColor: 'var(--cinnabar)', color: 'var(--cinnabar)' } : { opacity: .5 }}
            >
              {collectedFamilies.has(family.id) ? family.title : '？？？'}
            </span>
          ))}
        </div>

        <h3 style={{ letterSpacing: '.2em', color: 'var(--cinnabar)' }}>验证过的因果（{NPC_ACTIONS.filter((action) => lit.has(`act:${action.npcId}:${action.when.claimId}`)).length}/{NPC_ACTIONS.length}）</h3>
        <ul className="sim-list">
          {NPC_ACTIONS.map((action) => {
            const isLit = lit.has(`act:${action.npcId}:${action.when.claimId}`)
            const npc = NPCS_BY_ID[action.npcId]
            return (
              <li key={action.id} className={`sim-item${isLit ? '' : ' done'}`}>
                <span className={`sim-seal${isLit ? '' : ' jade'}`}>{npc?.mark ?? '？'}</span>
                <div className="sim-item-main">
                  <div className="sim-item-title">{isLit ? `${npc?.name}：信念成行` : '尚未点亮的因果'}</div>
                  <div className="sim-item-sub">{isLit ? action.boundary : '让某个人信下某句话，看他夜里做什么。'}</div>
                </div>
              </li>
            )
          })}
        </ul>

        <h3 style={{ letterSpacing: '.2em', color: 'var(--cinnabar)' }}>人物档案</h3>
        <div>
          {NPCS.map((npc) => {
            const known = codex.dossiers[npc.id]?.length ?? 0
            return (
              <span key={npc.id} className="sim-chip" style={known === npc.secrets.length ? { borderColor: 'var(--jade)', color: 'var(--jade)' } : undefined}>
                {npc.mark} {npc.name} {known}/{npc.secrets.length}
              </span>
            )
          })}
        </div>

        {codex.chronicles.length > 0 ? (
          <>
            <h3 style={{ letterSpacing: '.2em', color: 'var(--cinnabar)' }}>收进史鉴的编年史</h3>
            <ul className="sim-list">
              {codex.chronicles.slice(0, 10).map((entry) => (
                <li key={`${entry.seed}-${entry.familyId}`} className="sim-item">
                  <div className="sim-item-main">
                    <div className="sim-item-title">
                      《{KNOWN_FAMILIES.find((family) => family.id === entry.familyId)?.title ?? entry.familyId}》
                      <span className="sim-quiet">　种子 {entry.seed}</span>
                    </div>
                    <div className="sim-item-sub">{entry.entries.find((line) => line.layer === 'legend')?.text ?? entry.entries[0]?.text ?? ''}</div>
                    {entry.entries.find((line) => line.sourceId)?.sourceId ? (
                      <SourceLink sourceId={entry.entries.find((line) => line.sourceId)?.sourceId} compact />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
    </Modal>
  )
}
