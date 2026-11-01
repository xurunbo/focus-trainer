import React, { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { GAMES } from '@/data/games'
import { DIFFICULTY_LABEL } from '@/utils/score'
import type { Difficulty } from '@/types'
import styles from './index.module.scss'

const TrainPage: React.FC = () => {
  const store = useUserStore()
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')

  const bestOf = (gameId: string): number => {
    const recs = store.history.filter((h) => h.gameId === gameId)
    return recs.length ? Math.max(...recs.map((r) => r.score)) : 0
  }

  const go = (url: string) => {
    Taro.navigateTo({ url: `${url}?difficulty=${difficulty}` })
  }

  return (
    <View className={styles.container}>
      {/* 难度选择 */}
      <View className={styles.diffCard}>
        <Text className={styles.diffTitle}>选择难度</Text>
        <View className={styles.diffRow}>
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <View
              key={d}
              className={difficulty === d ? styles.diffItemActive : styles.diffItem}
              onClick={() => setDifficulty(d)}
            >
              <Text className={difficulty === d ? styles.diffTextActive : styles.diffText}>
                {DIFFICULTY_LABEL[d]}
              </Text>
            </View>
          ))}
        </View>
        <Text className={styles.diffHint}>
          {difficulty === 'easy' ? '轻松入门，适合热身' : difficulty === 'medium' ? '标准挑战，稳步提升' : '高手专属，经验加成 15%'}
        </Text>
      </View>

      {/* 游戏列表 */}
      <View className={styles.list}>
        {GAMES.map((game) => {
          const best = bestOf(game.id)
          return (
            <View key={game.id} className={styles.gameCard} onClick={() => go(game.route)}>
              <View className={styles.iconWrap}>
                <Text className={styles.icon}>{game.icon}</Text>
              </View>
              <View className={styles.info}>
                <Text className={styles.name}>{game.name}</Text>
                <Text className={styles.slogan}>{game.slogan}</Text>
                <Text className={styles.desc}>{game.desc}</Text>
              </View>
              <View className={styles.meta}>
                <View className={styles.dimTag}>
                  <Text className={styles.dimText}>{game.dimensionName}</Text>
                </View>
                <Text className={styles.best}>最佳 {best}</Text>
                <Text className={styles.arrow}>›</Text>
              </View>
            </View>
          )
        })}
      </View>

      {/* 专注训练入口 */}
      <View className={styles.focusCard} onClick={() => Taro.navigateTo({ url: '/pages/focus/index' })}>
        <Text className={styles.focusIcon}>🍅</Text>
        <View className={styles.focusInfo}>
          <Text className={styles.focusName}>番茄专注钟</Text>
          <Text className={styles.focusDesc}>静心凝神，在呼吸间培养持久专注</Text>
        </View>
        <Text className={styles.arrow}>›</Text>
      </View>
    </View>
  )
}

export default TrainPage
