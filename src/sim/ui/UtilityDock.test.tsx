import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UtilityDock from './UtilityDock'

describe('移动端工具弹层', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('点到弹层外时只关闭弹层，不把第一次按下传给底层按钮', () => {
    const host = document.createElement('div')
    const underlying = document.createElement('button')
    underlying.textContent = '底层操作'
    document.body.append(host, underlying)
    const pressed = vi.fn()
    underlying.addEventListener('pointerdown', pressed)
    const root = createRoot(host)

    act(() => root.render(
      <UtilityDock
        state={null}
        audio={{ muted: false, volume: 0.5 }}
        onAudioChange={() => undefined}
        onImport={() => undefined}
        onMessage={() => undefined}
      />,
    ))
    expect(host.querySelector('input[type="range"]')?.getAttribute('aria-label')).toBe('音量')
    const summary = host.querySelector('summary')!
    act(() => summary.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })))
    expect(host.querySelector('details')?.open).toBe(true)

    act(() => underlying.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true })))
    expect(pressed).not.toHaveBeenCalled()
    expect(host.querySelector('details')?.open).toBe(false)

    act(() => root.unmount())
  })
})
