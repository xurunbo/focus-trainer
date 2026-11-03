import React from 'react'
import { View, Text } from '@tarojs/components'
import { topPaddingStyle } from '@/utils/safeArea'
import styles from './index.module.scss'

interface PageHeaderProps {
  title: string
  // 右侧扩展内容（可选）
  extra?: React.ReactNode
}

// tab 页沉浸式头部：金色竖线 + 衬线标题，自适配刘海屏安全区（H5）与状态栏（小程序）
const PageHeader: React.FC<PageHeaderProps> = ({ title, extra }) => {
  return (
    <View className={styles.header} style={topPaddingStyle(14)}>
      <View className={styles.titleRow}>
        <View className={styles.goldBar} />
        <Text className={styles.title}>{title}</Text>
      </View>
      {extra ? <View className={styles.extra}>{extra}</View> : null}
    </View>
  )
}

export default PageHeader
