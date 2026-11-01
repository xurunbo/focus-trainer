import { create } from 'zustand'
import Taro from '@tarojs/taro'
import type {
  BrainScores, DimensionKey, Difficulty, Settings, TrainingRecord, UserState
} from '@/types'
import { loadState, saveState, clearAll } from '@/utils/storage'
import { applyRecordToScores, expGain, levelFromExp, titleFromLevel } from '@/utils/score'
import { ACHIEVEMENTS } from '@/data/achievements'
import { genId } from '@/utils/random'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function initialState(): UserState {
  const scores: BrainScores = { memory: 20, focus: 20, observation: 20, reaction: 20 }
  return {
    profile: { nickname: '修炼者', avatar: '🧠', level: 1, exp: 0, title: '初学者' },
    scores,
    totalTrainings: 0,
    streakDays: 0,
    lastTrainDate: null,
    todayDone: [],
    todayDate: todayStr(),
    history: [],
    achievements: [],
    settings: { sound: true, vibrate: true, dailyGoal: 4 },
    pomodoroCount: 0,
    focusTotalMin: 0
  }
}

interface UserActions {
  hydrate: () => void
  addRecord: (input: {
    gameId: TrainingRecord['gameId']
    gameName: string
    dimension: DimensionKey
    score: number
    accuracy: number
    durationSec: number
    difficulty: Difficulty
    detail: string
  }) => TrainingRecord
  completeFocus: (minutes: number) => void
  unlockAchievement: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetAll: () => void
}

type UserStore = UserState & UserActions

function checkAchievements(state: UserState, record: TrainingRecord): string[] {
  const unlocked: string[] = []
  const has = (id: string) => state.achievements.includes(id) || unlocked.includes(id)
  const add = (id: string) => {
    if (!has(id)) unlocked.push(id)
  }

  if (state.totalTrainings >= 1) add('first-blood')
  if (state.totalTrainings >= 50) add('train-50')
  if (state.streakDays >= 7) add('streak-7')
  if (state.profile.level >= 10) add('level-10')
  if (state.focusTotalMin >= 60) add('focus-lord')

  if (record.gameId === 'tracking' && record.difficulty === 'hard' && record.score >= 100) add('tracking-master')
  if (record.gameId === 'schulte' && record.score >= 85 && record.durationSec <= 30) add('schulte-pro')
  if (record.gameId === 'item-memory' && record.score >= 100) add('memory-king')
  if (record.gameId === 'character' && record.difficulty === 'hard' && record.score >= 100) add('eagle-eye')
  if (record.gameId === 'number-matrix') {
    const recent = [record, ...state.history.filter((h) => h.gameId === 'number-matrix').slice(0, 4)]
    if (recent.length >= 5 && recent.slice(0, 5).every((r) => r.score >= 100)) add('number-brain')
  }
  return unlocked
}

export const useUserStore = create<UserStore>()((set, get) => ({
  ...initialState(),

  hydrate: () => {
    const saved = loadState<UserState | null>('user_state', null)
    const base = initialState()
    if (saved) {
      const merged: UserState = {
        ...base,
        ...saved,
        profile: { ...base.profile, ...saved.profile },
        scores: { ...base.scores, ...saved.scores },
        settings: { ...base.settings, ...saved.settings },
        history: Array.isArray(saved.history) ? saved.history : [],
        achievements: Array.isArray(saved.achievements) ? saved.achievements : [],
        todayDone: Array.isArray(saved.todayDone) ? saved.todayDone : []
      }
      // 跨天重置今日完成
      if (merged.todayDate !== todayStr()) {
        merged.todayDate = todayStr()
        merged.todayDone = []
      }
      set(merged)
    }
  },

  addRecord: (input) => {
    const state = get()
    const today = todayStr()
    const isNewDay = state.lastTrainDate !== today
    const yesterday = new Date(Date.now() - 86400000)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    let streakDays = state.streakDays
    if (isNewDay) {
      streakDays = state.lastTrainDate === yesterdayStr ? state.streakDays + 1 : 1
    }

    const gain = expGain(input.score, input.difficulty)
    const totalExp = state.profile.exp + gain
    const level = levelFromExp(totalExp)

    const record: TrainingRecord = {
      id: genId(),
      gameId: input.gameId,
      gameName: input.gameName,
      dimension: input.dimension,
      score: input.score,
      accuracy: input.accuracy,
      durationSec: input.durationSec,
      date: new Date().toISOString(),
      detail: input.detail
    }

    const nextState: UserState = {
      ...state,
      profile: { ...state.profile, exp: totalExp, level, title: titleFromLevel(level) },
      scores: applyRecordToScores(state.scores, input.dimension, input.score, input.difficulty),
      totalTrainings: state.totalTrainings + 1,
      streakDays,
      lastTrainDate: today,
      todayDone: isNewDay ? [input.gameId] : [...state.todayDone, input.gameId],
      todayDate: today,
      history: [record, ...state.history].slice(0, 100)
    }

    const unlocked = checkAchievements(nextState, record)
    if (unlocked.length > 0) {
      nextState.achievements = [...nextState.achievements, ...unlocked]
    }

    set(nextState)
    saveState('user_state', nextState)
    console.log('[UserStore] record added:', record.gameId, 'score:', record.score, 'unlocked:', unlocked)
    return record
  },

  completeFocus: (minutes) => {
    const state = get()
    const nextState: UserState = {
      ...state,
      pomodoroCount: state.pomodoroCount + 1,
      focusTotalMin: state.focusTotalMin + minutes,
      scores: { ...state.scores, focus: Math.min(100, state.scores.focus + 1) }
    }
    const unlocked = checkAchievements(nextState, {
      id: 'x', gameId: 'focus', gameName: '番茄专注钟', dimension: 'focus',
      score: 100, accuracy: 100, durationSec: minutes * 60, date: new Date().toISOString(), detail: ''
    } as TrainingRecord)
    if (unlocked.length > 0) {
      nextState.achievements = [...nextState.achievements, ...unlocked]
    }
    set(nextState)
    saveState('user_state', nextState)
    console.log('[UserStore] focus completed:', minutes, 'min')
  },

  unlockAchievement: (id) => {
    const state = get()
    if (state.achievements.includes(id)) return
    const nextState = { ...state, achievements: [...state.achievements, id] }
    set(nextState)
    saveState('user_state', nextState)
  },

  updateSettings: (patch) => {
    const state = get()
    const nextState = { ...state, settings: { ...state.settings, ...patch } }
    set(nextState)
    saveState('user_state', nextState)
  },

  resetAll: () => {
    clearAll()
    const fresh = initialState()
    set(fresh)
    console.log('[UserStore] all data reset')
  }
}))

export function showAchievementToasts(unlocked: string[]): void {
  if (!unlocked.length) return
  const names = unlocked
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => `${a!.icon} ${a!.name}`)
  Taro.showToast({ title: `解锁成就 ${names.join('、')}`, icon: 'none', duration: 2500 })
}
