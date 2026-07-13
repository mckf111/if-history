import { useState } from 'react'
import { loadCodex } from '../storage'
import CodexPanel from './CodexPanel'
import Modal from './Modal'
import SourceLink from './SourceLink'
import { useScreenEntry } from './useScreenEntry'

interface HomeScreenProps {
  hasSave: boolean
  saveComplete: boolean
  onStart: () => void
  onContinue: () => void
}

export default function HomeScreen({ hasSave, saveComplete, onStart, onContinue }: HomeScreenProps) {
  const [showCodex, setShowCodex] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const headingRef = useScreenEntry<HTMLHeadingElement>()
  const modalOpen = showCodex || confirmNew

  const requestStart = () => {
    if (hasSave) setConfirmNew(true)
    else onStart()
  }

  return (
    <div className="sim-home">
      <div className="sim-home-stage" inert={modalOpen || undefined}>
        <main className="sim-home-hero">
          <div className="sim-home-copy">
            <p className="sim-kicker">如果历史 · 甲申</p>
            <h1 ref={headingRef} tabIndex={-1}>
              城破前夜
              <span>刻下无名</span>
            </h1>
            <p className="sim-home-lede">
              崇祯十七年三月十六。外城陷落前十二个时辰，
              一个无名女刻工要让几张纸，先于兵锋抵达人心。
            </p>
            <p className="sim-home-premise">
              城破挡不住。你能撬动的，是门由谁开、匠籍落谁手、弟弟能不能踏上那条船。
              看清，探问，制书，托送；每个字都要经过一个有欲望、有恐惧、也有私心的人。
            </p>

            <div className="sim-home-actions">
              <button type="button" className="sim-btn sim-btn-primary sim-btn-hero" onClick={requestStart}>
                <span>立下一局的誓</span>
                <small>约 20–40 分钟 · 单机可复盘</small>
              </button>
              {hasSave ? (
                <button type="button" className="sim-btn" onClick={onContinue}>
                  {saveComplete ? '重看上一局结局' : '接着上回的日子过'}
                </button>
              ) : null}
              <button type="button" className="sim-btn sim-btn-ghost" onClick={() => setShowCodex(true)}>
                翻史鉴
              </button>
            </div>

            <ul className="sim-home-facts" aria-label="游戏特点">
              <li><b>同种子，同选择</b><span>历史逐字重演</span></li>
              <li><b>七类正常结局</b><span>加一种失败的写法</span></li>
              <li><b>无账号，无联网</b><span>存档只留在浏览器</span></li>
            </ul>
          </div>

          <div className="sim-home-art" aria-hidden="true">
            <HomeWoodcut />
            <div className="sim-countdown-block">
              <span>距外城陷</span>
              <b>十二</b>
              <em>时辰</em>
            </div>
            <div className="sim-red-cord" />
          </div>
        </main>

        <section className="sim-home-info" id="about-game" aria-labelledby="about-title">
          <div>
            <p className="sim-kicker">这是什么</p>
            <h2 id="about-title">一场关于“相信”的历史实验</h2>
          </div>
          <div className="sim-home-info-grid">
            <article>
              <span className="sim-info-no">壹</span>
              <h3>不是选项树</h3>
              <p>人物会验看文书、转卖消息、添油加醋或把信昧下。你的计划只是因果链的开头，不是系统必须照办的剧本。</p>
            </article>
            <article>
              <span className="sim-info-no">贰</span>
              <h3>历史有惯性</h3>
              <p>外城陷落是不可改的史实骨架。门、册、人三个局部撬点由九根人物信念支撑；没有碰过的撬点不会白送成功。</p>
            </article>
            <article>
              <span className="sim-info-no">叁</span>
              <h3>结局能追账</h3>
              <p>终局分开事实、记载与流传，并公开种子骰。你可以从一段传说一路倒查到哪封信、哪个人、哪次选择改变了它。</p>
            </article>
          </div>
        </section>

        <section className="sim-boundary" id="historical-boundary" aria-labelledby="boundary-title">
          <div>
            <p className="sim-kicker">史实与架空边界</p>
            <h2 id="boundary-title">大历史取证，小人物明写为虚构</h2>
          </div>
          <div>
            <p>
              本作只把居庸关失守、三月十八日日晡外城陷、十九日昧爽内城陷与帝崩万岁山作为时代约束。
              姚小满、八名人物、具体文书、街巷行动与全部偏转结局均为架空推演，不借史料冒充真人真事。
            </p>
            <div className="sim-source-stack">
              <SourceLink sourceId="mingshi-benji" />
              <SourceLink sourceId="jiashen-chuanxin" />
              <SourceLink sourceId="da-ming-huidian" />
            </div>
          </div>
        </section>

        <footer className="sim-home-footer">
          <span>《城破前夜：刻下无名》v0.3 · Copyright © 2026 mckf111（文虎）</span>
          <span>代码 AGPL-3.0-only · 叙事内容 CC BY-NC-SA 4.0</span>
        </footer>
      </div>

      {showCodex ? <CodexPanel codex={loadCodex()} onClose={() => setShowCodex(false)} /> : null}
      {confirmNew ? (
        <Modal title="旧史还在案上" eyebrow="开始新局前" closeLabel="先不重开" onClose={() => setConfirmNew(false)}>
          <p className="sim-modal-lede">
            开新局会替换当前单局存档；已经收入史鉴的结局、人物档案与因果发现不会丢。
          </p>
          <div className="sim-row">
            <button
              type="button"
              className="sim-btn sim-btn-primary"
              onClick={() => { setConfirmNew(false); onStart() }}
            >
              收起旧卷，另开一局
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

/** 原创代码绘制木刻城影，不依赖第三方图片资产。 */
function HomeWoodcut() {
  return (
    <svg className="sim-woodcut" viewBox="0 0 680 760" role="presentation">
      <defs>
        <pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
          <path d="M0 2H12 M0 8H12" className="woodcut-hatch" />
        </pattern>
        <filter id="rough">
          <feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="17" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
        </filter>
      </defs>
      <circle cx="455" cy="170" r="118" className="woodcut-moon" />
      <circle cx="455" cy="170" r="96" fill="url(#hatch)" opacity=".32" />
      <g filter="url(#rough)" className="woodcut-city">
        <path d="M48 620H636V690H48Z" />
        <path d="M88 620V470H196V620 M110 470L142 425L174 470" />
        <path d="M236 620V400H442V620 M258 400L339 330L420 400" />
        <path d="M282 620V498Q339 442 396 498V620" className="woodcut-cut" />
        <path d="M490 620V455H594V620 M510 455L542 414L575 455" />
        <path d="M50 575H235 M442 552H636 M74 530H212 M468 512H614" className="woodcut-line" />
        <path d="M22 690H658 M38 710H642 M82 730H600" className="woodcut-line" />
        <path d="M124 414L142 374L160 414 M320 330L339 282L358 330 M524 414L542 377L560 414" className="woodcut-line" />
      </g>
      <g className="woodcut-clouds">
        <path d="M20 245Q96 190 175 245T332 245" />
        <path d="M372 286Q451 233 530 286T688 286" />
        <path d="M-20 332Q58 278 137 332T295 332" />
      </g>
      <g className="woodcut-birds">
        <path d="M135 190q14-14 28 0q14-14 28 0 M206 235q10-10 20 0q10-10 20 0" />
      </g>
    </svg>
  )
}
