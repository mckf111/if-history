import type { EventDefinition } from './types'

export const MAIN_EVENTS: EventDefinition[] = [
  {
    id: 'coal-hill', act: 1, date: '崇祯十七年 三月十九日', category: '生死', title: '煤山未尽',
    brief: '王承恩割断白绫。山下火光逼近，宫门已开。你还活着，但大明皇帝如今只剩一夜可用。',
    context: '活下来不是胜利。皇帝、太子、印玺与能够证明身份的人，至少要有一项抵达南方。',
    sourceId: 'counterfactual', boundary: '王承恩阻止自缢是本作唯一预设变量；三条撤离路线均为遵守城破条件的架空设计。',
    choices: [
      { id: 'secret-way', title: '由内官密道出城', summary: '轻装，只带王承恩与印玺，趁乱向通州走。', consequenceHint: '较稳妥；失去召集旧部的机会。', immediate: { metrics: { legitimacy: 2, command: -4 }, addFlags: ['seal-saved', 'secret-flight'] }, actorIds: ['wang-chengen'], check: { baseChance: 72, metricWeights: { court: .08 }, actorSkill: 'intrigue', delay: 1, success: { metrics: { legitimacy: 5 }, resources: { couriers: 1 }, addFlags: ['emperor-escaped'] }, failure: { metrics: { people: -6, legitimacy: -8 }, resources: { treasury: -1 }, addFlags: ['wounded-flight'] }, successText: '通州旧驿仍有一条船。天亮前，御舟已离开北京。', failureText: '密道出口被乱兵发现。你虽脱身，随行者和内帑又少了一半。' } },
      { id: 'rally-guards', title: '回宫召集宿卫', summary: '公开身份，带走太子与仍愿从命的禁军。', consequenceHint: '收益极高，但城破之夜最忌声张。', immediate: { metrics: { legitimacy: 7, command: 4 }, resources: { couriers: -1 }, addFlags: ['rallied-guards'] }, actorIds: ['wang-chengen'], check: { baseChance: 42, metricWeights: { command: .15, court: .08 }, actorSkill: 'integrity', delay: 1, success: { metrics: { legitimacy: 9, command: 7 }, resources: { treasury: 1 }, addFlags: ['heir-saved', 'emperor-escaped'] }, failure: { metrics: { legitimacy: -12, command: -8 }, resources: { treasury: -2 }, addFlags: ['heir-lost', 'wounded-flight'] }, successText: '数十名宿卫护着太子杀出东便门。残破的队伍，却仍像一个朝廷。', failureText: '宫中已无人听令。混乱中太子失散，只余王承恩拖你出城。' } },
      { id: 'hide-among-people', title: '换衣混入流民', summary: '舍弃仪仗与印玺，以百姓身份穿过陷落的城门。', consequenceHint: '最容易活命，法统将承受长期疑问。', immediate: { metrics: { legitimacy: -10, people: 8 }, addFlags: ['seal-lost', 'saw-refugees'] }, check: { baseChance: 82, metricWeights: { people: .08 }, delay: 1, success: { metrics: { people: 5 }, resources: { couriers: 1 }, addFlags: ['emperor-escaped'] }, failure: { metrics: { legitimacy: -7 }, resources: { treasury: -2 }, addFlags: ['wounded-flight'] }, successText: '没有人认出那个扶着老妇越过尸堆的中年人。皇帝第一次从城外看见北京。', failureText: '关卡搜去了最后的财物。你活着离城，却拿不出一件能立刻证明身份的东西。' } },
    ],
  },
  {
    id: 'last-edict', act: 1, date: '三月二十日', category: '政令', title: '留给北京的最后一道旨',
    brief: '逃亡途中仍可发出一道命令。它未必能救北京，却会决定北方百姓和守军如何记住你。',
    context: '驿骑只够送出一份正式诏书，收件者也未必还在原位。', sourceId: 'jiangnan-news', boundary: '北京失陷和信息混乱属史实；诏书内容及影响为架空推演。',
    choices: [
      { id: 'dismiss', title: '解散守军，保全民众', summary: '准许无力再战者卸甲归家，命官仓就地放粮。', consequenceHint: '民心受益；军事威望受损。', cost: { couriers: 1 }, immediate: { metrics: { people: 10, command: -6, legitimacy: 2 }, addFlags: ['beijing-relief'] } },
      { id: 'resist', title: '号召巷战到底', summary: '以勤王名义要求军民拖住大顺，为南迁争取时间。', consequenceHint: '可能迟滞追兵，也会扩大伤亡。', cost: { couriers: 1 }, immediate: { metrics: { command: 7, people: -9 }, addFlags: ['beijing-resistance'] }, check: { baseChance: 38, metricWeights: { legitimacy: .12, command: .1 }, delay: 1, success: { metrics: { command: 5 }, addFlags: ['shun-delayed'] }, failure: { metrics: { people: -7, legitimacy: -5 }, addFlags: ['beijing-massacre'] }, successText: '零散守军坚持到第二日，追索御驾的兵力被迫回城。', failureText: '诏书被不同队伍各自解释，抵抗很快变成抢掠与报复。' } },
      { id: 'amnesty', title: '赦降官，保存名册', summary: '允许官员暂降保民，暗令保存户册、仓册和驿站。', consequenceHint: '被视为软弱，却可能保住国家的记忆。', cost: { couriers: 1 }, immediate: { metrics: { court: 5, legitimacy: -4, people: 4 }, addFlags: ['northern-registers'] } },
    ],
  },
  {
    id: 'road-south', act: 1, date: '三月下旬', category: '行路', title: '南下之路',
    brief: '通州以南，运河驿站人去楼空。追兵、流民和消息同时向南涌。御驾必须选择路线。',
    context: '快路更容易被发现，稳路会让南京先被谣言占领。', sourceId: 'southern-ming', boundary: '交通崩坏和流民南下属史实；皇帝的路线为架空。',
    choices: [
      { id: 'grand-canal', title: '沿运河疾行', summary: '依赖残存漕站，抢在封锁前抵达淮安。', consequenceHint: '最快；需要驿骑打通关节。', cost: { couriers: 1 }, immediate: { metrics: { supply: 3 } }, actorIds: ['li-mingrui', 'wang-chengen'], check: { baseChance: 55, metricWeights: { supply: .12, court: .06 }, actorSkill: 'statecraft', delay: 1, success: { metrics: { legitimacy: 5, supply: 5 }, addFlags: ['early-nanjing'] }, failure: { metrics: { people: -4, legitimacy: -5 }, resources: { treasury: -1 }, addFlags: ['rumors-ahead'] }, successText: '漕丁仍认得大明的关防。几处闸口连夜放船，南京尚未来得及另立新君。', failureText: '船队在临清受阻。等你继续南下时，真假皇帝的传言已经跑在前面。' } },
      { id: 'coast', title: '转走山东海路', summary: '从海上绕开大顺控制区，并尝试联系登莱旧部。', consequenceHint: '隐蔽且可能获得水师，风浪与时间不可控。', cost: { treasury: 1 }, immediate: { metrics: { supply: -3 }, addFlags: ['coastal-route'] }, actorIds: ['wang-chengen'], check: { baseChance: 58, metricWeights: { legitimacy: .06 }, actorSkill: 'intrigue', delay: 2, success: { metrics: { command: 5 }, resources: { treasury: 1 }, addFlags: ['naval-contact'] }, failure: { metrics: { supply: -8, people: -3 }, addFlags: ['late-nanjing'] }, successText: '一支登莱商船认出关防，护送御驾直抵长江口。', failureText: '风向和海盗让行程多耗半月，南都已在争论该拥立哪位宗室。' } },
      { id: 'hidden-land', title: '分队走陆路', summary: '御驾、太子和信使分开南下，降低一网打尽的风险。', consequenceHint: '生存率较高；权威与信息将进一步碎裂。', immediate: { metrics: { legitimacy: -3, court: -4 }, resources: { couriers: 1 }, addFlags: ['split-party'] }, check: { baseChance: 68, metricWeights: { people: .08 }, delay: 1, success: { metrics: { people: 4 }, addFlags: ['local-guides'] }, failure: { metrics: { legitimacy: -7 }, addFlags: ['party-missing'] }, successText: '乡民带队绕过兵卡，各路人马在淮安重新会合。', failureText: '一队信使再无消息。南京收到的诏书残缺，疑心更重。' } },
    ],
  },
  {
    id: 'proclamation', act: 1, date: '四月初', category: '名分', title: '皇帝为何南来',
    brief: '抵达淮安后，第一份能够传遍江南的诏书等待落印。你必须解释：这是逃亡，还是另一种战争？',
    context: '措辞将决定士绅、军人和百姓分别把你看作什么。', sourceId: 'southern-capital', boundary: '南京留都制度属史实；三种政治叙事及其后果为架空。',
    choices: [
      { id: 'tour-war', title: '称南巡亲征', summary: '否认迁都，宣布以南京为行在、整军北伐。', consequenceHint: '维护名分；也制造必须尽快出兵的压力。', immediate: { metrics: { legitimacy: 9, command: 3, court: -3 }, addFlags: ['promised-northern-campaign'] } },
      { id: 'self-reproach', title: '下罪己诏', summary: '承认误国与弃民，公布减膳、停工和问责。', consequenceHint: '争取民众；官僚可能把认错理解为可乘之机。', immediate: { metrics: { people: 10, legitimacy: 4, court: -5 }, resources: { treasury: 1 }, addFlags: ['austere-court'] } },
      { id: 'dual-capital', title: '宣布两京并立', summary: '南京接续政务，北方官民仍属大明，不追究暂降。', consequenceHint: '重视制度延续；立场不够激烈。', immediate: { metrics: { court: 9, supply: 3, legitimacy: 2 }, addFlags: ['dual-capital-policy'] } },
    ],
  },
  {
    id: 'nanjing-gate', act: 2, date: '四月中旬', category: '朝局', title: '南都城门',
    brief: '南京六部官员、勋臣和军队在城外迎驾。他们行礼整齐，彼此却都在计算谁将失去位置。',
    context: '北来官员和南京官署若直接合并，争权会立刻开始；若完全依靠旧班底，南方不会听命。', sourceId: 'southern-capital', boundary: '南京具备平行官署属史实；迎驾和整合方式为架空。',
    choices: [
      { id: 'keep-southern', title: '全用南京原官署', summary: '北来官员暂作顾问，不夺南官职位。', consequenceHint: '政务接续最快；旧臣和皇帝的控制力下降。', immediate: { metrics: { court: 9, command: -4 }, relations: { 'ma-shiying': 5, 'li-mingrui': -4 }, addFlags: ['southern-bureaucracy'] } },
      { id: 'merge', title: '南北官员混编', summary: '每部设置南北两名主官，三个月后考核去留。', consequenceHint: '短期摩擦大，可能建立更可靠的制度。', immediate: { metrics: { court: -4, legitimacy: 4 }, addFlags: ['merit-review'] }, actorIds: ['shi-kefa', 'li-mingrui'], check: { baseChance: 56, metricWeights: { legitimacy: .1, court: .12 }, actorSkill: 'statecraft', delay: 2, success: { metrics: { court: 12, command: 4 }, addFlags: ['merged-administration'] }, failure: { metrics: { court: -10, supply: -3 }, addFlags: ['office-feud'] }, successText: '考成册第一次把官员的承诺与结果放在一起，六部勉强开始同向运转。', failureText: '双主官变成双重命令，地方借口无所适从而拒绝执行。' } },
      { id: 'purge', title: '先清查再任用', summary: '封存衙门，追查贪墨、误国和党争旧案。', consequenceHint: '彰显威严；危局中停摆代价巨大。', immediate: { metrics: { legitimacy: 6, court: -11, supply: -4 }, relations: { 'ma-shiying': -8, 'shi-kefa': 2 }, addFlags: ['official-purge'] } },
    ],
  },
  {
    id: 'cabinet', act: 2, date: '五月', category: '用人', title: '谁来主持南都',
    brief: '史可法有清望，马士英有兵和现实手腕，李明睿最早主张南迁。皇帝不能亲自批完每一道粮票。',
    context: '首辅之选不只改变数值，也决定之后谁愿意为朝廷承担风险。', sourceId: 'southern-ming', boundary: '人物身份与政治资源来自史实；在崇祯麾下组阁为架空。',
    choices: [
      { id: 'shi', title: '以史可法主政', summary: '用清望整合士林，马士英留督凤阳。', consequenceHint: '法统与信任较强；军镇协调仍是难题。', immediate: { metrics: { legitimacy: 7, court: 5, command: -2 }, relations: { 'shi-kefa': 14, 'ma-shiying': -7 }, addFlags: ['shi-cabinet'] } },
      { id: 'ma', title: '以马士英主政', summary: '用兵力与关系网迅速收拢江北。', consequenceHint: '执行力较强；士林反弹明显。', immediate: { metrics: { command: 7, court: 3, legitimacy: -6 }, relations: { 'ma-shiying': 14, 'shi-kefa': -6 }, addFlags: ['ma-cabinet'] } },
      { id: 'war-council', title: '设战时合议院', summary: '三人共同署名，军饷和军令必须留下可核对记录。', consequenceHint: '慢，但能减少一人垄断；需要皇帝容忍争论。', immediate: { metrics: { court: -3, legitimacy: 3 }, relations: { 'shi-kefa': 5, 'ma-shiying': 3, 'li-mingrui': 7 }, addFlags: ['war-council'] }, actorIds: ['shi-kefa', 'li-mingrui'], check: { baseChance: 58, metricWeights: { court: .15, legitimacy: .06 }, actorSkill: 'statecraft', delay: 2, success: { metrics: { court: 11, command: 5 }, addFlags: ['audited-council'] }, failure: { metrics: { court: -7, command: -4 }, addFlags: ['paralyzed-council'] }, successText: '公开账册让争论仍然尖锐，却不再能随意捏造军情与饷数。', failureText: '共同署名变成无人负责，紧急军报在三处官署间往返。' } },
    ],
  },
  {
    id: 'raise-revenue', act: 2, date: '六月', category: '财政', title: '第一笔军饷',
    brief: '江北各军同时索饷。南京富庶，但财富在商人、士绅和层层旧账里，并不在国库。',
    context: '银子不是抽象资源：征收方式会改变谁认为这个政权值得继续。', sourceId: 'ming-military', boundary: '明末军费和欠饷困境属史实；具体筹措方案及收益为架空。',
    choices: [
      { id: 'forced-levy', title: '按田亩加派', summary: '由地方官限期征收，三个月内补足军需。', consequenceHint: '见效快；会把战争成本压向基层。', immediate: { metrics: { supply: 11, people: -12, court: -3 }, resources: { treasury: 3 }, addFlags: ['land-surcharge'] } },
      { id: 'merchant-bonds', title: '发行复国公债', summary: '以盐课、关税作抵押，允许商人监督专款。', consequenceHint: '需要让渡财政透明度，信用良好时回报高。', immediate: { metrics: { legitimacy: 2, court: -2 }, addFlags: ['war-bonds'] }, actorIds: ['li-mingrui', 'ma-shiying'], check: { baseChance: 52, metricWeights: { legitimacy: .16, court: .08 }, actorSkill: 'statecraft', delay: 1, success: { metrics: { supply: 9, people: 3 }, resources: { treasury: 4 }, addFlags: ['merchant-credit'] }, failure: { metrics: { legitimacy: -6, supply: -4 }, resources: { treasury: 1 }, addFlags: ['bond-discount'] }, successText: '商帮认购超出预期，因为账目第一次允许出资人查验。', failureText: '商人只肯折价接券，市面把“复国银票”当成又一次摊派。' } },
      { id: 'court-austerity', title: '先清内帑与勋田', summary: '皇室、勋臣先交银停禄，再请江南共担。', consequenceHint: '数额有限，但能改变征收的政治顺序。', immediate: { metrics: { legitimacy: 8, people: 7, court: -7, supply: 4 }, resources: { treasury: 2 }, addFlags: ['court-austerity'] } },
    ],
  },
  {
    id: 'four-garrisons', act: 2, date: '七月', category: '兵权', title: '江北诸镇',
    brief: '高杰、黄得功等军拥兵争地。给他们地盘，百姓受苦；不给，他们可能自己来拿。',
    context: '纸面兵额不等于朝廷军队。谁发饷、谁任官、谁掌家属，才是谁的兵。', sourceId: 'ming-military', boundary: '南明军镇难制属史实；崇祯整军路线为架空。',
    choices: [
      { id: 'zones', title: '划防区、给饷不夺兵', summary: '承认各镇现状，以守土和军纪换取粮饷。', consequenceHint: '短期最稳；长期坐大。', cost: { treasury: 2 }, immediate: { metrics: { command: 4, supply: 3, people: -4 }, relations: { 'gao-jie': 10, 'huang-degong': 9 }, addFlags: ['warlord-zones'] } },
      { id: 'mixed-command', title: '混编亲军与诸镇', summary: '抽调精兵、轮换驻地，并由兵部统一核饷。', consequenceHint: '真正收兵权；极易引发抵制。', cost: { treasury: 2, couriers: 1 }, immediate: { metrics: { command: -3, court: -2 } }, actorIds: ['shi-kefa', 'huang-degong'], check: { baseChance: 45, metricWeights: { command: .18, supply: .12, legitimacy: .05 }, actorSkill: 'military', delay: 2, success: { metrics: { command: 15, people: 4 }, addFlags: ['central-army'] }, failure: { metrics: { command: -12, people: -7 }, addFlags: ['garrison-mutiny'] }, successText: '第一批混编营按新饷册领粮，士兵开始区分朝廷军令与将主私令。', failureText: '裁并名单外泄，几营士兵裹挟百姓抢占州县。' } },
      { id: 'hostages', title: '厚赏将领、家属入京', summary: '封爵加赏，邀请将领家属居南京“奉养”。', consequenceHint: '传统而有效；会加深猜疑与财政压力。', cost: { treasury: 3 }, immediate: { metrics: { command: 8, supply: -4, legitimacy: -2 }, relations: { 'gao-jie': 4, 'huang-degong': 5 }, addFlags: ['garrison-hostages'] } },
    ],
  },
  {
    id: 'wu-choice', act: 3, date: '八月', category: '北方', title: '山海关来使',
    brief: '吴三桂的使者抵达。他没有解释全部经过，只说关宁军仍愿奉大明正朔，条件是承认其处置北方的权力。',
    context: '你不知道他与清军谈到哪一步。答复太慢，本身也是一种答复。', sourceId: 'southern-ming', boundary: '吴三桂引清入关属史实；在崇祯存活时间线中的来使与条件为架空。',
    choices: [
      { id: 'restore', title: '赦免并恢复全权', summary: '仍以平西伯节制关宁，命其抗清复京。', consequenceHint: '可能保留北方支点，也可能养出另一个政权。', cost: { couriers: 1 }, immediate: { metrics: { command: 4, legitimacy: -4 }, relations: { 'wu-sangui': 14 }, addFlags: ['wu-restored'] }, actorIds: ['li-mingrui', 'ma-shiying'], check: { baseChance: 47, metricWeights: { legitimacy: .1, command: .08 }, actorSkill: 'intrigue', delay: 2, success: { metrics: { command: 8 }, addFlags: ['northern-buffer'] }, failure: { metrics: { legitimacy: -8 }, addFlags: ['wu-used-title'] }, successText: '关宁军暂缓南撤，在山海关外维持一块名义上的明军防区。', failureText: '吴三桂收下名号，却继续借清军扩张自己的地盘。' } },
      { id: 'conditional', title: '只认军、暂缓封爵', summary: '先送饷慰军，要求送家属与副将入南京议事。', consequenceHint: '可验证忠诚；也可能把对方推向清廷。', cost: { treasury: 2, couriers: 1 }, immediate: { metrics: { legitimacy: 3, supply: -3 }, addFlags: ['test-wu'] }, actorIds: ['wang-chengen', 'li-mingrui'], check: { baseChance: 52, metricWeights: { legitimacy: .15, supply: .05 }, actorSkill: 'intrigue', delay: 2, success: { metrics: { command: 7, legitimacy: 4 }, relations: { 'wu-sangui': 6 }, addFlags: ['wu-family-south'] }, failure: { metrics: { command: -5 }, relations: { 'wu-sangui': -12 }, addFlags: ['wu-to-qing'] }, successText: '一批关宁将校家眷抵达南京，吴三桂至少还不愿彻底断绝退路。', failureText: '使者原路返回。不久，北方军报开始称吴军与八旗并肩行动。' } },
      { id: 'condemn', title: '明诏定罪', summary: '斥其借虏复仇，号召关宁军士自行南归。', consequenceHint: '维护政治底线；放弃影响其选择的机会。', immediate: { metrics: { legitimacy: 8, command: -7 }, relations: { 'wu-sangui': -20 }, addFlags: ['wu-condemned'] } },
    ],
  },
  {
    id: 'shun-question', act: 3, date: '十月', category: '外交', title: '大顺余部的国书',
    brief: '李自成退出北京后仍有大军。他提出共同拒清，却要求明廷承认大顺官爵，并停止追究北京之变。',
    context: '敌人的敌人可以争取时间，但联盟会撕裂“复仇”和“正统”的政治叙事。', sourceId: 'southern-ming', boundary: '大顺败退与清军入关属史实；正式国书和联盟条件为架空。',
    choices: [
      { id: 'alliance', title: '联顺抗清', summary: '互不隶属，划定战区，先逐清军再议天下。', consequenceHint: '军事收益最大；法统与旧仇代价高。', cost: { couriers: 1 }, immediate: { metrics: { legitimacy: -9, command: 5, people: 2 }, addFlags: ['shun-alliance'] }, actorIds: ['li-mingrui', 'shi-kefa'], check: { baseChance: 55, metricWeights: { legitimacy: .08, command: .08 }, actorSkill: 'statecraft', delay: 1, success: { metrics: { command: 10, supply: 4 }, addFlags: ['joint-front'] }, failure: { metrics: { command: -6, legitimacy: -4 }, addFlags: ['shun-betrayal-rumor'] }, successText: '双方交换防区和清军动向，第一次让八旗不得不同时照看两条战线。', failureText: '盟书尚未落实便遭泄露，明顺两军都有人借机攻击主帅。' } },
      { id: 'amnesty-soldiers', title: '赦兵不认大顺', summary: '招抚基层军民，拒绝承认李自成的政权。', consequenceHint: '政治上较稳；难以形成统一战线。', immediate: { metrics: { legitimacy: 4, people: 5, command: 2 }, addFlags: ['shun-amnesty'] } },
      { id: 'revenge', title: '先讨逆、再拒清', summary: '宣布大顺仍是首敌，任何谈判都是辱国。', consequenceHint: '名分清楚；让清军从分裂中获利。', immediate: { metrics: { legitimacy: 9, command: -8, people: -4 }, addFlags: ['two-front-war'] } },
    ],
  },
  {
    id: 'jianghuai-defense', act: 3, date: '崇祯十八年 正月', category: '战略', title: '江淮防线',
    brief: '清军前锋转向河南。江北将领都说自己能守，却都要求别人先交兵、交粮、交城。',
    context: '朝廷只够支持一种主战略，其他方向只能依靠地方自守。', sourceId: 'southern-ming', boundary: '清军南下和南明防务失序属史实；具体作战方案为架空。',
    choices: [
      { id: 'hold-huai', title: '重守淮扬', summary: '集中军粮与火器，以城市和运河迟滞南下。', consequenceHint: '稳健；一旦外围崩溃将承受围城。', cost: { treasury: 2, couriers: 1 }, immediate: { metrics: { supply: 4, people: -3 } }, actorIds: ['shi-kefa', 'huang-degong'], check: { baseChance: 50, metricWeights: { command: .2, supply: .18, court: .05 }, actorSkill: 'military', delay: 1, success: { metrics: { command: 10, legitimacy: 6 }, addFlags: ['huai-held'] }, failure: { metrics: { command: -10, people: -8 }, addFlags: ['yangzhou-falls'] }, successText: '军粮、河闸和援军时刻终于对上，清军在淮北失去一个月。', failureText: '互不统属的援军隔岸观望，淮扬防线被各个击破。' } },
      { id: 'defense-depth', title: '放弃淮北，坚壁清野', summary: '撤军民于长江南岸，毁渡船、集中水师。', consequenceHint: '保存主力；北岸百姓和政治声望代价惨重。', immediate: { metrics: { command: 6, supply: 5, people: -13, legitimacy: -6 }, addFlags: ['yangtze-defense'] } },
      { id: 'counterattack', title: '主动北上会师', summary: '趁清军立足未稳，与大顺或关宁残部夹击。', consequenceHint: '最可能改变战争；也最可能葬送主力。', cost: { treasury: 3, couriers: 1 }, immediate: { metrics: { command: 3, supply: -7 } }, actorIds: ['huang-degong', 'gao-jie', 'zuo-liangyu'], check: { baseChance: 36, metricWeights: { command: .22, supply: .16, legitimacy: .05 }, actorSkill: 'military', delay: 1, success: { metrics: { command: 16, legitimacy: 10 }, addFlags: ['northern-victory'] }, failure: { metrics: { command: -16, supply: -8 }, addFlags: ['field-army-lost'] }, successText: '清军前锋被迫后撤。胜利不大，却证明南军并非只能守城。', failureText: '军镇行军期不一，主力在会师前已被击溃。' } },
    ],
  },
  {
    id: 'final-council', act: 3, date: '崇祯十八年 四月', category: '终局', title: '最后一次战时朝议',
    brief: '北岸烽烟已能从南京城头望见。群臣等待的不是一句豪言，而是一套失败后仍有人执行的命令。',
    context: '你必须决定皇帝、朝廷、军队与百姓谁先退、谁留下，以及政权是否还有第二个支点。', sourceId: 'southern-ming', boundary: '1645年清军逼近南京属史实；崇祯主持的终局部署为架空。',
    choices: [
      { id: 'hold-capital', title: '御驾守南京', summary: '公布防区、粮册与继承顺序，皇帝与都城共存亡。', consequenceHint: '凝聚最高；若城破将失去全部中枢。', immediate: { metrics: { legitimacy: 10, command: 5, people: 4 }, addFlags: ['emperor-holds-nanjing'] } },
      { id: 'mobile-court', title: '朝廷移驻上游', summary: '南京守军独立指挥，御驾转往湖广组织纵深。', consequenceHint: '保存政权；再次撤退会重伤信任。', cost: { couriers: 1 }, immediate: { metrics: { legitimacy: -7, command: 3, court: 5 }, addFlags: ['mobile-court'] } },
      { id: 'sea-fallback', title: '建立海上后路', summary: '留中枢守城，提前把太子、档案和银粮送往福建水师。', consequenceHint: '最现实的保险；分散眼前防御资源。', cost: { treasury: 2 }, immediate: { metrics: { supply: -4, legitimacy: -2, court: 3 }, addFlags: ['sea-fallback'] } },
    ],
  },
]
