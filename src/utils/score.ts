import type { BrainScores, DimensionKey, Difficulty, TrainingRecord } from '@/types'

// 等级称号
export const LEVEL_TITLES = [
  '初学者', '入门弟子', '心性稳定', '小有所成', '融会贯通',
  '登堂入室', '炉火纯青', '出类拔萃', '登峰造极', '一代宗师'
]

export const EXP_PER_LEVEL = 120

export function levelFromExp(totalExp: number): number {
  return Math.floor(totalExp / EXP_PER_LEVEL) + 1
}

export function titleFromLevel(level: number): string {
  const idx = Math.min(Math.floor((level - 1) / 3), LEVEL_TITLES.length - 1)
  return LEVEL_TITLES[idx]
}

export function brainScoreTotal(scores: BrainScores): number {
  return Math.round((scores.memory + scores.focus + scores.observation + scores.reaction) / 4)
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
}

export const DIFFICULTY_FACTOR: Record<Difficulty, number> = {
  easy: 0.85,
  medium: 1,
  hard: 1.15
}

// 游戏主维度 -> 四维权重（其余按比例分摊）
const DIMENSION_WEIGHTS: Record<DimensionKey, Record<DimensionKey, number>> = {
  memory: { memory: 0.7, focus: 0.15, observation: 0.1, reaction: 0.05 },
  focus: { memory: 0.15, focus: 0.7, observation: 0.1, reaction: 0.05 },
  observation: { memory: 0.1, focus: 0.15, observation: 0.7, reaction: 0.05 },
  reaction: { memory: 0.05, focus: 0.1, observation: 0.15, reaction: 0.7 }
}

// 训练后更新四维分数（指数移动平均）
export function applyRecordToScores(
  scores: BrainScores,
  dimension: DimensionKey,
  score: number,
  difficulty: Difficulty
): BrainScores {
  const weights = DIMENSION_WEIGHTS[dimension]
  const adjusted = Math.max(0, Math.min(100, score * DIFFICULTY_FACTOR[difficulty]))
  const next = { ...scores }
  ;(Object.keys(weights) as DimensionKey[]).forEach((k) => {
    const w = weights[k]
    next[k] = Math.round(next[k] * (1 - w * 0.3) + adjusted * w * 0.3)
  })
  return next
}

export function expGain(score: number, difficulty: Difficulty): number {
  const base = score >= 90 ? 24 : score >= 70 ? 18 : score >= 50 ? 12 : 8
  return Math.round(base * DIFFICULTY_FACTOR[difficulty])
}

export function gradeFromScore(score: number): { label: string; color: string } {
  if (score >= 95) return { label: '完美', color: '#f5d76e' }
  if (score >= 80) return { label: '优秀', color: '#d4af37' }
  if (score >= 60) return { label: '良好', color: '#4caf50' }
  if (score >= 40) return { label: '一般', color: '#ffb300' }
  return { label: '加油', color: '#e64545' }
}

// 训练统计
export function summarizeHistory(history: TrainingRecord[]) {
  const total = history.length
  const avgScore = total ? Math.round(history.reduce((s, r) => s + r.score, 0) / total) : 0
  const best = total ? Math.max(...history.map((r) => r.score)) : 0
  const totalMin = Math.round(history.reduce((s, r) => s + r.durationSec, 0) / 60)
  return { total, avgScore, best, totalMin }
}
