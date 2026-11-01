import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'

interface GameShellProps {
  title: string
  stage: string
  children: React.ReactNode
}

// 游戏页面框架：顶部导航 + 阶段提示 + 返回确认
const GameShell: React.FC<GameShellProps> = ({ title, stage, children }) => {
  const handleBack = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出当前训练吗？进度将不会保存',
      confirmText: '退出',
      confirmColor: '#e64545',
      success: (res) => {
        if (res.confirm) Taro.navigateBack()
      }
    })
  }

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <View className={styles.backBtn} onClick={handleBack}>
          <Text className={styles.backIcon}>‹</Text>
        </View>
        <Text className={styles.title}>{title}</Text>
        <View className={styles.stageBadge}>
          <Text className={styles.stageText}>{stage}</Text>
        </View>
      </View>
      <View className={styles.body}>{children}</View>
    </View>
  )
}

export default GameShell
