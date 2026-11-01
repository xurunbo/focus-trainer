import type { GameMeta } from '@/types'

export const GAMES: GameMeta[] = [
  {
    id: 'tracking',
    name: '多目标追踪',
    slogan: '只记住起点还不够',
    desc: '记住发光的目标球，在移动中持续追踪它们',
    icon: '🎯',
    dimension: 'focus',
    dimensionName: '专注力',
    route: '/pages/game/tracking/index'
  },
  {
    id: 'number-matrix',
    name: '数字记忆矩阵',
    slogan: '还要确认它真的出现过',
    desc: '三十六个数字一闪而过，考验工作记忆',
    icon: '🔢',
    dimension: 'memory',
    dimensionName: '记忆力',
    route: '/pages/game/number-matrix/index'
  },
  {
    id: 'item-memory',
    name: '八秒物品记忆',
    slogan: '看见不等于记住',
    desc: '八秒内记住十二件物品，说出少了什么',
    icon: '⏱️',
    dimension: 'memory',
    dimensionName: '记忆力',
    route: '/pages/game/item-memory/index'
  },
  {
    id: 'schulte',
    name: '舒尔特方格',
    slogan: '这次从二十五开始',
    desc: '按顺序击破数字，倒序规则更要守住',
    icon: '🧩',
    dimension: 'focus',
    dimensionName: '专注力',
    route: '/pages/game/schulte/index'
  },
  {
    id: 'character',
    name: '形近字辨识',
    slogan: '字形越接近越考验眼力',
    desc: '从相似信息里找出真正不同的细节',
    icon: '🔍',
    dimension: 'observation',
    dimensionName: '观察力',
    route: '/pages/game/character/index'
  }
]

export function getGameMeta(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id)
}
