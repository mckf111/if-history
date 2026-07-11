import type { SourceDefinition } from './types'

export const SOURCES: SourceDefinition[] = [
  {
    id: 'southern-ming',
    title: '《剑桥中国史·南明，1644—1662》',
    url: 'https://www.cambridge.org/core/books/abs/cambridge-history-of-china/southern-ming-16441662/97FA570559404A627906FBF78D0C3A09',
    note: '用于南北通信断裂、南京动员迟缓、流民与军政失序等背景。',
  },
  {
    id: 'southern-capital',
    title: 'The Political Functions of the Southern Capital in the Ming Dynasty',
    url: 'https://www.tandfonline.com/doi/abs/10.1179/014703706788762536',
    note: '用于南京留都官署与两京制度背景。',
  },
  {
    id: 'jiangnan-news',
    title: '《崇祯十七年的江南社会与关于北京的信息》',
    url: 'https://qsyj.ruc.edu.cn/CN/abstract/abstract537.shtml',
    note: '用于消息传播、流言和江南社会反应。',
  },
  {
    id: 'ming-military',
    title: 'Why Military Institutions Matter for Ming History',
    url: 'https://www.cambridge.org/core/journals/journal-of-chinese-history/article/why-military-institutions-matter-for-ming-history/B3C345236C8588E708C661758D2DED51',
    note: '用于军饷、粮食、军队士气与兵变风险。',
  },
  {
    id: 'counterfactual',
    title: '本作架空推演说明',
    url: '#historical-boundary',
    note: '没有史料可以证明未发生的路线；本作仅让推演遵守当时可见的制度与物质约束。',
  },
]

export const SOURCES_BY_ID = Object.fromEntries(SOURCES.map((source) => [source.id, source]))

