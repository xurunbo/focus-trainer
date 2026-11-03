import React, { useEffect, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import NavBar from '@/components/NavBar'
import ResultOverlay from '@/components/ResultOverlay'
import StyledView from '@/components/StyledView'
import { feedback } from '@/utils/feedback'
import { useTrainingBgm } from '@/utils/bgm'
import { getStatusBarTop } from '@/utils/safeArea'
import styles from './index.module.scss'

const DURATIONS = [15, 25, 45, 60]

const FocusPage: React.FC = () => {
  const store = useUserStore()
  const { musicOn, toggleMusic } = useTrainingBgm()
  const [minutes, setMinutes] = useState(25)
  const [totalSec, setTotalSec] = useState(25 * 60)
  const [remainSec, setRemainSec] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  // 结束时刻（毫秒）：按真实时间差计算剩余秒数，
  // 避免 App 切到后台被系统节流后计时变慢、专注时长失真
  const endAt = useRef(0)

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setRemainSec(left)
    }, 1000)
    return () => clearInterval(timer)
  }, [running])

  // 专注中保持屏幕常亮（微信小程序与部分浏览器支持，失败时静默忽略）
  useEffect(() => {
    try {
      Taro.setKeepScreenOn({ keepScreenOn: running })
    } catch {
      // ignore
    }
    return () => {
      try {
        Taro.setKeepScreenOn({ keepScreenOn: false })
      } catch {
        // ignore
      }
    }
  }, [running])

  // 完成检测
  useEffect(() => {
    if (running && remainSec === 0) {
      setRunning(false)
      setCompleted(true)
      store.completeFocus(minutes)
      feedback('finish')
      console.log('[Focus] session completed:', minutes, 'min')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, remainSec])

  const selectDuration = (m: number) => {
    if (running) return
    setMinutes(m)
    setTotalSec(m * 60)
    setRemainSec(m * 60)
    setCompleted(false)
    endAt.current = 0
  }

  const toggleRunning = () => {
    if (completed) {
      setCompleted(false)
      setRemainSec(totalSec)
      endAt.current = Date.now() + totalSec * 1000
      setRunning(true)
      return
    }
    setRunning((r) => {
      const next = !r
      endAt.current = next ? Date.now() + remainSec * 1000 : 0
      return next
    })
  }

  const reset = () => {
    setRunning(false)
    setCompleted(false)
    setRemainSec(totalSec)
    endAt.current = 0
  }

  const statusTop = getStatusBarTop()

  const mm = String(Math.floor(remainSec / 60)).padStart(2, '0')
  const ss = String(remainSec % 60).padStart(2, '0')
  const progress = totalSec > 0 ? remainSec / totalSec : 0
  // 双半圆环角度：右半圆 0~180°，左半圆 180°~360°
  const deg = progress * 360
  const rightDeg = Math.min(deg, 180)
  const leftDeg = Math.max(0, deg - 180)

  return (
    <View className={styles.container}>
      <NavBar title="番茄专注钟" />
      {/* 背景音乐开关（悬浮于导航栏右侧） */}
      <View
        className={styles.musicFab}
        style={statusTop ? { top: `${statusTop + 10}px` } : undefined}
        onClick={toggleMusic}
      >
        <Text className={styles.musicFabIcon}>{musicOn ? '🎵' : '🔇'}</Text>
      </View>
      <View className={styles.content}>
        {/* 计时器 */}
        <View className={styles.timerWrap}>
        {/* 轨道整环 */}
        <View className={styles.ringTrack} />
        {/* 右半圆进度弧 */}
        <View className={styles.maskRight}>
          <StyledView
            className={[styles.ringArc, styles.ringArcRight].join(' ')}
            css={{ transform: `rotate(${rightDeg}deg)` }}
          />
        </View>
        {/* 左半圆进度弧 */}
        <View className={styles.maskLeft}>
          <StyledView
            className={[styles.ringArc, styles.ringArcLeft].join(' ')}
            css={{ transform: `rotate(${leftDeg}deg)` }}
          />
        </View>
        <View className={styles.timerCenter}>
          {completed ? (
            <Text className={styles.doneText}>完成</Text>
          ) : (
            <Text className={styles.timeText}>{mm}:{ss}</Text>
          )}
          <Text className={styles.stateText}>
            {completed ? '本次专注已达成' : running ? '专注中…' : '准备就绪'}
          </Text>
        </View>
      </View>

      {/* 时长选择 */}
      <View className={styles.durRow}>
        {DURATIONS.map((d) => (
          <View
            key={d}
            className={!running && d === minutes ? styles.durItemActive : styles.durItem}
            onClick={() => selectDuration(d)}
          >
            <Text className={!running && d === minutes ? styles.durTextActive : styles.durText}>{d} 分钟</Text>
          </View>
        ))}
      </View>

      {/* 控制按钮 */}
      <View className={styles.btnRow}>
        <View className={styles.btnSecondary} onClick={reset}>
          <Text className={styles.btnSecondaryText}>重置</Text>
        </View>
        <View className={styles.btnPrimary} onClick={toggleRunning}>
          <Text className={styles.btnPrimaryText}>
            {completed ? '再次专注' : running ? '暂停' : '开始专注'}
          </Text>
        </View>
      </View>

      {/* 统计 */}
      <View className={styles.statsCard}>
        <View className={styles.statItem}>
          <Text className={styles.statNum}>{store.pomodoroCount}</Text>
          <Text className={styles.statLabel}>专注次数</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statNum}>{store.focusTotalMin}</Text>
          <Text className={styles.statLabel}>累计分钟</Text>
        </View>
      </View>

      <Text className={styles.tip}>
        专注不是天生的，是练出来的。{"\n"}放下手机，与自己相处一段时间。
      </Text>
      </View>

      {/* 完成结算 */}
      <ResultOverlay
        visible={completed}
        score={minutes}
        scoreUnit="分钟"
        gradeLabel="专注达成"
        accuracy={100}
        durationSec={minutes * 60}
        exp={minutes}
        detail={`第 ${store.pomodoroCount} 次专注 · 累计 ${store.focusTotalMin} 分钟`}
        onRetry={toggleRunning}
        onHome={() => Taro.navigateBack()}
      />
    </View>
  )
}

export default FocusPage
