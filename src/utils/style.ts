import Taro from '@tarojs/taro'

// Taro H5 中内联 style 的 rpx 单位不会被转换（浏览器无法解析 rpx，整条样式会被丢弃）
// 此工具把 rpx 数值换算成 px 字符串，供内联样式使用
export function rpxToPx(rpx: number): string {
  try {
    if (typeof document !== 'undefined') {
      // H5：根字号由 Taro 固定（1rem = 37.5rpx）
      const fs = parseFloat(window.getComputedStyle(document.documentElement).fontSize)
      if (fs > 0) return `${(rpx * fs) / 37.5}px`
    }
  } catch {
    // 忽略，走小程序分支
  }
  try {
    // 小程序：按屏幕宽度换算（750rpx = 屏宽）
    const info = Taro.getSystemInfoSync()
    if (info.windowWidth) return `${(rpx * info.windowWidth) / 750}px`
  } catch {
    // 忽略
  }
  return `${rpx * 0.48}px`
}
