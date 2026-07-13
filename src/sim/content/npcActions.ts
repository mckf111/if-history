import type { NpcActionDefinition } from '../types'

// 人物夜间自主行动表：信念过阈即触发，每局一次。
// 这是"你的谎言长出自己的腿"的落点——每个人都按自己的欲望与恐惧行事，
// 不按你的剧本。text 保持市井叙事口吻；史实边界一律写在 boundary。

export const NPC_ACTIONS: NpcActionDefinition[] = [
  {
    id: 'na-qian-hide',
    npcId: 'qian-sili',
    when: { claimId: 'c-audit-coming', min: 2 },
    text: '廊房的灶膛半夜还热着。有人看见钱司吏往里头塞了几页纸，火光一蹿一蹿的。',
    boundary: '架空推演：钱司吏烧掉吃空额的册页，是他对「清查将至」恐惧的自保反应。',
    visibleToPlayer: true,
    effects: { npcFlag: 'qian-burned-graft-pages', guaranteesLever: 'roster' },
  },
  {
    id: 'na-qian-court',
    npcId: 'qian-sili',
    when: { claimId: 'c-new-master-values-roster', min: 2 },
    text: '钱司吏把册库的铜锁擦了又擦，还给木柜加了道麻绳封。像是在替谁看着这批东西。',
    boundary: '架空推演：钱司吏笃信名册能换新朝前程，于是把册看得比命紧——献册的心思落了地。',
    visibleToPlayer: true,
    effects: { npcFlag: 'qian-guarding-roster' },
  },
  {
    id: 'na-sun-family',
    npcId: 'sun-bazong',
    when: { claimId: 'c-scapegoat-list', min: 2 },
    text: '汛地的兵嚼舌头：把总天没亮就托人往渡口递了话，问的是船。',
    boundary: '架空推演：孙把总信了问罪名单，开始给家眷找退路——恐惧先于忠义。',
    visibleToPlayer: true,
    effects: { npcFlag: 'sun-moving-family', bonds: [{ from: 'sun-bazong', to: 'wu-qiniang', delta: 1 }] },
  },
  {
    id: 'na-sun-steady',
    npcId: 'sun-bazong',
    when: { claimId: 'c-pay-coming', min: 2 },
    text: '把总把「饷银将至」四个字念给全汛听了。兵们的腰杆直了半截，门闩也上得更勤了。',
    boundary: '架空推演：孙把总想信饷银会来，于是拿它稳军心——这根柱子被你亲手扶正了。',
    visibleToPlayer: true,
    effects: { npcFlag: 'sun-holding-line' },
  },
  {
    id: 'na-he-panic',
    npcId: 'master-he',
    when: { claimId: 'c-he-implicated', min: 2 },
    text: '铺子里一夜纸灰味。何师傅把带官字的纸样翻出来烧了个干净，连柜底都掏了。',
    boundary: '架空推演：何师傅信了追查之说，烧证自保——铺里的官面部件从此难寻。',
    visibleToPlayer: true,
    effects: { npcFlag: 'he-burned-evidence', suspicion: 1, removesWorldItemIds: ['col-scrap-seal'] },
  },
  {
    id: 'na-douzi-print',
    npcId: 'douzi',
    when: { claimId: 'c-roster-copied', min: 2 },
    text: '坊口墙上天亮多了半页刷印的名单，墨还新。看热闹的人围了三层。',
    boundary: '架空推演：豆子信了「抄页已流出」，便用攒下的字钉自己印了一页——他等的由头到了。',
    visibleToPlayer: true,
    effects: { npcFlag: 'douzi-printed-names', suspicion: 1, guaranteesLever: 'roster' },
  },
  {
    id: 'na-wu-hide-boat',
    npcId: 'wu-qiniang',
    when: { claimId: 'c-boat-requisition', min: 2 },
    text: '吴家的粮船后半夜挪了泊位，船头调向了水门。船工们连夜把舱里的粮包倒腾上了岸。',
    boundary: '架空推演：吴七娘信了征用行文，抢先腾舱备走——船一旦调头，就再难叫她回头。',
    visibleToPlayer: true,
    effects: { npcFlag: 'wu-ready-to-run' },
  },
  {
    id: 'na-su-gather',
    npcId: 'su-popo',
    when: { claimId: 'c-mercy-order', min: 2 },
    text: '苏婆婆把「开门不杀」的话，一个棚一个棚地讲了过去。讲完，她把孩子们的包袱都打好了。',
    boundary: '架空推演：苏婆婆信了不杀之令，安抚全棚并备妥出城——她的话在棚里比告示管用。',
    visibleToPlayer: true,
    effects: { npcFlag: 'su-calmed-camp' },
  },
  {
    id: 'na-zhao-hunt',
    npcId: 'zhao-si',
    when: { claimId: 'c-buyers-exist', min: 2 },
    text: '赵四这两日见人就递烟锅，拐着弯打听：谁手上有带格眼朱丝栏的纸页。',
    boundary: '架空推演：赵四信了有人重金收册页，开始替买主找货——你袖里的东西在他眼里变成了银子。',
    visibleToPlayer: true,
    effects: { npcFlag: 'zhao-hunting-pages' },
  },
  {
    id: 'na-chun-brace',
    npcId: 'chunsheng',
    when: { claimId: 'c-chun-transfer', min: 3 },
    text: '有运夫夜里翻营墙被抓了回去。营里传：是个系红绳结的，挨了二十鞭，人还活着。',
    boundary: '架空推演：春生笃信明日随营开拔，铤而走险试图逃营未遂——恐惧会逼人先动。',
    visibleToPlayer: true,
    effects: { npcFlag: 'chun-tried-escape' },
  },
]

export const NPC_ACTIONS_BY_ID: Record<string, NpcActionDefinition> = Object.fromEntries(
  NPC_ACTIONS.map((action) => [action.id, action]),
)
