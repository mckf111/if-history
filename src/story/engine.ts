import { buildAftermath, buildScene } from './content'
import type { CharacterId, Chapter, StoryEnding, StoryState } from './types'

const CHARACTER_IDS: CharacterId[] = ['xiaoman', 'master-he', 'douzi', 'zhao-si', 'wu-qiniang', 'chunsheng']
const CHOICE_IDS: Record<Chapter, string[]> = {
  1: ['refuse-name', 'cut-mark', 'sell-name'],
  2: ['tell-cut', 'keep-quiet', 'lie-for-clue'],
  3: ['show-proof', 'open-first', 'burn-both'],
}
const ENDING_IDS = ['printed-names', 'open-gate', 'burned-proof']

export function createStory(seed: number): StoryState {
  return {
    saveVersion: 3,
    seed,
    rngState: seed || 1,
    chapter: 1,
    phase: 'scene',
    inspectedClueIds: [],
    characters: Object.fromEntries(CHARACTER_IDS.map((id) => [id, { trust: 0, alive: true }])) as StoryState['characters'],
    flags: [],
    debts: [],
    settledDebts: [],
    choices: [],
  }
}

function unique(values: string[]) {
  return [...new Set(values)]
}

export function inspectClue(state: StoryState, clueId: string): StoryState {
  if (state.phase !== 'scene') return state
  const scene = buildScene(state)
  if (!scene.clues.some((clue) => clue.id === clueId)) throw new Error('这件东西已经不在眼前。')
  return { ...state, inspectedClueIds: unique([...state.inspectedClueIds, clueId]) }
}

export function canChoose(state: StoryState) {
  return state.phase === 'scene' && new Set(state.inspectedClueIds).size >= 2
}

export function isStoryChoiceAvailable(state: StoryState, choiceId: string) {
  if (state.chapter !== 3) return true
  if (choiceId === 'open-first' && state.characters.douzi.trust < 0) return false
  return true
}

function addTrust(state: StoryState, id: CharacterId, delta: number): StoryState {
  return {
    ...state,
    characters: {
      ...state.characters,
      [id]: { ...state.characters[id], trust: Math.max(-2, Math.min(2, state.characters[id].trust + delta)) },
    },
  }
}

function applyChapterOne(state: StoryState, choiceId: string): StoryState {
  if (choiceId === 'refuse-name') return addTrust({ ...state, flags: unique([...state.flags, 'kept-dead-name']), debts: unique([...state.debts, 'lost-brother-lead']) }, 'master-he', 1)
  if (choiceId === 'cut-mark') return addTrust({ ...state, flags: unique([...state.flags, 'marked-corpse-tag', 'has-red-cord', 'zhao-owes-name']), debts: unique([...state.debts, 'master-may-deny', 'zhao-life-debt']) }, 'zhao-si', 1)
  return addTrust({ ...state, flags: unique([...state.flags, 'sold-dead-name', 'has-red-cord', 'zhao-has-leverage']), debts: unique([...state.debts, 'owe-zhao-silence']) }, 'master-he', -1)
}

function applyChapterTwo(state: StoryState, choiceId: string): StoryState {
  if (choiceId === 'tell-cut') {
    const douziAngry = addTrust({ ...state, flags: unique([...state.flags, 'grain-to-camp', 'proof-public', 'douzi-angry']), debts: unique([...state.debts, 'refugees-saw-boat-leave']) }, 'douzi', -1)
    return addTrust(douziAngry, 'master-he', -1)
  }
  if (choiceId === 'keep-quiet') return addTrust({ ...state, flags: unique([...state.flags, 'grain-to-refugees', 'proof-unspoken']), debts: unique([...state.debts, 'camp-still-starves']) }, 'douzi', 1)
  return addTrust({ ...state, flags: unique([...state.flags, 'grain-to-camp', 'knows-chunsheng', 'lied-for-brother']), debts: unique([...state.debts, 'refugees-saw-boat-leave']) }, 'zhao-si', -1)
}

function settleFinalDebts(state: StoryState, choiceId: string): StoryState {
  const settled = new Set(state.settledDebts)
  const outstanding = state.debts.filter((debt) => {
    const isZhaoLifeDebt = debt === 'zhao-life-debt' && choiceId === 'show-proof'
    const isSilenceDebt = debt === 'owe-zhao-silence' && choiceId === 'show-proof'
    const isCampHunger = debt === 'camp-still-starves'
    if (isZhaoLifeDebt || isSilenceDebt || isCampHunger) {
      settled.add(debt)
      return false
    }
    return true
  })
  return { ...state, debts: outstanding, settledDebts: [...settled] }
}

