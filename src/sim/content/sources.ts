import type { SourceDefinition } from '../types'

// 史料来源表（沿旧引擎结构）。counterfactual 为特例条目：纯架空内容引用它，绝不伪造史源。
export const SIM_SOURCES: SourceDefinition[] = [
  {
    id: 'mingshi-benji',
    title: '《明史·本纪第二十四·庄烈帝二》',
    url: 'https://zh.wikisource.org/wiki/%E6%98%8E%E5%8F%B2/%E5%8D%B724',
    note: '用于崇祯十七年三月京师陷落前后的时序背景：居庸关降、外城陷、帝崩煤山。不用于证明任何虚构人物与街巷细节。',
  },
  {
    id: 'jiashen-chuanxin',
    title: '《甲申传信录》（钱士馨辑）',
    url: 'https://zh.wikisource.org/wiki/%E7%94%B2%E7%94%B3%E5%82%B3%E4%BF%A1%E9%8C%84',
    note: '用于城破前后城中讹言纷起、人心惶乱的氛围记载。所记多为传闻汇辑，本作只取"当时确有此类传言"这一层，不取其为事实。',
  },
  {
    id: 'da-ming-huidian',
    title: '《大明会典》',
    url: 'https://zh.wikisource.org/wiki/%E5%A4%A7%E6%98%8E%E6%9C%83%E5%85%B8',
    note: '用于明代匠籍佥派、文书印信与驿传勘合类制度的一般背景。不用于证明本作中任何具体文书、名册或人物存在。',
  },
  {
    id: 'counterfactual',
    title: '架空推演说明',
    url: '#historical-boundary',
    note: '此条目标记完全由本作虚构预设产生的内容：虚构人物、虚构文书与推演后果。本作不为架空内容伪造史料来源。',
  },
]

export const SIM_SOURCES_BY_ID: Record<string, SourceDefinition> = Object.fromEntries(
  SIM_SOURCES.map((source) => [source.id, source]),
)
