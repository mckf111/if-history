import {
  AMBIENT_NIGHT,
  CHRONICLE_TEMPLATES,
  CLAIMS,
  CLAIMS_BY_ID,
  COLLECTABLES,
  COMMAND_LIMIT,
  DAYS,
  DOC_TEMPLATES,
  EXECUTED_FAMILY,
  LOCATIONS,
  LOCATIONS_BY_ID,
  NPCS,
  NPCS_BY_ID,
  NPC_ACTIONS,
  OBSERVABLES,
  OBSERVABLES_BY_ID,
  OUTCOME_FAMILIES,
  PILLARS,
  SIM_SOURCES,
  SIM_SOURCES_BY_ID,
  SLOTS_PER_DAY,
} from '../content'
import { applyCommand, createSim } from './engine'
import { isPlayerCommand } from './commands'
import type { PlayerCommand, SimState } from '../types'

// ── 内容 linter（形状承袭旧引擎 validateContent）──────
// 测试要求返回空数组；每条内容规约都是一道可执行的守门检查。

export function validateContent(): string[] {
  const errors: string[] = []

  for (const source of SIM_SOURCES) {
    if (!source.title || !source.url || !source.note || !source.locator) {
      errors.push(`来源 ${source.id} 缺少标题、地址、适用说明或定位信息`)
    }
  }

  const npcIds = new Set<string>()
  for (const npc of NPCS) {
    if (npcIds.has(npc.id)) errors.push(`重复人物 ID：${npc.id}`)
    npcIds.add(npc.id)
    if (!npc.name || !npc.role || !npc.mark || !npc.brief) errors.push(`人物 ${npc.id} 缺少显示信息`)
    if (!npc.desire || !npc.fear || !npc.stance) errors.push(`人物 ${npc.id} 缺少欲望/恐惧/立场——人物刻画是承重墙，不是文案`)
    if (npc.acumen < 0 || npc.acumen > 3) errors.push(`人物 ${npc.id} 的精明超出 0-3`)
    for (const claimId of [...npc.desireClaimIds, ...npc.fearClaimIds, ...Object.keys(npc.initialBeliefs)]) {
      if (!CLAIMS_BY_ID[claimId]) errors.push(`人物 ${npc.id} 引用了不存在的断言 ${claimId}`)
    }
    for (const edge of npc.edges) {
      if (edge.to === npc.id) errors.push(`人物 ${npc.id} 的关系边指向自己`)
      else if (!NPCS_BY_ID[edge.to]) errors.push(`人物 ${npc.id} 的关系边指向不存在的人物 ${edge.to}`)
    }
    for (const day of DAYS) {
      for (let slot = 0; slot < SLOTS_PER_DAY; slot += 1) {
        const key = `${day}-${slot}`
        const location = npc.schedule[key]
        if (!location) errors.push(`人物 ${npc.id} 行踪表缺格：${key}`)
        else if (!LOCATIONS_BY_ID[location]) errors.push(`人物 ${npc.id} 行踪表 ${key} 指向不存在的地点 ${location}`)
      }
    }
    const secretIds = new Set<string>()
    for (const secret of npc.secrets) {
      if (secretIds.has(secret.id)) errors.push(`人物 ${npc.id} 有重复底细 ID：${secret.id}`)
      secretIds.add(secret.id)
      if (!secret.text) errors.push(`人物 ${npc.id} 的底细 ${secret.id} 缺少文本`)
    }
    if (npc.carryBias && !npc.canCarry) errors.push(`人物 ${npc.id} 不可带信却有私心倾向`)
    if (npc.canCarry && !npc.carryBias) errors.push(`人物 ${npc.id} 可带信却没有私心倾向——带信人必须有私心`)
  }

  const claimIds = new Set<string>()
  for (const claim of CLAIMS) {
    if (claimIds.has(claim.id)) errors.push(`重复断言 ID：${claim.id}`)
    claimIds.add(claim.id)
    if (!claim.text) errors.push(`断言 ${claim.id} 缺少文本`)
    if (!claim.boundary) errors.push(`断言 ${claim.id} 缺少史实边界说明`)
    if (claim.truth === 'true' && !claim.sourceId) errors.push(`断言 ${claim.id} 为真却没有来源——史实必须给来源，虚构真值须引 counterfactual`)
    if (claim.sourceId && !SIM_SOURCES_BY_ID[claim.sourceId]) errors.push(`断言 ${claim.id} 引用了不存在的来源 ${claim.sourceId}`)
    for (const npcId of claim.aboutNpcIds) {
      if (!NPCS_BY_ID[npcId]) errors.push(`断言 ${claim.id} 关联了不存在的人物 ${npcId}`)
    }
  }

  const locationIds = new Set<string>()
  for (const location of LOCATIONS) {
    if (locationIds.has(location.id)) errors.push(`重复地点 ID：${location.id}`)
    locationIds.add(location.id)
    if (!OBSERVABLES.some((observable) => observable.locationId === location.id)) {
      errors.push(`地点 ${location.id} 没有任何可观察物——现场必须有东西可看`)
    }
  }

  const observableIds = new Set<string>()
  for (const observable of OBSERVABLES) {
    if (observableIds.has(observable.id)) errors.push(`重复观察物 ID：${observable.id}`)
    observableIds.add(observable.id)
    if (!LOCATIONS_BY_ID[observable.locationId]) errors.push(`观察物 ${observable.id} 挂在不存在的地点 ${observable.locationId}`)
    if (!observable.detail) errors.push(`观察物 ${observable.id} 缺少细节文本`)
  }

  const collectableIds = new Set<string>()
  for (const collectable of COLLECTABLES) {
    if (collectableIds.has(collectable.id)) errors.push(`重复采集条目 ID：${collectable.id}`)
    collectableIds.add(collectable.id)
    if (!LOCATIONS_BY_ID[collectable.locationId]) errors.push(`采集条目 ${collectable.id} 挂在不存在的地点`)
    if (collectable.requiresObservedId && !OBSERVABLES_BY_ID[collectable.requiresObservedId]) {
      errors.push(`采集条目 ${collectable.id} 的前置观察物不存在`)
    }
    if (collectable.requiresSecret) {
      const npc = NPCS_BY_ID[collectable.requiresSecret.npcId]
      if (!npc) errors.push(`采集条目 ${collectable.id} 的前置底细挂在不存在的人物上`)
      else if (!npc.secrets.some((secret) => secret.id === collectable.requiresSecret!.secretId)) {
        errors.push(`采集条目 ${collectable.id} 的前置底细 ${collectable.requiresSecret.secretId} 不存在`)
      }
    }
    if (collectable.costSilver < 0) errors.push(`采集条目 ${collectable.id} 的价钱为负`)
  }

  for (const day of DAYS) {
    if (!AMBIENT_NIGHT[day]?.text) errors.push(`第 ${day} 日缺少夜间时局文本`)
  }

  const templateIds = new Set<string>()
  const obtainableRefIds = new Set(COLLECTABLES.map((collectable) => collectable.part.refId))
  for (const template of DOC_TEMPLATES) {
    if (templateIds.has(template.id)) errors.push(`重复文书型制 ID：${template.id}`)
    templateIds.add(template.id)
    if (!template.name || !template.formDesc) errors.push(`型制 ${template.id} 缺少显示信息`)
    if (!template.boundary) errors.push(`型制 ${template.id} 缺少史实边界说明`)
    if (!SIM_SOURCES_BY_ID[template.sourceId]) errors.push(`型制 ${template.id} 引用了不存在的来源`)
    if (template.carriableClaimKinds.length === 0) errors.push(`型制 ${template.id} 装不下任何断言`)
    for (const refId of [template.requiredParts.sealRefId, template.requiredParts.handRefId, template.requiredParts.paperRefId]) {
      if (refId && !obtainableRefIds.has(refId)) {
        errors.push(`型制 ${template.id} 的要件 ${refId} 在全城无处可采——伪造之路被堵死`)
      }
    }
  }

  // 可玩性护栏：每条撬点断言必须有至少一种型制能承载（否则杠杆无从下手）
  for (const claim of CLAIMS) {
    if (!claim.leverId) continue
    if (!DOC_TEMPLATES.some((template) => template.carriableClaimKinds.includes(claim.kind))) {
      errors.push(`撬点断言 ${claim.id}（${claim.kind}）没有任何文书型制可承载`)
    }
  }

  const actionIds = new Set<string>()
  for (const action of NPC_ACTIONS) {
    if (actionIds.has(action.id)) errors.push(`重复人物行动 ID：${action.id}`)
    actionIds.add(action.id)
    if (!NPCS_BY_ID[action.npcId]) errors.push(`人物行动 ${action.id} 挂在不存在的人物上`)
    if (!CLAIMS_BY_ID[action.when.claimId]) errors.push(`人物行动 ${action.id} 的触发断言不存在`)
    if (action.when.min < 1 || action.when.min > 3) errors.push(`人物行动 ${action.id} 的触发档位超出 1-3`)
    if (!action.text) errors.push(`人物行动 ${action.id} 缺少晨报文本`)
    if (!action.boundary) errors.push(`人物行动 ${action.id} 缺少架空推演说明——每次自主行动都是推演，必须标注`)
    for (const bond of action.effects?.bonds ?? []) {
      if (!NPCS_BY_ID[bond.from] || !NPCS_BY_ID[bond.to]) errors.push(`人物行动 ${action.id} 的关系效果引用了不存在的人物`)
    }
    if (action.effects?.guaranteesLever && !['gate', 'roster', 'chunsheng'].includes(action.effects.guaranteesLever)) {
      errors.push(`人物行动 ${action.id} 保证了不存在的撬点`)
    }
    for (const itemId of action.effects?.removesWorldItemIds ?? []) {
      if (!COLLECTABLES.some((item) => item.id === itemId)) errors.push(`人物行动 ${action.id} 移除了不存在的世界物件 ${itemId}`)
    }
  }

  // 每个人物至少要有一条自主行动——没人是布景板
  for (const npc of NPCS) {
    if (!NPC_ACTIONS.some((action) => action.npcId === npc.id)) {
      errors.push(`人物 ${npc.id} 没有任何自主行动——他的欲望和恐惧长不出腿`)
    }
  }

  // ── 撬点与支撑柱 ──
  const pillarIds = new Set<string>()
  const levers = ['gate', 'roster', 'chunsheng'] as const
  for (const pillar of PILLARS) {
    if (pillarIds.has(pillar.id)) errors.push(`重复支撑柱 ID：${pillar.id}`)
    pillarIds.add(pillar.id)
    if (!NPCS_BY_ID[pillar.npcId]) errors.push(`支撑柱 ${pillar.id} 挂在不存在的人物上`)
    if (!CLAIMS_BY_ID[pillar.claimId]) errors.push(`支撑柱 ${pillar.id} 的断言不存在`)
    if (pillar.weight <= 0) errors.push(`支撑柱 ${pillar.id} 的权重必须为正`)
    if (!pillar.boundary) errors.push(`支撑柱 ${pillar.id} 缺少架空推演说明`)
    if (pillar.holdsWhen.min === undefined && pillar.holdsWhen.max === undefined) {
      errors.push(`支撑柱 ${pillar.id} 没有立柱条件`)
    }
  }
  for (const lever of levers) {
    const own = PILLARS.filter((pillar) => pillar.leverId === lever)
    if (own.length < 2 || own.length > 4) errors.push(`撬点 ${lever} 的支撑柱须为 2-4 根，现有 ${own.length}`)
    if (new Set(own.map((pillar) => pillar.npcId)).size < 2) {
      errors.push(`撬点 ${lever} 的支撑柱须分属至少两个人物——单点撬动违背多因论`)
    }
  }

  // ── 结果族 ──
  const familyIds = new Set<string>()
  const priorities = new Set<number>()
  for (const family of [...OUTCOME_FAMILIES, EXECUTED_FAMILY]) {
    if (familyIds.has(family.id)) errors.push(`重复结果族 ID：${family.id}`)
    familyIds.add(family.id)
    if (priorities.has(family.priority)) errors.push(`结果族 ${family.id} 的优先级与他族撞车`)
    priorities.add(family.priority)
    if (!family.boundary.startsWith('架空推演：')) errors.push(`结果族 ${family.id} 的边界说明必须以「架空推演：」开头`)
  }
  const fallbackFamilies = OUTCOME_FAMILIES.filter(
    (family) => Object.keys(family.requires.leverTipped ?? {}).length === 0,
  )
  if (fallbackFamilies.length === 0) {
    errors.push('结果族必须有一个无条件兜底，防止级联落空')
  }
  if (fallbackFamilies.some((family) => family.collectible !== false)) {
    errors.push('无条件兜底只处理异常状态，不得占用玩家的结局收藏位')
  }

  // ── 编年史模板 ──
  const templateIds2 = new Set<string>()
  for (const template of CHRONICLE_TEMPLATES) {
    if (templateIds2.has(template.id)) errors.push(`重复编年史模板 ID：${template.id}`)
    templateIds2.add(template.id)
    if (!template.text) errors.push(`编年史模板 ${template.id} 缺少正文`)
    if (template.text.includes('{')) errors.push(`编年史模板 ${template.id} 残留未填槽位`)
    if (template.divergence && !template.divergence.startsWith('架空推演：')) {
      errors.push(`编年史模板 ${template.id} 的史实对照必须以「架空推演：」开头`)
    }
    if (template.sourceId && !SIM_SOURCES_BY_ID[template.sourceId]) {
      errors.push(`编年史模板 ${template.id} 引用了不存在的来源`)
    }
    for (const familyId of template.familyIds) {
      if (!familyIds.has(familyId)) errors.push(`编年史模板 ${template.id} 引用了不存在的结果族 ${familyId}`)
    }
    if (template.requires?.npcFlag && !NPCS_BY_ID[template.requires.npcFlag.npcId]) {
      errors.push(`编年史模板 ${template.id} 的旗标条件挂在不存在的人物上`)
    }
  }
  // 容量：每个结果族的每一层至少两条模板可选
  for (const family of [...OUTCOME_FAMILIES, EXECUTED_FAMILY]) {
    for (const layer of ['fact', 'record', 'legend'] as const) {
      const count = CHRONICLE_TEMPLATES.filter(
        (template) => template.layer === layer && template.familyIds.includes(family.id),
      ).length
      if (count < 2) errors.push(`结果族 ${family.id} 的${layer}层只有 ${count} 条模板，至少要两条`)
    }
  }

  return errors
}

// ── 重放防篡改（思路承袭 story 版 validateStoryState）──
// 一切随机出自 rngState、一切非玩家决策是 (state, rng) 的确定函数，
// 故 replay(seed, commands) 可完整重建终态；整态 JSON 全等即未被篡改。

export function replay(seed: number, commands: PlayerCommand[]): SimState {
  let state = createSim(seed)
  for (const cmd of commands) state = applyCommand(state, cmd)
  return state
}

export function validateSimState(value: unknown): value is SimState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<SimState>
  if (state.saveVersion !== 5) return false
  if (!Number.isInteger(state.seed) || !Number.isInteger(state.rngState)) return false
  if (!Array.isArray(state.commands) || state.commands.length > COMMAND_LIMIT) return false
  if (!state.commands.every(isPlayerCommand)) return false
  try {
    const replayed = replay(state.seed!, state.commands)
    return JSON.stringify(replayed) === JSON.stringify(value)
  } catch {
    return false
  }
}
