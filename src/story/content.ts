import type { CharacterId, StoryAftermath, StoryChoice, StoryScene, StoryState } from './types'

export const CHARACTERS: Record<CharacterId, { name: string; role: string; mark: string }> = {
  xiaoman: { name: '姚小满', role: '刻字铺代工', mark: '刀' },
  'master-he': { name: '何师傅', role: '刻字铺掌柜', mark: '木' },
  douzi: { name: '豆子', role: '刷印学徒', mark: '墨' },
  'zhao-si': { name: '赵四', role: '递书脚夫', mark: '路' },
  'wu-qiniang': { name: '吴七娘', role: '运粮船主', mark: '舟' },
  chunsheng: { name: '姚春生', role: '被征的运夫', mark: '结' },
}

const CHOICES: Record<string, StoryChoice[]> = {
  corpse: [
    { id: 'refuse-name', title: '不借这个名字', action: '把银子推回去，照实刻“无名男尸”。', sacrifice: '赵四不会告诉你弟弟的下落。', requiredClueId: 'dead-hands' },
    { id: 'cut-mark', title: '借名，但留一道伤', action: '刻下赵四的名字，在“四”字尾端留下一道反刀。', sacrifice: '师傅若被查出，会说这块牌不是他刻的。', requiredClueId: 'red-cord' },
    { id: 'sell-name', title: '把死人卖个好价', action: '收银子，换来弟弟的红绳，不留任何记号。', sacrifice: '从此以后，赵四有了一个能要你命的秘密。', requiredClueId: 'silver' },
  ],
  grain: [
    { id: 'tell-cut', title: '说出制版的先后', action: '告诉吴七娘：军营那份提粮文书是后照刻的。', sacrifice: '师傅会否认曾让你鉴别它，追查只会落到你身上。', requiredClueId: 'broken-tail' },
    { id: 'keep-quiet', title: '当作什么也没看见', action: '让吴七娘按先到的文书驶向难民棚。', sacrifice: '城外那营欠饷兵今夜仍然没有粮。', requiredClueId: 'boat-noise' },
    { id: 'lie-for-clue', title: '用真假换弟弟的下落', action: '按赵四要的说，让吴七娘把粮送往军营。', sacrifice: '难民棚会看着这船粮从眼前过去。', requiredClueId: 'paper-fibers' },
  ],
  gate: [
    { id: 'show-proof', title: '把名册和领粮记录挂出来', action: '让营兵自己认出那十一个已死却仍在领粮的名字。', sacrifice: '证据公开，携带者、作证者和你都无处可退。', requiredClueId: 'official-seal' },
    { id: 'open-first', title: '先让营里的人动起来', action: '帮豆子印出冒领名字，由吴七娘分给家眷和底层营兵。', sacrifice: '你们发动了人，也把可复制的手段留给了下一个人。', requiredClueId: 'inked-hands' },
    { id: 'burn-both', title: '把名册和记录一起烧了', action: '不让军官或豆子继续借这些名字发号施令。', sacrifice: '没有证据，营门外只剩下谁能说动守门兵。', requiredClueId: 'women-line' },
  ],
}

function has(state: StoryState, flag: string) {
  return state.flags.includes(flag)
}

