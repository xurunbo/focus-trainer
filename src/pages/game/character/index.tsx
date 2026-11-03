import React, { useEffect, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore, showAchievementToasts } from '@/store/user'
import GameShell from '@/components/GameShell'
import CountdownRing from '@/components/CountdownRing'
import ResultOverlay from '@/components/ResultOverlay'
import StyledView from '@/components/StyledView'
import { getGameMeta } from '@/data/games'
import { CHAR_GROUPS, CHAR_GRID_SPEC } from '@/data/characters'
import { expGain, DIFFICULTY_LABEL, bestScoreOf, trainCountOf } from '@/utils/score'
import { feedback } from '@/utils/feedback'
import { randomInt, shuffle } from '@/utils/random'
import { rpxToPx } from '@/utils/style'
import type { Difficulty } from '@/types'
import styles from './index.module.scss'

const ROUNDS = 3

interface CharRound {
  target: string
  distractor: string
  tip: string
  targetIndex: number
  answerIndex: number
  total: number
}

type Stage = 'intro' | 'memorize' | 'answer' | 'result'

const CharacterPage: React.FC = () => {
  const store = useUserStore()
  const router = Taro.getCurrentInstance().router?.params || {}
  const difficulty = (router.difficulty as Difficulty) || 'easy'
  const spec = CHAR_GRID_SPEC[difficulty]
  const meta = getGameMeta('character')!

  const [stage, setStage] = useState<Stage>('intro')
  const [rounds, setRounds] = useState<CharRound[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [score, setScore] = useState(0)
  const [findLeft, setFindLeft] = useState(spec.findSec)
  const [picked, setPicked] = useState(-1)
  const [startTime, setStartTime] = useState(0)
  const [results, setResults] = useState<('right' | 'wrong' | null)[]>([])
  const [bestBefore, setBestBefore] = useState(0)
  // 计时与判定必须精确，统一用 ref：避免 setState 异步 / 定时器闭包拿到旧值
  const memorizeEndAt = useRef(0)
  const answerEndAt = useRef(0)
  const correctRef = useRef(0)
  const pickedRef = useRef(-1)

  const buildRounds = (): CharRound[] => {
    const total = spec.cols * spec.rows
    const groups = shuffle(CHAR_GROUPS).slice(0, ROUNDS)
    return groups.map((g) => {
      const targetIndex = randomInt(0, total - 1)
      // 答题阶段目标字换一个随机位置，避免与记忆位置重合变成"送分题"
      let answerIndex = randomInt(0, total - 1)
      if (answerIndex === targetIndex) answerIndex = (answerIndex + 1) % total
      return {
        target: g.target,
        distractor: g.distractor,
        tip: g.tip,
        targetIndex,
        answerIndex,
        total
      }
    })
  }

  const startGame = () => {
    setBestBefore(bestScoreOf(useUserStore.getState().history, 'character'))
    correctRef.current = 0
    pickedRef.current = -1
    setRounds(buildRounds())
    setRoundIndex(0)
    setCorrectCount(0)
    setScore(0)
    setPicked(-1)
    setFindLeft(spec.findSec)
    setResults([])
    setStartTime(Date.now())
    setStage('memorize')
  }

  // 记忆阶段：按真实时间判定结束，切后台被节流也不会提前/延后进入作答
  useEffect(() => {
    if (stage !== 'memorize') return
    memorizeEndAt.current = Date.now() + spec.memorizeSec * 1000
    const timer = setInterval(() => {
      if (Date.now() >= memorizeEndAt.current) {
        clearInterval(timer)
        setStage('answer')
        answerEndAt.current = Date.now() + spec.findSec * 1000
        setFindLeft(spec.findSec)
      }
    }, 300)
    return () => clearInterval(timer)
  }, [stage, roundIndex, spec.memorizeSec, spec.findSec])

  // 作答倒计时：同样按真实时间差计算
  useEffect(() => {
    if (stage !== 'answer') return
    const timer = setInterval(() => {
      const left = Math.max(0, Math.round((answerEndAt.current - Date.now()) / 1000))
      setFindLeft(left)
    }, 300)
    return () => clearInterval(timer)
  }, [stage])

  // 超时未作答 → 本题记为未命中
  useEffect(() => {
    if (stage === 'answer' && findLeft === 0) resolveRound(-1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, findLeft])

  const resolveRound = (pickedIndex: number) => {
    if (pickedRef.current !== -1) return // 已判过，避免超时与点击重复触发
    pickedRef.current = pickedIndex
    setPicked(pickedIndex)
    const round = rounds[roundIndex]
    const right = pickedIndex === round.answerIndex
    feedback(right ? 'right' : 'wrong')
    if (right) {
      correctRef.current += 1
      setCorrectCount(correctRef.current)
    }
    setResults((prev) => {
      const next = [...prev]
      next[roundIndex] = right ? 'right' : 'wrong'
      return next
    })
    const isLast = roundIndex + 1 >= ROUNDS
    setTimeout(() => {
      setPicked(-1)
      pickedRef.current = -1
      if (isLast) {
        finish(correctRef.current)
      } else {
        setRoundIndex(roundIndex + 1)
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
      gameId: 'character',
      gameName: meta.name,
      dimension: 'observation',
      score: finalScore,
      accuracy: finalScore,
      durationSec,
      difficulty,
      detail: `命中 ${finalCorrect}/${ROUNDS} 次`
    })
    const unlocked = useUserStore.getState().achievements.filter((a) => !before.has(a))
    if (unlocked.length) {
      setTimeout(() => showAchievementToasts(unlocked), 600)
    }
    setStage('result')
  }

  const tapCell = (i: number) => {
    if (stage !== 'answer' || pickedRef.current !== -1) return
    resolveRound(i)
  }

  const currentRound = rounds[roundIndex]
  const stageLabel = {
    intro: '准备',
    memorize: `第 ${roundIndex + 1}/${ROUNDS} 轮 · 记位置`,
    answer: `第 ${roundIndex + 1}/${ROUNDS} 轮 · 找目标`,
    result: '结算'
  }

  // 答错时把正确位置也标出来，让用户"知道自己错在哪"，学习闭环更完整
  const revealCorrect = stage === 'answer' && picked >= 0 && picked !== currentRound?.answerIndex

  const renderGrid = (showMark: boolean) => {
    if (!currentRound) return null
    const gap = 8
    // calc() 内的 rpx 浏览器无法解析，换算成 px
    const cellW = `calc((100% - ${rpxToPx((spec.cols - 1) * gap)}) / ${spec.cols})`
    const cells = []
    for (let i = 0; i < currentRound.total; i++) {
      // 记忆阶段：目标字位于 targetIndex（金环标记）；答题阶段：目标字换到 answerIndex
      const isTarget = showMark ? i === currentRound.targetIndex : i === currentRound.answerIndex
      const isPicked = picked === i
      const isReveal = revealCorrect && isTarget
      cells.push(
        <StyledView
          key={i}
          className={[
            styles.cell,
            showMark && isTarget ? styles.cellMarked : '',
            isReveal ? styles.cellReveal : '',
            isPicked ? (isTarget ? styles.cellRight : styles.cellWrong) : ''
          ].join(' ')}
          css={{ width: cellW }}
          onClick={() => tapCell(i)}
        >
          <Text className={styles.cellText}>
            {isTarget ? currentRound.target : currentRound.distractor}
          </Text>
          {showMark && isTarget ? <View className={styles.markRing} /> : null}
          {isReveal ? <Text className={styles.revealTag}>✓</Text> : null}
          {isPicked && !isTarget ? <Text className={styles.pickedTag}>✕</Text> : null}
          {isPicked && isTarget ? <Text className={styles.pickedRightTag}>✓</Text> : null}
        </StyledView>
      )
    }
    return <View className={styles.grid}>{cells}</View>
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

  const liveBest = bestScoreOf(store.history, 'character')
  const liveCount = trainCountOf(store.history, 'character')

  return (
    <GameShell title={meta.name} stage={stageLabel[stage]} requireConfirm={stage !== 'intro' && stage !== 'result'}>
      {stage === 'intro' && (
        <View className={styles.intro}>
          <Text className={styles.introIcon}>🔍</Text>
          <Text className={styles.introTitle}>形近字辨识</Text>
          <Text className={styles.introText}>
            在满屏相似的汉字中，找出唯一不同的那个。{"\n"}
            先记住金环标记的目标字，{"\n"}
            它会在乱阵中换个位置，考考你能不能认出来。
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
          <CountdownRing total={spec.memorizeSec} running />
          <Text className={styles.tip}>记住金环中的目标字</Text>
          {renderGrid(true)}
        </View>
      )}

      {stage === 'answer' && currentRound && (
        <View className={styles.answerArea}>
          {roundDots}
          <View className={styles.answerBar}>
            <Text className={styles.answerTip}>
              找出唯一的「{currentRound.target}」
            </Text>
            <View className={styles.timerChip}>
              <Text className={styles.timerNum}>{findLeft}</Text>
              <Text className={styles.timerUnit}>s</Text>
            </View>
          </View>
          {renderGrid(false)}
        </View>
      )}

      <ResultOverlay
        visible={stage === 'result'}
        score={score}
        accuracy={score}
        durationSec={Math.max(1, Math.round((Date.now() - startTime) / 1000))}
        exp={expGain(score, difficulty)}
        best={bestBefore}
        detail={`${DIFFICULTY_LABEL[difficulty]} · 命中 ${correctRef.current}/${ROUNDS} 次目标`}
        onRetry={startGame}
        onHome={() => Taro.reLaunch({ url: '/pages/home/index' })}
      />
    </GameShell>
  )
}

export default CharacterPage
