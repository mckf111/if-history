import { NPCS } from '../content'
import type { PlayerCommand, SimState } from '../types'

interface CityMapProps {
  state: SimState
  dispatch: (cmd: PlayerCommand) => void
}

/** 地点在图上的锚点与符号（外城简图：西北坊巷、东部衙署、南缘城门、东缘渡口、西南棚区） */
const SPOTS: Array<{ id: string; x: number; y: number; label: string; glyph: 'shop' | 'paper' | 'office' | 'gate' | 'boat' | 'camp' }> = [
  { id: 'keji-shop', x: 74, y: 66, label: '刻字铺', glyph: 'shop' },
  { id: 'zhipu', x: 128, y: 96, label: '纸铺', glyph: 'paper' },
  { id: 'yamen', x: 196, y: 64, label: '兵马司', glyph: 'office' },
  { id: 'chengmen', x: 152, y: 180, label: '城门汛地', glyph: 'gate' },
  { id: 'dukou', x: 252, y: 122, label: '渡口', glyph: 'boat' },
  { id: 'nanpeng', x: 66, y: 156, label: '难民棚', glyph: 'camp' },
]

/** 坊巷小径（无向） */
const PATHS: Array<[string, string]> = [
  ['keji-shop', 'zhipu'],
  ['zhipu', 'yamen'],
  ['zhipu', 'chengmen'],
  ['keji-shop', 'nanpeng'],
  ['nanpeng', 'chengmen'],
  ['chengmen', 'dukou'],
  ['yamen', 'dukou'],
]

function spotOf(id: string) {
  return SPOTS.find((spot) => spot.id === id)!
}

/** 地点符号：几笔墨线的小建筑 */
function Glyph({ kind }: { kind: (typeof SPOTS)[number]['glyph'] }) {
  switch (kind) {
    case 'shop':
      return <path d="M-9,4 L-9,-3 L0,-9 L9,-3 L9,4 Z M-3,4 L-3,-1 L3,-1 L3,4" className="sim-map-ink" />
    case 'paper':
      return <path d="M-7,-7 L5,-7 L7,-4 L7,7 L-7,7 Z M-3,-3 L3,-3 M-3,0 L3,0 M-3,3 L1,3" className="sim-map-ink" />
    case 'office':
      return <path d="M-10,5 L-10,-2 L0,-8 L10,-2 L10,5 Z M-10,-2 L10,-2 M-5,5 L-5,0 M0,5 L0,0 M5,5 L5,0" className="sim-map-ink" />
    case 'gate':
      return <path d="M-11,5 L-11,-4 L11,-4 L11,5 M-11,-4 L0,-10 L11,-4 M-4,5 L-4,-2 Q0,-5 4,-2 L4,5" className="sim-map-ink" />
    case 'boat':
      return <path d="M-10,2 Q0,7 10,2 L7,6 L-7,6 Z M0,2 L0,-8 M0,-8 L6,-4 L0,-2" className="sim-map-ink" />
    case 'camp':
      return <path d="M-9,5 L0,-7 L9,5 Z M-2,5 L0,1 L2,5" className="sim-map-ink" />
  }
}

/**
 * 城图盘面：SVG 手绘风外城简图。
 * 只标玩家自己的位置；探过底细（摸熟脚程）的人物，才在图上显示他此刻的印记——知识即视野。
 */
export default function CityMap({ state, dispatch }: CityMapProps) {
  // 已摸熟脚程者：按地点分组，错位排布小印
  const knownHere: Record<string, string[]> = {}
  for (const npc of NPCS) {
    if ((state.knowledge.knownSecrets[npc.id] ?? []).length === 0) continue
    const npcState = state.npcs[npc.id]
    if (!npcState?.alive || npcState.arrested) continue
    ;(knownHere[npcState.location] ??= []).push(npc.mark)
  }

  return (
    <svg viewBox="0 0 300 224" className="sim-map" role="group" aria-label="城图">
      {/* 城墙：外城轮廓，南缘留门洞 */}
      <path
        d="M22,30 L278,30 L278,196 L170,196 M134,196 L22,196 Z"
        className="sim-map-wall"
      />
      {/* 门洞垛口 */}
      <path d="M134,196 L134,188 M170,196 L170,188" className="sim-map-wall" />
      {/* 通惠河水纹（东缘外） */}
      <path d="M284,60 Q288,90 284,120 Q280,150 284,180" className="sim-map-water" />
      <path d="M292,70 Q296,100 292,130 Q288,160 292,186" className="sim-map-water" />

      {/* 坊巷小径 */}
      {PATHS.map(([from, to]) => {
        const a = spotOf(from)
        const b = spotOf(to)
        return (
          <path
            key={`${from}-${to}`}
            d={`M${a.x},${a.y} Q${(a.x + b.x) / 2 + 6},${(a.y + b.y) / 2 - 6} ${b.x},${b.y}`}
            className="sim-map-path"
          />
        )
      })}

      {/* 地点 */}
      {SPOTS.map((spot) => {
        const here = state.playerLocation === spot.id
        const marks = knownHere[spot.id] ?? []
        return (
          <g
            key={spot.id}
            transform={`translate(${spot.x},${spot.y})`}
            className={`sim-map-spot${here ? ' here' : ''}`}
            onClick={() => { if (!here) dispatch({ t: 'move', to: spot.id }) }}
            role="button"
            aria-label={here ? `${spot.label}（你在此处）` : `走去${spot.label}`}
          >
            {/* 命中区域 */}
            <circle r="20" className="sim-map-hit" />
            <Glyph kind={spot.glyph} />
            <text y="20" className="sim-map-label">{spot.label}</text>
            {/* 玩家朱印 */}
            {here ? (
              <g transform="translate(12,-14)">
                <rect x="-8" y="-8" width="16" height="16" rx="2" className="sim-map-seal-box" />
                <text y="4" className="sim-map-seal-text">满</text>
              </g>
            ) : null}
            {/* 摸熟脚程者的小印 */}
            {marks.map((mark, index) => (
              <g key={mark} transform={`translate(${-14 - index * 13},-14)`}>
                <circle r="6.5" className="sim-map-npc-dot" />
                <text y="3" className="sim-map-npc-text">{mark}</text>
              </g>
            ))}
          </g>
        )
      })}
    </svg>
  )
}
