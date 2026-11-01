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
  const plan: PlanItem[] = []
  const usedIds = new Set<string>()
  // 优先安排短板维度对应的游戏；反应力暂无专项游戏，跳过由下方兜底补齐
  for (const dim of sorted) {
    if (plan.length >= 3) break
    const game = GAMES.find((g) => g.dimension === dim && !usedIds.has(g.id))
    if (!game) continue
    plan.push({
      gameId: game.id,
      name: game.name,
      icon: game.icon,
      route: game.route,
      reason: `${DIMENSION_NAME[dim]}待提升`
    })
    usedIds.add(game.id)
  }
  // 兜底：短板维度无可用游戏时，用其余训练补足 3 项，保证计划始终可执行
  for (const game of GAMES) {
    if (plan.length >= 3) break
    if (usedIds.has(game.id)) continue
    plan.push({
      gameId: game.id,
      name: game.name,
      icon: game.icon,
      route: game.route,
      reason: '综合修炼'
    })
    usedIds.add(game.id)
  }
  plan.push({
    gameId: 'focus',
    name: '番茄专注钟',
    icon: '🍅',
    route: '/pages/focus/index',
    reason: '静心专注 25 分钟'
  })
  return plan
}
