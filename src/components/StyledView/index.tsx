import React, { useLayoutEffect, useRef } from 'react'
import { View } from '@tarojs/components'
import type { CSSProperties } from 'react'

interface StyledViewProps {
  /** 动态样式：经 ref 直接写入 DOM（Taro 的 style prop 在 H5 上会被整体丢弃） */
  css: CSSProperties
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}

// Taro 的 View 类型未暴露 ref，但运行时是 forwardRef 包装的 taro-view-core 自定义元素
const TaroView = View as unknown as React.ForwardRefExoticComponent<
  React.RefAttributes<HTMLElement> & {
    className?: string
    onClick?: () => void
    children?: React.ReactNode
  }
>

/**
 * 需要动态内联样式的 View。
 * 背景：@tarojs/components 的 React 包装器会把 style prop 整体剥掉，
 * 对象与字符串形式的内联样式在 H5 上都不会生效。
 * 该组件每次渲染后把 css 同步到 DOM 节点的 style 上，父组件重渲染即可驱动更新。
 */
const StyledView: React.FC<StyledViewProps> = ({ css, className, onClick, children }) => {
  const ref = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const target = el.style as unknown as Record<string, unknown>
    Object.keys(css).forEach((key) => {
      const value = (css as Record<string, unknown>)[key]
      if (value !== undefined && value !== null) target[key] = value
    })
  })
  return (
    <TaroView ref={ref} className={className} onClick={onClick}>
      {children}
    </TaroView>
  )
}

export default StyledView