export function buildScene(state: StoryState): StoryScene {
  if (state.chapter === 1) {
    return {
      chapter: 1,
      title: '死人借名',
      eyebrow: '第一回·城破后的第二天',
      date: '崇祯十七年 三月二十日',
      location: '京城东南·寺外停尸地',
      opening: [
        '姚小满给死人刻名字。不是墓碑，是一寸宽的薄木牌。',
        '眼前十一具尸体来自同一支临时征发的转运队。何师傅在刻牌，小满同时把名字抄在收殓单上，等小吏来领。',
        '有名字的死人能被家人领走。没名字的，天黑后会被抬去同一个坑里。',
      ],
      lines: [
        { speaker: 'master-he', text: '字别刻深。今日的死人多，木片不够。' },
        { speaker: 'zhao-si', text: '给他刻我的名字。从今往后，赵四死了。' },
        { speaker: 'xiaoman', text: '你死了，谁在这里说话？' },
        { speaker: 'zhao-si', text: '一个知道姚春生去了哪里的人。' },
      ],
      clues: [
        { id: 'red-cord', label: '赵四手里的红绳', detail: '绳结是小满教给弟弟的。结打反了，春生每次都打反。' },
        { id: 'dead-hands', label: '死者的手', detail: '指缝里是墨，虎口却没有刀茧。他不是刻工，只在印坊干过杂活。' },
        { id: 'silver', label: '案角的碎银', detail: '银子够师傅和豆子吃五天。何师傅一直盯着它，却叫小满自己做主。' },
      ],
      question: '一个活人要借死人的名字逃命。你让谁先付代价？',
      choices: CHOICES.corpse,
      sourceNote: '明代印刷业存在官、私、坊、寺观等多种生产系统；本场的北京收殓和点名流程不以该资料作证。',
      boundary: '姚小满、停尸地、转运队收殓单、冒名避过一次征役点名与具体交易均为合成情境。',
      sources: [{ title: '故宫博物院：元明清佳刻', url: 'https://www.dpm.org.cn/ancient/yuanmingqings.html' }],
    }
  }

  if (state.chapter === 2) {
    const redCord = has(state, 'has-red-cord') ? '红绳缠在小满的手腕上，每抬一次刀就蹭一下皮。' : '赵四没有留下红绳。他只说通州有刻字活，弟弟的事一个字也不肯再提。'
    const journeyBridge = has(state, 'marked-corpse-tag')
      ? '何师傅把尸牌和收殓单交给小吏，小吏在当日运夫点名簿上勾掉了赵四。赵四靠这一次疏漏脱身，又向船主吴七娘吹嘘小满能辨制版先后。吴七娘因此把三个刻印匠带到通州。'
      : has(state, 'zhao-has-leverage')
        ? '赵四拿借尸的秘密逼小满一行跟他去通州，替船主吴七娘分辨两份相互矛盾的文书。'
        : '吴七娘需要一个懂版式的人，赵四只把小满介绍给她。这不算还债，是另一笔生意。'
    return {
      chapter: 2,
      title: '一船不肯死的粮',
      eyebrow: '第二回·七日后',
      date: '崇祯十七年 三月二十七日',
      location: '通州西·废弃粮行',
      opening: [
        journeyBridge,
        redCord,
        '现在桌上有两份临时提粮文书。它们都用预印的通用版头，船号和去向由人手填：一份要吴七娘去难民棚，一份要她去城外转运营。两边的签押都找不到人当面核实。',
      ],
      lines: [
        { speaker: 'douzi', text: '真的给谁吃，谁那张就是真的。' },
        { speaker: 'master-he', text: '闭嘴。字有真假，人也因为说错真假掉脑袋。' },
        { speaker: 'xiaoman', text: '这两张不是同一块版印的。' },
        { speaker: 'wu-qiniang', text: '船是我的，押船伙计的命也是我借来的。你只管说哪份后到；船往哪走，由我担。' },
        { speaker: 'zhao-si', text: has(state, 'zhao-owes-name') ? '我欠你一条命。但你若开口，我们今日都得还。' : has(state, 'zhao-has-leverage') ? '尸牌的事我还没花出去。你照我要的说，它今天就还是秘密。' : '我不欠你。春生的事也不在这笔生意里。' },
      ],
      clues: [
        { id: 'broken-tail', label: '预印版头的“提”字', detail: '转运营那份的通用版头照着另一份后刻，连旧版的裂口都搬了过去。小满能证明版头后到，不能证明手填的去向没有传达真实命令。' },
        { id: 'paper-fibers', label: '文书的纸边', detail: '一份用的是旧帐簿纸，另一份是刚拆下的经书衬纸。两边都在拿不该拿的东西救急。' },
        { id: 'boat-noise', label: '窗外的船板声', detail: '船户已经在解缆。真假还没分出，粮却必须在天黑前选一个去处。' },
      ],
      question: '你能证明谁在仿谁，却证明不了谁在救人。你让谁先付代价？',
      choices: CHOICES.grain,
      sourceNote: '北京与通州之间的粮食转运依赖河道、船只和大量人力。',
      boundary: '两份文书无法当面核实及其改变粮船去向均为架空推演；预印通用版头、手填船号和去向的“临时提粮文书”、签发者、样式、粮行争执与姚小满的鉴别均不宣称有具体史料对应。',
      sources: [{ title: '中国国家博物馆：通惠河漕运图卷', url: 'https://www.chnmuseum.cn/zp/zpml/ysp/202012/t20201217_248581.shtml' }],
    }
  }

  const masterLine = state.characters['master-he'].trust > 0
    ? '今日若有人问，这些字是我教的，人也是我带来的。别急着感激，我只是不想让你把我的手艺砍坏。'
    : has(state, 'master-may-deny') || state.characters['master-he'].trust < 0
      ? '别看我。尸牌、文书和你的反刀都与我无关。你要逞能，便用自己的名字逞。'
      : '你若要说，就只说刀口。别替天下说话，天下也不会替你挨刀。'
  const douziLine = has(state, 'douzi-angry')
    ? '上次你说了真话，粮也跟着走了。这回我先把冒领粮的名字印给营里人看，再等你说道理。'
    : has(state, 'proof-unspoken')
      ? '你教我不开口也能改一船粮。我已经把名册藏下了，这回轮到你猜我想做什么。'
      : '给我一块版。军官能把死人的名字抄十一遍领粮，我为什么不能把这十一个名字印给活人看？'
  const zhaoLine = has(state, 'zhao-owes-name')
    ? '你借我一条命，今日我替你把名册送进去。送到以后，我们两清。'
    : has(state, 'zhao-has-leverage')
      ? '你若公开作证，我就把那具借名的尸体也公开。别瞪我，这是你亲手给我的价钱。'
      : '我可以把一张名册送进去，但不会白送。你上次守住了死人的名，今日也守守活人的价。'
  return {
    chapter: 3,
    title: '营门只认一刀',
    eyebrow: '第三回·天黑以前',
    date: '崇祯十七年 三月二十七日',
    location: '通州西·无名军营',
    opening: [
      has(state, 'grain-to-refugees') ? '粮船没有到转运营。营门外却来了两百个刚吃过粥的难民。' : '粮船靠在转运营外，难民跟了一路，谁也不肯先散。',
      '营官手里有转运队领粮名册，吴七娘手里有近七日的收粮签记。两样都是真的，名册上却有收殓单里那十一个死者。',
      '小满能证明有人仍在用死人领粮。她不能靠一句话打开营门：钥匙在守门兵手里，船在吴七娘手里，名册的副本已被豆子偷走。',
    ],
    lines: [
      { speaker: 'master-he', text: masterLine },
      { speaker: 'douzi', text: douziLine },
      { speaker: 'zhao-si', text: zhaoLine },
      { speaker: has(state, 'knows-chunsheng') ? 'chunsheng' : 'wu-qiniang', text: has(state, 'knows-chunsheng') ? '姐，别拿整船人的粮买我回家。我不跟你走。我要让同伍先看见那十一个死人名字。' : '我会把船横在营门外，但不会替你冲门。你得让营里的兵和家眷自己动。' },
    ],
    clues: [
      { id: 'official-seal', label: '名册与收粮签记', detail: '十一个名字同时出现在小满七日前刻过的尸牌和今日领粮名册上；收粮签记显示，有人今早仍替他们领走了粮。' },
      { id: 'women-line', label: '营墙下的家眷', detail: '她们拿着空碗，没有跟军官喊，也没有跟难民喊。营门一乱，她们会最先被挤倒。' },
      { id: 'inked-hands', label: '豆子的手', detail: '他偷走了一页冒领名字，手上已经沾了新墨。他想把名字印给营兵和家眷，让他们自己去找握钥匙的守门兵。' },
    ],
    question: '证据只能让人看见冒领，营门要靠里面的人打开。你准备把风险交给谁？',
    choices: CHOICES.gate,
    sourceNote: '北京与通州之间的粮食转运依赖河道、船只和大量人力。',
    boundary: '该临时转运营、领粮名册、冒领记录、人物行动与后果均为架空推演；链接史料只支持运河和转运结构，不支持虚构营地的文书流程。',
    sources: [{ title: '中国国家博物馆：通惠河漕运图卷', url: 'https://www.chnmuseum.cn/zp/zpml/ysp/202012/t20201217_248581.shtml' }],
  }
}

