// 形近字辨识 - 字库（目标字 + 干扰字）

export interface CharGroup {
  target: string
  distractor: string
  tip: string
}

export const CHAR_GROUPS: CharGroup[] = [
  { target: '末', distractor: '未', tip: '末字一横长' },
  { target: '己', distractor: '已', tip: '己字口半开' },
  { target: '戊', distractor: '戌', tip: '戊字心中空' },
  { target: '荼', distractor: '茶', tip: '荼字多一横' },
  { target: '密', distractor: '蜜', tip: '密字虫在山下' },
  { target: '辨', distractor: '辩', tip: '辨字中间是心' },
  { target: '戌', distractor: '戍', tip: '戌中有一横' },
  { target: '赢', distractor: '羸', tip: '赢字口在中间' }
]

// 不同难度对应的网格规格
export const CHAR_GRID_SPEC = {
  easy: { cols: 5, rows: 5, memorizeSec: 4, findSec: 15 },
  medium: { cols: 8, rows: 8, memorizeSec: 4, findSec: 15 },
  hard: { cols: 10, rows: 10, memorizeSec: 3, findSec: 12 }
}
