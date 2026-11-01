import type { BrainScores, DimensionKey } from '@/types'
import { GAMES } from './games'

export interface PlanItem {
  gameId: string
  name: string
  icon: string
  route: string
  reason: string
}

const DIMENSION_NAME: Record<DimensionKey, string> = {
  memory: '记忆力',
  focus: '专注力',
  observation: '观察力',
  reaction: '反应力'
}

// 根据四维分数短板生成每日训练计划（3 个游戏 + 1 个番茄钟）
export function generateDailyPlan(scores: BrainScores): PlanItem[] {
  const dims: DimensionKey[] = ['memory', 'focus', 'observation', 'reaction']
  const sorted = [...dims].sort((a, b) => scores[a] - scores[b])
  const plan: PlanItem[] = sorted.slice(0, 3).map((dim) => {
    const game = GAMES.find((g) => g.dimension === dim)!
    return {
      gameId: game.id,
      name: game.name,
      icon: game.icon,
      route: game.route,
      reason: `${DIMENSION_NAME[dim]}待提升`
    }
  })
  plan.push({
    gameId: 'focus',
    name: '番茄专注钟',
    icon: '🍅',
    route: '/pages/focus/index',
    reason: '静心专注 25 分钟'
  })
  return plan
}
