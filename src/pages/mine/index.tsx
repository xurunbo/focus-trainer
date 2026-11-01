import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import StyledView from '@/components/StyledView'
import { brainScoreTotal, EXP_PER_LEVEL, titleFromLevel } from '@/utils/score'
import { ACHIEVEMENTS } from '@/data/achievements'
import PageHeader from '@/components/PageHeader'
import PlatformCard from '@/components/PlatformCard'
import styles from './index.module.scss'

const MinePage: React.FC = () => {
  const store = useUserStore()
  const total = brainScoreTotal(store.scores)
  const expInLevel = store.profile.exp % EXP_PER_LEVEL

  const entries = [
    { icon: '🏆', name: '排行榜', desc: '看看别人的脑力值', url: '/pages/mine/leaderboard/index' },
    { icon: '🎖️', name: '成就殿堂', desc: `${store.achievements.length}/${ACHIEVEMENTS.length} 已解锁`, url: '/pages/mine/achievements/index' },
    { icon: '⚙️', name: '设置', desc: '音效、震动与音乐', url: '/pages/mine/settings/index' }
  ]

  return (
    <View className={styles.container}>
      <PageHeader title="我的" />

      {/* 用户信息 */}
      <View className={styles.profileCard}>
        <View className={styles.avatarWrap}>
          <Text className={styles.avatar}>{store.profile.avatar}</Text>
        </View>
        <Text className={styles.nickname}>{store.profile.nickname}</Text>
        <View className={styles.titleBadge}>
          <Text className={styles.titleText}>Lv.{store.profile.level} · {store.profile.title}</Text>
        </View>
        <View className={styles.expRow}>
          <View className={styles.expTrack}>
            <StyledView
              className={styles.expFill}
              css={{ width: `${Math.round((expInLevel / EXP_PER_LEVEL) * 100)}%` }}
            />
          </View>
          <Text className={styles.expText}>经验 {expInLevel}/{EXP_PER_LEVEL}</Text>
        </View>
      </View>

      {/* 数据概览 */}
      <View className={styles.statsRow}>
        <View className={styles.statItem}>
          <Text className={styles.statNum}>{total}</Text>
          <Text className={styles.statLabel}>脑力值</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statNum}>{store.totalTrainings}</Text>
          <Text className={styles.statLabel}>训练次数</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statNum}>{store.streakDays}</Text>
          <Text className={styles.statLabel}>连续天数</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statNum}>{store.pomodoroCount}</Text>
          <Text className={styles.statLabel}>专注次数</Text>
        </View>
      </View>

      {/* 平台数据：在线人数 / 今日活跃 / 累计使用（未配置时自动隐藏） */}
      <PlatformCard />

      {/* 功能入口 */}
      <View className={styles.menuCard}>
        {entries.map((e) => (
          <View key={e.name} className={styles.menuItem} onClick={() => Taro.navigateTo({ url: e.url })}>
            <Text className={styles.menuIcon}>{e.icon}</Text>
            <View className={styles.menuInfo}>
              <Text className={styles.menuName}>{e.name}</Text>
              <Text className={styles.menuDesc}>{e.desc}</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        ))}
      </View>

      {/* 关于 */}
      <View className={styles.about}>
        <Text className={styles.aboutTitle}>脑力修炼馆</Text>
        <Text className={styles.aboutText}>专注不是天生的，是练出来的</Text>
        <Text className={styles.aboutVer}>v1.0.0</Text>
      </View>
    </View>
  )
}

export default MinePage
