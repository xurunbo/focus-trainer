import React from 'react'
import { View, Text } from '@tarojs/components'
import { usePlatformStats } from '@/hooks/usePlatformStats'
import { PLATFORM_STATS_ENABLED } from '@/config/platform'
import styles from './index.module.scss'

/**
 * 首页实时人气条：当前在线 / 今日活跃 / 累计使用
 * 数据未配置或未加载完成时自动隐藏，不影响页面布局。
 */
const PlatformStrip: React.FC = () => {
  const summary = usePlatformStats()
  if (!PLATFORM_STATS_ENABLED || !summary) return null

  return (
    <View className={styles.strip}>
      <View className={styles.item}>
        <View className={styles.dot} />
        <Text className={styles.num}>{summary.online}</Text>
        <Text className={styles.label}>当前在线</Text>
      </View>
      <View className={styles.divider} />
      <View className={styles.item}>
        <Text className={styles.num}>{summary.today}</Text>
        <Text className={styles.label}>今日活跃</Text>
      </View>
      <View className={styles.divider} />
      <View className={styles.item}>
        <Text className={styles.num}>{summary.total}</Text>
        <Text className={styles.label}>累计使用</Text>
      </View>
    </View>
  )
}

export default PlatformStrip
