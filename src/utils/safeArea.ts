import Taro from '@tarojs/taro'

/**
 * 微信小程序使用 navigationStyle: custom 时页面会铺满整屏，
 * 需要把内容顶部让出系统状态栏高度（iOS 刘海 / Android 状态栏）。
 * H5 由 CSS 的 env(safe-area-inset-top) 处理，这里统一返回 0。
 */
export function getStatusBarTop(): number {
  if (process.env.TARO_ENV === 'h5') return 0
  try {
    return Taro.getSystemInfoSync().statusBarHeight || 0
  } catch {
    return 0
  }
}

/** 小程序端顶部内边距（状态栏高度 + 少量呼吸空间）；H5 返回 undefined，交由样式表处理 */
export function topPaddingStyle(extra = 8): { paddingTop: string } | undefined {
  const top = getStatusBarTop()
  if (!top) return undefined
  return { paddingTop: `${top + extra}px` }
}
