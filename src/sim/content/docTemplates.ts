import type { DocTemplateDefinition } from '../types'

// 文书型制表：每种型制规定要件（印/手迹/纸）与可承载的断言类别。
// 所有必需部件齐备后才能落刀；部件短板与工时共同决定成色。

export const DOC_TEMPLATES: DocTemplateDefinition[] = [
  {
    id: 'dt-huopiao',
    name: '火票',
    formDesc: '兵马司急递用的勘合小票：格眼、朱戳、日期，三样齐了才像话。',
    requiredParts: { sealRefId: 'seal-huopiao', paperRefId: 'paper-guan' },
    carriableClaimKinds: ['order'],
    sourceId: 'counterfactual',
    boundary: '架空推演：本局「火票」的名称、格眼、朱戳与通行用途均为玩法拟制，不冒充《大明会典》中的具体制度。',
  },
  {
    id: 'dt-sitie',
    name: '司帖',
    formDesc: '司吏名义的手书条子：不用大印，全凭笔迹和花押取信。',
    requiredParts: { handRefId: 'hand-qian', paperRefId: 'paper-guan' },
    carriableClaimKinds: ['order', 'logistics'],
    sourceId: 'da-ming-huidian',
    boundary: '衙署书吏以手帖行文属明代吏事常例；「钱司吏」及其花押为本作虚构。',
  },
  {
    id: 'dt-cepage',
    name: '册页',
    formDesc: '匠籍名册的一页：格眼、朱丝栏、书吏小楷。改一个名字，就是改一户人的命。',
    requiredParts: { handRefId: 'hand-qian', paperRefId: 'paper-guan' },
    carriableClaimKinds: ['identity'],
    sourceId: 'da-ming-huidian',
    boundary: '明代匠籍册档制度属史实背景（《大明会典》）；本局这本名册与其页式为架空拟制。',
  },
  {
    id: 'dt-bingdie',
    name: '病牒',
    formDesc: '营中遣送病夫的条子：要汛房的木戳，字倒不必好——营里没几个识字的。',
    requiredParts: { sealRefId: 'seal-ying', paperRefId: 'paper-guan' },
    carriableClaimKinds: ['identity', 'logistics'],
    sourceId: 'counterfactual',
    boundary: '架空推演：病牒式样为本作虚构；「疫者遣出营外」的营规符合时代常理。',
  },
  {
    id: 'dt-sixin',
    name: '私信',
    formDesc: '无名帖：不落款，不用印，塞进门缝就走。信不信，看收信人心里那杆秤。',
    requiredParts: { paperRefId: 'paper-min' },
    carriableClaimKinds: ['rumor', 'logistics'],
    sourceId: 'counterfactual',
    boundary: '架空推演：匿名私信为通用虚构手段，不系于任何史载文书制度。',
  },
  {
    id: 'dt-jietie',
    name: '揭帖',
    formDesc: '贴在墙上的告示体：字要大，话要短，最好天亮前满坊都是。',
    requiredParts: { paperRefId: 'paper-min' },
    carriableClaimKinds: ['rumor', 'order'],
    sourceId: 'jiashen-chuanxin',
    boundary: '明末城中揭帖流布属时代背景（野史多载）；本局揭帖内容均为架空拟写。',
  },
]

export const DOC_TEMPLATES_BY_ID: Record<string, DocTemplateDefinition> = Object.fromEntries(
  DOC_TEMPLATES.map((template) => [template.id, template]),
)

/** 质量档位名：刻工行话 */
export const GRADE_NAMES = ['粗', '工', '精', '神'] as const
