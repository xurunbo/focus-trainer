import React, { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore, showAchievementToasts } from '@/store/user'
import GameShell from '@/components/GameShell'
import CountdownRing from '@/components/CountdownRing'
import ResultOverlay from '@/components/ResultOverlay'
import { getGameMeta } from '@/data/games'
import { MEMORY_ITEMS } from '@/data/items'
import { expGain, DIFFICULTY_LABEL } from '@/utils/score'
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

const LEVEL_CONFIG: Record<Difficulty, { memorizeSec: number; optionCount: number }> = {
  easy: { memorizeSec: 8, optionCount: 3 },
  medium: { memorizeSec: 7, optionCount: 4 },
  hard: { memorizeSec: 6, optionCount: 4 }
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
    setRounds(buildRounds())
    setRoundIndex(0)
    setScore(0)
    setPickedName('')
    setStartTime(Date.now())
    setStage('memorize')
  }

  const answer = (name: string) => {
    if (pickedName) return
    const round = rounds[roundIndex]
    const right = name === round.missing.name
    feedback(right ? 'right' : 'wrong')
    setPickedName(name)
    const newScore = right ? 100 : 0
    setScore((s) => s + newScore)
    const isLast = roundIndex + 1 >= ROUNDS
    setTimeout(() => {
      if (isLast) {
        finish(score + newScore)
      } else {
        setRoundIndex(roundIndex + 1)
        setPickedName('')
        setStage('memorize')
      }
    }, 900)
  }

  const finish = (totalScore: number) => {
    const finalScore = Math.round(totalScore / ROUNDS)
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
      detail: `共 ${ROUNDS} 轮物品记忆`
    })
    const unlocked = useUserStore.getState().achievements.filter((a) => !before.has(a))
    if (unlocked.length) {
      setTimeout(() => showAchievementToasts(unlocked), 600)
    }
    setStage('result')
  }

  // 记忆倒计时结束
  useEffect(() => {
    if (stage !== 'memorize' || rounds.length === 0) return
    const t = setTimeout(() => setStage('answer'), cfg.memorizeSec * 1000)
    return () => clearTimeout(t)
  }, [stage, roundIndex, rounds, cfg.memorizeSec])

  const currentRound = rounds[roundIndex]
  const stageLabel = {
    intro: '准备',
    memorize: `第 ${roundIndex + 1} 轮 · 记忆`,
    answer: `第 ${roundIndex + 1} 轮 · 作答`,
    result: '结算'
  }

  return (
    <GameShell title={meta.name} stage={stageLabel[stage]} requireConfirm={stage !== 'intro' && stage !== 'result'}>
      {stage === 'intro' && (
        <View className={styles.intro}>
          <Text className={styles.introIcon}>⏱️</Text>
          <Text className={styles.introTitle}>八秒物品记忆</Text>
          <Text className={styles.introText}>
            在 {cfg.memorizeSec} 秒内，记住画面中的十二件物品。{"\n"}
            其中一件会消失，说出少了什么。{"\n"}
            看见不等于记住，共 {ROUNDS} 轮。
          </Text>
          <View className={styles.startBtn} onClick={startGame}>
            <Text className={styles.startBtnText}>开始训练</Text>
          </View>
        </View>
      )}

      {stage === 'memorize' && currentRound && (
        <View className={styles.memorizeArea}>
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
          <Text className={styles.answerTip}>其中一件消失了，少了什么？</Text>
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
              const picked = pickedName === opt.name
              // 选中后：答对绿色高亮；答错红色高亮并揭示正确项
              const cls = picked
                ? isMissing
                  ? styles.optionBtnRight
                  : styles.optionBtnWrong
                : pickedName && isMissing
                  ? styles.optionBtnRight
                  : styles.optionBtn
              return (
                <View key={opt.name} className={cls} onClick={() => answer(opt.name)}>
                  <Text className={styles.optionIcon}>{opt.icon}</Text>
                  <Text className={styles.optionName}>{opt.name}</Text>
                  {picked && !isMissing ? <Text className={styles.optionMark}>✕</Text> : null}
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
        detail={`${DIFFICULTY_LABEL[difficulty]} · 共 ${ROUNDS} 轮，累计得分 ${score}`}
        onRetry={startGame}
        onHome={() => Taro.reLaunch({ url: '/pages/home/index' })}
      />
    </GameShell>
  )
}

export default ItemMemoryPage
