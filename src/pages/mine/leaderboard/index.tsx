import React from 'react'
import { View, Text } from '@tarojs/components'
import { useUserStore } from '@/store/user'
import { getLeaderboard } from '@/data/leaderboard'
import { brainScoreTotal } from '@/utils/score'
import styles from './index.module.scss'

const LeaderboardPage: React.FC = () => {
  const store = useUserStore()
  const myScore = brainScoreTotal(store.scores)
  const list = getLeaderboard(myScore)
  const myRank = list.find((i) => i.isMe)?.rank || 0

  return (
    <View className={styles.container}>
      {/* 我的排名 */}
      <View className={styles.myCard}>
        <Text className={styles.myLabel}>我的脑力值</Text>
        <Text className={styles.myScore}>{myScore}</Text>
        <View className={styles.myRankBadge}>
          <Text className={styles.myRankText}>当前排名 第 {myRank} 名</Text>
        </View>
        <Text className={styles.myHint}>坚持每日训练，排名会持续上升</Text>
      </View>

      {/* 榜单 */}
      <View className={styles.list}>
        {list.map((item) => (
          <View
            key={`${item.rank}-${item.nickname}`}
            className={item.isMe ? styles.rowMe : styles.row}
          >
            <Text className={item.rank <= 3 ? styles.rankTop : styles.rank}>{item.rank}</Text>
            <Text className={styles.avatar}>{item.avatar}</Text>
            <Text className={item.isMe ? styles.nicknameMe : styles.nickname}>{item.nickname}</Text>
            <Text className={styles.score}>{item.brainScore}</Text>
          </View>
        ))}
      </View>

      <Text className={styles.footerTip}>排行榜数据为模拟演示，上线后可接入真实云端榜单</Text>
    </View>
  )
}

export default LeaderboardPage
