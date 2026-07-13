// 《城破前夜》模拟引擎类型定义。
// 【存】= 进 SimState 存档；【容】= 内容表常量（构建期发布）；【派】= 运行时派生，不存档。
// 一切规则均为纯函数；随机只来自存档内 rngState；禁 Math.random() 与时间戳。

export type SimDay = 16 | 17 | 18
export type SimPhase = 'action' | 'night-report' | 'node' | 'epilogue'
export type SimStatus = 'playing' | 'complete' | 'executed'

/** 信念档位：0 未闻 / 1 存疑 / 2 半信 / 3 笃信 */
export type BeliefLevel = 0 | 1 | 2 | 3
/** 伪造质量：0 粗 / 1 工 / 2 精 / 3 神 */
export type ForgeGrade = 0 | 1 | 2 | 3
/** 精明：0 迟钝 / 1 寻常 / 2 老练 / 3 明察 */
export type Acumen = 0 | 1 | 2 | 3

export type LeverId = 'gate' | 'roster' | 'chunsheng'
export type NpcId = string
export type ClaimId = string
export type LocationId = string
export type DocTemplateId = string
export type DocId = string
export type PartKind = 'paper' | 'seal' | 'hand-sample' | 'blank-form'

// ── 人物 ──────────────────────────────────────────────

export interface NpcSecret {
  id: string
  /** 探得后写入人物册的情报文本 */
  text: string
}

export interface NpcEdge {
  to: NpcId
  kind: 'kin' | 'trade' | 'duty' | 'debt'
  strength: 1 | 2
}

/** 【容】人物定义：欲望与恐惧是承重墙——欲望决定他想信什么（查得松），恐惧决定节点日他怎么动。 */
export interface NpcDefinition {
  id: NpcId
  name: string
  role: string
  /** 印记单字，界面用 */
  mark: string
  /** 初始公开档案（未探查也可见） */
  brief: string
  desire: string
  fear: string
  /** 他想信的断言：验看含这些断言的文书时识破率下降 */
  desireClaimIds: ClaimId[]
  /** 他害怕的断言：宁可信其有，且作为节点日决策输入 */
  fearClaimIds: ClaimId[]
  acumen: Acumen
  stance: string
  edges: NpcEdge[]
  /** 3 天 × 4 时段的行踪表，键 `${day}-${slot}`，linter 强制无缺格 */
  schedule: Record<string, LocationId>
  initialBeliefs: Partial<Record<ClaimId, BeliefLevel>>
  /** 按序解锁：第 N 次探查得第 N 条 */
  secrets: NpcSecret[]
  /** 可否受托带信 */
  canCarry: boolean
  /** 带信人的私心：转卖 / 添改 / 昧下（照送是默认出口） */
  carryBias?: 'sell' | 'alter' | 'pocket'
  /** 每次探查此人抬多少嫌疑（官面人物盘问有代价），缺省 0 */
  probeSuspicion?: number
}

/** 【存】人物运行时状态 */
export interface NpcState {
  location: LocationId
  /** 稀疏信念表，缺省档位 0 */
  beliefs: Record<ClaimId, BeliefLevel>
  /** 对其他人物的临时好恶修正，-2..2 */
  bonds: Record<NpcId, number>
  alive: boolean
  arrested: boolean
  flags: string[]
}

// ── 断言与文书 ────────────────────────────────────────

/** 【容】断言：信念的原子单位。truth 用于事实层编年史；史实断言必须给来源。 */
export interface ClaimDefinition {
  id: ClaimId
  text: string
  truth: 'true' | 'false' | 'unresolvable'
  kind: 'identity' | 'order' | 'logistics' | 'rumor'
  aboutNpcIds: NpcId[]
  leverId?: LeverId
  sourceId?: string
  /** 史实/架空分界说明，必填 */
  boundary: string
}

/** 【容】文书型制 */
export interface DocTemplateDefinition {
  id: DocTemplateId
  name: string
  formDesc: string
  requiredParts: {
    sealRefId?: string
    handRefId?: string
    paperRefId?: string
  }
  carriableClaimKinds: Array<ClaimDefinition['kind']>
  sourceId: string
  boundary: string
}

