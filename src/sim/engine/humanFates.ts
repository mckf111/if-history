import type { AuditEntry, LeverId, NodeOutcome, SimState, VowId } from '../types'

export type HumanFateResult = 'changed' | 'baseline' | 'unresolved'

export interface HumanFateItem {
  lever: LeverId
  subject: string
  headline: string
  outcome: string
  reason: string
  sourceAuditIds: string[]
  result: HumanFateResult
  primary: boolean
}

export interface HumanFateSummary {
  heading: string
  intro: string
  items: HumanFateItem[]
}

const LEVER_ORDER: LeverId[] = ['gate', 'roster', 'chunsheng']

const VOW_LEVER: Record<VowId, LeverId> = {
  'save-chunsheng': 'chunsheng',
  'protect-roster': 'roster',
  'protect-neighborhood': 'gate',
}

const SUBJECTS: Record<LeverId, string> = {
  gate: '何师傅一家与三条胡同',
  roster: '姚小满与册上匠户',
  chunsheng: '姚春生',
}

/**
 * 把既有终局状态翻成人物命运；不参与结算，也不把未结算的事写成结果。
 */
export function deriveHumanFates(state: SimState): HumanFateSummary | null {
  if (state.status === 'playing') return null

  const primaryLever = state.vow ? VOW_LEVER[state.vow] : undefined
  const orderedLevers = primaryLever
    ? [primaryLever, ...LEVER_ORDER.filter((lever) => lever !== primaryLever)]
    : LEVER_ORDER

  if (state.status === 'executed') {
    const arrest = [...state.audit].reverse().find((entry) => entry.kind === 'arrest')
    return {
      heading: '姚小满没能活着等到答案',
      intro: '架空推演：姚小满在城破前死于站笼。城破仍会到来，但门、册与春生尚未进入节点结算；下面只写她没能等到的三件事，不替未结算状态编造结果。',
      items: orderedLevers.map((lever) => unresolvedFate(lever, primaryLever, arrest)),
    }
  }

  if (!state.node) return null

  const leverAudits = state.audit.filter((entry) => entry.kind === 'lever')
  const auditByLever = new Map(
    LEVER_ORDER.map((lever, index) => [lever, leverAudits[index]] as const),
  )
  const nodeByLever = new Map(state.node.levers.map((lever) => [lever.lever, lever] as const))

  return {
    heading: '先看人，再看结局名',
    intro: '以下命运由本局已经结算的人物信念、行动与撬点直接翻译而来，均属架空推演，不是史料所载。',
    items: orderedLevers.flatMap((lever) => {
      const node = nodeByLever.get(lever)
      if (!node) return []
      return [settledFate(state, node, primaryLever, auditByLever.get(lever))]
    }),
  }
}

function settledFate(
  state: SimState,
  node: NodeOutcome['levers'][number],
  primaryLever: LeverId | undefined,
  leverAudit: AuditEntry | undefined,
): HumanFateItem {
  const narrative = fateNarrative(state, node.lever, node.tipped)
  const actionAudits = narrative.actionIds.flatMap((actionId) => {
    const entry = [...state.audit].reverse().find(
      (candidate) => candidate.kind === 'npc-act' && candidate.actionId === actionId,
    )
    return entry ? [entry] : []
  })
  const selfEraseAudits = node.lever === 'roster'
    ? Object.values(state.docs)
      .filter((doc) => doc.claimIds.includes('c-xiaoman-not-listed'))
      .flatMap((doc) => {
        const entry = [...state.audit].reverse().find(
          (candidate) => candidate.kind === 'forge' && candidate.docId === doc.id,
        )
        return entry ? [entry] : []
      })
    : []
  const sourceAuditIds = unique([
    ...(leverAudit ? [leverAudit.id, ...leverAudit.causeIds] : []),
    ...actionAudits.map((entry) => entry.id),
    ...selfEraseAudits.map((entry) => entry.id),
  ])

  return {
    lever: node.lever,
    subject: SUBJECTS[node.lever],
    headline: narrative.headline,
    outcome: narrative.outcome,
    reason: `${fallbackReason(node)}${leverAudit ? ` 结算账写道：${leverAudit.text}` : ''}`,
    sourceAuditIds,
    result: node.tipped ? 'changed' : 'baseline',
    primary: node.lever === primaryLever,
  }
}

function unresolvedFate(
  lever: LeverId,
  primaryLever: LeverId | undefined,
  arrest: AuditEntry | undefined,
): HumanFateItem {
  const outcomes: Record<LeverId, string> = {
    gate: '架空推演：姚小满死前没能知道三条胡同是否得到守门人的保护；本局没有结算这项命运。',
    roster: '架空推演：姚小满死前没能知道匠籍名册最终是完整移交还是散佚；本局没有结算这项命运。',
    chunsheng: '架空推演：姚小满死前没能等到春生的下落；本局没有结算他是否离开运夫营。',
  }
  return {
    lever,
    subject: SUBJECTS[lever],
    headline: '答案停在城破之前',
    outcome: outcomes[lever],
    reason: arrest
      ? `可追溯原因：${arrest.text}`
      : '可追溯原因：本局以处决告终，三个局部撬点没有进入结算。',
    sourceAuditIds: arrest ? unique([arrest.id, ...arrest.causeIds]) : [],
    result: 'unresolved',
    primary: lever === primaryLever,
  }
}

