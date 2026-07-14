import { useEffect, useRef, useState } from 'react'
import { exportSim } from '../storage'
import type { AudioPreferences } from '../audio'
import type { SimState } from '../types'

interface UtilityDockProps {
  state: SimState | null
  audio: AudioPreferences
  onAudioChange: (next: AudioPreferences) => void
  onImport: (raw: string) => void
  onMessage: (message: string) => void
}

export default function UtilityDock({ state, audio, onAudioChange, onImport, onMessage }: UtilityDockProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dockRef = useRef<HTMLElement>(null)
  const [openPanel, setOpenPanel] = useState<'audio' | 'save' | null>(null)

  useEffect(() => {
    if (!openPanel) return
    const closeOutside = (event: PointerEvent) => {
      if (dockRef.current?.contains(event.target as Node)) return
      event.preventDefault()
      event.stopPropagation()
      setOpenPanel(null)
    }
    document.addEventListener('pointerdown', closeOutside, true)
    return () => document.removeEventListener('pointerdown', closeOutside, true)
  }, [openPanel])

  const downloadSave = () => {
    if (!state) return
    const exported = exportSim(state)
    if (!exported.ok) {
      onMessage('存档没能抄出来。请先不要关闭这一页。')
      return
    }
    const blob = new Blob([exported.text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `城破前夜-三月${state.day}-种子${state.seed}.json`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    onMessage('存档已经抄成一份本地文件。')
  }

  const readSave = async (file: File | undefined) => {
    if (!file) return
    try {
      onImport(await file.text())
    } catch {
      onMessage('这份文件没能读出来。原来的存档没有动。')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <aside ref={dockRef} className="sim-utility-dock" aria-label="声音与存档工具">
      <details open={openPanel === 'audio'}>
        <summary
          aria-label="声音设置"
          aria-expanded={openPanel === 'audio'}
          onClick={(event) => { event.preventDefault(); setOpenPanel((current) => current === 'audio' ? null : 'audio') }}
        >{audio.muted ? '静' : '声'}</summary>
        <div className="sim-utility-popover">
          <button
            type="button"
            className="sim-utility-toggle"
            aria-pressed={!audio.muted}
            onClick={() => onAudioChange({ ...audio, muted: !audio.muted })}
          >
            {audio.muted ? '启用声音' : '静音'}
          </button>
          <label>
            <span>音量</span>
            <input
              type="range"
              aria-label="音量"
              min="0"
              max="1"
              step="0.05"
              value={audio.volume}
              disabled={audio.muted}
              onChange={(event) => onAudioChange({ ...audio, volume: Number(event.target.value) })}
            />
          </label>
          <small>环境声与动作声均由本地合成，不上传数据。</small>
        </div>
      </details>

      <details open={openPanel === 'save'}>
        <summary
          aria-label="存档工具"
          aria-expanded={openPanel === 'save'}
          onClick={(event) => { event.preventDefault(); setOpenPanel((current) => current === 'save' ? null : 'save') }}
        >档</summary>
        <div className="sim-utility-popover">
          {state ? <button type="button" className="sim-utility-toggle" onClick={downloadSave}>抄出存档</button> : null}
          <button type="button" className="sim-utility-toggle" onClick={() => inputRef.current?.click()}>读入存档</button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void readSave(event.target.files?.[0])}
          />
          <small>文件只在你的设备上读写。读入前会重放核对全部因果。</small>
        </div>
      </details>
    </aside>
  )
}
