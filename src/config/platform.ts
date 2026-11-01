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
export const PLATFORM_STATS_ENABLED = true

// 注意：URL 填到域名根为止，代码会自动拼接 /rest/v1/...
export const SUPABASE_URL = 'https://vakstgdnnfgglrtdudyb.supabase.co'

export const SUPABASE_ANON_KEY = 'sb_publishable_QsmbzMzpbnqfWgoLB_Y71g_cY_APQdD'
