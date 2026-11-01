import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'

// 全局反馈工具：提示音（Web Audio 合成，无需音频文件）+ 震动
// 音效与震动均受「设置」页开关控制，未开启时不触发

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      audioCtx = new Ctor()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    return audioCtx
  } catch {
    return null
  }
}

function beep(freq: number, durationMs: number, type: OscillatorType = 'sine', gainValue = 0.06): void {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(gainValue, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000)
  } catch {
    // 忽略音频播放失败（部分浏览器需要用户交互后才允许播放）
  }
}

function vibrate(type: 'light' | 'medium' | 'heavy'): void {
  Taro.vibrateShort({ type }).catch(() => {})
}

export type FeedbackType = 'right' | 'wrong' | 'tick' | 'tap' | 'finish'

// 统一反馈入口：自动读取设置中的音效/震动开关
export function feedback(type: FeedbackType): void {
  const { settings } = useUserStore.getState()
  switch (type) {
    case 'right':
      if (settings.sound) beep(880, 120, 'sine', 0.06)
      if (settings.vibrate) vibrate('light')
      break
    case 'wrong':
      if (settings.sound) beep(196, 220, 'sine', 0.05)
      if (settings.vibrate) vibrate('medium')
      break
    case 'tick':
      if (settings.sound) beep(1200, 60, 'sine', 0.03)
      break
    case 'tap':
      if (settings.sound) beep(660, 80, 'sine', 0.04)
      break
    case 'finish':
      if (settings.sound) {
        beep(660, 150, 'sine', 0.06)
        setTimeout(() => beep(880, 260, 'sine', 0.06), 160)
      }
      if (settings.vibrate) vibrate('heavy')
      break
    default:
      break
  }
}
