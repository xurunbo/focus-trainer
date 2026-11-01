import React, { useEffect, useState } from 'react'
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

interface Question {
  num: number
  appeared: boolean
}

const LEVEL_CONFIG: Record<Difficulty, { memorizeSec: number; rounds: number }> = {
  easy: { memorizeSec: 6, rounds: 4 },
  medium: { memorizeSec: 5, rounds: 6 },
  hard: { memorizeSec: 4, rounds: 8 }
}

type Stage = 'intro' | 'memorize' | 'question' | 'result'

const NumberMatrixPage: React.FC = () => {
  const store = useUserStore()
  const router = Taro.getCurrentInstance().router?.params || {}
  const difficulty = (router.difficulty as Difficulty) || 'easy'
  const cfg = LEVEL_CONFIG[difficulty]
  const meta = getGameMeta('number-matrix')!

  const [stage, setStage] = useState<Stage>('intro')
  const [grid, setGrid] = useState<number[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [lastAnswer, setLastAnswer] = useState<'none' | 'right' | 'wrong'>('none')
  const [flashBtn, setFlashBtn] = useState<'' | 'yes' | 'no'>('')
  const [score, setScore] = useState(0)
  const [startTime, setStartTime] = useState(0)

  const startGame = () => {
    const nums = new Set<number>()
    while (nums.size < 36) nums.add(randomInt(10, 98))
    const newGrid = Array.from(nums)
    const gridSet = new Set(newGrid)
    // 生成题目：一半出现过，一半未出现过
    const qs: Question[] = []
    const appearedNums = shuffle(newGrid).slice(0, cfg.rounds)
    appearedNums.forEach((n) => qs.push({ num: n, appeared: true }))
    let fakeCount = 0
    while (fakeCount < cfg.rounds) {
      const n = randomInt(10, 98)
      if (!gridSet.has(n) && !qs.some((q) => q.num === n)) {
        qs.push({ num: n, appeared: false })
        fakeCount++
      }
    }
    setGrid(newGrid)
    setQuestions(shuffle(qs))
    setQIndex(0)
    setCorrectCount(0)
    setScore(0)
    setLastAnswer('none')
    setStartTime(Date.now())
    setStage('memorize')
  }

  const answer = (sayAppeared: boolean) => {
    if (flashBtn) return
    const q = questions[qIndex]
    const right = sayAppeared === q.appeared
    feedback(right ? 'right' : 'wrong')
    const nextCorrect = right ? correctCount + 1 : correctCount
    setCorrectCount(nextCorrect)
    setLastAnswer(right ? 'right' : 'wrong')
    setFlashBtn(sayAppeared ? 'yes' : 'no')
    setTimeout(() => {
      setLastAnswer('none')
      setFlashBtn('')
      if (qIndex + 1 >= questions.length) {
        finish(nextCorrect)
      } else {
        setQIndex(qIndex + 1)
      }
    }, 450)
  }

  const finish = (finalCorrect: number) => {
    const finalScore = Math.round((finalCorrect / questions.length) * 100)
    const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setScore(finalScore)
    feedback('finish')
    const before = new Set(store.achievements)
    store.addRecord({
      gameId: 'number-matrix',
      gameName: meta.name,
      dimension: 'memory',
      score: finalScore,
      accuracy: finalScore,
      durationSec,
      difficulty,
      detail: `答对 ${finalCorrect}/${questions.length} 题`
    })
    const unlocked = useUserStore.getState().achievements.filter((a) => !before.has(a))
    if (unlocked.length) {
      setTimeout(() => showAchievementToasts(unlocked), 600)
    }
    setStage('result')
  }

  const stageLabel = {
    intro: '准备',
    memorize: '记忆',
    question: `第 ${qIndex + 1} 题`,
    result: '结算'
  }

  const currentQ = questions[qIndex]

  return (
    <GameShell title={meta.name} stage={stageLabel[stage]} requireConfirm={stage !== 'intro' && stage !== 'result'}>
      {stage === 'intro' && (
        <View className={styles.intro}>
          <Text className={styles.introIcon}>🔢</Text>
          <Text className={styles.introTitle}>数字记忆矩阵</Text>
          <Text className={styles.introText}>
            下面有三十六个数字，请在 {cfg.memorizeSec} 秒内记住它们。{"\n"}
            随后系统会给出数字，你要确认它真的出现过吗。
          </Text>
          <View className={styles.startBtn} onClick={startGame}>
            <Text className={styles.startBtnText}>开始训练</Text>
          </View>
        </View>
      )}

      {stage === 'memorize' && (
        <View className={styles.memorizeArea}>
          <CountdownRing total={cfg.memorizeSec} running onComplete={() => setStage('question')} />
          <View className={styles.grid}>
            {grid.map((n, i) => (
              <View key={i} className={styles.cell}>
                <Text className={styles.cellText}>{n}</Text>
              </View>
            ))}
          </View>
          <Text className={styles.memorizeTip}>全力记住这些数字</Text>
        </View>
      )}

      {stage === 'question' && currentQ && (
        <View className={styles.questionArea}>
          <Text className={styles.questionTip}>这个数字出现过吗？</Text>
          <View className={styles.numberBox}>
            <Text className={styles.numberText}>{currentQ.num}</Text>
          </View>
          <View className={styles.progressDots}>
            {questions.map((_, i) => (
              <View
                key={i}
                className={
                  i < qIndex
                    ? lastAnswer === 'wrong' && i === qIndex - 1
                      ? styles.dotWrong
                      : styles.dotRight
                    : i === qIndex
                      ? styles.dotCurrent
                      : styles.dot
                }
              />
            ))}
          </View>
          <View className={styles.btnRow}>
            <View
              className={
                flashBtn === 'no'
                  ? lastAnswer === 'right'
                    ? styles.btnNoRight
                    : styles.btnNoWrong
                  : styles.btnNo
              }
              onClick={() => answer(false)}
            >
              <Text className={styles.btnNoText}>没出现过</Text>
            </View>
            <View
              className={
                flashBtn === 'yes'
                  ? lastAnswer === 'right'
                    ? styles.btnYesRight
                    : styles.btnYesWrong
                  : styles.btnYes
              }
              onClick={() => answer(true)}
            >
              <Text className={styles.btnYesText}>出现过</Text>
            </View>
          </View>
        </View>
      )}

      <ResultOverlay
        visible={stage === 'result'}
        score={score}
        accuracy={score}
        durationSec={Math.max(1, Math.round((Date.now() - startTime) / 1000))}
        exp={expGain(score, difficulty)}
        detail={`${DIFFICULTY_LABEL[difficulty]} · 答对 ${correctCount}/${questions.length} 题`}
        onRetry={startGame}
        onHome={() => Taro.reLaunch({ url: '/pages/home/index' })}
      />
    </GameShell>
  )
}

export default NumberMatrixPage
