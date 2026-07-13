import { useEffect, useRef } from 'react'

/** 换屏后回到页首并把焦点送到标题，修复移动端旧滚动位置与读屏断点。 */
export function useScreenEntry<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    const frame = window.requestAnimationFrame(() => ref.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [])
  return ref
}
