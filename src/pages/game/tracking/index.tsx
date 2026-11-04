import React, { useEffect, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore, showAchievementToasts } from '@/store/user'
import GameShell from '@/components/GameShell'
import ResultOverlay from '@/components/ResultOverlay'
import StyledView from '@/components/StyledView'
import { getGameMeta } from '@/data/games'
import { expGain, DIFFICULTY_LABEL, bestScoreOf, trainCountOf } from '@/utils/score'
import { feedback } from '@/utils/feedback'
import { randomInt, shuffle } from '@/utils/random'
import type { Difficulty } from '@/types'
import styles from './index.module.scss'

interface Ball {
  id: number
  x: number
  y: number
  vx: number // 水平速度（rpx/秒）
  vy: number // 垂直速度（rpx/秒）
  isTarget: boolean
  selected: boolean
  reveal: 'none' | 'correct' | 'wrong'
}

const BOX_W = 640 // rpx，场地宽
const BOX_H = 500 // rpx，场地高
const BALL_SIZE = 64 // rpx，球直径
const EDGE = 6 // 距场地边缘最小距离

// 经典多目标追踪（MOT）规则：全部球同色；先闪烁标记 targets 颗目标球供记忆，
// 随后全场同色自由移动并相互碰撞；观察期结束定格并从 1 开始编号，凭记忆点出目标球
const LEVEL_CONFIG: Record<Difficulty, { balls: number; targets: number; observeSec: number; speed: number }> = {
  easy: { balls: 10, targets: 3, observeSec: 15, speed: 85 },
  medium: { balls: 12, targets: 4, observeSec: 12, speed: 110 },
  hard: { balls: 15, targets: 5, observeSec: 9, speed: 140 }
}

// 标记阶段时长：目标球闪烁展示，供玩家记住（秒）
const MARK_SEC = 3

// 移动速度档位：用户可自行调节
const SPEED_OPTIONS = [
  { key: 'slow', label: '悠闲', factor: 0.6 },
  { key: 'normal', label: '标准', factor: 1 },
  { key: 'fast', label: '迅捷', factor: 1.5 }
] as const
type SpeedKey = (typeof SPEED_OPTIONS)[number]['key']

const clampX = (x: number) => Math.min(Math.max(x, EDGE), BOX_W - BALL_SIZE - EDGE)
const clampY = (y: number) => Math.min(Math.max(y, EDGE), BOX_H - BALL_SIZE - EDGE)

// 球球弹性碰撞：等质量同半径球沿连心线交换法向速度分量，并分离重叠
function resolveCollisions(balls: Ball[]): Ball[] {
  const next = balls.map((b) => ({ ...b }))
  const diameter = BALL_SIZE * 2
  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const a = next[i]
      const b = next[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let dist = Math.sqrt(dx * dx + dy * dy)
      if (dist === 0) {
        // 完全重合时给确定性微小方向，避免除零
        dx = 1
        dy = 0
        dist = 1
      }
      if (dist >= diameter) continue
      const nx = dx / dist
      const ny = dy / dist
      // 位置分离：沿连心线各退一半重叠量，防止粘连
      const overlap = (diameter - dist) / 2 + 0.5
      a.x = clampX(a.x - nx * overlap)
      a.y = clampY(a.y - ny * overlap)
      b.x = clampX(b.x + nx * overlap)
      b.y = clampY(b.y + ny * overlap)
      // 仅在相互接近时交换法向分量（等质量弹性碰撞，动量与动能均守恒）
      const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
      if (approach < 0) {
        a.vx += approach * nx
        a.vy += approach * ny
        b.vx -= approach * nx
        b.vy -= approach * ny
      }
    }
  }
  return next
}

type Stage = 'intro' | 'mark' | 'observe' | 'answer' | 'result'

