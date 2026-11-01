import Taro from '@tarojs/taro'

const PREFIX = 'brain_trainer_'

export function loadState<T>(key: string, fallback: T): T {
  try {
    const val = Taro.getStorageSync(PREFIX + key)
    if (val === '' || val === undefined || val === null) return fallback
    return val as T
  } catch (e) {
    console.error('[Storage] load failed:', key, e)
    return fallback
  }
}

export function saveState<T>(key: string, value: T): void {
  try {
    Taro.setStorageSync(PREFIX + key, value)
  } catch (e) {
    console.error('[Storage] save failed:', key, e)
  }
}

export function clearAll(): void {
  try {
    Taro.removeStorageSync(PREFIX + 'user_state')
  } catch (e) {
    console.error('[Storage] clear failed:', e)
  }
}