/** 【存】文书实体。id 用确定性自增序号，禁时间戳。 */
export interface DocState {
  id: DocId
  templateId: DocTemplateId
  claimIds: ClaimId[]
  /** 真件（观察所得）还是伪造件 */
  authentic: boolean
  grade?: ForgeGrade
  parts: {
    sealPartId?: string
    handPartId?: string
    paperPartId?: string
  }
  holder: NpcId | 'player' | 'destroyed'
  /** 已被识破为伪造 */
  exposed: boolean
  /** 在途投递：托付给带信人后、送达前 */
  route?: { targetNpcId: NpcId; dispatchedDay: SimDay }
}

// ── 地点与采集 ────────────────────────────────────────

/** 【容】现场可观察物：看了才知道，知道才可采、可仿。 */
export interface ObservableDefinition {
  id: string
  locationId: LocationId
  label: string
  /** 观察后获得的知识文本 */
  detail: string
}

/** 【容】可采集部件 */
export interface CollectableDefinition {
  id: string
  locationId: LocationId
  label: string
  part: { kind: PartKind; refId: string; quality: 0 | 1 | 2 }
  costSilver: number
  /** 采集抬多少嫌疑（偷窃类 > 采买类） */
  suspicion: number
  /** 是否属被搜出即定罪的违禁部件 */
  contraband: boolean
  /** 需先观察某物件 */
  requiresObservedId?: string
  /** 需先探得某人某条底细 */
  requiresSecret?: { npcId: NpcId; secretId: string }
}

export interface LocationDefinition {
  id: LocationId
  name: string
  brief: string
}

// ── 人物自主行动 ──────────────────────────────────────

/**
 * 【容】NPC 夜间自主行动：信念过阈即触发（每局一次）。
 * 这是「出人意料但合乎其性格」的落点——玩家的谎言会长出自己的腿。
 */
export interface NpcActionDefinition {
  id: string
  npcId: NpcId
  when: { claimId: ClaimId; min: BeliefLevel }
  /** 晨报可见的市井说法（保持叙事口吻，史实边界写在 boundary） */
  text: string
  /** 架空推演说明，linter 强制非空 */
  boundary: string
  visibleToPlayer: boolean
  effects?: {
    suspicion?: number
    npcFlag?: string
    bonds?: Array<{ from: NpcId; to: NpcId; delta: number }>
  }
}

// ── 撬点与结局（M4 填充内容，类型先立） ──────────────

/** 【容】支撑柱：撑住历史默认走向的一根柱子，挂在具名人物对某断言的信念区间上。 */
export interface PillarDefinition {
  id: string
  leverId: LeverId
  title: string
  npcId: NpcId
  claimId: ClaimId
  /** 柱仍立的信念区间 */
  holdsWhen: { min?: BeliefLevel; max?: BeliefLevel }
  weight: number
  /** 架空推演说明 */
  boundary: string
}

export type PillarStatus = 'standing' | 'shaken' | 'fallen'

export interface PillarState {
  id: string
  status: PillarStatus
  causeAuditIds: string[]
}

/** 【容】结果族：优先级级联选择（沿旧引擎 buildEnding 形状，避免被均值抵消） */
export interface OutcomeFamilyDefinition {
  id: string
  title: string
  priority: number
  /** 判定条件文本化描述 + 结构化 requires（M4 定型） */
  requires: {
    leverTipped?: Partial<Record<LeverId, boolean>>
  }
  boundary: string
}

/** 【存】节点结算结果 */
export interface NodeOutcome {
  familyId: string
  levers: Array<{ lever: LeverId; chance: number; roll: number; tipped: boolean }>
  pillars: PillarState[]
}

// ── 编年史 ────────────────────────────────────────────

export type ChronicleLayer = 'fact' | 'record' | 'legend'

/** 【存】编年史条目：事实层（发生了什么）/ 记载层（什么被记下）/ 流传层（百年后怎么写） */
export interface ChronicleEntry {
  id: string
  layer: ChronicleLayer
  text: string
  /** 与史实线的偏差说明；架空必以「架空推演：」开头 */
  divergence?: string
  sourceAuditIds: string[]
}

/** 【容】编年史模板：条件匹配 + 种子选取。事实层取全部命中项，记载/流传层各抽两条。 */
export interface ChronicleTemplateDefinition {
  id: string
  layer: ChronicleLayer
  /** 可出现于哪些结果族 */
  familyIds: string[]
  requires?: {
    leverTipped?: Partial<Record<LeverId, boolean>>
    npcFlag?: { npcId: NpcId; flag: string }
  }
  text: string
  /** 与史实线的对照；架空必以「架空推演：」开头 */
  divergence?: string
  sourceId?: string
}

