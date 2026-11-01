import React from 'react'
import { View, Text } from '@tarojs/components'
import StyledView from '@/components/StyledView'
import { usePlatformStats } from '@/hooks/usePlatformStats'
import { PLATFORM_STATS_ENABLED } from '@/config/platform'
import styles from './index.module.scss'

/**
 * 「我的」页面平台数据卡：当前在线 / 今日活跃 / 累计使用 + 近 7 天活跃趋势。
 * 面向来访者与合作伙伴展示平台真实体量；未配置时自动隐藏。
 */
const PlatformCard: React.FC = () => {
  const summary = usePlatformStats()
  if (!PLATFORM_STATS_ENABLED || !summary) return null

  const days = summary.days.slice(-7)
  const max = Math.max(1, ...days.map((d) => d.count))

  return (
    <View className={styles.card}>
      <View className={styles.header}>
        <Text className={styles.title}>平台数据</Text>
        <View className={styles.liveBadge}>
          <View className={styles.dot} />
          <Text className={styles.liveText}>实时</Text>
        </View>
      </View>

      <View className={styles.statRow}>
        <View className={styles.statItem}>
          <Text className={styles.statNum}>{summary.online}</Text>
          <Text className={styles.statLabel}>当前在线</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statNum}>{summary.today}</Text>
          <Text className={styles.statLabel}>今日活跃</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statNum}>{summary.total}</Text>
          <Text className={styles.statLabel}>累计使用</Text>
        </View>
      </View>

      {days.length > 0 && (
        <View className={styles.trend}>
          <Text className={styles.trendTitle}>近 {days.length} 天活跃趋势</Text>
          <View className={styles.bars}>
            {days.map((d) => (
              <View key={d.day} className={styles.barCol}>
                <View className={styles.barTrack}>
                  <StyledView
                    className={styles.barFill}
                    css={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
                  />
                </View>
                <Text className={styles.barLabel}>{d.day.slice(5)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text className={styles.footNote}>数据为匿名设备统计，每 30 秒刷新</Text>
    </View>
  )
}

export default PlatformCard
