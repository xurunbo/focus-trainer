import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { gradeFromScore } from '@/utils/score'
import styles from './index.module.scss'

interface ResultOverlayProps {
  visible: boolean
  score: number
  accuracy: number
  durationSec: number
  exp: number
  detail: string
  onRetry: () => void
  onHome: () => void
}

// 训练结算浮层
const ResultOverlay: React.FC<ResultOverlayProps> = ({
  visible, score, accuracy, durationSec, exp, detail, onRetry, onHome
}) => {
  if (!visible) return null
  const grade = gradeFromScore(score)

  return (
    <View className={styles.mask}>
      <View className={styles.panel}>
        <View className={styles.decoTop} />
        <Text className={styles.finish}>训练完成</Text>
        <Text className={styles.grade} style={{ color: grade.color }}>{grade.label}</Text>
        <View className={styles.scoreBox}>
          <Text className={styles.scoreNum}>{score}</Text>
          <Text className={styles.scoreUnit}>分</Text>
        </View>
        <View className={styles.statRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{accuracy}%</Text>
            <Text className={styles.statLabel}>正确率</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{durationSec}s</Text>
            <Text className={styles.statLabel}>用时</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>+{exp}</Text>
            <Text className={styles.statLabel}>经验</Text>
          </View>
        </View>
        {detail ? <Text className={styles.detail}>{detail}</Text> : null}
        <View className={styles.btnRow}>
          <View className={styles.btnSecondary} onClick={onHome}>
            <Text className={styles.btnSecondaryText}>返回首页</Text>
          </View>
          <View className={styles.btnPrimary} onClick={onRetry}>
            <Text className={styles.btnPrimaryText}>再来一次</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default ResultOverlay
