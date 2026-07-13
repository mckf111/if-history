import { CLAIMS_BY_ID, DOC_TEMPLATES_BY_ID, GRADE_NAMES } from '../content'
import type { DocState } from '../types'

interface DocScrollProps {
  doc: DocState
  /** 紧凑模式（袖中列表用），完整模式用于工作台预览 */
  compact?: boolean
}

const DAY_NUMERAL: Record<number, string> = { 16: '十六', 17: '十七', 18: '十八' }

/** 各型制的印文与花押 */
const SEAL_TEXT: Record<string, string | null> = {
  'dt-huopiao': '兵马',
  'dt-sitie': null, // 司帖凭花押不用印
  'dt-cepage': '照磨',
  'dt-bingdie': '汛记',
  'dt-sixin': null,
  'dt-jietie': null,
}

const HAND_SIGN: Record<string, string | null> = {
  'dt-sitie': '钱',
  'dt-cepage': '钱',
}

/**
 * 文书道具：竖排实体渲染。刻工的游戏里，文书必须是道具，不是一行字。
 * 成色直接可见：粗品墨渍歪印，工品端正，精品细边清晰，神品描金。
 */
export default function DocScroll({ doc, compact }: DocScrollProps) {
  const template = DOC_TEMPLATES_BY_ID[doc.templateId]
  const grade = doc.grade ?? 0
  const sealText = SEAL_TEXT[doc.templateId]
  const handSign = HAND_SIGN[doc.templateId]
  const dateDay = doc.route?.dispatchedDay ?? 18

  return (
    <div className={`sim-doc-scroll grade-${grade}${compact ? ' compact' : ''}${doc.exposed ? ' exposed' : ''}`}>
      <div className="sim-doc-paper">
        <div className="sim-doc-columns">
          <span className="sim-doc-title-col">{template?.name ?? doc.templateId}</span>
          {doc.claimIds.map((claimId) => (
            <span key={claimId} className="sim-doc-line">{CLAIMS_BY_ID[claimId]?.text ?? claimId}</span>
          ))}
          <span className="sim-doc-date">崇祯十七年三月{DAY_NUMERAL[dateDay] ?? '十八'}日</span>
        </div>
        {sealText ? (
          <span className="sim-doc-seal" aria-hidden>
            {sealText}
          </span>
        ) : null}
        {handSign ? (
          <span className="sim-doc-sign" aria-hidden>
            {handSign}
          </span>
        ) : null}
        {grade === 0 ? <span className="sim-doc-blot" aria-hidden /> : null}
        {doc.exposed ? <span className="sim-doc-busted" aria-hidden>伪</span> : null}
      </div>
      <div className="sim-doc-caption">
        <span className="sim-doc-grade">{GRADE_NAMES[grade]}品</span>
        {doc.authentic ? <span className="sim-quiet">真件</span> : null}
      </div>
    </div>
  )
}
