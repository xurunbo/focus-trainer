import type { LeaderboardItem } from '@/types'
import { randomInt } from '@/utils/random'

const NICKNAMES = [
  '记忆猎人', '静水流深', '清风徐来', '专注的猫', '夜观星象',
  '一格之言', '淡定先生', '心之所向', '山海皆可平', '指尖流沙',
  '明察秋毫', '笃行致远', '松间明月', '武者之心', '拾光者',
  '北岸初晴', '云中漫步', '十年磨剑', '格物致知', '一念通天'
]

const AVATARS = ['🦊', '🐼', '🦉', '🐯', '🦁', '🐺', '🦅', '🐬', '🦚', '🐳', '🌵', '🍀']

// 生成确定性的 mock 排行榜数据
export function getLeaderboard(myScore: number): LeaderboardItem[] {
  const list: LeaderboardItem[] = NICKNAMES.map((nickname, i) => {
    const avatar = AVATARS[i % AVATARS.length]
    // 分数从高到低分布，带随机波动
    const base = 96 - i * 3
    const brainScore = Math.max(30, Math.min(99, base + randomInt(-2, 2)))
    return { rank: 0, nickname, avatar, brainScore }
  })
  list.push({ rank: 0, nickname: '我', avatar: '🧠', brainScore: myScore, isMe: true })
  list.sort((a, b) => b.brainScore - a.brainScore)
  list.forEach((item, i) => {
    item.rank = i + 1
  })
  return list
}