function fateNarrative(
  state: SimState,
  lever: LeverId,
  tipped: boolean,
): { headline: string; outcome: string; actionIds: string[] } {
  if (lever === 'gate') return gateNarrative(state, tipped)
  if (lever === 'roster') return rosterNarrative(state, tipped)
  return chunshengNarrative(state, tipped)
}

function gateNarrative(state: SimState, tipped: boolean) {
  const soughtBoat = hasFlag(state, 'sun-bazong', 'sun-moving-family')
  const heldLine = hasFlag(state, 'sun-bazong', 'sun-holding-line')
  if (tipped) {
    return {
      headline: '门开了，门板没有被踹响',
      outcome: soughtBoat
        ? '架空推演：孙把总此前已替家眷找船；城破时，他又先撤拒马、约束乱兵不入三条胡同。何师傅一家和附近匠户暂时躲过了城破初夜的沿街劫掠。'
        : '架空推演：孙把总先撤拒马、约束乱兵不入三条胡同。何师傅一家和附近匠户暂时躲过了城破初夜的沿街劫掠。',
      actionIds: soughtBoat ? ['na-sun-family'] : [],
    }
  }
  return {
    headline: '门在混乱中打开',
    outcome: heldLine
      ? '架空推演：孙把总虽然曾拿“饷银将至”稳住守军，城门最终仍在混乱中打开。何师傅一家和三条胡同的住户没有得到约束乱兵的保护。'
      : '架空推演：街巷秩序随城门仓促打开而崩散。何师傅一家和三条胡同的住户没有得到约束乱兵的保护。',
    actionIds: heldLine ? ['na-sun-steady'] : [],
  }
}

function rosterNarrative(state: SimState, tipped: boolean) {
  const burned = hasFlag(state, 'qian-sili', 'qian-burned-graft-pages')
  const printed = hasFlag(state, 'douzi', 'douzi-printed-names')
  const guarded = hasFlag(state, 'qian-sili', 'qian-guarding-roster')
  const erasedHerself = Object.values(state.docs).some(
    (doc) => doc.claimIds.includes('c-xiaoman-not-listed'),
  )
  if (tipped) {
    const actionIds = [
      ...(burned ? ['na-qian-hide'] : []),
      ...(printed ? ['na-douzi-print'] : []),
    ]
    const opening = burned && printed
      ? '钱司吏烧了吃空额的册页，豆子又把半页名单印上坊墙。'
      : burned
        ? '钱司吏把吃空额的册页送进了灶膛。'
        : printed
          ? '豆子把半页名单印上了坊墙。'
          : '册页有的烧了，有的散了，有的被贴上坊墙。'
    return {
      headline: '纸上的名字抓不准人了',
      outcome: `架空推演：${opening}完整名册不复可据，姚小满与其他册上匠户暂时避开了按册佥派。${erasedHerself ? '她曾把自己从一页假册上抹掉；那张纸没有单独撬动大册，但真册散佚后，她不再需要靠那一句谎活命。' : ''}`,
      actionIds,
    }
  }
  return {
    headline: '名字仍钉在册上',
    outcome: `${guarded
      ? '架空推演：钱司吏给册库加锁封绳，名册最终完整移交。三日内，姚小满与其他册上匠户被按册分批带走。'
      : '架空推演：匠籍名册完整移交。三日内，姚小满与其他册上匠户被按册分批带走。'}${erasedHerself ? '她曾把自己从一页假册上抹掉；那张纸没能越过完整总册的装订线。真名仍在——那一刀救不了她。' : ''}`,
    actionIds: guarded ? ['na-qian-court'] : [],
  }
}

function chunshengNarrative(state: SimState, tipped: boolean) {
  const triedEscape = hasFlag(state, 'chunsheng', 'chun-tried-escape')
  const boatReady = hasFlag(state, 'wu-qiniang', 'wu-ready-to-run')
  const actionIds = [
    ...(triedEscape ? ['na-chun-brace'] : []),
    ...(boatReady ? ['na-wu-hide-boat'] : []),
  ]
  const earlier = triedEscape
    ? '春生此前翻营失败、挨了二十鞭。'
    : ''
  if (tipped) {
    const boat = boatReady
      ? '吴七娘的粮船已经调向水门；十九日晨，春生藏进船舱，腕上的红绳过了栅栏。'
      : '十九日晨，春生藏进出水门的粮船，腕上的红绳过了栅栏。'
    return {
      headline: '红绳过了水门',
      outcome: `架空推演：${earlier}${boat}他离开了运夫营，但此后的命运仍无史可证。`,
      actionIds,
    }
  }
  const boat = boatReady
    ? '吴七娘的粮船虽然已经调向水门，他仍没能上船。'
    : ''
  return {
    headline: '春生随运夫营出了城',
    outcome: `架空推演：${earlier}${boat}春生随运夫营转输出城，此后音讯不明；姚小满留在城里，没等到口信。`,
    actionIds,
  }
}

function hasFlag(state: SimState, npcId: string, flag: string) {
  return state.npcs[npcId]?.flags.includes(flag) ?? false
}

function fallbackReason(node: NodeOutcome['levers'][number]) {
  if (node.resolution === 'untouched') return '可追溯原因：相关支撑柱一根未倒，这一项未触碰、未掷骰。'
  if (node.resolution === 'guaranteed') return '可追溯原因：周全准备或已经发生的人物行动把结果坐实，因此未掷骰。'
  return `可追溯原因：胜算 ${node.chance}% · 骰值 ${node.roll ?? '—'}，${node.tipped ? '结果偏离了原路。' : '结果仍回到原路。'}`
}

function unique(ids: string[]) {
  return [...new Set(ids)]
}
