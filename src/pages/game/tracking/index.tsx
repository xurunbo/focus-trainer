import React, { useEffect, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore, showAchievementToasts } from '@/store/user'
import GameShell from '@/components/GameShell'
import CountdownRing from '@/components/CountdownRing'
import ResultOverlay from '@/components/ResultOverlay'
import StyledView from '@/components/StyledView'
import { getGameMeta } from '@/data/games'
import { expGain, DIFFICULTY_LABEL } from '@/utils/score'
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

// 规则：观察期内只有 isTarget 的球会移动，其余球完全静止
// 观察结束后全部静止，凭记忆选出刚才动过的球
const LEVEL_CONFIG: Record<Difficulty, { balls: number; targets: number; observeSec: number; speed: number }> = {
  easy: { balls: 10, targets: 3, observeSec: 5, speed: 85 },
  medium: { balls: 12, targets: 4, observeSec: 4, speed: 110 },
  hard: { balls: 15, targets: 5, observeSec: 3, speed: 140 }
}

type Stage = 'intro' | 'observe' | 'answer' | 'result'

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
        return Math.hypot(dx, dy) >= minDist
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
  const [correctCount, setCorrectCount] = useState(0)
  const [score, setScore] = useState(0)
  const startTime = useRef(0)

  const startGame = () => {
    const targetIds = new Set(shuffle(Array.from({ length: cfg.balls }, (_, i) => i)).slice(0, cfg.targets))
    const positions = placeBalls(cfg.balls)
    const newBalls: Ball[] = positions.map((pos, i) => {
      // 目标球获得随机方向与速度；非目标球速度为 0（完全静止）
      const angle = Math.random() * Math.PI * 2
      const speed = cfg.speed * (0.85 + Math.random() * 0.3)
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
    setCorrectCount(0)
    setScore(0)
    startTime.current = Date.now()
    setStage('observe')
  }

  // 观察阶段：requestAnimationFrame 驱动目标球移动，碰壁反弹
  useEffect(() => {
    if (stage !== 'observe') return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) // 秒，限制切后台后的跳变
      last = now
      setBalls((prev) =>
        prev.map((b) => {
          if (!b.isTarget) return b
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
      )
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [stage])

  // 观察阶段兜底计时：倒计时环结束时切到指认阶段（双保险，防止组件异常卡死）
  useEffect(() => {
    if (stage !== 'observe') return
    const t = setTimeout(() => setStage('answer'), cfg.observeSec * 1000 + 400)
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
      detail: `命中 ${correct}/${cfg.targets} 个移动球`
    })
    const unlocked = useUserStore.getState().achievements.filter((a) => !before.has(a))
    if (unlocked.length) {
      setTimeout(() => showAchievementToasts(unlocked), 600)
    }
    setStage('result')
  }

  const stageLabel: Record<Stage, string> = {
    intro: '准备',
    observe: '观察中',
    answer: '指认',
    result: '结算'
  }

  return (
    <GameShell title={meta.name} stage={stageLabel[stage]} requireConfirm={stage !== 'intro' && stage !== 'result'}>
      {/* 介绍 */}
      {stage === 'intro' && (
        <View className={styles.intro}>
          <Text className={styles.introIcon}>👀</Text>
          <Text className={styles.introTitle}>多目标追踪</Text>
          <Text className={styles.introText}>
            {DIFFICULTY_LABEL[difficulty]}模式：{cfg.balls} 颗球中，{"\n"}
            会有 {cfg.targets} 颗悄悄移动，其余球一动不动。{"\n"}
            请在 {cfg.observeSec} 秒内看清哪几颗在动，{"\n"}
            时间结束后把它们一颗颗指出来。
          </Text>
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
              </StyledView>
            ))}
          </View>

          <View className={styles.controlBar}>
            {stage === 'observe' && (
              <View className={styles.observeBar}>
                <CountdownRing
                  total={cfg.observeSec}
                  running={true}
                  size={88}
                  label="秒"
                  onComplete={() => setStage('answer')}
                />
                <Text className={styles.tipText}>仔细观察：哪些球正在移动？</Text>
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
              <Text className={styles.answerHint}>刚才移动的是哪几颗？点选它们（可取消重选）</Text>
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
        detail={`${DIFFICULTY_LABEL[difficulty]} · 命中 ${correctCount}/${cfg.targets} 个移动球`}
        onRetry={startGame}
        onHome={() => Taro.reLaunch({ url: '/pages/home/index' })}
      />
    </GameShell>
  )
}

export default TrackingPage
