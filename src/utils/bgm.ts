import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'

// 训练背景音乐：播放真实音频文件《若如初见（开智小曲）》，整曲循环
// 音频文件由 config/index.ts 的 copy 规则从 src/assets/audio/bgm.mp3 拷贝到构建产物的 static/audio/ 下
// 仅在训练功能页播放，退出训练即暂停；多页面栈用引用计数管理，避免互相打断
//
// 跨端路径差异：
//   H5：站点相对路径（hash 路由下始终指向 /focus-trainer/static/audio/bgm.mp3）
//   微信小程序：包内绝对路径 /static/audio/bgm.mp3（文件随小程序包一起发布，无需网络与域名白名单）

const IS_WEAPP = process.env.TARO_ENV === 'weapp'
const SRC_CANDIDATES = IS_WEAPP
  ? ['/static/audio/bgm.mp3', 'static/audio/bgm.mp3']
  : ['static/audio/bgm.mp3']
const BGM_VOLUME = 0.45

let ctx: Taro.InnerAudioContext | null = null
let playing = false
let wantCount = 0 // 需要播放音乐的页面数
let failed = false // 音频文件加载失败时静默降级，避免反复报错
let resumeBound = false
let srcIndex = 0

function getCtx(): Taro.InnerAudioContext | null {
  try {
    if (!ctx) {
      ctx = Taro.createInnerAudioContext()
      ctx.loop = true
      ctx.volume = BGM_VOLUME
      if (IS_WEAPP) {
        // 微信端默认跟随静音开关，这里允许在手机静音时也播放训练背景音
        try {
          ctx.obeyMuteSwitch = false
        } catch {
          // 低版本基础库不支持时忽略
        }
      }
      ctx.onError(() => {
        // 首个路径失败时尝试备用路径（不同基础库对包内路径写法要求不同）
        if (srcIndex + 1 < SRC_CANDIDATES.length) {
          srcIndex += 1
          ctx!.src = SRC_CANDIDATES[srcIndex]
          if (wantCount > 0) {
            try {
              ctx!.play()
              playing = true
            } catch {
              // ignore
            }
          }
          return
        }
        failed = true // 文件缺失或网络失败：放弃播放，不影响训练功能
      })
      if (!resumeBound) {
        resumeBound = true
        // 部分浏览器要求用户交互后才允许播音，首次交互时自动恢复（仅 H5）
        if (process.env.TARO_ENV === 'h5' && typeof document !== 'undefined') {
          const resume = () => {
            if (wantCount > 0 && !playing && !failed) startPlay()
          }
          document.addEventListener('pointerdown', resume)
          document.addEventListener('touchend', resume)
        }
      }
    }
    return ctx
  } catch {
    return null
  }
}

function startPlay(): void {
  const c = getCtx()
  if (!c || failed) return
  if (!c.src) c.src = SRC_CANDIDATES[srcIndex]
  try {
    c.play()
    playing = true
  } catch {
    // 自动播放被拦截时保持 playing=false，等待首次用户交互后由 resume 重试
  }
}

function stopPlay(): void {
  playing = false
  if (ctx) {
    try {
      ctx.pause()
    } catch {
      // ignore
    }
  }
}

export const bgm = {
  // 页面引用：进入训练页调用，返回释放函数
  acquire(): () => void {
    wantCount += 1
    if (!playing && !failed) startPlay()
    return () => {
      wantCount = Math.max(0, wantCount - 1)
      if (wantCount === 0) stopPlay()
    }
  },
  // 强制停止（用户在设置/页面内关闭音乐时使用）
  forceStop(): void {
    wantCount = 0
    stopPlay()
  },
  isPlaying(): boolean {
    return playing
  }
}

// 训练页背景音乐 Hook：进入页面按设置播放，离开页面暂停，并提供页内开关
export function useTrainingBgm(): { musicOn: boolean; toggleMusic: () => void } {
  const musicOn = useUserStore((s) => s.settings.music)

  useEffect(() => {
    if (!musicOn) return
    const release = bgm.acquire()
    return release
  }, [musicOn])

  const toggleMusic = () => {
    const next = !useUserStore.getState().settings.music
    useUserStore.getState().updateSettings({ music: next })
    if (!next) {
      bgm.forceStop()
    }
    // 开启时无需手动 start：musicOn 变化会触发本页（及其他训练页）effect 重新 acquire
  }

  return { musicOn, toggleMusic }
}
