import { useEffect, useState } from 'react'
import { fetchSummary, type PlatformSummary } from '@/utils/platformStats'
import { PLATFORM_STATS_ENABLED } from '@/config/platform'

/**
 * 订阅平台统计数据：挂载即拉取，每 30s 刷新。
 * 未配置 Supabase（PLATFORM_STATS_ENABLED 为 false）时返回 null，界面自动隐藏。
 */
export function usePlatformStats(): PlatformSummary | null {
  const [summary, setSummary] = useState<PlatformSummary | null>(null)

  useEffect(() => {
    if (!PLATFORM_STATS_ENABLED) return
    let alive = true
    const load = () => {
      fetchSummary().then((s) => {
        if (alive && s) setSummary(s)
      })
    }
    load()
    const t = setInterval(load, 30000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  return summary
}
