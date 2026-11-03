// 平台统计配置（在线人数 / 今日活跃 / 累计使用人数）
//
// 开启步骤：
// 1. 在 Supabase 项目后台 → Project Settings → Data API 页面
//    复制 Project URL 和 anon public key，分别填入下面两个常量
// 2. 将 ENABLED 改为 true
// 3. 重新部署后，首页人气条与「我的」平台数据卡自动生效
//
// 说明：anon key 是设计上可公开的客户端密钥（随前端 bundle 发布），
// 数据库已开启行级安全，匿名角色只能调用 heartbeat / platform_summary 两个函数，
// 无法直接读取或修改任何数据。
// 微信小程序端自动关闭：小程序网络请求必须使用已备案并加入白名单的域名，
// Supabase 域名无法配置为合法域名，强行请求只会得到失败提示。
// 因此小程序内不展示在线人数等平台统计，H5 端保持开启。
export const PLATFORM_STATS_ENABLED = process.env.TARO_ENV !== 'weapp'

// 注意：URL 填到域名根为止，代码会自动拼接 /rest/v1/...
export const SUPABASE_URL = 'https://vakstgdnnfgglrtdudyb.supabase.co'

export const SUPABASE_ANON_KEY = 'sb_publishable_QsmbzMzpbnqfWgoLB_Y71g_cY_APQdD'
