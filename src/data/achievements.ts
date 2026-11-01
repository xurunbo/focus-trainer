import type { AchievementMeta } from '@/types'

export const ACHIEVEMENTS: AchievementMeta[] = [
  { id: 'first-blood', name: '初出茅庐', desc: '完成第一次训练', icon: '🌱' },
  { id: 'tracking-master', name: '追踪大师', desc: '多目标追踪困难难度全部命中', icon: '🎯' },
  { id: 'number-brain', name: '最强大脑', desc: '数字记忆矩阵连续答对 5 题', icon: '🧠' },
  { id: 'memory-king', name: '过目不忘', desc: '八秒物品记忆全部答对', icon: '👑' },
  { id: 'schulte-pro', name: '方格高手', desc: '舒尔特方格 30 秒内完成', icon: '🧩' },
  { id: 'eagle-eye', name: '火眼金睛', desc: '形近字辨识困难难度一次命中', icon: '🔍' },
  { id: 'focus-lord', name: '专注达人', desc: '番茄专注钟累计 60 分钟', icon: '🍅' },
  { id: 'streak-7', name: '七日坚持', desc: '连续打卡 7 天', icon: '📅' },
  { id: 'train-50', name: '训练狂人', desc: '累计训练 50 次', icon: '🔥' },
  { id: 'level-10', name: '脑力宗师', desc: '等级达到 10 级', icon: '🏆' }
]