// ── 因果账 ────────────────────────────────────────────

export type AuditKind =
  | 'observe' | 'probe' | 'collect' | 'rest' | 'ambient'
  | 'forge' | 'alter' | 'destroy' | 'dispatch'
  | 'carry' | 'betray' | 'inspect' | 'belief' | 'npc-act'
  | 'suspicion' | 'question' | 'search' | 'arrest'
  | 'pillar' | 'lever'

/** 【存】因果账条目：谁因为什么信了什么、做了什么。带骰判定的 chance/roll 终局全公开。 */
export interface AuditEntry {
  id: string
  day: SimDay
  slot?: number
  phase: 'action' | 'night' | 'node'
  kind: AuditKind
  actor: NpcId | 'player'
  target?: NpcId
  docId?: DocId
  claimId?: ClaimId
  from?: BeliefLevel
  to?: BeliefLevel
  chance?: number
  roll?: number
  /** 指向更早账目的因果链 */
  causeIds: string[]
  text: string
  /** 晨报是否让玩家看见（小人物听得见街面，听不见朝堂） */
  visibleToPlayer: boolean
}

// ── 玩家侧 ────────────────────────────────────────────

export interface PlayerKnowledge {
  /** 已探得的人物底细：npcId -> secretId[] */
  knownSecrets: Record<NpcId, string[]>
  /** 信念目击快照（可能过时——只是"那天看他像是信了"） */
  beliefSightings: Array<{ npcId: NpcId; claimId: ClaimId; level: BeliefLevel; day: SimDay; slot: number }>
  seenObservables: string[]
}

export interface InventoryPart {
  /** 即采集条目 id（部件均为一次性获取） */
  id: string
  kind: PartKind
  refId: string
  quality: 0 | 1 | 2
  contraband: boolean
}

export interface PlayerInventory {
  silver: number
  parts: InventoryPart[]
  docIds: DocId[]
}

// ── 玩家命令（重放校验之根） ──────────────────────────

export type PlayerCommand =
  | { t: 'move'; to: LocationId }
  | { t: 'observe'; observableId: string }
  | { t: 'probe'; npcId: NpcId }
  | { t: 'collect'; collectableId: string }
  | { t: 'forge'; templateId: DocTemplateId; claimIds: ClaimId[]; partIds: string[]; effortSlots: 1 | 2 }
  | { t: 'alter'; docId: DocId; addClaimId: ClaimId }
  | { t: 'destroy'; docId: DocId }
  | { t: 'dispatch'; docId: DocId; courierId: NpcId; targetNpcId: NpcId }
  | { t: 'rest' }
  | { t: 'confirm-report' }

// ── 全局状态 ──────────────────────────────────────────

/** 【存】唯一权威状态。React 只提交 PlayerCommand，不直接修改。 */
export interface SimState {
  saveVersion: 4
  seed: number
  rngState: number
  day: SimDay
  /** 今日已花费的时段数 0..4；4 = 今日行动结束 */
  slot: number
  phase: SimPhase
  status: SimStatus
  playerLocation: LocationId
  /** 刻工技艺，参与伪造质量 */
  craft: number
  suspicion: number
  suspicionFired: number[]
  inventory: PlayerInventory
  knowledge: PlayerKnowledge
  npcs: Record<NpcId, NpcState>
  docs: Record<DocId, DocState>
  docSeq: number
  audit: AuditEntry[]
  auditSeq: number
  commands: PlayerCommand[]
  node?: NodeOutcome
  chronicle?: ChronicleEntry[]
}

// ── 史鉴（跨局） ──────────────────────────────────────

/** 【独立存储键】跨局收藏：因果连线点亮、编年史收藏、人物档案补全 */
export interface CodexState {
  version: 1
  litLinks: string[]
  chronicles: Array<{
    seed: number
    familyId: string
    entries: ChronicleEntry[]
    savedAt: string
  }>
  dossiers: Record<NpcId, string[]>
}

// ── 史料来源（沿旧制，含 counterfactual 特例） ────────

export interface SourceDefinition {
  id: string
  title: string
  url: string
  note: string
}
