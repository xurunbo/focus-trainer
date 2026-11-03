import React, { useEffect, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore, showAchievementToasts } from '@/store/user'
import GameShell from '@/components/GameShell'
import CountdownRing from '@/components/CountdownRing'
import ResultOverlay from '@/components/ResultOverlay'
import { getGameMeta } from '@/data/games'
import { MEMORY_ITEMS } from '@/data/items'
import { expGain, DIFFICULTY_LABEL, bestScoreOf, trainCountOf } from '@/utils/score'
import { feedback } from '@/utils/feedback'
import { pickSome, shuffle } from '@/utils/random'
import type { Difficulty } from '@/types'
import styles from './index.module.scss'

const ITEM_COUNT = 12
const ROUNDS = 3

interface Round {
  shown: typeof MEMORY_ITEMS
  missing: typeof MEMORY_ITEMS[number]
  options: typeof MEMORY_ITEMS
}

const LEVEL_CONFIG: Record<Difficulty, { memorizeSec: number; optionCount: number; answerSec: number }> = {
  easy: { memorizeSec: 8, optionCount: 3, answerSec: 15 },
  medium: { memorizeSec: 7, optionCount: 4, answerSec: 12 },
  hard: { memorizeSec: 6, optionCount: 4, answerSec: 10 }
}

type Stage = 'intro' | 'memorize' | 'answer' | 'result'

