import React from 'react'
import { View, Text } from '@tarojs/components'
import StyledView from '@/components/StyledView'
import styles from './index.module.scss'

interface BarStatProps {
  label: string
  value: number
  color?: string
  suffix?: string
}

// 横向条形统计（数据页四维展示）
const BarStat: React.FC<BarStatProps> = ({ label, value, color = '#d4af37', suffix = '' }) => {
  return (
    <View className={styles.row}>
      <Text className={styles.label}>{label}</Text>
      <View className={styles.track}>
        <StyledView
          className={styles.fill}
          css={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </View>
      <Text className={styles.value}>{value}{suffix}</Text>
    </View>
  )
}

export default BarStat
