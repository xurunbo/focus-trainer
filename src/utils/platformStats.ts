import Taro from '@tarojs/taro'
import { PLATFORM_STATS_ENABLED, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/platform'

export interface DayPoint {
  day: string // YYYY-MM-DD
  count: number
}

export interface PlatformSummary {
  online: number // 当前在线（90 秒内有过心跳的设备）
  total: number // 累计使用过的设备总数
  today: number // 今日活跃设备数
  days: DayPoint[] // 近 7 天每日活跃
}

const DEVICE_KEY = 'ft_device_id'
const HEARTBEAT_MS = 30000 // 心跳间隔：30 秒

// 生成匿名设备 ID（UUID v4），仅用于去重计数，不含任何个人信息
function randomUUID(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    const v = ch === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** 匿名设备 ID：首次进入生成本地保存；清缓存/换设备则计为新用户 */
export function getDeviceId(): string {
  let id = ''
  try {
    id = Taro.getStorageSync(DEVICE_KEY) || ''
  } catch {
    // 存储不可用时退化为内存 ID（本次会话内仍可计数）
  }
  if (!id) {
    id = randomUUID()
    try {
      Taro.setStorageSync(DEVICE_KEY, id)
    } catch {
      // ignore
    }
  }
  return id
}

// 调用 Supabase 上的 Postgres 函数（REST 直连，无需引入 SDK）
async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T | null> {
  if (!PLATFORM_STATS_ENABLED || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  try {
    const res = await Taro.request({
      url: `${SUPABASE_URL}/rest/v1/rpc/${fn}`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      data: body,
      dataType: 'json',
      timeout: 8000
    })
    return (res.data ?? null) as T | null
  } catch {
    return null // 网络失败静默处理，下一轮心跳自然恢复
  }
}

/** 上报一次心跳（匿名计数，不采集任何个人信息） */
export async function sendHeartbeat(): Promise<void> {
  await rpc('heartbeat', { p_device: getDeviceId() })
}

/** 拉取平台汇总数据 */
export async function fetchSummary(): Promise<PlatformSummary | null> {
  const data = await rpc<PlatformSummary>('platform_summary', {})
  if (!data) return null
  return {
    online: Number(data.online) || 0,
    total: Number(data.total) || 0,
    today: Number(data.today) || 0,
    days: Array.isArray(data.days) ? data.days : []
  }
}

let timer: ReturnType<typeof setInterval> | 0 = 0

/** 启动心跳：进入即报一次，之后每 30s 一次（整个 App 内仅启动一次） */
export function startHeartbeat(): void {
  if (!PLATFORM_STATS_ENABLED || timer) return
  sendHeartbeat()
  timer = setInterval(sendHeartbeat, HEARTBEAT_MS)
}
