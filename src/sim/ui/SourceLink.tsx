import { SIM_SOURCES_BY_ID } from '../content'

export default function SourceLink({ sourceId, compact }: { sourceId?: string; compact?: boolean }) {
  if (!sourceId) return null
  const source = SIM_SOURCES_BY_ID[sourceId]
  if (!source) return null
  const internal = source.url.startsWith('#')
  return (
    <a
      className={`sim-source-link${compact ? ' compact' : ''}`}
      href={source.url}
      {...(internal ? {} : { target: '_blank', rel: 'noreferrer' })}
      title={`${source.note} 定位：${source.locator}`}
    >
      核对来源：{source.title}{compact ? '' : ` · ${source.locator}`}
    </a>
  )
}
