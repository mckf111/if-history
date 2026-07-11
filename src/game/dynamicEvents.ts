import type { EventDefinition } from './types'

export const DYNAMIC_EVENTS: EventDefinition[] = [
  {
    id: 'missing-heir', act: 1, date: '京师失陷后', category: '皇室', title: '太子的下落',
    brief: '信使称太子可能仍在北京，也有人说已被乱军带往东郊。每一日都会产生新的“太子”。',
    context: '寻找血脉能够巩固法统，也可能暴露御驾路线。', sourceId: 'jiangnan-news', boundary: '太子在北京失陷后下落成谜属史实；营救行动为架空。',
    choices: [
      { id: 'rescue', title: '派死士回京', summary: '以密记和旧宫人辨认太子。', consequenceHint: '耗费驿骑，可能挽回皇嗣。', cost: { couriers: 1, treasury: 1 }, immediate: { metrics: { legitimacy: 2 } }, actorIds: ['wang-chengen'], check: { baseChance: 34, metricWeights: { court: .05 }, actorSkill: 'intrigue', delay: 2, success: { metrics: { legitimacy: 12 }, addFlags: ['heir-saved'] }, failure: { metrics: { legitimacy: -3 }, addFlags: ['rescuers-lost'] }, successText: '旧宫人认出太子肩上的胎记。一支不起眼的商队正向南走。', failureText: '接应点只留下血迹。更多人开始借太子之名聚众。' } },
      { id: 'recognition-rule', title: '公布验明规程', summary: '不派人冒险，先宣布由宗人府、宫人和密档共同验明。', consequenceHint: '不能救人，但能压低冒名风险。', immediate: { metrics: { court: 5, legitimacy: 2 }, addFlags: ['heir-protocol'] } },
      { id: 'name-successor', title: '立即指定备位', summary: '按宗法公布替代继承顺序，不让朝廷被一人下落绑架。', consequenceHint: '制度稳定；近似宣布放弃太子。', immediate: { metrics: { court: 7, legitimacy: -5 }, addFlags: ['succession-order'] } },
    ],
  },
  {
    id: 'palace-silver', act: 1, date: '离京途中', category: '资源', title: '散落的内帑',
    brief: '一名内官知道皇庄银车的去向，但车旁聚集了饥民和溃兵。',
    context: '拿回银子可以救军，却会拖慢行程并暴露身份。', sourceId: 'counterfactual', boundary: '具体银车为架空；内帑与军费紧张符合明末财政背景。',
    choices: [
      { id: 'recover', title: '冒险取银', summary: '派人连夜辨认封识，只取易带银锭。', consequenceHint: '高风险、高回报。', actorIds: ['wang-chengen'], check: { baseChance: 50, metricWeights: { people: .08 }, actorSkill: 'intrigue', delay: 1, success: { resources: { treasury: 3 }, metrics: { supply: 4 }, addFlags: ['palace-silver'] }, failure: { metrics: { legitimacy: -4, people: -3 }, resources: { treasury: -1 }, addFlags: ['identity-exposed'] }, successText: '银箱仍有宫中封识，足够支付第一批南下信使。', failureText: '抢银引来乱兵，御驾只能再次改道。' } },
      { id: 'open-grain', title: '用银车换粮赈民', summary: '当场公开身份，让银子变成粮食与向导。', consequenceHint: '民心大增，带不走多少现银。', immediate: { metrics: { people: 10, legitimacy: 5, supply: 2 }, resources: { treasury: 1 }, addFlags: ['road-relief'] } },
      { id: 'leave', title: '不为财货停留', summary: '保持隐蔽，令内官把地点记入密奏。', consequenceHint: '没有收益，也没有额外风险。', immediate: { metrics: { legitimacy: 1 }, addFlags: ['kept-moving'] } },
    ],
  },
  {
    id: 'refugee-gate', act: 1, date: '运河沿岸', category: '民生', title: '一座关闭的县城',
    brief: '城外数千流民请求开门，县令担心疫病和奸细。御驾也需要城里的粮与船。',
    context: '你的决定会被沿途所有县城模仿。', sourceId: 'southern-ming', boundary: '道路拥塞、流民与疫病属史实背景；本县事件为合成情境。',
    choices: [
      { id: 'open', title: '开门分区收容', summary: '征用寺院与仓场，登记后入城。', consequenceHint: '耗粮，但能建立秩序。', immediate: { metrics: { people: 9, supply: -7, legitimacy: 3 }, addFlags: ['refugee-register'] } },
      { id: 'outside-camp', title: '城外设营赈粥', summary: '不开放民城，以军粮维持临时营地。', consequenceHint: '折中方案，执行质量取决于地方官。', cost: { treasury: 1 }, actorIds: ['li-mingrui', 'wang-chengen'], check: { baseChance: 60, metricWeights: { court: .1, supply: .08 }, actorSkill: 'statecraft', delay: 1, success: { metrics: { people: 7, court: 3 }, addFlags: ['ordered-relief'] }, failure: { metrics: { people: -7, supply: -4 }, addFlags: ['camp-riot'] }, successText: '名册与粥棚同时建立，数百青壮自愿护送御驾南下。', failureText: '粮吏克扣引发争抢，县令趁乱封死城门。' } },
      { id: 'close', title: '准县令闭城', summary: '优先保全粮仓与交通节点。', consequenceHint: '保存物资，留下怨恨。', immediate: { metrics: { supply: 6, people: -10, legitimacy: -3 }, addFlags: ['closed-cities'] } },
    ],
  },
  {
    id: 'false-edict', act: 1, date: '山东南部', category: '情报', title: '两份相反的圣旨',
    brief: '前方州县同时收到“坚守运河”和“毁闸撤退”两份诏书，都盖着近似的印。',
    context: '在通信断裂时，认证命令本身就是国家能力。', sourceId: 'jiangnan-news', boundary: '消息失真属史实背景；伪诏案件为合成事件。',
    choices: [
      { id: 'code', title: '建立密押与回执', summary: '今后诏令附每日不同的密押，收件者必须回报。', consequenceHint: '耗费驿骑，长期提高执行可靠性。', cost: { couriers: 1 }, immediate: { metrics: { court: 8, command: 4 }, addFlags: ['authenticated-orders'] } },
      { id: 'public-seal', title: '公开印样辨伪', summary: '让各地张贴真印特征和诏书格式。', consequenceHint: '简单迅速，也让敌人更容易仿造。', immediate: { metrics: { legitimacy: 4, court: 3 }, addFlags: ['public-seal-pattern'] } },
      { id: 'punish', title: '先斩传假旨者', summary: '不论幕后是谁，以重刑恢复命令威慑。', consequenceHint: '短期见效；可能杀错携带真旨的信使。', immediate: { metrics: { command: 6, people: -4, court: -2 }, addFlags: ['harsh-courier-law'] } },
    ],
  },
  {
    id: 'ministers-families', act: 1, date: '淮安以北', category: '朝局', title: '留京官员的家眷',
    brief: '南下官员要求御驾派船接出家眷，否则他们无心办事；同行百姓质问为何官船只救官家。',
    context: '危局中的特权最容易被看见，也最难一次取消。', sourceId: 'counterfactual', boundary: '官员在京利益是南迁阻力之一；此处船队冲突为架空。',
    choices: [
      { id: 'official-first', title: '先接官眷', summary: '稳定随驾官员，要求他们以俸禄偿还船费。', consequenceHint: '朝局改善，民众信任下降。', cost: { treasury: 1 }, immediate: { metrics: { court: 8, people: -8 }, addFlags: ['official-evacuation'] } },
      { id: 'lottery', title: '按户抽签同船', summary: '官民使用同一名册，幼弱者优先。', consequenceHint: '公平但缓慢。', immediate: { metrics: { people: 7, court: -3, legitimacy: 4 }, addFlags: ['equal-evacuation'] } },
      { id: 'no-return', title: '不派船北返', summary: '所有运力用于粮食与公文，私人自行设法。', consequenceHint: '效率最高；官员怨气难消。', immediate: { metrics: { supply: 6, court: -7 }, addFlags: ['no-private-ships'] } },
    ],
  },
  {
    id: 'refugee-fever', act: 2, date: '五月末', category: '民生', title: '城外热病',
    brief: '南京城外难民营出现高热。医生无法断言是时疫、饥饿还是谣言，但城内已开始驱赶北人。',
    context: '防疫、救济与秩序彼此牵连，任何一项都要花粮与人。', sourceId: 'southern-ming', boundary: '南下流民携带疾病和恐慌属史实背景；具体疫情为合成事件。',
    choices: [
      { id: 'wards', title: '设隔离营与公医', summary: '征用寺观，公布每日病亡和粮数。', consequenceHint: '耗费大，但能压住谣言。', cost: { treasury: 2 }, immediate: { metrics: { people: 9, supply: -5, court: 2 }, addFlags: ['public-health'] } },
      { id: 'close-gates', title: '封城十四日', summary: '暂停人员与货物入城，军队维持外围。', consequenceHint: '降低城内风险，漕运和民生受创。', immediate: { metrics: { people: -5, supply: -8, command: 3 }, addFlags: ['nanjing-lockdown'] } },
      { id: 'local-charity', title: '交由乡绅善会', summary: '朝廷给名号，由地方筹粮照料。', consequenceHint: '省钱；救济会被地方关系筛选。', immediate: { metrics: { court: 4, people: 2 }, resources: { treasury: 1 }, addFlags: ['gentry-relief'] } },
    ],
  },
  {
    id: 'merchant-fleet', act: 2, date: '六月', category: '财政', title: '徽商的船队',
    brief: '商人愿运军粮，却要求免除旧欠、统一沿江关卡，并让商会查验军需账。',
    context: '这是交易，不是忠诚；可靠制度往往从允许别人核账开始。', sourceId: 'ming-military', boundary: '军粮运输与商人网络符合历史结构；谈判条件为架空。',
    choices: [
      { id: 'accept', title: '接受监督换运力', summary: '废除重复关卡，军需账按月抄送商会。', consequenceHint: '供给提升，官署失去灰色收入。', immediate: { metrics: { supply: 10, court: -5, legitimacy: 3 }, resources: { treasury: 2 }, addFlags: ['open-ledgers'] } },
      { id: 'charter', title: '授予三年专营', summary: '用盐引和运输特许换取现粮。', consequenceHint: '来得快，会制造新垄断。', immediate: { metrics: { supply: 8, people: -4 }, resources: { treasury: 3 }, addFlags: ['merchant-monopoly'] } },
      { id: 'requisition', title: '征用船粮', summary: '战时不容讨价还价，事后凭票补偿。', consequenceHint: '立刻得粮，未来信用受损。', immediate: { metrics: { supply: 12, legitimacy: -7, people: -4 }, addFlags: ['requisitioned-fleet'] } },
    ],
  },
  {
    id: 'shi-ma-memorials', act: 2, date: '七月初', category: '党争', title: '互相弹劾的两本奏疏',
    brief: '史可法弹劾马士英纵兵，马士英反指清议误事。证据都不完整，但两边都要求你表态。',
    context: '把争论压下去不会让利益冲突消失；公开程序也不保证团结。', sourceId: 'southern-ming', boundary: '南明内部政治冲突属史实；奏疏内容和审理方式为架空。',
    choices: [
      { id: 'public-hearing', title: '公开对质、只问事实', summary: '军纪、账册和人事分别查验，不审党名。', consequenceHint: '过程难看，但可能留下可复用规则。', immediate: { metrics: { court: -2, legitimacy: 3 }, addFlags: ['evidence-hearings'] }, actorIds: ['li-mingrui'], check: { baseChance: 57, metricWeights: { court: .15 }, actorSkill: 'statecraft', delay: 1, success: { metrics: { court: 10, legitimacy: 4 }, relations: { 'shi-kefa': 3, 'ma-shiying': 2 }, addFlags: ['factual-review'] }, failure: { metrics: { court: -9 }, relations: { 'shi-kefa': -4, 'ma-shiying': -4 }, addFlags: ['hearing-fiasco'] }, successText: '查出的贪墨与党名并不重合，朝廷第一次能处罚具体行为而非整个派系。', failureText: '证人翻供、账册失踪，对质变成更大的公开羞辱。' } },
      { id: 'back-shi', title: '支持史可法', summary: '以军纪和清望为先，削马士英权。', consequenceHint: '士林振奋，江北关系网受损。', immediate: { metrics: { legitimacy: 6, command: -5, court: 2 }, relations: { 'shi-kefa': 10, 'ma-shiying': -14 }, addFlags: ['backed-shi'] } },
      { id: 'back-ma', title: '支持马士英', summary: '危局先用能筹兵者，禁止继续翻旧案。', consequenceHint: '执行加强，清议反弹。', immediate: { metrics: { command: 7, legitimacy: -7, court: -2 }, relations: { 'ma-shiying': 10, 'shi-kefa': -12 }, addFlags: ['backed-ma'] } },
    ],
  },
  {
    id: 'arrears-riot', act: 2, date: '七月末', category: '军饷', title: '欠饷营啸',
    brief: '一营士兵包围粮仓，声称已经十四个月未见足饷。将领请旨镇压，仓官说粮册上他们从未欠过。',
    context: '问题可能不在有没有拨款，而在银粮经过多少只手。', sourceId: 'ming-military', boundary: '欠饷、饥饿导致哗变有充分历史依据；具体营啸为合成事件。',
    choices: [
      { id: 'pay-audit', title: '先发半饷，再倒查账册', summary: '士兵登记领粮，仓官和将领同时受审。', consequenceHint: '花钱但直指问题。', cost: { treasury: 2 }, immediate: { metrics: { command: 7, supply: -2, court: 2 }, addFlags: ['direct-pay'] } },
      { id: 'suppress', title: '立即镇压首恶', summary: '军令若失去威慑，其他营都会仿效。', consequenceHint: '可能恢复秩序，也可能引发连锁兵变。', actorIds: ['huang-degong', 'gao-jie'], check: { baseChance: 52, metricWeights: { command: .18 }, actorSkill: 'military', delay: 1, success: { metrics: { command: 7, people: -4 }, addFlags: ['mutiny-suppressed'] }, failure: { metrics: { command: -13, people: -6 }, addFlags: ['mutiny-spreads'] }, successText: '主谋被擒，军中同时公布补饷日程，其他营没有跟进。', failureText: '镇压部队也索要欠饷，两营合兵抢开仓门。' } },
      { id: 'disband', title: '发路费遣散', summary: '承认无力供养虚额，愿回乡者发粮离营。', consequenceHint: '减少负担，也削弱当前兵力。', cost: { treasury: 1 }, immediate: { metrics: { supply: 7, command: -8, people: 3 }, addFlags: ['voluntary-demobilization'] } },
    ],
  },
  {
    id: 'zuo-petition', act: 2, date: '八月', category: '军镇', title: '左良玉请入朝',
    brief: '左良玉称愿率大军入南京“清君侧”。无论准不准，他的船已经在长江上集结。',
    context: '这是请示，也是威胁。朝廷必须给他一个不必攻南京也能获得的目标。', sourceId: 'southern-ming', boundary: '左良玉拥兵并曾东下属史实；在本时间线中的请入朝为架空。',
    choices: [
      { id: 'northern-command', title: '授上游北伐总督', summary: '给名号和补给，令其从襄阳牵制北方。', consequenceHint: '把野心导向外部；需付真饷。', cost: { treasury: 2 }, immediate: { metrics: { command: 4, supply: -3 }, relations: { 'zuo-liangyu': 11 }, addFlags: ['zuo-northern-command'] } },
      { id: 'summon-alone', title: '只许本人入朝', summary: '军队原地驻扎，左良玉轻骑入京自陈。', consequenceHint: '测试服从，拒绝概率很高。', cost: { couriers: 1 }, actorIds: ['shi-kefa', 'ma-shiying'], check: { baseChance: 38, metricWeights: { legitimacy: .16, command: .12 }, actorSkill: 'intrigue', delay: 1, success: { metrics: { command: 10, legitimacy: 5 }, relations: { 'zuo-liangyu': 5 }, addFlags: ['zuo-submitted'] }, failure: { metrics: { command: -8, court: -4 }, relations: { 'zuo-liangyu': -10 }, addFlags: ['zuo-defiant'] }, successText: '左良玉没有亲来，却遣子和账册入朝，事实上接受了一次约束。', failureText: '来使拒绝接旨，上游军队开始截留税粮。' } },
      { id: 'block-river', title: '令水师封江', summary: '把他当潜在叛军，预先控制下游航道。', consequenceHint: '保南京，失上游协作。', immediate: { metrics: { command: 3, supply: -6 }, relations: { 'zuo-liangyu': -15 }, addFlags: ['river-blockade'] } },
    ],
  },
  {
    id: 'garrison-feud', act: 3, date: '九月', category: '军镇', title: '高杰与黄得功争饷',
    brief: '两镇在瓜洲争夺同一批军粮，各自都拿出兵部文书。再晚一日，他们会先打一仗。',
    context: '调停不能只讲忠义，必须说明谁失去什么、得到什么。', sourceId: 'ming-military', boundary: '江北军镇争地争饷符合史实；瓜洲冲突为合成事件。',
    choices: [
      { id: 'split-grain', title: '按实兵分粮', summary: '现场点名核兵，虚额不给饷。', consequenceHint: '公平且触动两边利益。', actorIds: ['shi-kefa', 'li-mingrui'], check: { baseChance: 53, metricWeights: { court: .12, command: .15 }, actorSkill: 'statecraft', delay: 1, success: { metrics: { command: 9, supply: 4 }, relations: { 'gao-jie': 2, 'huang-degong': 3 }, addFlags: ['verified-musters'] }, failure: { metrics: { command: -9, supply: -5 }, addFlags: ['garrison-clash'] }, successText: '当众点名揭出两镇虚额，争粮变成各自清理名册。', failureText: '点名官被扣，两镇都声称对方收买了朝廷。' } },
      { id: 'reward-huang', title: '粮归黄得功', summary: '以驻防急迫和旧有忠勤为由优先发饷。', consequenceHint: '奖励可靠者，高杰部可能自行取粮。', immediate: { metrics: { command: 2 }, relations: { 'huang-degong': 10, 'gao-jie': -13 }, addFlags: ['favored-huang'] } },
      { id: 'reward-gao', title: '粮归高杰', summary: '先稳住最可能生变的军队。', consequenceHint: '现实有效，却向所有人奖励威胁。', immediate: { metrics: { command: 4, legitimacy: -4 }, relations: { 'gao-jie': 10, 'huang-degong': -8 }, addFlags: ['favored-gao'] } },
    ],
  },
  {
    id: 'fake-emperor', act: 3, date: '十一月', category: '名分', title: '“南京的是假皇帝”',
    brief: '北方流传崇祯已死，南京不过是阉党找来的替身。谣言甚至列出你脸上的痣哪里不对。',
    context: '在照片和电报不存在的时代，身份必须由关系网和连续记录证明。', sourceId: 'jiangnan-news', boundary: '崇祯死讯传播迟滞和真假消息混杂属史实；替身谣言为架空。',
    choices: [
      { id: 'public-audience', title: '开放大朝觐见', summary: '让北来旧臣、宗室、军民代表逐批验认。', consequenceHint: '有力但有刺杀风险。', immediate: { metrics: { legitimacy: 8, people: 4, court: -2 }, addFlags: ['public-emperor'] } },
      { id: 'documents', title: '公布起居与密档', summary: '用连续文书、御笔和宫中问答建立证据链。', consequenceHint: '制度化，传播较慢。', immediate: { metrics: { legitimacy: 5, court: 7 }, addFlags: ['identity-archive'] } },
      { id: 'ban-rumor', title: '严禁传播死讯', summary: '追查造谣者和印坊，先止住扩散。', consequenceHint: '短期安静，长期更像欲盖弥彰。', immediate: { metrics: { command: 3, people: -5, legitimacy: -3 }, addFlags: ['rumor-ban'] } },
    ],
  },
  {
    id: 'yangzhou-grain', act: 3, date: '弘光元年 二月', category: '后勤', title: '扬州只剩二十日粮',
    brief: '守军与城民都在粮册上。若只按军籍发粮，百姓会逃；若平均分，守军无法作战。',
    context: '围城不是勇气测试，而是每天都要回答谁先吃、谁先饿。', sourceId: 'ming-military', boundary: '军粮决定城防能力属史实规律；具体粮数和政策为架空。',
    choices: [
      { id: 'ration-all', title: '军民同额、军属做工', summary: '所有人按口领粮，军属参与筑城与运输。', consequenceHint: '民心最好，战兵口粮偏低。', immediate: { metrics: { people: 9, command: -3, supply: 2 }, addFlags: ['equal-rations'] } },
      { id: 'soldiers-first', title: '优先战兵', summary: '守住城才有百姓，严格按军功和岗位发粮。', consequenceHint: '军事效率高，城内怨气大。', immediate: { metrics: { command: 8, people: -9, supply: 3 }, addFlags: ['military-rations'] } },
      { id: 'break-blockade', title: '组织船队抢运', summary: '从长江夜航补给，不在城内重新分配匮乏。', consequenceHint: '需要水运基础和可靠将领。', cost: { treasury: 1 }, actorIds: ['huang-degong', 'gao-jie'], check: { baseChance: 47, metricWeights: { command: .14, supply: .12 }, actorSkill: 'military', delay: 1, success: { metrics: { supply: 12, people: 4 }, addFlags: ['yangzhou-supplied'] }, failure: { metrics: { supply: -9, command: -4 }, addFlags: ['grain-fleet-lost'] }, successText: '夜潮掩护百余粮船入城，守军第一次相信援军真的会来。', failureText: '火光暴露船队，江面漂来的尽是烧焦粮袋。' } },
    ],
  },
  {
    id: 'coastal-offer', act: 3, date: '弘光元年 三月', category: '海疆', title: '福建水师的条件',
    brief: '东南海商愿提供战船、火炮与退路，条件是开放海贸、承认其武装并给予税权。',
    context: '海上力量能延长国祚，也可能成为独立于朝廷的另一套财政。', sourceId: 'counterfactual', boundary: '东南海商与水师力量属历史条件；此项协议为架空。',
    choices: [
      { id: 'regulated-trade', title: '开海设总税司', summary: '承认贸易，以统一税率换舰队接受朝廷核账。', consequenceHint: '长期收益高，传统官僚会抵触。', immediate: { metrics: { supply: 7, court: -5, people: 3 }, resources: { treasury: 2 }, addFlags: ['regulated-sea-trade', 'naval-base'] } },
      { id: 'privateer', title: '授予海防专营', summary: '不改制度，只用封号换取即时出兵。', consequenceHint: '见效快，海上力量更难控制。', immediate: { metrics: { command: 5, legitimacy: -3 }, resources: { treasury: 2 }, addFlags: ['privateer-fleet'] } },
      { id: 'reject-sea', title: '拒绝以税权换兵', summary: '国家不可再把财政割给私家武装。', consequenceHint: '守住原则，失去海上后路。', immediate: { metrics: { legitimacy: 4, supply: -4 }, addFlags: ['no-sea-alliance'] } },
    ],
  },
  {
    id: 'spring-flood', act: 3, date: '弘光元年 三月末', category: '灾害', title: '春汛冲断粮道',
    brief: '连雨使淮河支流暴涨，堤岸、难民营和军粮仓只能先救一处。',
    context: '灾害本身不选择政治后果，资源分配会。', sourceId: 'counterfactual', boundary: '水患与脆弱漕运符合时代背景；本次洪水为合成事件。',
    choices: [
      { id: 'save-dikes', title: '全力保堤', summary: '征调军民固守堤防，避免更大范围决口。', consequenceHint: '保护长期生产，眼前军粮受损。', immediate: { metrics: { people: 6, supply: -7, command: -2 }, addFlags: ['dikes-held'] } },
      { id: 'save-grain', title: '先抢军粮', summary: '船和人优先搬空仓库，灾民自行上高地。', consequenceHint: '保住战役，民众承担洪水。', immediate: { metrics: { supply: 9, people: -11, legitimacy: -3 }, addFlags: ['grain-saved'] } },
      { id: 'open-stores', title: '开仓就地赈济', summary: '粮食运不走便分给灾民，并组织其修路。', consequenceHint: '把损失变成民心和劳力。', immediate: { metrics: { people: 10, legitimacy: 4, supply: -5 }, addFlags: ['flood-relief'] } },
    ],
  },
]