const ItemMemoryPage: React.FC = () => {
  const store = useUserStore()
  const router = Taro.getCurrentInstance().router?.params || {}
  const difficulty = (router.difficulty as Difficulty) || 'easy'
  const cfg = LEVEL_CONFIG[difficulty]
  const meta = getGameMeta('item-memory')!

  const [stage, setStage] = useState<Stage>('intro')
  const [rounds, setRounds] = useState<Round[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [pickedName, setPickedName] = useState('')
  const [left, setLeft] = useState(cfg.answerSec)
  const [results, setResults] = useState<('right' | 'wrong' | null)[]>([])
  const [bestBefore, setBestBefore] = useState(0)
  // 判定与计分用 ref，避免 setTimeout 闭包拿到旧 state
  const pickedRef = useRef(false)
  const correctRef = useRef(0)
  const memorizeEndAt = useRef(0)
  const answerEndAt = useRef(0)

  const buildRounds = (): Round[] => {
    const result: Round[] = []
    const used = new Set<string>()
    for (let r = 0; r < ROUNDS; r++) {
      let pool = MEMORY_ITEMS.filter((i) => !used.has(i.name))
      if (pool.length < ITEM_COUNT + 4) {
        used.clear()
        pool = MEMORY_ITEMS
      }
      const picked = pickSome(pool, ITEM_COUNT + cfg.optionCount)
      const shown = picked.slice(0, ITEM_COUNT)
      const rest = picked.slice(ITEM_COUNT)
      const missing = rest[0]
      const distractors = shuffle(MEMORY_ITEMS.filter((i) =>
        !shown.some((s) => s.name === i.name) && i.name !== missing.name
      )).slice(0, cfg.optionCount - 1)
      const options = shuffle([missing, ...distractors])
      shown.forEach((s) => used.add(s.name))
      result.push({ shown, missing, options })
    }
    return result
  }

  const startGame = () => {
    setBestBefore(bestScoreOf(useUserStore.getState().history, 'item-memory'))
    pickedRef.current = false
    correctRef.current = 0
    setRounds(buildRounds())
    setRoundIndex(0)
    setScore(0)
    setPickedName('')
    setLeft(cfg.answerSec)
    setResults([])
    setStartTime(Date.now())
    setStage('memorize')
  }

  // 记忆倒计时结束：按真实时间判定，切后台也不会失真
  useEffect(() => {
    if (stage !== 'memorize' || rounds.length === 0) return
    memorizeEndAt.current = Date.now() + cfg.memorizeSec * 1000
    const timer = setInterval(() => {
      if (Date.now() >= memorizeEndAt.current) {
        clearInterval(timer)
        setStage('answer')
        setLeft(cfg.answerSec)
        answerEndAt.current = Date.now() + cfg.answerSec * 1000
      }
    }, 300)
    return () => clearInterval(timer)
  }, [stage, roundIndex, rounds, cfg.memorizeSec, cfg.answerSec])

  // 作答倒计时
  useEffect(() => {
    if (stage !== 'answer') return
    const timer = setInterval(() => {
      const remain = Math.max(0, Math.round((answerEndAt.current - Date.now()) / 1000))
      setLeft(remain)
    }, 300)
    return () => clearInterval(timer)
  }, [stage])

  // 作答超时 → 本题记为未命中
  useEffect(() => {
    if (stage === 'answer' && left === 0) judge(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, left])

  // name 为 null 表示超时未作答
  const judge = (name: string | null) => {
    if (pickedRef.current) return
    pickedRef.current = true
    const round = rounds[roundIndex]
    const right = name !== null && name === round.missing.name
    feedback(right ? 'right' : 'wrong')
    setPickedName(name || '__timeout__')
    if (right) {
      correctRef.current += 1
      setScore(correctRef.current * 100)
    }
    setResults((prev) => {
      const next = [...prev]
      next[roundIndex] = right ? 'right' : 'wrong'
      return next
    })
    const isLast = roundIndex + 1 >= ROUNDS
    setTimeout(() => {
      if (isLast) {
        finish(correctRef.current)
      } else {
        setRoundIndex(roundIndex + 1)
        setPickedName('')
        pickedRef.current = false
        setStage('memorize')
      }
    }, 900)
  }

  const finish = (finalCorrect: number) => {
    const finalScore = Math.round((finalCorrect / ROUNDS) * 100)
    const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setScore(finalScore)
    feedback('finish')
    const before = new Set(store.achievements)
    store.addRecord({
      gameId: 'item-memory',
      gameName: meta.name,
      dimension: 'memory',
      score: finalScore,
      accuracy: finalScore,
      durationSec,
      difficulty,
      detail: `共 ${ROUNDS} 轮，命中 ${finalCorrect}/${ROUNDS} 轮`
    })
    const unlocked = useUserStore.getState().achievements.filter((a) => !before.has(a))
    if (unlocked.length) {
      setTimeout(() => showAchievementToasts(unlocked), 600)
    }
    setStage('result')
  }

  const currentRound = rounds[roundIndex]
  const stageLabel = {
    intro: '准备',
    memorize: `第 ${roundIndex + 1}/${ROUNDS} 轮 · 记忆`,
    answer: `第 ${roundIndex + 1}/${ROUNDS} 轮 · 作答`,
    result: '结算'
  }

  const roundDots = (
    <View className={styles.roundRow}>
      {Array.from({ length: ROUNDS }).map((_, i) => (
        <View
          key={i}
          className={[
            styles.dot,
            i === roundIndex ? styles.dotCurrent : '',
            results[i] === 'right' ? styles.dotRight : results[i] === 'wrong' ? styles.dotWrong : ''
          ].join(' ')}
        />
      ))}
    </View>
  )

  const liveBest = bestScoreOf(store.history, 'item-memory')
  const liveCount = trainCountOf(store.history, 'item-memory')

  return (
    <GameShell title={meta.name} stage={stageLabel[stage]} requireConfirm={stage !== 'intro' && stage !== 'result'}>
      {stage === 'intro' && (
        <View className={styles.intro}>
          <Text className={styles.introIcon}>⏱️</Text>
          <Text className={styles.introTitle}>八秒物品记忆</Text>
          <Text className={styles.introText}>
            在 {cfg.memorizeSec} 秒内，记住画面中的十二件物品。{"\n"}
            其中一件会消失，在 {cfg.answerSec} 秒内说出少了什么。{"\n"}
            看见不等于记住，共 {ROUNDS} 轮。
          </Text>
          <Text className={styles.recordLine}>
            {liveCount > 0 ? `历史最佳 ${liveBest} 分 · 已训练 ${liveCount} 次` : '首次挑战，记录从这一次开始'}
          </Text>
          <View className={styles.startBtn} onClick={startGame}>
            <Text className={styles.startBtnText}>开始训练</Text>
          </View>
        </View>
      )}

      {stage === 'memorize' && currentRound && (
        <View className={styles.memorizeArea}>
          {roundDots}
          <CountdownRing total={cfg.memorizeSec} running />
          <View className={styles.itemGrid}>
            {currentRound.shown.map((item, i) => (
              <View key={`${item.name}-${i}`} className={styles.itemCell}>
                <Text className={styles.itemIcon}>{item.icon}</Text>
                <Text className={styles.itemName}>{item.name}</Text>
              </View>
            ))}
          </View>
          <Text className={styles.memorizeTip}>全力记住这十二件物品</Text>
        </View>
      )}

      {stage === 'answer' && currentRound && (
        <View className={styles.answerArea}>
          {roundDots}
          <View className={styles.answerBar}>
            <Text className={styles.answerTip}>其中一件消失了，少了什么？</Text>
            <View className={styles.timerChip}>
              <Text className={styles.timerNum}>{left}</Text>
              <Text className={styles.timerUnit}>s</Text>
            </View>
          </View>
          <View className={styles.itemGrid}>
            {currentRound.shown
              .filter((i) => i.name !== currentRound.missing.name)
              .map((item, i) => (
                <View key={`${item.name}-${i}`} className={styles.itemCellDim}>
                  <Text className={styles.itemIcon}>{item.icon}</Text>
                  <Text className={styles.itemName}>{item.name}</Text>
                </View>
              ))}
            <View className={styles.ghostCell}>
              <Text className={styles.ghostText}>?</Text>
            </View>
          </View>
          <View className={styles.optionList}>
            {currentRound.options.map((opt) => {
              const isMissing = opt.name === currentRound.missing.name
              const isPicked = pickedName === opt.name
              // 选中后：答对绿色高亮；答错红色高亮并揭示正确项
              const cls = isPicked
                ? isMissing
                  ? styles.optionBtnRight
                  : styles.optionBtnWrong
                : pickedName && isMissing
                  ? styles.optionBtnRight
                  : styles.optionBtn
              return (
                <View key={opt.name} className={cls} onClick={() => judge(opt.name)}>
                  <Text className={styles.optionIcon}>{opt.icon}</Text>
                  <Text className={styles.optionName}>{opt.name}</Text>
                  {isPicked && !isMissing ? <Text className={styles.optionMark}>✕</Text> : null}
                  {isMissing && pickedName ? <Text className={styles.optionMarkRight}>✓</Text> : null}
                </View>
              )
            })}
          </View>
        </View>
      )}

      <ResultOverlay
        visible={stage === 'result'}
        score={score}
        accuracy={score}
        durationSec={Math.max(1, Math.round((Date.now() - startTime) / 1000))}
        exp={expGain(score, difficulty)}
        best={bestBefore}
        detail={`${DIFFICULTY_LABEL[difficulty]} · 共 ${ROUNDS} 轮，命中 ${correctRef.current} 轮`}
        onRetry={startGame}
        onHome={() => Taro.reLaunch({ url: '/pages/home/index' })}
      />
    </GameShell>
  )
}

export default ItemMemoryPage
