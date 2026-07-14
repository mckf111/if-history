import { useState } from 'react'
import {
  CLAIMS,
  COLLECTABLES,
  DOC_TEMPLATES,
  GRADE_NAMES,
  LOCATIONS_BY_ID,
  PART_NAMES_BY_REF_ID,
} from '../content'
import { matchTemplateParts } from '../engine/engine'
import { forgeGrade } from '../engine/forge'
import DocScroll from './DocScroll'
import Modal from './Modal'
import SourceLink from './SourceLink'
import type { DocState, PlayerCommand, SimState } from '../types'

interface WorkbenchPanelProps {
  state: SimState
  dispatch: (cmd: PlayerCommand) => void
  onClose: () => void
}

/** 刻坊工作台：选型制 → 落断言（至多两条）→ 定工时 → 动刀 */
export default function WorkbenchPanel({ state, dispatch, onClose }: WorkbenchPanelProps) {
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [claimIds, setClaimIds] = useState<string[]>([])
  const [effort, setEffort] = useState<1 | 2>(1)

  const template = DOC_TEMPLATES.find((candidate) => candidate.id === templateId)
  const partIds = templateId ? matchTemplateParts(state, templateId) : null
  const previewParts = partIds
    ? state.inventory.parts.filter((part) => partIds.includes(part.id))
    : []
  const previewGrade = templateId && partIds ? forgeGrade(templateId, previewParts, effort, state.craft) : null
  const hoursLeft = 4 - state.slot
  const forgeCommand = templateId && partIds && claimIds.length > 0
    ? { t: 'forge', templateId, claimIds, partIds, effortSlots: effort } as const
    : null

  const toggleClaim = (claimId: string) => {
    setClaimIds((current) => current.includes(claimId)
      ? current.filter((id) => id !== claimId)
      : current.length >= 2 ? current : [...current, claimId])
  }

  const pickTemplate = (id: string) => {
    setTemplateId(id)
    setClaimIds([])
  }

  const forge = () => {
    if (!forgeCommand) return
    dispatch(forgeCommand)
    onClose()
  }

  return (
    <Modal title="刻坊工作台" eyebrow={`今日还剩 ${hoursLeft} 个时辰`} closeLabel="搁刀" onClose={onClose} wide>
      <p className="sim-modal-lede">
        先选文书型制，再落一两句话。纸会耗掉；印和笔迹样本还能再用。
        {state.craft >= 2 ? ' 手已经熟了：往后的文书成色额外抬一档。' : ' 再完成一张文书，手上会熟一档。'}
      </p>

      <div className="sim-field">
        <span className="sim-field-label">壹 · 选型制</span>
        <div className="sim-options sim-options-grid">
          {DOC_TEMPLATES.map((candidate) => {
            const ready = matchTemplateParts(state, candidate.id) !== null
            const missing = missingRequirements(state, candidate.requiredParts)
            return (
              <button
                key={candidate.id}
                type="button"
                className={`sim-option${templateId === candidate.id ? ' picked' : ''}`}
                onClick={() => pickTemplate(candidate.id)}
                aria-pressed={templateId === candidate.id}
                aria-label={`选择型制：${candidate.name}，${ready ? '可落刀' : `缺要件：${missing.join('、')}`}`}
              >
                <b>{candidate.name}</b><span className={`sim-readiness ${ready ? 'ready' : ''}`}>{ready ? '可落刀' : '缺要件'}</span>
                <span className="sub">{candidate.formDesc}</span>
                {!ready ? <span className="sub sim-missing">还缺：{missing.join('、')}</span> : null}
              </button>
            )
          })}
        </div>
      </div>

      {template ? (
        <>
          <div className="sim-selected-form">
            <div>
              <b>{template.name}</b>
              <p>{template.boundary}</p>
            </div>
            <SourceLink sourceId={template.sourceId} compact />
          </div>

          <div className="sim-field">
            <span className="sim-field-label">贰 · 落什么话（至多两句）</span>
            <div className="sim-options">
              {CLAIMS.filter((claim) => template.carriableClaimKinds.includes(claim.kind)).map((claim) => (
                <button
                  key={claim.id}
                  type="button"
                  className={`sim-option${claimIds.includes(claim.id) ? ' picked' : ''}`}
                  onClick={() => toggleClaim(claim.id)}
                  aria-pressed={claimIds.includes(claim.id)}
                  aria-label={`选择断言：${claim.text}`}
                >
                  {claim.text}
                  <span className="sub">{claim.boundary}</span>
                  {claim.sourceId ? <SourceLink sourceId={claim.sourceId} compact /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="sim-field">
            <span className="sim-field-label">叁 · 花多少工夫</span>
            <div className="sim-row">
              <button type="button" className={`sim-option${effort === 1 ? ' picked' : ''}`} onClick={() => setEffort(1)} aria-pressed={effort === 1} aria-label="选择工时：一个时辰，成色较低">
                一个时辰<span className="sub">快，但手上功夫打折</span>
              </button>
              <button type="button" className={`sim-option${effort === 2 ? ' picked' : ''}`} onClick={() => setEffort(2)} aria-pressed={effort === 2} disabled={hoursLeft < 2} aria-label="选择工时：两个时辰，成色加一">
                两个时辰<span className="sub">慢工出细活，成色加一</span>
              </button>
            </div>
          </div>

          {previewGrade !== null && claimIds.length > 0 ? (
            <div className="sim-workbench-preview">
              <DocScroll
                doc={{
                  id: 'preview', templateId: templateId!, claimIds, authentic: false,
                  grade: previewGrade, parts: {}, holder: 'player', exposed: false, createdDay: state.day,
                } satisfies DocState}
              />
              <div>
                <p className="sim-kicker">落刀前过眼</p>
                <strong className="sim-preview-grade">估得「{GRADE_NAMES[previewGrade]}」品</strong>
                <p className="sim-quiet">成色越高越难被识破；原本就想相信这句话的人，也会查得更松。</p>
              </div>
            </div>
          ) : null}

          <div className="sim-row sim-modal-actions sim-modal-actions-sticky">
            <span className="sim-action-summary">
              {template.name} · {claimIds.length > 0 ? `${claimIds.length} 句` : '还未落话'}
              {previewGrade !== null && claimIds.length > 0 ? ` · ${GRADE_NAMES[previewGrade]}品` : ''}
            </span>
            <button
              type="button"
              className="sim-btn sim-btn-primary"
              disabled={!partIds || claimIds.length === 0 || hoursLeft < effort}
              onClick={forge}
            >
              落刀 · 耗 {effort} 个时辰
            </button>
          </div>
        </>
      ) : null}
    </Modal>
  )
}

function missingRequirements(state: SimState, required: { sealRefId?: string; handRefId?: string; paperRefId?: string }) {
  return [required.sealRefId, required.handRefId, required.paperRefId]
    .filter((refId): refId is string => Boolean(refId))
    .filter((refId) => !state.inventory.parts.some((part) => part.refId === refId && (part.usesLeft ?? 1) > 0))
    .map((refId) => {
      const matching = COLLECTABLES.filter((collectable) => collectable.part.refId === refId)
      const available = matching.filter((collectable) => !state.removedWorldItemIds.includes(collectable.id))
      const locations = [...new Set(
        available
          .map((collectable) => LOCATIONS_BY_ID[collectable.locationId]?.name)
          .filter((name): name is string => Boolean(name)),
      )]
      const where = locations.length > 0
        ? `（${locations.join('或')}可找）`
        : matching.length > 0 ? '（原处已经找不到，需另寻他法）' : ''
      return `${PART_NAMES_BY_REF_ID[refId] ?? '未知要件'}${where}`
    })
}
