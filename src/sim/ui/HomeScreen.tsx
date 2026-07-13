import { useState } from 'react'
import { loadCodex } from '../storage'
import CodexPanel from './CodexPanel'

interface HomeScreenProps {
  hasSave: boolean
  onStart: () => void
  onContinue: () => void
}

export default function HomeScreen({ hasSave, onStart, onContinue }: HomeScreenProps) {
  const [showCodex, setShowCodex] = useState(false)
  return (
    <div className="sim-home">
      <div className="sim-home-card">
        <p className="sim-kicker">如果历史 · 甲申</p>
        <h1>城破前夜</h1>
        <p className="sim-home-sub">崇祯十七年三月十六 —— 还有三天，北京城破。</p>
        <p>
          你是姚小满，宣武门外一间刻字铺的代工。你没有兵，没有官身，只有一把刻刀、
          十二个时辰的白天，和一城各怀心事的人。
        </p>
        <p>
          城破挡不住——这是历史的惯性。但门由谁开、名册落谁手、弟弟能不能上船，
          取决于这三天里，谁相信了什么。文书能改变相信，相信能改变人做的事。
          刻什么、给谁看、托谁送，你说了算；代价也归你。
        </p>
        <div className="sim-home-actions">
          <button type="button" className="sim-btn sim-btn-primary" onClick={onStart}>
            开一局新的三天
          </button>
          {hasSave ? (
            <button type="button" className="sim-btn" onClick={onContinue}>
              接着上回的日子过
            </button>
          ) : null}
          <button type="button" className="sim-btn" onClick={() => setShowCodex(true)}>
            翻史鉴
          </button>
        </div>
        <p className="sim-home-note">
          每回合按同一节奏推进：白天四个时辰行事，夜里文书与流言各走各的路，晨起读报。
          先看清，再动刀；每个行动都要看过对应的东西。识破、搜查、缉拿都在明处计着嫌疑。
          史实与架空的分界，见文书与断言上的「史据与边界」。存档只在这台浏览器里。
        </p>
      </div>
      {showCodex ? <CodexPanel codex={loadCodex()} onClose={() => setShowCodex(false)} /> : null}
    </div>
  )
}
