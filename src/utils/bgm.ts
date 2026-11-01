import { useEffect } from 'react'
import { useUserStore } from '@/store/user'

// 训练背景音乐：Web Audio API 实时合成的轻音乐（无需音频文件）
// C 大调和弦进行 C-G-Am-F 循环，pad 铺底 + 五声音阶随机旋律，音量轻柔
// 仅在训练功能页播放，退出训练即停止；多页面栈用引用计数管理，避免互相打断

let ctx: AudioContext | null = null
let master: GainNode | null = null
let loopTimer: ReturnType<typeof setTimeout> | null = null
let playing = false
let wantCount = 0 // 需要播放音乐的页面数
let resumeBound = false

// 和弦频率：C / G / Am / F
const CHORDS: number[][] = [
  [261.63, 329.63, 392.0], // C：C E G
  [196.0, 246.94, 293.66], // G：G B D
  [220.0, 261.63, 329.63], // Am：A C E
  [174.61, 220.0, 261.63] // F：F A C
]
// C 大调五声音阶（旋律音）
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0] // C5 D5 E5 G5 A5

const BEAT = 60 / 72 // 72 BPM
const CHORD_DUR = BEAT * 2 // 每和弦 2 拍
const LOOP_DUR = CHORD_DUR * CHORDS.length

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = 0.05
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 2200
      master.connect(filter)
      filter.connect(ctx.destination)
      if (!resumeBound) {
        resumeBound = true
        // 部分浏览器要求用户交互后才允许播音，首次交互时自动恢复
        const resume = () => {
          if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
        }
        document.addEventListener('pointerdown', resume)
        document.addEventListener('touchend', resume)
      }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null
  }
}

function padChord(freqs: number[], t0: number): void {
  if (!ctx || !master) return
  freqs.forEach((f, i) => {
    const osc = ctx!.createOscillator()
    const g = ctx!.createGain()
    osc.type = i === 0 ? 'sine' : 'triangle'
    osc.frequency.value = f
    osc.detune.value = i === 1 ? 5 : i === 2 ? -5 : 0
    const vol = 0.16 / freqs.length
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(vol, t0 + 0.7)
    g.gain.setValueAtTime(vol, t0 + CHORD_DUR - 0.9)
    g.gain.linearRampToValueAtTime(0.0001, t0 + CHORD_DUR)
    osc.connect(g)
    g.connect(master!)
    osc.start(t0)
    osc.stop(t0 + CHORD_DUR + 0.05)
  })
}

function melodyNote(freq: number, t0: number): void {
  if (!ctx || !master) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(0.1, t0 + 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55)
  osc.connect(g)
  g.connect(master!)
  osc.start(t0)
  osc.stop(t0 + 0.6)
}

function scheduleLoop(): void {
  const c = getCtx()
  if (!c || !playing) return
  const t0 = c.currentTime + 0.08
  CHORDS.forEach((chord, i) => padChord(chord, t0 + i * CHORD_DUR))
  // 五声音阶随机旋律：半拍网格，约一半概率落音
  const step = BEAT / 2
  for (let t = 0; t < LOOP_DUR - step; t += step) {
    if (Math.random() < 0.5) {
      melodyNote(PENTA[Math.floor(Math.random() * PENTA.length)], t0 + t)
    }
  }
  loopTimer = setTimeout(scheduleLoop, LOOP_DUR * 1000 - 150)
}

export const bgm = {
  // 页面引用：进入训练页调用，返回释放函数
  acquire(): () => void {
    wantCount += 1
    if (!playing) {
      playing = true
      scheduleLoop()
    }
    return () => {
      wantCount = Math.max(0, wantCount - 1)
      if (wantCount === 0 && playing) {
        playing = false
        if (loopTimer) {
          clearTimeout(loopTimer)
          loopTimer = null
        }
      }
    }
  },
  // 强制停止（用户在设置/页面内关闭音乐时使用）
  forceStop(): void {
    wantCount = 0
    playing = false
    if (loopTimer) {
      clearTimeout(loopTimer)
      loopTimer = null
    }
  },
  isPlaying(): boolean {
    return playing
  }
}

// 训练页背景音乐 Hook：进入页面按设置播放，离开页面停止，并提供页内开关
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
