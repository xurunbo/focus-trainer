import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'

interface NavBarProps {
  title: string
}

// 二级页面导航栏：返回按钮 + 居中标题
// 用于番茄钟、成就殿堂、排行榜、设置等 navigateTo 进入的页面
const NavBar: React.FC<NavBarProps> = ({ title }) => {
  const handleBack = () => {
    Taro.navigateBack().catch(() => {
      // 栈底（如直接刷新进入）时退回首页
      Taro.reLaunch({ url: '/pages/home/index' }).catch(() => {})
    })
  }

  return (
    <View className={styles.header}>
      <View className={styles.backBtn} onClick={handleBack}>
        <Text className={styles.backIcon}>‹</Text>
      </View>
      <Text className={styles.title}>{title}</Text>
      <View className={styles.placeholder} />
    </View>
  )
}

export default NavBar
