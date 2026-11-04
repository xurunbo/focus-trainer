export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/train/index',
    'pages/stats/index',
    'pages/mine/index',
    'pages/game/tracking/index',
    'pages/game/number-matrix/index',
    'pages/game/item-memory/index',
    'pages/game/schulte/index',
    'pages/game/character/index',
    'pages/focus/index',
    'pages/mine/achievements/index',
    'pages/mine/leaderboard/index',
    'pages/mine/settings/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#17120a',
    // 沉浸式：tab 页不显示系统标题栏，由页面自渲染头部
    navigationStyle: 'custom',
    navigationBarTitleText: '心流小馆',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#7d6f4f',
    selectedColor: '#d4af37',
    backgroundColor: '#1c150c',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-selected.png'
      },
      {
        pagePath: 'pages/train/index',
        text: '训练',
        iconPath: 'assets/tabbar/train.png',
        selectedIconPath: 'assets/tabbar/train-selected.png'
      },
      {
        pagePath: 'pages/stats/index',
        text: '数据',
        iconPath: 'assets/tabbar/stats.png',
        selectedIconPath: 'assets/tabbar/stats-selected.png'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.png',
        selectedIconPath: 'assets/tabbar/mine-selected.png'
      }
    ]
  }
})
