import type { SimState, VowId } from '../types'
import Modal from './Modal'

export type GuideFocus = 'map' | 'people' | 'observables' | 'inventory' | 'workbench' | 'documents' | 'none'

interface PlayerGuidance {
  mark: string
  goal: string
  goalDetail: string
  nextStep: string
  focus: GuideFocus
}

const VOW_GUIDANCE: Record<VowId, Pick<PlayerGuidance, 'mark' | 'goal' | 'goalDetail'>> = {
  'save-chunsheng': {
    mark: '人',
    goal: '先把春生带回来',
    goalDetail: '让春生从运夫营除名，并在三月十九日真正踏上出城的船。',
  },
  'protect-roster': {
    mark: '册',
    goal: '先让匠户从册上消失',
    goalDetail: '让完整匠籍无法落到接管者手里，免得整条街被照册征走。',
  },
  'protect-neighborhood': {
    mark: '门',
    goal: '先保三条胡同',
    goalDetail: '让守门的人在城破前有判断、有退路，别让外城门只在乱兵中打开。',
  },
}

export function shouldOpenGuide(state: SimState, guideSeen = false): boolean {
  return Boolean(
    !guideSeen
    && state.vow
    && state.status === 'playing'
    && state.phase === 'action'
    && state.commands.length === 1
    && state.commands[0]?.t === 'choose-vow',
  )
}

/** 只解释现有状态，不产生命令、不改数值，也不泄露人物未探得的底细。 */
export function derivePlayerGuidance(state: SimState): PlayerGuidance {
  const vow = state.vow ?? 'save-chunsheng'
  const base = VOW_GUIDANCE[vow]
  const hasTimedAction = state.commands.some((command) => command.t !== 'choose-vow' && command.t !== 'move')
  const probedAnyone = Object.keys(state.knowledge.knownSecrets).length > 0
  const observedAnything = state.knowledge.seenObservables.length > 0
  const hasParts = state.inventory.parts.length > 0
  const hasDocs = state.inventory.docIds.length > 0
  const sentAnything = Object.values(state.docs).some((doc) => doc.holder !== 'player' && doc.holder !== 'destroyed')

  if (!hasTimedAction) {
    const first = firstStepForVow(vow, state.playerLocation)
    return { ...base, ...first }
  }
  if (state.day === 18) return {
    ...base,
    nextStep: sentAnything
      ? '最后一夜。信已经离手；还来得及补另一条因果，但别把所有希望压在同一个人身上。'
      : '今天日晡，外城必陷。先把已经做好的文书托送出去；留在袖中的纸不会改变任何人。',
    focus: sentAnything ? 'none' : 'documents',
  }
  if (sentAnything && !hasDocs) return {
    ...base,
    nextStep: '信在路上。晨报只会写街面听得见的动静；白天再探问相关人物，或等入夜看回声。',
    focus: 'people',
  }
  if (!probedAnyone) return {
    ...base,
    nextStep: '点一名在场人物旁的「探问」。你会知道他想守住什么、害怕什么，也会记下他的脚程。',
    focus: 'people',
  }
  if (!observedAnything) return {
    ...base,
    nextStep: '点「眼前可查」里的「细看」。现场物件看明白后，才知道哪里能取得制书要件。',
    focus: 'observables',
  }
  if (!hasParts && !hasDocs) return {
    ...base,
    nextStep: '留意「可以下手」里的物件。满足条件后点「收下」，把纸、印或笔迹样本放进袖中。',
    focus: 'inventory',
  }
  if (!hasDocs) return {
    ...base,
    nextStep: state.playerLocation === 'keji-shop'
      ? '打开「上工作台」。每种文书还缺什么、能写什么，工作台都会直接列出来。'
      : '先在「外城图」回何记刻字铺，再打开「上工作台」。刻刀和案子都留在铺里。',
    focus: state.playerLocation === 'keji-shop' ? 'workbench' : 'map',
  }
  if (hasDocs) return {
    ...base,
    nextStep: '纸已经做好。找到肯带信的人，点文书旁的「托人送出」，再选真正需要相信它的收信人。',
    focus: 'documents',
  }
  return { ...base, nextStep: '继续查看人物、物件与晨报，让誓愿对应的因果真正发生。', focus: 'none' }
}

