import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { GAMES } from '@/data/games'
import { generateDailyPlan } from '@/data/plan'
import { brainScoreTotal, EXP_PER_LEVEL } from '@/utils/score'
import styles from './index.module.scss'

const HomePage: React.FC = () => {
  const store = useUserStore()
  const total = brainScoreTotal(store.scores)
  const plan = generateDailyPlan(store.scores)
  const expInLevel = store.profile.exp % EXP_PER_LEVEL
  const expPct = Math.round((expInLevel / EXP_PER_LEVEL) * 100)

  const go = (url: string) => Taro.navigateTo({ url })

  return (
    <View className={styles.container}>
      {/* 顶部用户卡片 */}
      <View className={styles.hero}>
        <View className={styles.heroTop}>
          <View className={styles.avatarWrap}>
            <Text className={styles.avatar}>{store.profile.avatar}</Text>
          </View>
          <View className={styles.heroInfo}>
            <Text className={styles.nickname}>{store.profile.nickname}</Text>
            <Text className={styles.levelText}>
              Lv.{store.profile.level} {store.profile.title}
            </Text>
          </View>
          <View className={styles.streakBadge}>
            <Text className={styles.streakNum}>{store.streakDays}</Text>
            <Text className={styles.streakLabel}>连续打卡</Text>
          </View>
        </View>
        <View className={styles.expRow}>
          <View className={styles.expTrack}>
            <View className={styles.expFill} style={{ width: `${expPct}%` }} />
          </View>
          <Text className={styles.expText}>{expInLevel}/{EXP_PER_LEVEL}</Text>
        </View>
      </View>

      {/* 总脑力值 */}
      <View className={styles.brainCard}>
        <View className={styles.brainLeft}>
          <Text className={styles.brainLabel}>综合脑力值</Text>
          <View className={styles.brainNumRow}>
            <Text className={styles.brainNum}>{total}</Text>
            <Text className={styles.brainUnit}>分</Text>
          </View>
          <Text className={styles.brainHint}>坚持训练，四维能力将持续增长</Text>
        </View>
        <View className={styles.brainRight}>
          {(
            [
              ['记忆', store.scores.memory, '#f5d76e'],
              ['专注', store.scores.focus, '#d4af37'],
              ['观察', store.scores.observation, '#c9a227'],
              ['反应', store.scores.reaction, '#a9831f']
            ] as const
          ).map(([name, val, color]) => (
            <View key={name} className={styles.miniRow}>
              <Text className={styles.miniName}>{name}</Text>
              <View className={styles.miniTrack}>
                <View
                  className={styles.miniFill}
                  style={{ width: `${val}%`, background: color }}
                />
              </View>
              <Text className={styles.miniVal}>{val}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 今日训练计划 */}
      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>今日修炼计划</Text>
          <Text className={styles.sectionExtra}>
            {store.todayDone.length}/{store.settings.dailyGoal} 已完成
          </Text>
        </View>
        <View className={styles.planCard}>
          {plan.map((item) => {
            const done = store.todayDone.includes(item.gameId)
            return (
              <View
                key={item.gameId}
                className={styles.planItem}
                onClick={() => go(item.route)}
              >
                <View className={done ? styles.planIconDone : styles.planIcon}>
                  <Text className={styles.planIconText}>{done ? '✓' : item.icon}</Text>
                </View>
                <View className={styles.planInfo}>
                  <Text className={styles.planName}>{item.name}</Text>
                  <Text className={styles.planReason}>{item.reason}</Text>
                </View>
                <Text className={styles.planArrow}>›</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* 训练入口 */}
      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>修炼场</Text>
          <Text className={styles.sectionExtra} onClick={() => Taro.switchTab({ url: '/pages/train/index' })}>
            全部 ›
          </Text>
        </View>
        <View className={styles.gameGrid}>
          {GAMES.map((game) => (
            <View
              key={game.id}
              className={styles.gameCard}
              onClick={() => go(game.route)}
            >
              <Text className={styles.gameIcon}>{game.icon}</Text>
              <Text className={styles.gameName}>{game.name}</Text>
              <Text className={styles.gameDim}>{game.dimensionName}</Text>
            </View>
          ))}
          <View className={styles.gameCard} onClick={() => go('/pages/focus/index')}>
            <Text className={styles.gameIcon}>🍅</Text>
            <Text className={styles.gameName}>番茄专注钟</Text>
            <Text className={styles.gameDim}>静心凝神</Text>
          </View>
        </View>
      </View>

      {/* 底部语录 */}
      <View className={styles.footer}>
        <Text className={styles.footerText}>专注不是天生的，是练出来的</Text>
      </View>
    </View>
  )
}

export default HomePage