function endingFor(state: StoryState, choiceId: string): StoryEnding {
  const brother = state.flags.includes('knows-chunsheng')
    ? '春生没有被姐姐“救回”。他留在同伍里，带头要求今后领粮必须由两名营兵和一名家眷共同看册。'
    : state.flags.includes('has-red-cord')
      ? '吴七娘认出红绳是东渡口运夫互认的结法。小满仍没找到春生，却第一次得到一个不需要拿别人的粮去换的方向。'
      : '姚春生仍然没有下落。小满亲手放弃了赵四手里的线索；她改得了别人的命，未必改得了自家的。'
  const firstDebt = state.flags.includes('zhao-owes-name')
    ? choiceId === 'show-proof' ? '赵四还了送名册的债，之后当场消失。他没有成为小满的忠仆。' : '赵四没有送名册，尸牌的债仍在。他笑说欠得越久，货才越值钱。'
    : state.flags.includes('zhao-has-leverage')
      ? choiceId === 'show-proof' ? '赵四公开了借尸骗点名的交易。小满的证言保住了冒领证据，她自己却不得不藏进吴七娘的粮船离开。' : '赵四没有公开尸牌交易。他把这个秘密继续揣在怀里，小满也继续欠他一次沉默。'
      : '赵四临时送了一趟名册，又给小满留下一笔尚未议价的债。'
  const grainDebt = state.flags.includes('grain-to-refugees')
    ? '先前吃过粥的难民没有冲抢粮船，而是跟吴七娘一起守住营外的路；营兵却因多饿了一顿，差点在名册公开前先拔刀。'
    : '难民棚里的苏婆婆认出小满是那天让粮船开走的人。她没有替小满作证，只把营外的孩子带离了门口。'
  if (choiceId === 'show-proof') return { id: 'open-gate', title: '死人开口', subtitle: '证据没有下令，营里的人拿它找到了彼此。', paragraphs: ['十一个死者的名字在名册和领粮记录上对齐。守门兵将钥匙交给军属，军官被底层营兵扣下。', firstDebt, grainDebt, brother], historyShift: '一名小校把名册抄本和收粮留样带到附近另一营。那不是能调兵的命令，只足够让第二群人开始查自己的名册。' }
  if (choiceId === 'open-first') return { id: 'printed-names', title: '印出死人', subtitle: '豆子没有印命令。他只把被藏起来的名字印得人人都能看见。', paragraphs: ['军属拿着冒领名字去找自家的守门兵。两名兵从里面抽掉门闩，粮仓被家眷和底层营兵共同盯住。', firstDebt, grainDebt, brother], historyShift: '豆子那块印名字的版流了出去。数日后，有人用同样的方法公开了另一处仓场的冒领名单；也有人开始印制伪造的名单报复私仇。' }
  return { id: 'burned-proof', title: '火里的两种历史', subtitle: '你阻止了人们继续使用这份证据，也阻止了后人查它。', paragraphs: ['吴七娘用粮船堵住营门外的路，军属说动一名守门兵开了侧门。粮食被分掉，冒领者的名字也消失了。', firstDebt, grainDebt, brother], historyShift: '这一营的冒领证据没有传出去。但两名本会在冲突中送命的刷印匠活了下来，把“守门兵可以被家人说动”的故事带向了南方。' }
}

export function resolveStoryChoice(state: StoryState, choiceId: string): StoryState {
  if (!canChoose(state)) throw new Error('至少看清两件东西，再动刀。')
  const scene = buildScene(state)
  if (!scene.choices.some((choice) => choice.id === choiceId)) throw new Error('这个选择已经错过了。')
  if (!isStoryChoiceAvailable(state, choiceId)) throw new Error('这个行动已被先一步动起来的人截断了。')
  const choice = scene.choices.find((item) => item.id === choiceId)!
  if (!state.inspectedClueIds.includes(choice.requiredClueId)) throw new Error('你还没有看见支撑这个行动的东西。')

  let next: StoryState = { ...state, choices: [...state.choices, { chapter: state.chapter, choiceId }] }
  if (state.chapter === 1) next = applyChapterOne(next, choiceId)
  if (state.chapter === 2) next = applyChapterTwo(next, choiceId)
  if (state.chapter === 3) {
    next = settleFinalDebts(next, choiceId)
    next = { ...next, phase: 'aftermath', ending: endingFor(next, choiceId) }
  }
  return { ...next, phase: 'aftermath' }
}

