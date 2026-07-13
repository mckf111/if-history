import type { SourceDefinition } from '../types'

// 史料来源表（沿旧引擎结构）。counterfactual 为特例条目：纯架空内容引用它，绝不伪造史源。
export const SIM_SOURCES: SourceDefinition[] = [
  {
    id: 'mingshi-benji',
    title: '《明史·本纪第二十四·庄烈帝二》',
    url: 'https://zh.wikisource.org/wiki/%E6%98%8E%E5%8F%B2/%E5%8D%B724',
    note: '用于崇祯十七年三月京师陷落前后的时序背景：居庸关降、外城陷、帝崩煤山。不用于证明任何虚构人物与街巷细节。',
    locator: '崇祯十七年三月丙午、丁未条：「日晡，外城陷」「昧爽，内城陷」。',
  },
  {
    id: 'jiashen-chuanxin',
    title: '《甲申传信录》（钱士馨辑）',
    url: 'https://ctext.org/library.pl?if=gb&res=2107',
    note: '中国哲学书电子化计划所收影印本。用于核对城破前后传闻与人心惶乱的时代氛围；所记本就杂有传闻，不能拿来证明本局具体情节。',
    locator: '全十卷影印本；引用时以页面图像为准，自动识别文本只作检索线索。',
  },
  {
    id: 'da-ming-huidian',
    title: '《大明会典》',
    url: 'https://zh.wikisource.org/wiki/%E5%A4%A7%E6%98%8E%E6%9C%83%E5%85%B8',
    note: '用于明代匠籍佥派、文书印信与驿传勘合类制度的一般背景。不用于证明本作中任何具体文书、名册或人物存在。',
    locator: '工部匠役、兵部驿传相关门类；只作制度背景，不支撑「火票」等本局具体名目。',
  },
  {
    id: 'counterfactual',
    title: '架空推演说明',
    url: '#historical-boundary',
    note: '此条目标记完全由本作虚构预设产生的内容：虚构人物、虚构文书与推演后果。本作不为架空内容伪造史料来源。',
    locator: '本页「史实与架空边界」一节。',
  },
]

export const SIM_SOURCES_BY_ID: Record<string, SourceDefinition> = Object.fromEntries(
  SIM_SOURCES.map((source) => [source.id, source]),
)