function firstStepForVow(vow: VowId, locationId: string): Pick<PlayerGuidance, 'nextStep' | 'focus'> {
  if (vow === 'protect-roster') {
    return locationId === 'yamen'
      ? { nextStep: '就在这里：先点「册库的木柜」旁的「细看」，或探问钱司吏，弄清谁掌着名册。', focus: 'observables' }
      : { nextStep: '先在「外城图」点兵马司。移动不耗时；到后细看册库、探问钱司吏。', focus: 'map' }
  }
  if (vow === 'protect-neighborhood') {
    return locationId === 'chengmen'
      ? { nextStep: '就在这里：先点孙把总旁的「探问」，弄清守门的人最怕什么、又缺什么退路。', focus: 'people' }
      : { nextStep: '先在「外城图」点城门汛地。移动不耗时；孙把总和守门的线索都在那里。', focus: 'map' }
  }
  return locationId === 'chengmen'
    ? { nextStep: '就在这里：先点姚春生旁的「探问」，再问孙把总，弄清谁能把春生从营册上划掉。', focus: 'people' }
    : { nextStep: '先在「外城图」点城门汛地。移动不耗时；春生和管运夫营的孙把总都在那里。', focus: 'map' }
}

interface GuidePanelProps {
  state: SimState
  onClose: () => void
}

export default function GuidePanel({ state, onClose }: GuidePanelProps) {
  const guidance = derivePlayerGuidance(state)

  return (
    <Modal title="先看懂这一局" eyebrow="一张放在游戏里的玩法册" closeLabel="开始走第一步" onClose={onClose} wide>
      <section className="sim-guide-goal" aria-labelledby="guide-goal-title">
        <span className="sim-guide-seal" aria-hidden="true">{guidance.mark}</span>
        <div>
          <p className="sim-kicker">这一局怎样才算有结果</p>
          <h3 id="guide-goal-title">{guidance.goal}</h3>
          <p>{guidance.goalDetail}</p>
        </div>
      </section>

      <section className="sim-guide-first" aria-labelledby="guide-first-title">
        <span aria-hidden="true">壹</span>
        <div><p className="sim-kicker">现在先做</p><h3 id="guide-first-title">{guidance.nextStep}</h3></div>
      </section>

      <p className="sim-guide-truth">
        <strong>城破是改不了的史实。</strong>
        你要改变的是一个局部结果。没有总分，也不用把所有人都救下；三月十八夜后，游戏会按真实发生的因果判断这句誓愿守住没有。
      </p>

      <section className="sim-guide-section" aria-labelledby="guide-loop-title">
        <div className="sim-guide-heading">
          <span>贰</span>
          <div><p className="sim-kicker">行动循环</p><h3 id="guide-loop-title">一局只反复做四件事</h3></div>
        </div>
        <ol className="sim-guide-loop">
          <li><b>走</b><span>在外城图换地点；移动不耗时。</span></li>
          <li><b>查</b><span>对人「探问」、对物「细看」；每次耗一个时辰。</span></li>
          <li><b>做</b><span>取得纸、印、笔迹，回刻字铺上工作台制书。</span></li>
          <li><b>送</b><span>托人把文书送给会因此改变判断的人，入夜看回声。</span></li>
        </ol>
      </section>

      <details className="sim-guide-terms-wrap">
        <summary className="sim-guide-heading">
          <span>叁</span>
          <div><p className="sim-kicker">这页怎么看</p><h3 id="guide-terms-title">展开术语：每样东西各管一件事</h3></div>
        </summary>
        <dl className="sim-guide-terms">
          <div><dt>时辰</dt><dd>每天只能做四次耗时行动；走路和当面托信不耗时。</dd></div>
          <div><dt>嫌疑</dt><dd>别人觉得你可疑的程度；到 4 盘查、7 搜查、10 被抓。</dd></div>
          <div><dt>银两</dt><dd>买纸、雇人或处理少数物件时会花。</dd></div>
          <div><dt>外城图</dt><dd>换地点。谁在何处，要先探问后才会留下行踪记号。</dd></div>
          <div><dt>袖中</dt><dd>你的随身包裹，放制书要件和已经刻好的文书。</dd></div>
          <div><dt>人物册</dt><dd>只记录你亲自探得的欲望、恐惧、行踪和信念。</dd></div>
          <div><dt>工作台</dt><dd>把纸、印、笔迹和一句话组合成能送出去的文书。</dd></div>
        </dl>
      </details>

      <div className="sim-row sim-modal-actions">
        <button type="button" className="sim-btn sim-btn-primary" onClick={onClose}>明白了，带着目标进城</button>
        <small className="sim-quiet">忘了随时点主界面右上角「玩法」。</small>
      </div>
    </Modal>
  )
}
