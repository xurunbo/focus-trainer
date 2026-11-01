// 全局类型定义

export type GameId =
  | 'tracking'
  | 'number-matrix'
  | 'item-memory'
  | 'schulte'
  | 'character'
  | 'focus'

export type DimensionKey = 'memory' | 'focus' | 'observation' | 'reaction'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface BrainScores {
  memory: number
  focus: number
  observation: number
  reaction: number
}

export interface TrainingRecord {
  id: string
  gameId: GameId
  gameName: string
  dimension: DimensionKey
  score: number
  accuracy: number
  durationSec: number
  date: string
  detail: string
}

export interface UserProfile {
  nickname: string
  avatar: string
  level: number
  exp: number
  title: string
}

export interface Settings {
  sound: boolean
  vibrate: boolean
  dailyGoal: number
}

export interface UserState {
  profile: UserProfile
  scores: BrainScores
  totalTrainings: number
  streakDays: number
  lastTrainDate: string | null
  todayDone: string[]
  todayDate: string
  history: TrainingRecord[]
  achievements: string[]
  settings: Settings
  pomodoroCount: number
  focusTotalMin: number
}

export interface GameMeta {
  id: GameId
  name: string
  slogan: string
  desc: string
  icon: string
  dimension: DimensionKey
  dimensionName: string
  route: string
  isNew?: boolean
}

export interface AchievementMeta {
  id: string
  name: string
  desc: string
  icon: string
}

export interface LeaderboardItem {
  rank: number
  nickname: string
  avatar: string
  brainScore: number
  isMe?: boolean
}
