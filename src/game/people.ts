import type { PersonDefinition, PersonState } from './types'

export const PEOPLE: PersonDefinition[] = [
  {
    id: 'wang-chengen',
    name: '王承恩',
    title: '司礼监太监',
    stance: '忠于皇帝本人，能办密事，但无法号令外廷。',
    skills: { statecraft: 8, military: 6, integrity: 18, intrigue: 13 },
  },
  {
    id: 'li-mingrui',
    name: '李明睿',
    title: '左中允',
    stance: '早有南迁之议，长于判断大势，资望尚浅。',
    skills: { statecraft: 16, military: 7, integrity: 15, intrigue: 8 },
  },
  {
    id: 'shi-kefa',
    name: '史可法',
    title: '南京兵部尚书',
    stance: '重名节与法统，愿任危局，但未必压得住军镇。',
    skills: { statecraft: 15, military: 12, integrity: 19, intrigue: 5 },
  },
  {
    id: 'ma-shiying',
    name: '马士英',
    title: '凤阳总督',
    stance: '握有兵力和关系网，办事现实，政治代价也高。',
    skills: { statecraft: 13, military: 11, integrity: 5, intrigue: 18 },
  },
  {
    id: 'huang-degong',
    name: '黄得功',
    title: '庐州总兵',
    stance: '悍勇而重恩义，需要明确粮饷与名分。',
    skills: { statecraft: 5, military: 18, integrity: 16, intrigue: 5 },
  },
  {
    id: 'gao-jie',
    name: '高杰',
    title: '总兵',
    stance: '由大顺来归，部众强悍，急需地盘与承认。',
    skills: { statecraft: 4, military: 17, integrity: 6, intrigue: 12 },
  },
  {
    id: 'zuo-liangyu',
    name: '左良玉',
    title: '宁南伯',
    stance: '拥兵自重，声势极大，服从取决于朝局和利益。',
    skills: { statecraft: 8, military: 16, integrity: 6, intrigue: 15 },
  },
  {
    id: 'wu-sangui',
    name: '吴三桂',
    title: '平西伯',
    stance: '关宁军残部的选择将改变北方力量平衡。',
    skills: { statecraft: 9, military: 19, integrity: 5, intrigue: 14 },
  },
]

export const PEOPLE_BY_ID = Object.fromEntries(PEOPLE.map((person) => [person.id, person]))

export function createPeopleState(): Record<string, PersonState> {
  return Object.fromEntries(
    PEOPLE.map((person) => [person.id, { relation: person.id === 'wang-chengen' ? 24 : 0, alive: true }]),
  )
}