const AFTERMATH: Record<string, (state: StoryState) => StoryAftermath> = {
  'refuse-name': () => ({ title: '赵四活着走了', lead: '无名死者依旧无名。', lines: [{ speaker: 'zhao-si', text: '你守住了他的名字。可你弟弟的名字，今日别想从我嘴里拿走。' }, { speaker: 'master-he', text: '一钱银子都没收，还把客人得罪了。行，这脂粉铺子日后交给你开。' }], consequence: '你保住了一个死人的身份，也失去了赵四手里的弟弟线索。', debt: '赵四不欠你；何师傅嘴上骂你，却第一次把铺子说成你的。', nextHook: '七日后，赵四介绍了一笔通州的刻字活。他不还人情，只谈价钱。' }),
  'cut-mark': () => ({ title: '赵四骗过了一次运夫点名', lead: '尸牌不能让他从天下消失，但足够让追征运夫的小吏在名字上画一道叉。', lines: [{ speaker: 'master-he', text: '那道反刀不是我教的。往后也别说是在我铺里学的。' }, { speaker: 'zhao-si', text: '你让我躲过一次点名。我会还，但怎么还，由我定。' }], consequence: '你帮赵四骗过了一个小吏，也把自己的刀口留在了可被追查的物证上。', debt: '赵四欠你一次送命的差事；何师傅已准备在出事时否认你。', nextHook: '七日后，赵四拿那道反刀向运粮船主吹嘘，为你们换来一笔通州的刻字活。' }),
  'sell-name': () => ({ title: '五日的粮到手了', lead: '一个死人有了赵四的名字，赵四拿走了你的把柄。', lines: [{ speaker: 'master-he', text: '银子是你收的。日后若有人问，也是你刻的。' }, { speaker: 'zhao-si', text: '别怕。秘密和银子一样，只有花出去才会少。' }], consequence: '你救了眼前的三张嘴，也让赵四变成唯一能证明这笔交易的人。', debt: '你欠死者一个名字，欠赵四一次沉默；何师傅决定出事时只保自己。', nextHook: '七日后，赵四拿这个秘密逼你们跟他去通州，分辨两份相互矛盾的提粮文书。' }),
  'tell-cut': () => ({ title: '吴七娘把船驶向军营', lead: '小满证明了制版先后。吴七娘根据这个判断选了航向，责任不会因此消失。', lines: [{ speaker: 'master-he', text: '追查起来，我只会说你自己看的，自己说的。你早该知道。' }, { speaker: 'douzi', text: '后到的就不真？难民的饿可是先到的。' }], consequence: '你公开了专业判断，吴七娘把粮送往军营，难民棚失去今夜的口粮。', debt: '难民记住了是你的判断让船开走；豆子决定下次先行动再听道理。', nextHook: '粮船到军营时，小满在领粮名册上认出了十一个亲手刻过尸牌的死者。' }),
  'keep-quiet': () => ({ title: '粮船向难民棚驶去', lead: '小满没有说谎。她只是没有说自己知道的事。', lines: [{ speaker: 'douzi', text: '原来闭嘴也能放粮。这可比刻字快多了。' }, { speaker: 'master-he', text: '今日你的沉默救人。明日别人的沉默杀你，你也不要喊冤。' }], consequence: '难民吃到粥，军营继续断粮。你保住了自己，也让证据失去了第一个证人。', debt: '军营的饥饿会回来索债；豆子学会了用沉默动手。', nextHook: '天黑前，欠饷兵冲出营门，追上了粮船和人群。' }),
  'lie-for-clue': () => ({ title: '赵四说出了姚春生的下落', lead: '弟弟在城外那营当兵。粮船也正驶向那里。', lines: [{ speaker: 'zhao-si', text: '我没骗你。我只是等你也说一次谎，好知道我们是一种人。' }, { speaker: 'douzi', text: '难民都看着你。他们不知道你弟弟叫什么，只知道船是你叫开的。' }], consequence: '你用一船粮换到了弟弟的准确下落。难民没有吃到今夜的粥。', debt: '赵四还清了情报的债；你欠难民一船他们看见过的粮。', nextHook: '粮船到营门时，姚春生就站在持刀的兵里。' }),
}

