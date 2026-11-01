import React, { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import BarStat from '@/components/BarStat'
import PageHeader from '@/components/PageHeader'
import { summarizeHistory } from '@/utils/score'
import { ACHIEVEMENTS } from '@/data/achievements'
import styles from './index.module.scss'

const StatsPage: React.FC = () => {
  const store = useUserStore()
  const [showAllRecords, setShowAllRecords] = useState(false)
  const { total, avgScore, best, totalMin } = summarizeHistory(store.history)
  const dims = [
    { label: '记忆', value: store.scores.memory, color: '#f5d76e' },
    { label: '专注', value: store.scores.focus, color: '#d4af37' },
    { label: '观察', value: store.scores.observation, color: '#c9a227' },
    { label: '反应', value: store.scores.reaction, color: '#a9831f' }
  ]

  // 最近 7 天训练次数
  const days: { label: string; count: number }[] = []
  const weekMap: Record<string, number> = {}
  store.history.forEach((r) => {
    const d = r.date.slice(0, 10)
    weekMap[d] = (weekMap[d] || 0) + 1
  })
  const weekLabels = ['日', '一', '二', '三', '四', '五', '六']
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({ label: weekLabels[d.getDay()], count: weekMap[key] || 0 })
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count))

  const unlockedCount = store.achievements.length

  return (
    <View className={styles.container}>
      <PageHeader title="修炼数据" />

      {/* 总览 */}
      <View className={styles.overviewCard}>
        <View className={styles.overviewItem}>
          <Text className={styles.overviewNum}>{total}</Text>
          <Text className={styles.overviewLabel}>训练次数</Text>
        </View>
        <View className={styles.overviewItem}>
          <Text className={styles.overviewNum}>{avgScore}</Text>
          <Text className={styles.overviewLabel}>平均分</Text>
        </View>
        <View className={styles.overviewItem}>
          <Text className={styles.overviewNum}>{best}</Text>
          <Text className={styles.overviewLabel}>最高分</Text>
        </View>
        <View className={styles.overviewItem}>
          <Text className={styles.overviewNum}>{totalMin}</Text>
          <Text className={styles.overviewLabel}>训练分钟</Text>
        </View>
      </View>

      {/* 四维能力 */}
      <View className={styles.card}>
        <Text className={styles.cardTitle}>四维能力</Text>
        <View className={styles.barList}>
          {dims.map((d) => (
            <BarStat key={d.label} label={d.label} value={d.value} color={d.color} />
          ))}
        </View>
        <Text className={styles.cardHint}>每次训练后按表现指数更新，难度越高成长越快</Text>
      </View>

      {/* 近7天趋势 */}
      <View className={styles.card}>
        <Text className={styles.cardTitle}>近 7 日修炼</Text>
        <View className={styles.chart}>
          {days.map((d, i) => (
            <View key={i} className={styles.chartCol}>
              <View className={styles.chartBarWrap}>
                <View
                  className={d.count > 0 ? styles.chartBar : styles.chartBarEmpty}
                  style={{ height: `${Math.round((d.count / maxCount) * 100)}%` }}
                />
              </View>
              <Text className={styles.chartLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 成就概览 */}
      <View className={styles.card} onClick={() => Taro.navigateTo({ url: '/pages/mine/achievements/index' })}>
        <View className={styles.achHeader}>
          <Text className={styles.cardTitle}>成就殿堂</Text>
          <Text className={styles.achCount}>{unlockedCount}/{ACHIEVEMENTS.length} ›</Text>
        </View>
        <View className={styles.achIcons}>
          {ACHIEVEMENTS.slice(0, 5).map((a) => {
            const got = store.achievements.includes(a.id)
            return (
              <View key={a.id} className={got ? styles.achIconGot : styles.achIcon}>
                <Text className={styles.achIconText}>{a.icon}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* 最近记录 */}
      <View className={styles.card}>
        <Text className={styles.cardTitle}>最近记录</Text>
        {store.history.length === 0 ? (
          <View className={styles.emptyBox}>
            <Text className={styles.emptyIcon}>📊</Text>
            <Text className={styles.emptyText}>还没有训练记录{"\n"}快去修炼场开始第一次训练吧</Text>
          </View>
        ) : (
          <View className={styles.recordList}>
            {(showAllRecords ? store.history : store.history.slice(0, 8)).map((r) => (
              <View key={r.id} className={styles.recordItem}>
                <Text className={styles.recordName}>{r.gameName}</Text>
                <Text className={styles.recordDetail}>{r.detail}</Text>
                <Text className={styles.recordScore}>{r.score} 分</Text>
              </View>
            ))}
          </View>
        )}
        {store.history.length > 8 ? (
          <Text className={styles.recordMore} onClick={() => setShowAllRecords((v) => !v)}>
            {showAllRecords ? '收起 ▲' : `展开全部 ${store.history.length} 条 ▼`}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

export default StatsPage
