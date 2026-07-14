import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Modal from './Modal'

describe('通用模态焦点', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('父组件因普通状态变化重渲染时，不把用户焦点抢回第一个按钮', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    const render = (tick: number) => (
      <Modal title={`测试 ${tick}`} onClose={() => undefined}>
        <button type="button">第一个按钮</button>
        <input aria-label="正在填写的内容" />
      </Modal>
    )

    act(() => root.render(render(0)))
    const input = host.querySelector('input')!
    input.focus()
    expect(document.activeElement).toBe(input)

    act(() => root.render(render(1)))
    expect(document.activeElement).toBe(input)

    act(() => root.unmount())
  })
})
