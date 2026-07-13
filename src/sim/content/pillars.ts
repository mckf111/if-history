import type { OutcomeFamilyDefinition, PillarDefinition } from '../types'

// 支撑柱：撑住「历史默认走向」的柱子，全部挂在具名人物的信念上。
// 柱立 = 历史照旧；柱倒 = 撬点松动。未倒柱时胜率为 0；倒柱后胜率 = 10 + 权重（夹 10–90）。
// 主节点「城破」没有柱——它不归你撬，这是本局的第一课。
//
// 历史默认走向（基线）：
// · 门——三月十八夜外城门仓促被开，乱兵入城，沿街劫掠（何门何人所开，史载歧异）；
// · 册——匠籍名册完整落入接管者之手，按册征发匠户；
// · 人——运夫随营转输出城，生死不明。

export const PILLARS: PillarDefinition[] = [
  // ── 撬点「门」：把总若无路可走，门就只会在乱中被打开 ──
  {
    id: 'p-gate-blind',
    leverId: 'gate',
    title: '守军还蒙在鼓里',
    npcId: 'sun-bazong',
    claimId: 'c-city-falls',
    holdsWhen: { max: 1 },
    weight: 25,
    boundary: '架空推演：孙把总若不信城真的要破，就不会提前谋划；柱倒代表他开始为「那一夜」做打算。',
  },
  {
    id: 'p-gate-noexit',
    leverId: 'gate',
    title: '船家不肯沾军眷',
    npcId: 'wu-qiniang',
    claimId: 'c-sun-family-boat',
    holdsWhen: { max: 1 },
    weight: 35,
    boundary: '架空推演：把总的退路在吴七娘的船上。她得先信「载军眷出城」这买卖做得、价钱谈得——两头都不敢先开口的交易，要有人从中间把话递活。',
  },
  {
    id: 'p-gate-blame',
    leverId: 'gate',
    title: '失门的罪名悬在头上',
    npcId: 'sun-bazong',
    claimId: 'c-scapegoat-list',
    holdsWhen: { max: 1 },
    weight: 30,
    boundary: '架空推演：他若信了问罪名单已定，反而横下心——横竖是死罪，不如换全汛和坊巷一条活路。恐惧先于忠义。',
  },

  // ── 撬点「册」：名册要么完整落入征发者之手，要么烧了、散了、公开了 ──
  {
    id: 'p-roster-intact',
    leverId: 'roster',
    title: '册档原封未动',
    npcId: 'qian-sili',
    claimId: 'c-roster-burn-order',
    holdsWhen: { max: 1 },
    weight: 40,
    boundary: '架空推演：钱司吏若信了「城危焚册」之令，那双最爱惜册子的手会亲自把它送进灶膛。',
  },
  {
    id: 'p-roster-calm',
    leverId: 'roster',
    title: '司吏还稳得住',
    npcId: 'qian-sili',
    claimId: 'c-audit-coming',
    holdsWhen: { max: 1 },
    weight: 25,
    boundary: '架空推演：怕清查的人先烧自己那几页——册一缺页，按册征发便对不上号。',
  },
  {
    id: 'p-roster-secret',
    leverId: 'roster',
    title: '坊间无人知册',
    npcId: 'douzi',
    claimId: 'c-roster-copied',
    holdsWhen: { max: 1 },
    weight: 30,
    boundary: '架空推演：豆子若信了抄页已流出，就会把名单印出来贴上墙——名册一旦人人可见，按册清算就失了准头。',
  },

  // ── 撬点「人」：三根柱都倒，春生才有机会踏上那条船 ──
  {
    id: 'p-chun-held',
    leverId: 'chunsheng',
    title: '春生仍在营册上',
    npcId: 'sun-bazong',
    claimId: 'c-chun-sick',
    holdsWhen: { max: 1 },
    weight: 40,
    boundary: '架空推演：营里放人只认文书。把总信了病牒，营册上才划得掉这个名字。',
  },
  {
    id: 'p-chun-noboat',
    leverId: 'chunsheng',
    title: '船不等没有名目的人',
    npcId: 'wu-qiniang',
    claimId: 'c-boat-hire',
    holdsWhen: { max: 1 },
    weight: 30,
    boundary: '架空推演：吴七娘的船要一个过水门的名目。她信了「受雇装货」的路子，才肯在十九日晨开舱。',
  },
  {
    id: 'p-chun-fear',
    leverId: 'chunsheng',
    title: '春生自己不敢动',
    npcId: 'chunsheng',
    claimId: 'c-chun-sick',
    holdsWhen: { max: 1 },
    weight: 30,
    boundary: '架空推演：上个月营门口吊过逃兵。春生得亲眼信了「病遣有据」，才敢在点名时应那一声。',
  },
]

export const PILLARS_BY_ID: Record<string, PillarDefinition> = Object.fromEntries(
  PILLARS.map((pillar) => [pillar.id, pillar]),
)

// 结果族：优先级级联（沿旧引擎 buildEnding 形状——先判特例，后落兜底，绝不用均值抵消）。
export const OUTCOME_FAMILIES: OutcomeFamilyDefinition[] = [
  {
    id: 'san-yin',
    title: '三印成史',
    priority: 1,
    requires: { leverTipped: { gate: true, roster: true, chunsheng: true } },
    boundary: '架空推演：门、册、人三处同时偏离史实线，是本局最难形成的完整新史。',
  },
  {
    id: 'quan-men',
    title: '全门之约',
    priority: 2,
    requires: { leverTipped: { gate: true, chunsheng: true } },
    boundary: '架空推演：门以约开、人以船走，是本局最难的双撬；史实中外城之开远为仓促混乱。',
  },
  {
    id: 'shui-dun',
    title: '水遁',
    priority: 3,
    requires: { leverTipped: { chunsheng: true } },
    boundary: '架空推演：一条船载走了该走的人，城照旧乱——个人的得救不等于历史转向。',
  },
  {
    id: 'wu-ji',
    title: '无籍之门',
    priority: 4,
    requires: { leverTipped: { gate: true, roster: true } },
    boundary: '架空推演：街坊免于乱兵，匠户也挣脱名册；个人未必获救，群体命运却改了道。',
  },
  {
    id: 'hui-ce',
    title: '灰烬名册',
    priority: 5,
    requires: { leverTipped: { roster: true } },
    boundary: '架空推演：城门仍在乱中打开，但匠籍残缺，纸上的命令失去抓人的准头。',
  },
  {
    id: 'san-xiang',
    title: '三巷灯火',
    priority: 6,
    requires: { leverTipped: { gate: true } },
    boundary: '架空推演：只有街坊因约得全；名册与家人仍随历史惯性而去。',
  },
  {
    id: 'ce-jie',
    title: '册劫',
    priority: 7,
    requires: { leverTipped: { gate: false, roster: false, chunsheng: false } },
    boundary: '架空推演：门乱开、册完整，是对匠户最狠的一夜——历史的默认，往往就是最重的那笔账。',
  },
  {
    id: 'luan-ye',
    title: '乱夜',
    priority: 8,
    requires: {},
    boundary: '架空推演：兜底结果族——城破如史，局部有细微偏差。',
  },
]

/** 被缉拿的特殊结果族：失败也是内容 */
export const EXECUTED_FAMILY: OutcomeFamilyDefinition = {
  id: 'wu-ming',
  title: '无名之刃',
  priority: 0,
  requires: {},
  boundary: '架空推演：私刻印信按明律近于伪造印信重罪，乱世用重典；无名刻工的下场不入正史。',
}
