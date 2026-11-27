import { useCallback, useEffect, useRef } from "react"
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0
  )
}

/**
 * 弹窗「模态」行为：
 * 1. 遮罩层始终存在（雾面遮盖，见 .dialog-scrim），点击遮罩只让弹窗轻微闪一下，不关闭也不隐藏；
 * 2. 焦点锁在弹窗内 —— 点遮罩不会让弹窗里的输入框失焦，Tab 只在弹窗内循环；
 * 3. 弹窗打开时把焦点落在面板本身（不抢输入框光标）。
 *
 * 用法：
 *   const { ref, backdropProps } = useDialogFlash<HTMLDivElement>(open)
 *   <div className="dialog-scrim ..." {...backdropProps}>   // 遮罩层
 *     <div ref={ref}>...</div>                             // 弹窗面板
 *   </div>
 */
export function useDialogFlash<T extends HTMLElement = HTMLDivElement>(active = true) {
  const ref = useRef<T | null>(null)
  const animationRef = useRef<Animation | null>(null)

  useEffect(() => {
    return () => {
      animationRef.current?.cancel()
      animationRef.current = null
    }
  }, [])

  // 打开时把焦点收进弹窗本身（不抢输入框光标），避免 Tab 跑到遮罩后面的页面上
  useEffect(() => {
    if (!active) return
    const root = ref.current
    if (!root) return

    const timer = window.setTimeout(() => {
      if (!root.isConnected) return
      const activeEl = document.activeElement
      // 焦点已经在弹窗里（比如点了弹窗内的元素）就不动
      if (activeEl && root.contains(activeEl)) return
      if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1")
      root.focus({ preventScroll: true })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [active])

  const flash = useCallback(() => {
    const el = ref.current
    if (!el) return

    // 已经闪过了，直接重启，保证连续点击也有反馈
    animationRef.current?.cancel()

    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduceMotion) {
      animationRef.current = el.animate(
        [{ opacity: 1 }, { opacity: 0.75 }, { opacity: 1 }],
        { duration: 220, easing: "ease-in-out" }
      )
      return
    }

    animationRef.current = el.animate(
      [
        { transform: "scale(1)", filter: "brightness(1)", offset: 0 },
        { transform: "scale(0.972)", filter: "brightness(0.78)", offset: 0.2 },
        { transform: "scale(1.006)", filter: "brightness(1.05)", offset: 0.55 },
        { transform: "scale(1)", filter: "brightness(1)", offset: 1 },
      ],
      { duration: 420, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" }
    )
  }, [])

  const onBackdropMouseDown = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return
    // 阻止默认行为，避免焦点被遮罩抢走（弹窗内正在输入的输入框保持聚焦）
    e.preventDefault()
    const root = ref.current
    if (!root) return
    const activeEl = document.activeElement
    if (!activeEl || !root.contains(activeEl)) {
      if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1")
      root.focus({ preventScroll: true })
    }
  }, [])

  const onBackdropClick = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return
      flash()
    },
    [flash]
  )

  // Tab 只在弹窗内循环（事件冒泡到遮罩层，说明焦点本来就在这个弹窗里）
  const onBackdropKeyDown = useCallback((e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key !== "Tab") return
    const root = ref.current
    if (!root) return

    const nodes = getFocusable(root)
    if (nodes.length === 0) {
      e.preventDefault()
      return
    }

    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    const activeEl = document.activeElement as HTMLElement | null
    const inside = Boolean(activeEl && root.contains(activeEl))

    if (!inside || activeEl === root) {
      e.preventDefault()
      ;(e.shiftKey ? last : first).focus()
      return
    }
    if (e.shiftKey && activeEl === first) {
      e.preventDefault()
      last.focus()
      return
    }
    if (!e.shiftKey && activeEl === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  const backdropProps = {
    onMouseDown: onBackdropMouseDown,
    onClick: onBackdropClick,
    onKeyDown: onBackdropKeyDown,
  }

  return { ref, flash, backdropProps }
}
