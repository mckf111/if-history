import type { CollectableDefinition, LocationDefinition, ObservableDefinition } from '../types'

export const LOCATIONS: LocationDefinition[] = [
  { id: 'keji-shop', name: '何记刻字铺', brief: '两间门脸，一方柜台，满墙未取的活计。你在这里当代工。' },
  { id: 'zhipu', name: '宣南纸铺', brief: '官私文书用纸都从这里走，柜上永远压着待取的货单。' },
  { id: 'yamen', name: '兵马司廊房', brief: '西城兵马司的廊房：司吏们在这里抄写、用印、喝茶。' },
  { id: 'chengmen', name: '城门汛地', brief: '外城门内的汛地：垛口、门闩，和六个月没关饷的兵。' },
  { id: 'dukou', name: '东便门渡口', brief: '通惠河边的渡口：粮船、水门、要现银的船家。' },
  { id: 'nanpeng', name: '难民棚', brief: '城隍庙外的难民棚：粥棚、讹言，和满墙找亲人的字条。' },
]

export const LOCATIONS_BY_ID: Record<string, LocationDefinition> = Object.fromEntries(
  LOCATIONS.map((location) => [location.id, location]),
)

// 现场可观察物：看了才知道，知道才可采、可仿。observe 免费但耗时段。
export const OBSERVABLES: ObservableDefinition[] = [
  {
    id: 'ob-worktable',
    locationId: 'keji-shop',
    label: '墙上挂的活计',
    detail: '几块未刻完的木牌记里，混着一张兵马司火票的戳样拓片——官面的活计出自这间铺子。',
  },
  {
    id: 'ob-he-ledger',
    locationId: 'keji-shop',
    label: '柜上的流水账',
    detail: '账面上，南纸店的欠款挂了两季。铺子的进项停在正月。',
  },
  {
    id: 'ob-paper-stock',
    locationId: 'zhipu',
    label: '架上的官用连四纸',
    detail: '与兵马司文书同料同帘纹的连四纸，商户也能买——只要你说得出用处。',
  },
  {
    id: 'ob-qian-receipt',
    locationId: 'zhipu',
    label: '柜上待取的货单',
    detail: '一叠押着「钱」字花押的取货单：兵马司钱司吏的笔迹，起落顿挫都在纸上。',
  },
  {
    id: 'ob-roster-chest',
    locationId: 'yamen',
    label: '册库的木柜',
    detail: '匠籍名册锁在铜锁木柜里；钥匙在钱司吏腰上，抄本进出都过他的手。',
  },
  {
    id: 'ob-huopiao',
    locationId: 'yamen',
    label: '案上的火票底簿',
    detail: '火票的格眼、印位、日期写法尽在底簿上——式样看熟了，闭眼也画得出。',
  },
  {
    id: 'ob-pay-notice',
    locationId: 'chengmen',
    label: '墙根的欠饷粉牌',
    detail: '粉牌上记着各棚欠饷的月份，最长的欠到去年九月。兵的火气写在脸上。',
  },
  {
    id: 'ob-gate-bar',
    locationId: 'chengmen',
    label: '门闩与锁链',
    detail: '暮鼓后落闩上锁。开门要把总的钥匙，或者一道过得了眼的火票。',
  },
  {
    id: 'ob-xunfang',
    locationId: 'chengmen',
    label: '汛房的案桌',
    detail: '把总的案上摊着营册与一方旧木戳——遣送、报病、领料，营里的条子都用它落印。',
  },
  {
    id: 'ob-grain-boat',
    locationId: 'dukou',
    label: '吴家的粮船',
    detail: '船主是个女人，船工只听她的。船舱腾一腾，装得下二十口人。',
  },
  {
    id: 'ob-water-gate',
    locationId: 'dukou',
    label: '水门栅栏',
    detail: '船出水门要验票放行；守栅的兵认票不认人。',
  },
  {
    id: 'ob-porridge',
    locationId: 'nanpeng',
    label: '残了的粥锅',
    detail: '粥越来越稀。施粥的婆婆把最后的米留给孩子，大人喝的是米汤。',
  },
  {
    id: 'ob-rumor-wall',
    locationId: 'nanpeng',
    label: '棚壁的寻亲字条',
    detail: '一墙的字条：谁家男人被拉去运粮，谁家孩子走失在哪门。识字的人在这里最忙。',
  },
]

export const OBSERVABLES_BY_ID: Record<string, ObservableDefinition> = Object.fromEntries(
  OBSERVABLES.map((observable) => [observable.id, observable]),
)

// 可采集部件：伪造的原料。偷窃类抬嫌疑，违禁品被搜出即定罪。
export const COLLECTABLES: CollectableDefinition[] = [
  {
    id: 'col-scrap-seal',
    locationId: 'keji-shop',
    label: '柜底的废火票戳版',
    part: { kind: 'seal', refId: 'seal-huopiao', quality: 1 },
    costSilver: 0,
    suspicion: 0,
    contraband: true,
    requiresSecret: { npcId: 'master-he', secretId: 'he-scrap-seal' },
  },
  {
    id: 'col-paper-guan',
    locationId: 'zhipu',
    label: '官用连四纸一刀',
    part: { kind: 'paper', refId: 'paper-guan', quality: 1, uses: 2 },
    costSilver: 2,
    suspicion: 0,
    contraband: false,
    requiresObservedId: 'ob-paper-stock',
  },
  {
    id: 'col-hand-qian',
    locationId: 'zhipu',
    label: '钱司吏的花押货单',
    part: { kind: 'hand-sample', refId: 'hand-qian', quality: 2 },
    costSilver: 1,
    suspicion: 1,
    contraband: false,
    requiresObservedId: 'ob-qian-receipt',
  },
  {
    id: 'col-blank-huopiao',
    locationId: 'yamen',
    label: '空白火票格眼纸',
    part: { kind: 'blank-form', refId: 'paper-guan', quality: 2, uses: 1 },
    costSilver: 0,
    suspicion: 3,
    contraband: true,
    requiresObservedId: 'ob-huopiao',
  },
  {
    id: 'col-paper-min',
    locationId: 'zhipu',
    label: '民用毛边纸一沓',
    part: { kind: 'paper', refId: 'paper-min', quality: 1, uses: 2 },
    costSilver: 1,
    suspicion: 0,
    contraband: false,
  },
  {
    id: 'col-seal-ying',
    locationId: 'chengmen',
    label: '汛房的旧木戳',
    part: { kind: 'seal', refId: 'seal-ying', quality: 2 },
    costSilver: 0,
    suspicion: 3,
    contraband: true,
    requiresObservedId: 'ob-xunfang',
  },
]

export const COLLECTABLES_BY_ID: Record<string, CollectableDefinition> = Object.fromEntries(
  COLLECTABLES.map((collectable) => [collectable.id, collectable]),
)
