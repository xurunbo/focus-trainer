import React from 'react'
import { View, Text, Switch } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import styles from './index.module.scss'

const GOALS = [2, 4, 6, 8]

const SettingsPage: React.FC = () => {
  const store = useUserStore()

  const handleClear = () => {
    Taro.showModal({
      title: '清除全部数据',
      content: '将清空等级、训练记录、成就等所有数据，且无法恢复。确定继续吗？',
      confirmText: '清除',
      confirmColor: '#e64545',
      success: (res) => {
        if (res.confirm) {
          store.resetAll()
          Taro.showToast({ title: '已清除', icon: 'success' })
        }
      }
    })
  }

  return (
    <View className={styles.container}>
      {/* 训练偏好 */}
      <View className={styles.card}>
        <Text className={styles.cardTitle}>训练偏好</Text>
        <View className={styles.row}>
          <View className={styles.rowInfo}>
            <Text className={styles.rowName}>音效反馈</Text>
            <Text className={styles.rowDesc}>训练过程中的提示音</Text>
          </View>
          <Switch
            color="#d4af37"
            checked={store.settings.sound}
            onChange={(e) => store.updateSettings({ sound: e.detail.value })}
          />
        </View>
        <View className={styles.row}>
          <View className={styles.rowInfo}>
            <Text className={styles.rowName}>震动反馈</Text>
            <Text className={styles.rowDesc}>答对答错时的轻微震动</Text>
          </View>
          <Switch
            color="#d4af37"
            checked={store.settings.vibrate}
            onChange={(e) => store.updateSettings({ vibrate: e.detail.value })}
          />
        </View>
      </View>

      {/* 每日目标 */}
      <View className={styles.card}>
        <Text className={styles.cardTitle}>每日训练目标</Text>
        <View className={styles.goalRow}>
          {GOALS.map((g) => (
            <View
              key={g}
              className={store.settings.dailyGoal === g ? styles.goalItemActive : styles.goalItem}
              onClick={() => store.updateSettings({ dailyGoal: g })}
            >
              <Text className={store.settings.dailyGoal === g ? styles.goalTextActive : styles.goalText}>
                {g} 次
              </Text>
            </View>
          ))}
        </View>
        <Text className={styles.cardHint}>今日已完成 {store.todayDone.length} 次训练</Text>
      </View>

      {/* 数据管理 */}
      <View className={styles.card}>
        <Text className={styles.cardTitle}>数据管理</Text>
        <View className={styles.dangerBtn} onClick={handleClear}>
          <Text className={styles.dangerText}>清除全部数据</Text>
        </View>
        <Text className={styles.cardHint}>数据仅保存在本机，清除后无法恢复</Text>
      </View>

      <Text className={styles.version}>脑力修炼馆 v1.0.0</Text>
    </View>
  )
}

export default SettingsPage