// 推进一帧：先按速度移动并处理碰壁反弹，再做球球碰撞
function advanceBalls(balls: Ball[], dt: number): Ball[] {
  const moved = balls.map((b) => {
    let nx = b.x + b.vx * dt
    let ny = b.y + b.vy * dt
    let nvx = b.vx
    let nvy = b.vy
    if (nx < EDGE) {
      nx = EDGE
      nvx = -b.vx
    } else if (nx > BOX_W - BALL_SIZE - EDGE) {
      nx = BOX_W - BALL_SIZE - EDGE
      nvx = -b.vx
    }
    if (ny < EDGE) {
      ny = EDGE
      nvy = -b.vy
    } else if (ny > BOX_H - BALL_SIZE - EDGE) {
      ny = BOX_H - BALL_SIZE - EDGE
      nvy = -b.vy
    }
    return { ...b, x: nx, y: ny, vx: nvx, vy: nvy }
  })
  return resolveCollisions(moved)
}

// 小程序端：进入观察前一次性把整段轨迹算好（固定 30 帧/秒），
// 播放时每帧只做一次 setData，不依赖真机的帧回调，也不会出现坐标 NaN
const PLAN_FPS = 30
function planTrajectory(balls: Ball[], seconds: number): { x: number; y: number }[][] {
  const steps = Math.max(1, Math.round(seconds * PLAN_FPS))
  let sim = balls
  const frames: { x: number; y: number }[][] = []
  for (let i = 0; i < steps; i++) {
    sim = advanceBalls(sim, 1 / PLAN_FPS)
    frames.push(sim.map((b) => ({ x: b.x, y: b.y })))
  }
  return frames
}

// 随机摆放球体，尽量互不重叠（拒绝采样）
function placeBalls(count: number): { x: number; y: number }[] {
  const placed: { x: number; y: number }[] = []
  const minDist = BALL_SIZE + 10
  for (let i = 0; i < count; i++) {
    let pos = { x: 0, y: 0 }
    for (let tries = 0; tries < 40; tries++) {
      pos = {
        x: randomInt(EDGE, BOX_W - BALL_SIZE - EDGE),
        y: randomInt(EDGE, BOX_H - BALL_SIZE - EDGE)
      }
      const ok = placed.every((p) => {
        const dx = p.x + BALL_SIZE / 2 - (pos.x + BALL_SIZE / 2)
        const dy = p.y + BALL_SIZE / 2 - (pos.y + BALL_SIZE / 2)
        return Math.sqrt(dx * dx + dy * dy) >= minDist
      })
      if (ok) break
    }
    placed.push(pos)
  }
  return placed
}

