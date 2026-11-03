import React, { useLayoutEffect, useRef } from 'react'
import { Text } from '@tarojs/components'
import type { CSSProperties } from 'react'

interface StyledTextProps {
  /** 动态样式：H5 经 ref 直接写入 DOM（Taro 的 style prop 在 H5 上会被整体丢弃）；小程序走 style prop */
  css: CSSProperties
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}

const IS_H5 = process.env.TARO_ENV === 'h5'

// Taro 的 Text 类型未暴露 ref，但运行时是 forwardRef 包装的 taro-text-core 自定义元素
const TaroText = Text as unknown as React.ForwardRefExoticComponent<
  React.RefAttributes<HTMLElement> & {
    className?: string
    style?: CSSProperties
    onClick?: () => void
    children?: React.ReactNode
  }
>

/**
 * 需要动态内联样式的 Text（用途同 StyledView，如结算浮层的动态颜色）。
 */
const StyledText: React.FC<StyledTextProps> = ({ css, className, onClick, children }) => {
  const ref = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (!IS_H5) return
    const el = ref.current
    if (!el) return
    const target = el.style as unknown as Record<string, unknown>
    Object.keys(css).forEach((key) => {
      const value = (css as Record<string, unknown>)[key]
      if (value !== undefined && value !== null) target[key] = value
    })
  })
  return (
    <TaroText ref={ref} className={className} style={IS_H5 ? undefined : css} onClick={onClick}>
      {children}
    </TaroText>
  )
}

export default StyledText
