import React, { useEffect, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore, showAchievementToasts } from '@/store/user'
import GameShell from '@/components/GameShell'
import CountdownRing from '@/components/CountdownRing'
import ResultOverlay from '@/components/ResultOverlay'
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
  vx: number
  vy: number
  isTarget: boolean
  selected: boolean
  reveal: 'none' | 'correct' | 'wrong'
}

const BOX_W = 640 // rpx
const BOX_H = 560 // rpx
const BALL_SIZE = 72

const LEVEL_CONFIG: Record<Difficulty, { balls: number; targets: number; memorizeSec: number; moveSec: number }> = {
  easy: { balls: 8, targets: 3, memorizeSec: 3, moveSec: 3 },
  medium: { balls: 10, targets: 4, memorizeSec: 3, moveSec: 4 },
  hard: { balls: 12, targets: 5, memorizeSec: 2, moveSec: 5 }
}

type Stage = 'intro' | 'memorize' | 'move' | 'answer' | 'result'

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
  const [startTime, setStartTime] = useState(0)
  const moveTimer = useRef<number | null>(null)
  const [moveLeft, setMoveLeft] = useState(cfg.moveSec)

  const startGame = () => {
    const targetIds = new Set(shuffle(Array.from({ length: cfg.balls }, (_, i) => i)).slice(0, cfg.targets))
    const newBalls: Ball[] = Array.from({ length: cfg.balls }, (_, i) => {
      const x = randomInt(20, BOX_W - BALL_SIZE - 20)
      const y = randomInt(20, BOX_H - BALL_SIZE - 20)
      return {
        id: i, x, y,
        vx: randomInt(-30, 30), vy: randomInt(-30, 30),
        isTarget: targetIds.has(i),
        selected: false,
        reveal: 'none'
      }
    })
    setBalls(newBalls)
    setCorrectCount(0)
    setScore(0)
    setMoveLeft(cfg.moveSec)
    setStartTime(Date.now())
    setStage('memorize')
  }

  // 移动阶段
  useEffect(() => {
    if (stage !== 'move') return
    moveTimer.current = setInterval(() => {
      setBalls((prev) =>
        prev.map((b) => {
          let nx = b.x + b.vx * 0.12
          let ny = b.y + b.vy * 0.12
          let nvx = b.vx
          let nvy = b.vy
          if (nx < 10 || nx > BOX_W - BALL_SIZE - 10) {
            nvx = -b.vx
            nx = Math.max(10, Math.min(BOX_W - BALL_SIZE - 10, nx))
          }
          if (ny < 10 || ny > BOX_H - BALL_SIZE - 10) {
            nvy = -b.vy
            ny = Math.max(10, Math.min(BOX_H - BALL_SIZE - 10, ny))
          }
          return { ...b, x: nx, y: ny, vx: nvx, vy: nvy }
        })
      )
      setMoveLeft((s) => {
        if (s <= 1) {
          if (moveTimer.current) clearInterval(moveTimer.current)
          setStage('answer')
          return 0
        }
        return s - 1
      })
    }, 250)
    return () => {
      if (moveTimer.current) clearInterval(moveTimer.current)
    }
  }, [stage])

  // 静默 speed 变量使用（避免未使用告警）
  useEffect(() => {
    if (stage === 'memorize') {
      const t = setTimeout(() => setStage('move'), cfg.memorizeSec * 1000)
      return () => clearTimeout(t)
    }
  }, [stage, cfg.memorizeSec])

  const toggleSelect = (id: number) => {
    if (stage !== 'answer') return
    setBalls((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b
        if (b.selected) return { ...b, selected: false }
        const selectedCount = prev.filter((x) => x.selected).length
        if (selectedCount >= cfg.targets) return b
        return { ...b, selected: true }
      })
    )
  }

  const submitAnswer = () => {
    const selected = balls.filter((b) => b.selected)
    const correct = selected.filter((b) => b.isTarget).length
    const finalScore = Math.round((correct / cfg.targets) * 100)
    const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setCorrectCount(correct)
    setScore(finalScore)
    feedback(finalScore >= 60 ? 'finish' : 'wrong')
    // 揭示答案：目标球标星，选错的球标叉
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
      detail: `命中 ${correct}/${cfg.targets} 个目标`
    })
    const unlocked = useUserStore.getState().achievements.filter((a) => !before.has(a))
    if (unlocked.length) {
      setTimeout(() => showAchievementToasts(unlocked), 600)
    }
    setStage('result')
  }

  const stageLabel: Record<Stage, string> = {
    intro: '准备',
    memorize: '记住目标',
    move: '持续追踪',
    answer: '指出目标',
    result: '结算'
  }

  return (
    <GameShell title={meta.name} stage={stageLabel[stage]} requireConfirm={stage !== 'intro' && stage !== 'result'}>
      {/* 介绍 */}
      {stage === 'intro' && (
        <View className={styles.intro}>
          <Text className={styles.introIcon}>🎯</Text>
          <Text className={styles.introTitle}>多目标追踪</Text>
          <Text className={styles.introText}>
            画面中将有 {cfg.balls} 颗球，其中 {cfg.targets} 颗会发出金光。{"\n"}
            它们开始移动后，请持续追踪，选出所有的目标球。{"\n"}
            只记住起点还不够，你要持续更新它们的位置。
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
              <View
                key={b.id}
                className={[
                  styles.ball,
                  stage === 'memorize' && b.isTarget ? styles.ballTarget : '',
                  stage === 'answer' && b.selected ? styles.ballSelected : '',
                  b.reveal === 'correct' ? styles.ballReveal : '',
                  b.reveal === 'wrong' ? styles.ballWrong : ''
                ].join(' ')}
                style={{
                  left: `${b.x}rpx`,
                  top: `${b.y}rpx`,
                  transition: stage === 'move' ? 'left 0.25s linear, top 0.25s linear' : 'none'
                }}
                onClick={() => toggleSelect(b.id)}
              >
                {b.reveal === 'correct' ? <Text className={styles.ballStar}>★</Text> : null}
                {b.reveal === 'wrong' ? <Text className={styles.ballCross}>✕</Text> : null}
              </View>
            ))}
          </View>

          <View className={styles.controlBar}>
            {stage === 'memorize' && (
              <View className={styles.tipCard}>
                <Text className={styles.tipText}>记住发金光的 {cfg.targets} 颗目标球</Text>
              </View>
            )}
            {stage === 'move' && (
              <View className={styles.tipCard}>
                <CountdownRing total={cfg.moveSec} running={true} size={80} />
                <Text className={styles.tipText}>持续更新它们的位置</Text>
              </View>
            )}
            {stage === 'answer' && (
              <View className={styles.answerBar}>
                <Text className={styles.answerTip}>
                  已选 {balls.filter((b) => b.selected).length}/{cfg.targets}
                </Text>
                <View className={styles.submitBtn} onClick={submitAnswer}>
                  <Text className={styles.submitBtnText}>确认提交</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      <ResultOverlay
        visible={stage === 'result'}
        score={score}
        accuracy={score}
        durationSec={Math.max(1, Math.round((Date.now() - startTime) / 1000))}
        exp={expGain(score, difficulty)}
        detail={`${DIFFICULTY_LABEL[difficulty]} · 命中 ${correctCount}/${cfg.targets} 个目标球`}
        onRetry={startGame}
        onHome={() => Taro.reLaunch({ url: '/pages/home/index' })}
      />
    </GameShell>
  )
}

export default TrackingPage