export function advanceStory(state: StoryState): StoryState {
  if (state.phase !== 'aftermath') return state
  if (state.chapter === 3) return { ...state, phase: 'complete' }
  return { ...state, chapter: (state.chapter + 1) as Chapter, phase: 'scene', inspectedClueIds: [] }
}

export function storyAftermath(state: StoryState) {
  if (state.phase !== 'aftermath') throw new Error('后果还没有发生。')
  return buildAftermath(state)
}

export function validateStoryState(value: unknown): value is StoryState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<StoryState>
  const charactersValid = Boolean(state.characters)
    && CHARACTER_IDS.every((id) => {
      const person = state.characters?.[id]
      return person && typeof person.trust === 'number' && typeof person.alive === 'boolean'
    })
  const choicesValid = Array.isArray(state.choices)
    && state.choices.length <= 3
    && state.choices.every((choice, index) => choice
      && choice.chapter === index + 1
      && CHOICE_IDS[choice.chapter as Chapter]?.includes(choice.choiceId))
  const endingValid = state.ending === undefined
    || (ENDING_IDS.includes(state.ending.id ?? '')
      && typeof state.ending.title === 'string'
      && typeof state.ending.subtitle === 'string'
      && Array.isArray(state.ending.paragraphs)
      && state.ending.paragraphs.every((paragraph) => typeof paragraph === 'string')
      && typeof state.ending.historyShift === 'string')
  const phaseInvariant = (() => {
    if (!choicesValid || !charactersValid || !Array.isArray(state.inspectedClueIds)
      || (state.chapter !== 1 && state.chapter !== 2 && state.chapter !== 3)
      || (state.phase !== 'scene' && state.phase !== 'aftermath' && state.phase !== 'complete')) return false
    const expectedChoices = state.phase === 'scene' ? state.chapter - 1 : state.chapter
    if (state.choices!.length !== expectedChoices) return false
    if (state.phase === 'complete' && (state.chapter !== 3 || !state.ending)) return false
    if (state.phase === 'aftermath' && (state.chapter === 3) !== Boolean(state.ending)) return false
    if (state.phase === 'scene' && state.ending) return false
    const validClues = buildScene(state as StoryState).clues.map((clue) => clue.id)
    return new Set(state.inspectedClueIds).size === state.inspectedClueIds.length
      && state.inspectedClueIds.every((id) => validClues.includes(id))
  })()
  const causalInvariant = (() => {
    if (!phaseInvariant || !Number.isInteger(state.seed) || !Array.isArray(state.choices)) return false
    try {
      let replay = createStory(state.seed!)
      state.choices.forEach((record, index) => {
        for (const clue of buildScene(replay).clues) replay = inspectClue(replay, clue.id)
        replay = resolveStoryChoice(replay, record.choiceId)
        if (index < state.choices!.length - 1) replay = advanceStory(replay)
      })
      if (state.phase === 'scene' && replay.phase === 'aftermath') replay = advanceStory(replay)
      if (state.phase === 'complete' && replay.phase === 'aftermath') replay = advanceStory(replay)
      return replay.chapter === state.chapter
        && replay.phase === state.phase
        && JSON.stringify(replay.flags) === JSON.stringify(state.flags)
        && JSON.stringify(replay.debts) === JSON.stringify(state.debts)
        && JSON.stringify(replay.settledDebts) === JSON.stringify(state.settledDebts)
        && JSON.stringify(replay.characters) === JSON.stringify(state.characters)
        && JSON.stringify(replay.ending) === JSON.stringify(state.ending)
    } catch {
      return false
    }
  })()

  return state.saveVersion === 3
    && (state.chapter === 1 || state.chapter === 2 || state.chapter === 3)
    && (state.phase === 'scene' || state.phase === 'aftermath' || state.phase === 'complete')
    && Array.isArray(state.inspectedClueIds) && state.inspectedClueIds.every((id) => typeof id === 'string')
    && Array.isArray(state.flags) && state.flags.every((flag) => typeof flag === 'string')
    && Array.isArray(state.debts) && state.debts.every((debt) => typeof debt === 'string')
    && Array.isArray(state.settledDebts) && state.settledDebts.every((debt) => typeof debt === 'string')
    && choicesValid
    && charactersValid
    && Number.isInteger(state.seed)
    && Number.isInteger(state.rngState)
    && endingValid
    && phaseInvariant
    && causalInvariant
}