const TrackingPage: React.FC = () => {
  const store = useUserStore()
  const router = Taro.getCurrentInstance().router?.params || {}
  const difficulty = (router.difficulty as Difficulty) || 'easy'
  const cfg = LEVEL_CONFIG[difficulty]
  const meta = getGameMeta('tracking')!

  const [stage, setStage] = useState<Stage>('intro')
  const [balls, setBalls] = useState<Ball[]>([])
  const [observeLeft, setObserveLeft] = useState(cfg.observeSec)
  const [markLeft, setMarkLeft] = useState(MARK_SEC)
  const [markFade, setMarkFade] = useState(false) // 标记结束后的白光淡出过渡，避免目标球瞬间褪色
  const [speedKey, setSpeedKey] = useState<SpeedKey>('normal')
  const [correctCount, setCorrectCount] = useState(0)
  const [score, setScore] = useState(0)
  // 本次开始前的历史最佳，用于结算页判断是否刷新纪录（addRecord 后历史会变，必须提前快照）
  const [bestBefore, setBestBefore] = useState(0)
  const startTime = useRef(0)
  // 小程序端的整段轨迹（进入观察时按帧播放；H5 端为空，实时计算即可）
  const framesRef = useRef<{ x: number; y: number }[][]>([])

  const speedFactor = SPEED_OPTIONS.find((s) => s.key === speedKey)!.factor

  const startGame = () => {
    setBestBefore(bestScoreOf(useUserStore.getState().history, 'tracking'))
    const targetIds = new Set(shuffle(Array.from({ length: cfg.balls }, (_, i) => i)).slice(0, cfg.targets))
    const positions = placeBalls(cfg.balls)
    const newBalls: Ball[] = positions.map((pos, i) => {
      // 全部球都获得随机方向与速度（乘用户选择的速度倍率）
      const angle = Math.random() * Math.PI * 2
      const speed = cfg.speed * speedFactor * (0.85 + Math.random() * 0.3)
      return {
        id: i,
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        isTarget: targetIds.has(i),
        selected: false,
        reveal: 'none'
      }
    })
    setBalls(newBalls)
    // 小程序端：开局即算好整段观察轨迹，标记阶段球不动，播放时直接用这份数据
    framesRef.current = process.env.TARO_ENV === 'weapp' ? planTrajectory(newBalls, cfg.observeSec) : []
    setCorrectCount(0)
    setScore(0)
    setObserveLeft(cfg.observeSec)
    setMarkLeft(MARK_SEC)
    startTime.current = Date.now()
    setStage('mark')
  }

  // 观察阶段：让全部球移动，碰壁反弹 + 球球弹性碰撞
  useEffect(() => {
    if (stage !== 'observe') return

    // 小程序端：开局已算好整段轨迹，这里只按时间播放对应帧，避免真机上实时计算不稳
    if (process.env.TARO_ENV === 'weapp') {
      const frames = framesRef.current
      if (!frames.length) return
      const startAt = Date.now()
      const frameMs = 1000 / PLAN_FPS
      const timer = setInterval(() => {
        const elapsed = Date.now() - startAt
        const idx = Math.min(frames.length - 1, Math.max(0, Math.floor(elapsed / frameMs)))
        const frame = frames[idx]
        setBalls((prev) => prev.map((b, i) => ({ ...b, x: frame[i].x, y: frame[i].y })))
      }, frameMs)
      return () => clearInterval(timer)
    }

    // H5 端：浏览器帧回调足够稳定，按真实时间实时推进
    let rafId = 0
    let stopped = false
    let last = 0
    const step = (stamp: number) => {
      let dt = (stamp - last) / 1000
      last = stamp
      if (!isFinite(dt) || dt <= 0) dt = 0.016
      dt = Math.min(0.05, dt)
      setBalls((prev) => advanceBalls(prev, dt))
    }
    const loop = (t: number) => {
      if (stopped) return
      rafId = requestAnimationFrame(loop)
      step(t)
    }
    rafId = requestAnimationFrame((t) => {
      last = t
      loop(t)
    })

    return () => {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [stage])

  // 标记阶段倒计时：目标球闪烁展示 MARK_SEC 秒后进入观察（本地计时器驱动，
  // 不依赖子组件回调，保证标记时间稳定成立）
  useEffect(() => {
    if (stage !== 'mark') return
    setMarkLeft(MARK_SEC)
    let left = MARK_SEC
    const timer = setInterval(() => {
      left -= 1
      setMarkLeft(left)
      if (left <= 0) {
        clearInterval(timer)
        setMarkFade(true)
        setStage('observe')
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [stage])

  // 双保险：标记阶段超时也强制进入观察，避免卡死
  useEffect(() => {
    if (stage !== 'mark') return
    const t = setTimeout(() => {
      setMarkFade(true)
      setStage('observe')
    }, MARK_SEC * 1000 + 600)
    return () => clearTimeout(t)
  }, [stage])

  // 白光淡出约 0.5s 后复位，供下一轮训练使用
  useEffect(() => {
    if (!markFade) return
    const t = setTimeout(() => setMarkFade(false), 500)
    return () => clearTimeout(t)
  }, [markFade])

  // 观察阶段倒计时：页面自带本地计时器驱动阶段切换（不依赖任何子组件回调，
  // 保证"观察满 observeSec 秒才进入指认"这一核心规则稳定成立）
  useEffect(() => {
    if (stage !== 'observe') return
    setObserveLeft(cfg.observeSec)
    let left = cfg.observeSec
    const timer = setInterval(() => {
      left -= 1
      setObserveLeft(left)
      if (left <= 0) {
        clearInterval(timer)
        setStage('answer')
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [stage, cfg.observeSec])

  // 双保险：万一计时器被浏览器异常节流，超时后也强制进入指认，避免卡死
  useEffect(() => {
    if (stage !== 'observe') return
    const t = setTimeout(() => setStage('answer'), cfg.observeSec * 1000 + 600)
    return () => clearTimeout(t)
  }, [stage, cfg.observeSec])

  const selectedCount = balls.filter((b) => b.selected).length

  const toggleSelect = (id: number) => {
    if (stage !== 'answer') return
    setBalls((prev) => {
      const target = prev.find((b) => b.id === id)
      if (!target) return prev
      if (target.selected) {
        feedback('tap')
        return prev.map((b) => (b.id === id ? { ...b, selected: false } : b))
      }
      if (prev.filter((b) => b.selected).length >= cfg.targets) return prev
      feedback('tick')
      return prev.map((b) => (b.id === id ? { ...b, selected: true } : b))
    })
  }

  const submitAnswer = () => {
    if (selectedCount < cfg.targets) return
    const selected = balls.filter((b) => b.selected)
    const correct = selected.filter((b) => b.isTarget).length
    const finalScore = Math.round((correct / cfg.targets) * 100)
    const durationSec = Math.max(1, Math.round((Date.now() - startTime.current) / 1000))
    setCorrectCount(correct)
    setScore(finalScore)
    feedback(finalScore >= 60 ? 'finish' : 'wrong')
    // 揭示答案：动过的球标星，选错的球标叉
    setBalls((prev) =>
      prev.map((b) => ({
        ...b,
        reveal: b.isTarget ? 'correct' : b.selected ? 'wrong' : 'none'
      }))
    )
    const before = new Set(store.achievements)
    store.addRecord({
      gameId: 'tracking',
      gameName: meta.name,
      dimension: 'focus',
      score: finalScore,
      accuracy: finalScore,
      durationSec,
      difficulty,
      detail: `命中 ${correct}/${cfg.targets} 个同色目标球`
    })
    const unlocked = useUserStore.getState().achievements.filter((a) => !before.has(a))
    if (unlocked.length) {
      setTimeout(() => showAchievementToasts(unlocked), 600)
    }
    setStage('result')
  }

  const stageLabel: Record<Stage, string> = {
    intro: '准备',
    mark: '标记',
    observe: '观察中',
    answer: '指认',
    result: '结算'
  }

  const liveBest = bestScoreOf(store.history, 'tracking')
  const liveCount = trainCountOf(store.history, 'tracking')

  return (
    <GameShell title={meta.name} stage={stageLabel[stage]} requireConfirm={stage !== 'intro' && stage !== 'result'}>
      {/* 介绍 */}
      {stage === 'intro' && (
        <View className={styles.intro}>
          <Text className={styles.introIcon}>👀</Text>
          <Text className={styles.introTitle}>多目标追踪</Text>
          <Text className={styles.introText}>
            {DIFFICULTY_LABEL[difficulty]}模式：{cfg.balls} 颗球颜色完全相同，{"\n"}
            先闪烁标记 {cfg.targets} 颗目标球，请记住它们；{"\n"}
            随后全部同色自由移动、相互碰撞，{"\n"}
            {cfg.observeSec} 秒后全场定格并编号，凭记忆点出那 {cfg.targets} 颗。
          </Text>
          <Text className={styles.recordLine}>
            {liveCount > 0 ? `历史最佳 ${liveBest} 分 · 已训练 ${liveCount} 次` : '首次挑战，记录从这一次开始'}
          </Text>
          <View className={styles.speedRow}>
            <Text className={styles.speedLabel}>移动速度</Text>
            <View className={styles.speedOptions}>
              {SPEED_OPTIONS.map((opt) => (
                <View
                  key={opt.key}
                  className={[styles.speedBtn, speedKey === opt.key ? styles.speedBtnActive : ''].join(' ')}
                  onClick={() => setSpeedKey(opt.key)}
                >
                  <Text
                    className={[styles.speedBtnText, speedKey === opt.key ? styles.speedBtnTextActive : ''].join(' ')}
                  >
                    {opt.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View className={styles.startBtn} onClick={startGame}>
            <Text className={styles.startBtnText}>开始训练</Text>
          </View>
        </View>
      )}

      {/* 游戏区 */}
      {stage !== 'intro' && (
        <View className={styles.gameArea}>
          <View className={styles.box}>
            {balls.map((b) => (
              <StyledView
                key={b.id}
                className={[
                  styles.ball,
                  stage === 'mark' && b.isTarget ? styles.ballMark : '',
                  stage === 'observe' && markFade && b.isTarget ? styles.ballMarkFade : '',
                  stage === 'answer' && b.selected ? styles.ballSelected : '',
                  b.reveal === 'correct' ? styles.ballReveal : '',
                  b.reveal === 'wrong' ? styles.ballWrong : ''
                ].join(' ')}
                // 内联 style prop 会被 Taro H5 丢弃，位置经 StyledView 直接写入 DOM
                css={{
                  left: `${(b.x / BOX_W) * 100}%`,
                  top: `${(b.y / BOX_H) * 100}%`
                }}
                onClick={() => toggleSelect(b.id)}
              >
                {b.reveal === 'correct' ? <Text className={styles.ballStar}>★</Text> : null}
                {b.reveal === 'wrong' ? <Text className={styles.ballCross}>✕</Text> : null}
                {/* 定格后每颗球从 1 开始显示编号 */}
                {(stage === 'answer' || stage === 'result') && b.reveal === 'none' ? (
                  <Text className={styles.ballNum}>{b.id + 1}</Text>
                ) : null}
              </StyledView>
            ))}
          </View>

          <View className={styles.controlBar}>
            {(stage === 'mark' || stage === 'observe') && (
              <View className={styles.observeBar}>
                {/* key 随阶段变化：阶段切换时倒计时/进度条/文案整体淡入刷新，避免数字与进度硬跳 */}
                <View className={styles.barSlide} key={stage}>
                  <View className={styles.countChip}>
                    <Text className={styles.countNum}>{stage === 'mark' ? markLeft : observeLeft}</Text>
                    <Text className={styles.countUnit}>秒</Text>
                  </View>
                  <View className={styles.countTrack}>
                    <StyledView
                      className={styles.countFill}
                      css={{
                        width: `${Math.max(
                          0,
                          ((stage === 'mark' ? markLeft : observeLeft) /
                            (stage === 'mark' ? MARK_SEC : cfg.observeSec)) *
                            100
                        )}%`
                      }}
                    />
                  </View>
                  <Text className={styles.tipText}>
                    {stage === 'mark' ? `记住闪烁的 ${cfg.targets} 颗球！` : '已混入同色球中：盯住它们！'}
                  </Text>
                </View>
              </View>
            )}
            {stage === 'answer' && (
              <View className={styles.answerBar}>
                <Text className={styles.answerTip}>
                  已选 {selectedCount}/{cfg.targets}
                </Text>
                <View
                  className={[
                    styles.submitBtn,
                    selectedCount < cfg.targets ? styles.submitBtnDisabled : ''
                  ].join(' ')}
                  onClick={submitAnswer}
                >
                  <Text className={styles.submitBtnText}>确认提交</Text>
                </View>
              </View>
            )}
            {stage === 'answer' && (
              <Text className={styles.answerHint}>全场已定格：刚才记住的是几号？点选它们（可取消重选）</Text>
            )}
          </View>
        </View>
      )}

      <ResultOverlay
        visible={stage === 'result'}
        score={score}
        accuracy={score}
        durationSec={Math.max(1, Math.round((Date.now() - startTime.current) / 1000))}
        exp={expGain(score, difficulty)}
        best={bestBefore}
        detail={`${DIFFICULTY_LABEL[difficulty]} · 命中 ${correctCount}/${cfg.targets} 个移动球`}
        onRetry={startGame}
        onHome={() => Taro.reLaunch({ url: '/pages/home/index' })}
      />
    </GameShell>
  )
}

export default TrackingPage
