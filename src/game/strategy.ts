import type { ChoiceDefinition, Effect, EventDefinition, GameState } from './types'

export const EDICT_BUDGET = 2

export type MapRegion = 'beijing' | 'canal' | 'huaian' | 'nanjing' | 'jianghuai' | 'coast'

export interface EventStrategy {
  region: MapRegion
  actorIds: string[]
  edictCosts: [1 | 2, 1 | 2, 1 | 2]
  neglectEffect: Effect
  neglectText: string
}

export const EVENT_STRATEGY: Record<string, EventStrategy> = {
  'coal-hill': { region: 'beijing', actorIds: ['wang-chengen', 'li-mingrui'], edictCosts: [2, 2, 1], neglectEffect: { metrics: { legitimacy: -7, command: -4 } }, neglectText: '架空推演：御驾迟疑至天明，出城路线与皇帝生死都落入乱军之手。' },
  'last-edict': { region: 'beijing', actorIds: ['wang-chengen', 'li-mingrui'], edictCosts: [1, 2, 1], neglectEffect: { metrics: { people: -5, command: -4 } }, neglectText: '架空推演：北京没有收到最后的处置，守军、官仓与百姓只能各自求生。' },
  'road-south': { region: 'canal', actorIds: ['wang-chengen', 'li-mingrui'], edictCosts: [2, 2, 1], neglectEffect: { metrics: { supply: -5, legitimacy: -4 } }, neglectText: '架空推演：南下队伍没有统一路线，信使与辎重在追兵逼近时失散。' },
  proclamation: { region: 'huaian', actorIds: ['wang-chengen', 'li-mingrui'], edictCosts: [1, 1, 1], neglectEffect: { metrics: { legitimacy: -6, court: -3 } }, neglectText: '架空推演：朝廷没有解释南迁，各地开始用自己的版本判断皇帝是否仍可号令天下。' },
  'nanjing-gate': { region: 'nanjing', actorIds: ['li-mingrui', 'shi-kefa', 'ma-shiying'], edictCosts: [1, 2, 1], neglectEffect: { metrics: { court: -7, legitimacy: -3 } }, neglectText: '架空推演：南北官员自行争夺衙门与印信，南京在开城前先出现了两个朝廷。' },
  cabinet: { region: 'nanjing', actorIds: ['li-mingrui', 'shi-kefa', 'ma-shiying'], edictCosts: [1, 1, 2], neglectEffect: { metrics: { court: -7, command: -3 } }, neglectText: '架空推演：中枢迟迟无人主持，各署以私人关系代替共同命令。' },
  'raise-revenue': { region: 'nanjing', actorIds: ['li-mingrui', 'shi-kefa', 'ma-shiying'], edictCosts: [1, 2, 1], neglectEffect: { metrics: { supply: -7, command: -3 } }, neglectText: '架空推演：第一笔军饷没有着落，各营开始直接向驻地索取粮银。' },
  'four-garrisons': { region: 'jianghuai', actorIds: ['shi-kefa', 'ma-shiying', 'huang-degong', 'gao-jie'], edictCosts: [1, 2, 2], neglectEffect: { metrics: { command: -8, supply: -3 } }, neglectText: '架空推演：江北诸镇自行划地筹饷，兵部的名册再也对不上实际军队。' },
  'wu-choice': { region: 'beijing', actorIds: ['wang-chengen', 'li-mingrui', 'ma-shiying'], edictCosts: [2, 2, 1], neglectEffect: { metrics: { command: -5, legitimacy: -4 } }, neglectText: '架空推演：山海关来使空手而返，关宁军只按眼前利益选择新的依附。' },
  'shun-question': { region: 'jianghuai', actorIds: ['li-mingrui', 'shi-kefa', 'ma-shiying'], edictCosts: [2, 1, 1], neglectEffect: { metrics: { command: -6, legitimacy: -3 } }, neglectText: '架空推演：大顺余部没有得到答复，双方边军继续把彼此当作首要敌人。' },
  'jianghuai-defense': { region: 'jianghuai', actorIds: ['shi-kefa', 'huang-degong', 'gao-jie', 'zuo-liangyu'], edictCosts: [2, 1, 2], neglectEffect: { metrics: { command: -8, supply: -5, people: -4 } }, neglectText: '架空推演：江淮各城各守一段，援军、粮道与河防没有形成同一条战线。' },
  'final-council': { region: 'nanjing', actorIds: ['wang-chengen', 'li-mingrui', 'shi-kefa', 'ma-shiying'], edictCosts: [1, 1, 2], neglectEffect: { metrics: { legitimacy: -7, court: -6 } }, neglectText: '架空推演：最后的战时朝议没有结论，中枢与守军各自准备自己的退路。' },

  'missing-heir': { region: 'beijing', actorIds: ['wang-chengen', 'li-mingrui'], edictCosts: [2, 1, 1], neglectEffect: { metrics: { legitimacy: -6, court: -2 } }, neglectText: '架空推演：太子下落无人核查，冒名者与拥立传言沿驿路同时出现。' },
  'palace-silver': { region: 'canal', actorIds: ['wang-chengen', 'li-mingrui'], edictCosts: [2, 1, 1], neglectEffect: { resources: { treasury: -1 }, metrics: { supply: -3 } }, neglectText: '架空推演：散落银车被沿途武装瓜分，朝廷既没有得银，也没有换来民心。' },
  'refugee-gate': { region: 'canal', actorIds: ['wang-chengen', 'li-mingrui'], edictCosts: [1, 2, 1], neglectEffect: { metrics: { people: -7, legitimacy: -3 } }, neglectText: '架空推演：县城继续闭门，流民与御驾争夺道路和最后的粮食。' },
  'false-edict': { region: 'canal', actorIds: ['wang-chengen', 'li-mingrui'], edictCosts: [1, 1, 1], neglectEffect: { metrics: { court: -6, command: -3 } }, neglectText: '架空推演：真假诏书继续并行，各县选择最符合自身利益的那一份。' },
  'ministers-families': { region: 'huaian', actorIds: ['wang-chengen', 'li-mingrui'], edictCosts: [1, 1, 1], neglectEffect: { metrics: { court: -5, people: -4 } }, neglectText: '架空推演：官员私下争船接眷，官民之间的撤离秩序随之瓦解。' },
  'refugee-fever': { region: 'nanjing', actorIds: ['li-mingrui', 'shi-kefa', 'ma-shiying'], edictCosts: [2, 1, 1], neglectEffect: { metrics: { people: -7, supply: -3 } }, neglectText: '架空推演：城外热病无人统筹，驱赶、谣言与断粮一同扩散。' },
  'merchant-fleet': { region: 'nanjing', actorIds: ['li-mingrui', 'shi-kefa', 'ma-shiying'], edictCosts: [1, 1, 1], neglectEffect: { metrics: { supply: -7, court: -2 } }, neglectText: '架空推演：徽商船队转投更可靠的买家，沿江军粮继续卡在重复关口。' },
  'shi-ma-memorials': { region: 'nanjing', actorIds: ['li-mingrui', 'shi-kefa', 'ma-shiying'], edictCosts: [2, 1, 1], neglectEffect: { metrics: { court: -7, legitimacy: -3 } }, neglectText: '架空推演：两派把沉默当成默许，弹劾从奏疏蔓延到军饷与人事。' },
  'arrears-riot': { region: 'jianghuai', actorIds: ['shi-kefa', 'ma-shiying', 'huang-degong', 'gao-jie'], edictCosts: [2, 1, 1], neglectEffect: { metrics: { command: -8, supply: -4 } }, neglectText: '架空推演：欠饷士兵自行开仓，附近各营开始仿效。' },
  'zuo-petition': { region: 'jianghuai', actorIds: ['shi-kefa', 'ma-shiying', 'li-mingrui'], edictCosts: [2, 2, 1], neglectEffect: { metrics: { command: -7, court: -3 } }, neglectText: '架空推演：左良玉把不答复视为软弱，船队继续向南京施压。' },
  'garrison-feud': { region: 'jianghuai', actorIds: ['shi-kefa', 'li-mingrui', 'huang-degong', 'gao-jie'], edictCosts: [2, 1, 1], neglectEffect: { metrics: { command: -8, supply: -5 } }, neglectText: '架空推演：两镇先为军粮交战，朝廷文书在炮声中同时失效。' },
  'fake-emperor': { region: 'nanjing', actorIds: ['wang-chengen', 'li-mingrui', 'shi-kefa', 'ma-shiying'], edictCosts: [1, 1, 1], neglectEffect: { metrics: { legitimacy: -7, court: -3 } }, neglectText: '架空推演：替身谣言无人回应，地方开始重新判断应向谁纳税听令。' },
  'yangzhou-grain': { region: 'jianghuai', actorIds: ['shi-kefa', 'huang-degong', 'gao-jie'], edictCosts: [1, 1, 2], neglectEffect: { metrics: { supply: -8, people: -5 } }, neglectText: '架空推演：扬州粮册无人裁定，军民各自抢占仅存的仓粮。' },
  'coastal-offer': { region: 'coast', actorIds: ['li-mingrui', 'shi-kefa', 'ma-shiying'], edictCosts: [1, 1, 1], neglectEffect: { metrics: { supply: -5, command: -4 } }, neglectText: '架空推演：福建水师自行接受海商条件，不再等待南京确认。' },
  'spring-flood': { region: 'huaian', actorIds: ['shi-kefa', 'huang-degong', 'gao-jie'], edictCosts: [1, 1, 1], neglectEffect: { metrics: { people: -8, supply: -5 } }, neglectText: '架空推演：堤岸、难民营与军仓无人决定先后，洪水替朝廷做出了最坏的分配。' },
}

export function strategyForEvent(event: EventDefinition): EventStrategy | undefined {
  return EVENT_STRATEGY[event.id]
}

export function edictCost(event: EventDefinition, choice: ChoiceDefinition): 1 | 2 {
  const index = event.choices.findIndex((item) => item.id === choice.id)
  return strategyForEvent(event)?.edictCosts[index] ?? 2
}

export function availableActorIds(state: GameState, event: EventDefinition, choice: ChoiceDefinition): string[] {
  const candidates = choice.actorIds?.length ? choice.actorIds : strategyForEvent(event)?.actorIds ?? []
  return candidates.filter((id) => state.people[id]?.alive)
}

export function neglectEffect(event: EventDefinition): Effect {
  return strategyForEvent(event)?.neglectEffect ?? {}
}

export function neglectText(event: EventDefinition): string {
  return strategyForEvent(event)?.neglectText ?? `架空推演：${event.title}无人承接。`
}

export function eventRegion(event: EventDefinition): MapRegion {
  return strategyForEvent(event)?.region ?? 'nanjing'
}
