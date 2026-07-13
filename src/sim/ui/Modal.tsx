import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  title: string
  eyebrow?: string
  closeLabel?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** 统一模态：标题关联、自动聚焦、焦点圈闭、Escape 关闭与焦点恢复。 */
export default function Modal({ title, eyebrow, closeLabel = '合上', onClose, children, wide }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      const first = dialog?.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? dialog)?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = oldOverflow
      window.requestAnimationFrame(() => previous?.focus())
    }
  }, [onClose])

  return (
    <div
      className="sim-modal-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        className={`sim-modal${wide ? ' sim-modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="sim-modal-head">
          <div>
            {eyebrow ? <p className="sim-kicker">{eyebrow}</p> : null}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="sim-btn sim-btn-small" onClick={onClose}>{closeLabel}</button>
        </header>
        {children}
      </div>
    </div>
  )
}
