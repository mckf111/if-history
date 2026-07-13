import { CLAIMS_BY_ID, DAYS, NPCS, SLOT_NAMES, SLOTS_PER_DAY } from '../content'
import Modal from './Modal'
import type { NpcDefinition, SimState } from '../types'

interface DossierPanelProps {
  state: SimState
  onClose: () => void
}

const LEVEL_NAMES = ['未闻', '存疑', '半信', '笃信'] as const
const LOC_SHORT: Record<string, string> = {
  'keji-shop': '铺', zhipu: '纸', yamen: '司', chengmen: '门', dukou: '渡', nanpeng: '棚',
}
const DAY_SHORT: Record<number, string> = { 16: '十六', 17: '十七', 18: '十八' }

/** 探过底细的人，脚程也摸熟了 */
function scheduleLine(npc: NpcDefinition): string {
  return DAYS.map((day) => {
    const stops = Array.from({ length: SLOTS_PER_DAY }, (_, slot) => LOC_SHORT[npc.schedule[`${day}-${slot}`]] ?? '？')
    return `${DAY_SHORT[day]}[${stops.join('')}]`
  }).join(' ')
}

/** 人物册：只写你亲眼见过、亲耳听来的。别人心里的事，探得多少记多少。 */
export default function DossierPanel({ state, onClose }: DossierPanelProps) {
  return (
    <Modal title="人物册" eyebrow="亲眼所见，亲耳所闻" onClose={onClose} wide>
        <p className="sim-quiet">这册子上只有你探得的东西。人心隔肚皮，记下的也只是"那天他像是信了"。</p>
        <ul className="sim-list" style={{ marginTop: 12 }}>
          {NPCS.map((npc) => {
            const secrets = state.knowledge.knownSecrets[npc.id] ?? []
            const known = npc.secrets.filter((secret) => secrets.includes(secret.id))
            const sightings = state.knowledge.beliefSightings.filter((sighting) => sighting.npcId === npc.id)
            const metHim = known.length > 0 || sightings.length > 0
            return (
              <li key={npc.id} className="sim-item">
                <span className={`sim-seal${metHim ? '' : ' jade'}`}>{npc.mark}</span>
                <div className="sim-item-main">
                  <div className="sim-item-title">{npc.name} · {npc.role}</div>
                  <div className="sim-item-sub">{npc.brief}</div>
                  {metHim ? <div className="sim-item-sub">「{npc.stance}」</div> : null}
                  {known.length > 0 ? (
                    <div className="sim-item-sub">
                      <b>脚程（铺纸司门渡棚·每日晨午暮夜）：</b>{scheduleLine(npc)}
                    </div>
                  ) : null}
                  {known.length > 0 ? (
                    <div className="sim-item-sub">
                      <b>探得的底细：</b>
                      {known.map((secret) => <div key={secret.id}>· {secret.text}</div>)}
                    </div>
                  ) : null}
                  {sightings.length > 0 ? (
                    <div className="sim-item-sub">
                      <b>看在眼里的心思：</b>
                      {sightings.map((sighting, index) => (
                        <div key={index}>
                          · 三月{sighting.day === 16 ? '十六' : sighting.day === 17 ? '十七' : '十八'}{SLOT_NAMES[Math.min(sighting.slot, 3)]}时，
                          他对「{CLAIMS_BY_ID[sighting.claimId]?.text ?? sighting.claimId}」像是{LEVEL_NAMES[sighting.level]}。
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
    </Modal>
  )
}
