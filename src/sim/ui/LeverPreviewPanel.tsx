import { deriveLeverPreviews } from '../engine/node'
import type { LeverId, SimState } from '../types'

interface LeverPreviewPanelProps {
  state: SimState
}

const LEVER_LABELS: Record<LeverId, { mark: string; title: string }> = {
  gate: { mark: '门', title: '三条胡同' },
  roster: { mark: '册', title: '匠籍名册' },
  chunsheng: { mark: '人', title: '姚春生' },
}

export default function LeverPreviewPanel({ state }: LeverPreviewPanelProps) {
  const previews = deriveLeverPreviews(state)
  return (
    <section className="sim-panel sim-lever-preview" aria-labelledby="lever-preview-title">
      <div className="sim-flex-title"><h2 id="lever-preview-title">三处撬点</h2><span className="sim-quiet">结算前估势</span></div>
      <ul className="sim-list">
        {previews.map((preview) => {
          const label = LEVER_LABELS[preview.lever]
          return (
            <li key={preview.lever} className="sim-item">
              <span className={`sim-seal${preview.settledBy ? '' : ' jade'}`} aria-hidden="true">{label.mark}</span>
              <div className="sim-item-main">
                <div className="sim-item-title">{label.title}<small>已倒 {preview.fallen}/{preview.total} 柱</small></div>
                <div className="sim-item-sub">
                  {preview.outlook}
                  {preview.settledBy === 'pillars' ? ' · 三柱全倒，不再交给终局骰' : ''}
                  {preview.settledBy === 'action' ? ' · 已发生的行动把结果坐实' : ''}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="sim-map-note">只按当前柱态与已发生行动定性推导；不掷骰，也不显示人心档位。</p>
    </section>
  )
}
