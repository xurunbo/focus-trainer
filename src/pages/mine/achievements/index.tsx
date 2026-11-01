import React from 'react'
import { View, Text } from '@tarojs/components'
import { useUserStore } from '@/store/user'
import { ACHIEVEMENTS } from '@/data/achievements'
import styles from './index.module.scss'

const AchievementsPage: React.FC = () => {
  const store = useUserStore()
  const unlocked = store.achievements.length

  return (
    <View className={styles.container}>
      <View className={styles.summary}>
        <Text className={styles.summaryNum}>{unlocked}</Text>
        <Text className={styles.summaryTotal}>/{ACHIEVEMENTS.length}</Text>
        <Text className={styles.summaryLabel}>已解锁成就</Text>
      </View>

      <View className={styles.list}>
        {ACHIEVEMENTS.map((a) => {
          const got = store.achievements.includes(a.id)
          return (
            <View key={a.id} className={got ? styles.cardGot : styles.card}>
              <View className={got ? styles.iconWrapGot : styles.iconWrap}>
                <Text className={styles.iconText}>{a.icon}</Text>
              </View>
              <View className={styles.info}>
                <Text className={got ? styles.nameGot : styles.name}>{a.name}</Text>
                <Text className={styles.desc}>{a.desc}</Text>
              </View>
              <Text className={got ? styles.statusGot : styles.status}>{got ? '已解锁' : '未解锁'}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default AchievementsPage
