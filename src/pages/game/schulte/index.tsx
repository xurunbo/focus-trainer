import React, { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore, showAchievementToasts } from '@/store/user'
import GameShell from '@/components/GameShell'
import ResultOverlay from '@/components/ResultOverlay'
import { getGameMeta } from '@/data/games'
import { expGain } from '@/utils/score'
import { shuffle } from '@/utils/random'
import type { Difficulty } from '@/types'
import styles from './index.module.scss'

const GRID = 5
const TOTAL = GRID * GRID

const LEVEL_CONFIG: Record<Difficulty, { timeLimit: number }> = {
  easy: { timeLimit: 60 },
  medium: { timeLimit: 45 },
  hard: { timeLimit: 35 }
}

type Stage = 'intro' | 'countdown' | 'playing' | 'result'
type Mode = 'asc' | 'desc'

const SchultePage: React.FC = () => {
  const store = useUserStore()
  const router = Taro.getCurrentInstance().router?.params || {}
  const difficulty = (router.difficulty as Difficulty) || 'easy'
  const cfg = LEVEL_CONFIG[difficulty]
  const meta = getGameMeta('schulte')!

  const [stage, setStage] = useState<Stage>('intro')
  const [mode, setMode] = useState<Mode>('asc')
  const [numbers, setNumbers] = useState<number[]>([])
  const [nextTarget, setNextTarget] = useState(1)
  const [foundCount, setFoundCount] = useState(0)
  const [wrongId, setWrongId] = useState(-1)
  const [timeLeft, setTimeLeft] = useState(cfg.timeLimit)
  const [score, setScore] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [usedSec, setUsedSec] = useState(0)
  const [cd, setCd] = useState(3)

  const beginGame = (m: Mode) => {
    setMode(m)
    setNumbers(shuffle(Array.from({ length: TOTAL }, (_, i) => i + 1)))
    setNextTarget(m === 'asc' ? 1 : TOTAL)
    setFoundCount(0)
    setWrongId(-1)
    setTimeLeft(cfg.timeLimit)
    setScore(0)
    setUsedSec(0)
    setCd(3)
    setStage('countdown')
  }

  // 倒计时 3-2-1
  useEffect(() => {
    if (stage !== 'countdown') return
    if (cd <= 0) {
      setStage('playing')
      setStartTime(Date.now())
      return
    }
    const t = setTimeout(() => setCd((s) => s - 1), 800)
    return () => clearTimeout(t)
  }, [stage, cd])

  // 游戏计时
  useEffect(() => {
    if (stage !== 'playing') return
    const timer = setInterval(() => {
      setTimeLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [stage])

  // 时间到自动结算
  useEffect(() => {
    if (stage === 'playing' && timeLeft === 0) {
      finishGame(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, timeLeft])

  const finishGame = (completed: boolean) => {
    const sec = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setUsedSec(sec)
    let finalScore: number
    if (completed) {
      const ratio = sec / cfg.timeLimit
      finalScore = Math.round(Math.max(60, 100 - ratio * 40))
    } else {
      finalScore = Math.round((foundCount / TOTAL) * 60)
    }
    setScore(finalScore)
    const before = new Set(store.achievements)
    store.addRecord({
      gameId: 'schulte',
      gameName: meta.name,
      dimension: 'focus',
      score: finalScore,
      accuracy: completed ? 100 : Math.round((foundCount / TOTAL) * 100),
      durationSec: sec,
      difficulty,
      detail: `${mode === 'asc' ? '正序' : '倒序'}找到 ${foundCount}/${TOTAL} 个`
    })
    const unlocked = useUserStore.getState().achievements.filter((a) => !before.has(a))
    if (unlocked.length) {
      setTimeout(() => showAchievementToasts(unlocked), 600)
    }
    setStage('result')
  }

  const tapCell = (num: number) => {
    if (stage !== 'playing') return
    if (num === nextTarget) {
      const nextFound = foundCount + 1
      setFoundCount(nextFound)
      if (nextFound >= TOTAL) {
        setTimeout(() => finishGame(true), 300)
        return
      }
      setNextTarget(mode === 'asc' ? num + 1 : num - 1)
    } else {
      setWrongId(num)
      setTimeout(() => setWrongId(-1), 400)
    }
  }

  const stageLabel = {
    intro: '准备',
    countdown: '准备开始',
    playing: `${mode === 'asc' ? '正序' : '倒序'}进行中`,
    result: '结算'
  }

  // 答案核对路径（按点击顺序的位置）
  const orderIndex = numbers.map((n, i) => ({ n, i }))
    .sort((a, b) => (mode === 'asc' ? a.n - b.n : b.n - a.n))
    .slice(0, Math.max(1, foundCount))

  return (
    <GameShell title={meta.name} stage={stageLabel[stage]}>
      {stage === 'intro' && (
        <View className={styles.intro}>
          <Text className={styles.introIcon}>🧩</Text>
          <Text className={styles.introTitle}>舒尔特方格</Text>
          <Text className={styles.introText}>
            在方格中按顺序击破数字。{"\n"}
            这次从二十五开始，倒序规则也要守住。
          </Text>
          <View className={styles.modeRow}>
            <View className={styles.modeBtn} onClick={() => beginGame('asc')}>
              <Text className={styles.modeTitle}>正序挑战</Text>
              <Text className={styles.modeDesc}>1 → 25</Text>
            </View>
            <View className={styles.modeBtnActive} onClick={() => beginGame('desc')}>
              <Text className={styles.modeTitleActive}>倒序挑战</Text>
              <Text className={styles.modeDescActive}>25 → 1</Text>
            </View>
          </View>
        </View>
      )}

      {stage === 'countdown' && (
        <View className={styles.countdownArea}>
          <Text className={styles.countdownNum}>{cd > 0 ? cd : '开始'}</Text>
          <Text className={styles.countdownTip}>
            {mode === 'asc' ? '从 1 开始，按顺序点到 25' : '从 25 开始，倒序点到 1'}
          </Text>
        </View>
      )}

      {stage === 'playing' && (
        <View className={styles.playArea}>
          <View className={styles.statusBar}>
            <View className={styles.statusItem}>
              <Text className={timeLeft <= 10 ? styles.statusNumUrgent : styles.statusNum}>{timeLeft}</Text>
              <Text className={styles.statusLabel}>剩余秒数</Text>
            </View>
            <View className={styles.targetBox}>
              <Text className={styles.targetLabel}>当前目标</Text>
              <Text className={styles.targetNum}>{nextTarget}</Text>
            </View>
            <View className={styles.statusItem}>
              <Text className={styles.statusNum}>{foundCount}</Text>
              <Text className={styles.statusLabel}>已找到</Text>
            </View>
          </View>
          <View className={styles.grid}>
            {numbers.map((n) => {
              const isDone = mode === 'asc' ? n < nextTarget : n > nextTarget
              return (
                <View
                  key={n}
                  className={[
                    styles.cell,
                    isDone ? styles.cellDone : '',
                    wrongId === n ? styles.cellWrong : ''
                  ].join(' ')}
                  onClick={() => tapCell(n)}
                >
                  <Text className={isDone ? styles.cellTextDone : styles.cellText}>{n}</Text>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {stage === 'result' && (
        <View className={styles.resultArea}>
          <Text className={styles.resultTitle}>时间到</Text>
          <Text className={styles.resultSub}>你最后找到了 {foundCount} 个</Text>
          <View className={styles.reviewGrid}>
            {numbers.map((n, i) => {
              const rank = orderIndex.findIndex((o) => o.i === i)
              return (
                <View
                  key={n}
                  className={rank >= 0 ? styles.reviewCellDone : styles.reviewCell}
                >
                  <Text className={styles.reviewText}>{n}</Text>
                  {rank >= 0 ? <Text className={styles.reviewRank}>{rank + 1}</Text> : null}
                </View>
              )
            })}
          </View>
        </View>
      )}

      <ResultOverlay
        visible={stage === 'result'}
        score={score}
        accuracy={Math.round((foundCount / TOTAL) * 100)}
        durationSec={usedSec}
        exp={expGain(score, difficulty)}
        detail={`${mode === 'asc' ? '正序' : '倒序'}找到 ${foundCount}/${TOTAL} 个数字`}
        onRetry={() => beginGame(mode)}
        onHome={() => Taro.reLaunch({ url: '/pages/home/index' })}
      />
    </GameShell>
  )
}

export default SchultePage
