import React, { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface CountdownRingProps {
  total: number
  running: boolean
  onComplete?: () => void
  size?: number
  label?: string
}

// 圆形倒计时组件（纯 View 双半圆环实现，兼容小程序渲染）
const CountdownRing: React.FC<CountdownRingProps> = ({
  total,
  running,
  onComplete,
  size = 120,
  label
}) => {
  const [remain, setRemain] = useState(total)
  const progress = total > 0 ? remain / total : 0
  // 进度角度：右半圆负责 0~180°，左半圆负责 180°~360°
  const deg = progress * 360
  const rightDeg = Math.min(deg, 180)
  const leftDeg = Math.max(0, deg - 180)

  useEffect(() => {
    setRemain(total)
  }, [total])

  useEffect(() => {
    if (!running) return
    if (remain <= 0) {
      onComplete?.()
      return
    }
    const timer = setTimeout(() => setRemain((r) => r - 1), 1000)
    return () => clearTimeout(timer)
  }, [running, remain, onComplete])

  const urgent = remain <= 3

  return (
    <View className={styles.wrap} style={{ width: `${size}rpx`, height: `${size}rpx` }}>
      {/* 轨道整环 */}
      <View className={styles.track} />
      {/* 右半圆进度弧 */}
      <View className={styles.maskRight}>
        <View
          className={[styles.arc, urgent ? styles.arcRightUrgent : styles.arcRight].join(' ')}
          style={{ transform: `rotate(${rightDeg}deg)` }}
        />
      </View>
      {/* 左半圆进度弧 */}
      <View className={styles.maskLeft}>
        <View
          className={[styles.arc, urgent ? styles.arcLeftUrgent : styles.arcLeft].join(' ')}
          style={{ transform: `rotate(${leftDeg}deg)` }}
        />
      </View>
      <View className={styles.center}>
        <Text className={urgent ? styles.numUrgent : styles.num}>{remain}</Text>
        {label ? <Text className={styles.label}>{label}</Text> : null}
      </View>
    </View>
  )
}

export default CountdownRing
