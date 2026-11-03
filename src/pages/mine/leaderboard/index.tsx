import React from 'react'
import { View, Text } from '@tarojs/components'
import { useUserStore } from '@/store/user'
import NavBar from '@/components/NavBar'
import { GAMES } from '@/data/games'
import { brainScoreTotal, bestScoreOf, trainCountOf } from '@/utils/score'
import styles from './index.module.scss'

// 段位：按四维脑力值总分划分，给用户明确的成长台阶
const TIERS = [
  { min: 90, name: '一代宗师', next: 100 },
  { min: 80, name: '洞察者', next: 90 },
  { min: 70, name: '心流行者', next: 80 },
  { min: 60, name: '专注学徒', next: 70 },
  { min: 0, name: '见习弟子', next: 60 }
]

const LeaderboardPage: React.FC = () => {
  const store = useUserStore()
  const myScore = brainScoreTotal(store.scores)
  const tier = TIERS.find((t) => myScore >= t.min) || TIERS[TIERS.length - 1]
  const gap = Math.max(0, tier.next - myScore)

  // 个人最佳榜：按五个训练项目的历史最好成绩排序（真实数据，不做虚构对手）
  const rows = GAMES.map((g) => ({
    name: g.name,
    icon: g.icon,
    score: bestScoreOf(store.history, g.id),
    count: trainCountOf(store.history, g.id)
  })).sort((a, b) => b.score - a.score)
  const trainedCount = rows.filter((r) => r.count > 0).length

  return (
    <View className={styles.container}>
      <NavBar title="成长榜" />
      {/* 我的段位 */}
      <View className={styles.myCard}>
        <Text className={styles.myLabel}>我的脑力值</Text>
        <Text className={styles.myScore}>{myScore}</Text>
        <View className={styles.myRankBadge}>
          <Text className={styles.myRankText}>{tier.name}</Text>
        </View>
        <Text className={styles.myHint}>
          {gap > 0 ? `再提升 ${gap} 分晋级下一段位` : '已达最高段位，保持状态'}
          {' · '}
          已解锁 {trainedCount}/{GAMES.length} 个项目
        </Text>
      </View>

      {/* 个人最佳榜 */}
      <View className={styles.list}>
        {rows.map((item, i) => (
          <View key={item.name} className={i === 0 && item.score > 0 ? styles.rowMe : styles.row}>
            <Text className={item.score > 0 ? styles.rankTop : styles.rank}>{i + 1}</Text>
            <Text className={styles.avatar}>{item.icon}</Text>
            <Text className={i === 0 && item.score > 0 ? styles.nicknameMe : styles.nickname}>
              {item.name}
            </Text>
            <Text className={styles.score}>{item.count > 0 ? item.score : '未挑战'}</Text>
          </View>
        ))}
      </View>

      <Text className={styles.footerTip}>榜单来自你的真实训练记录，全部保存在本机</Text>
    </View>
  )
}

export default LeaderboardPage
