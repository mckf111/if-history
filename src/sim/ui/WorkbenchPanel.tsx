import { useState } from 'react'
import { CLAIMS, DOC_TEMPLATES, GRADE_NAMES, SIM_SOURCES_BY_ID } from '../content'
import { matchTemplateParts } from '../engine/engine'
import { forgeGrade } from '../engine/forge'
import type { PlayerCommand, SimState } from '../types'

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
    if (!templateId || !partIds || claimIds.length === 0) return
    dispatch({ t: 'forge', templateId, claimIds, partIds, effortSlots: effort })
    onClose()
  }

  return (
    <div className="sim-drawer-backdrop" onClick={onClose}>
      <div className="sim-drawer" onClick={(event) => event.stopPropagation()}>
        <h2>
          刻坊工作台
          <button type="button" className="sim-btn sim-btn-small" onClick={onClose}>搁刀</button>
        </h2>

        <div className="sim-field">
          <span className="sim-field-label">选型制</span>
          <div className="sim-options">
            {DOC_TEMPLATES.map((candidate) => {
              const ready = matchTemplateParts(state, candidate.id) !== null
              return (
                <button
                  key={candidate.id}
                  type="button"
                  className={`sim-option${templateId === candidate.id ? ' picked' : ''}`}
                  disabled={!ready}
                  onClick={() => pickTemplate(candidate.id)}
                >
                  {candidate.name}{ready ? '' : '（要件不齐）'}
                  <span className="sub">{candidate.formDesc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {template ? (
          <>
            <div className="sim-field">
              <span className="sim-field-label">落什么话（至多两句，贪多必露）</span>
              <div className="sim-options">
                {CLAIMS.filter((claim) => template.carriableClaimKinds.includes(claim.kind)).map((claim) => (
                  <button
                    key={claim.id}
                    type="button"
                    className={`sim-option${claimIds.includes(claim.id) ? ' picked' : ''}`}
                    onClick={() => toggleClaim(claim.id)}
                  >
                    {claim.text}
                    <span className="sub">史据与边界：{claim.boundary}{claim.sourceId ? `（${SIM_SOURCES_BY_ID[claim.sourceId]?.title ?? claim.sourceId}）` : ''}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sim-field">
              <span className="sim-field-label">工时</span>
              <div className="sim-row">
                <button type="button" className={`sim-option${effort === 1 ? ' picked' : ''}`} onClick={() => setEffort(1)}>
                  一个时辰——快，但手上功夫打折
                </button>
                <button type="button" className={`sim-option${effort === 2 ? ' picked' : ''}`} onClick={() => setEffort(2)}>
                  两个时辰——慢工出细活（成色 +1）
                </button>
              </div>
            </div>

            {previewGrade !== null ? (
              <p className="sim-quiet">
                照现在的部件与工时，估摸能出「{GRADE_NAMES[previewGrade]}」品。
                成色越高越难被识破；想信这话的人，查得也松。
              </p>
            ) : null}

            <div className="sim-row">
              <button
                type="button"
                className="sim-btn sim-btn-primary"
                disabled={!partIds || claimIds.length === 0}
                onClick={forge}
              >
                落刀（耗 {effort} 个时辰）
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