export function buildAftermath(state: StoryState): StoryAftermath {
  const choice = state.choices[state.choices.length - 1]
  if (choice.chapter < 3) return AFTERMATH[choice.choiceId](state)

  const zhaoCarries = state.flags.includes('zhao-owes-name')
  const zhaoThreatens = state.flags.includes('zhao-has-leverage')
  if (choice.choiceId === 'show-proof') return {
    title: '十一个死人的名字被挂上营门',
    lead: '吴七娘把船横在门外。赵四把名册送给守门兵，豆子把冒领记录印给家眷。营里的人自己开始点名。',
    lines: [
      { speaker: 'zhao-si', text: zhaoCarries ? '这趟送到，尸牌的债就两清。你若死了，别再找我借名字。' : zhaoThreatens ? '名册我送到了。尸牌的事我也说了。你要公开，就一起公开。' : '我替你送了。价钱以后再计，别把这当成人情。' },
      { speaker: 'xiaoman', text: '我证的是这十一个名字已经死了。谁在替死人领粮，你们自己问。' },
    ],
    consequence: '守门兵把钥匙交给了军属。军官被底层营兵扣下，粮食先按现有活人发放；一名小校带着名册抄本和签记留样离营。',
    debt: zhaoThreatens ? '冒领证据被保住，小满借尸骗过点名的事也被公开。' : '作证者都成了可被追查的人；何师傅是否承认小满，将决定她能否跟船离开。',
    nextHook: '名册抄本只会被下一营当作线索，不是命令。下一营的人仍得自己查证。',
  }
  if (choice.choiceId === 'open-first') return {
    title: '营里的人先动了',
    lead: '豆子印的不是命令，是十一个死者的名字。吴七娘沿营墙分发，军属拿着它们去找自家的守门兵。',
    lines: [{ speaker: 'douzi', text: '我没印一句假话。我只是印得比军官收纸的人快。' }, { speaker: 'wu-qiniang', text: '船我横了，名字我散了。门若还不开，就证明营里的人还没饿到同一处。' }],
    consequence: '两名守门兵从里面抽掉门闩，军属先进营盯住粮仓。军官不得不当众核对名册，却趁乱擒走了一名刷印人。',
    debt: '你们没有伪造授权，却证明了名字可以被快速复制来组织人。下一个人也会学会这件事。',
    nextHook: '豆子的版没被找到。是他自己藏的，还是别人偷的，小满第一次真的不知道。',
  }
  return {
    title: '纸烧得比粮快',
    lead: '名册和收粮记录一起卷成黑边。军官无法再用名册自证，小满也失去了指认冒领的物证。',
    lines: [{ speaker: 'zhao-si', text: '没了纸，就只剩下人。人可比纸更会说谎。' }, { speaker: 'xiaoman', text: '我只是不肯让军官和豆子都拿死人的名字当自己的刀。' }],
    consequence: '吴七娘把船横在营外，军属说动一名守门兵开了侧门。粮食被分掉，冒领者却没有留下可追查的名字。',
    debt: '你保住了自己不被文书追查，也亲手烧掉了让更多营查证的路。',
    nextHook: '史书若提到这里，只会写“饥兵争粮”。只有当时的人知道，火里曾有过可以继续查的名字。',
  }
}
