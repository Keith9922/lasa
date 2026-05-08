# 💩 拉啥（LASA）

> 输入今日饮食，伪科学算法预测明日拉啥。仅供娱乐 · 不构成医学建议。

[![CI](https://github.com/Keith9922/lasa/actions/workflows/ci.yml/badge.svg)](https://github.com/Keith9922/lasa/actions/workflows/ci.yml)

**🌐 在线体验：https://lasa-gilt.vercel.app/**

基于「碳水 → 量、蛋白质 → 形、脂肪 → 质」的伪科学理论，把今日饮食换算成明日便便预测：Bristol 类型 + 颜色 + 油亮 + 漂浮 + 气味，输出可分享的拍立得卡片。

---

## 功能一览

### 核心流程

- **描述输入是主入口**：直接说「中午吃了两盘肥牛 + 啤酒」，AI 拆成结构化食物清单 + 估算热量
- **辅助选择**：「不想打字？挑几个常吃的」按钮触发**搜索式 Modal**，23 种预设 + 用户「常用」分组
- **「开拉」CTA** 触发 3.5s 出卡动效（马桶接屎 + 拍立得 + 音效 + 震动）
- **拍立得结果卡**：Bristol 1-7、颜色 7 档、油亮 / 漂浮 / 臭味、营养环、AI 一句话吐槽
- **Web Share API + 服务端 PNG 兜底下载**，覆盖夸克 / UC / 微信浏览器

### 健康轨道（v2.2 — 大健康转向）

- **🩷 健康分 0-100**（首页头部徽章）：综合最近 7 天 Bristol 集中度、颜色稳定性、纤维水分、记录频次、反馈准确率
- **7 条健康成就**（取代旧"集卡 BINGO"，全部奖励"做对了"）：
  - 🌿 光滑七连（连续 7 天 Bristol 3-5）
  - ✨ 告别糊状一周（近 7 天没出现 Type 6-7）
  - 🎨 正色一月（近 30 天颜色全是「正常棕」）
  - 🌾 纤维大师周（近 7 天 ≥5 天纤维 ≥25g）
  - 🍃 轻量月（近 30 天日均 1800-2200 kcal）
  - 🎯 校准 90%（反馈 ≥10 次、命中率 ≥90%）
  - 🌟 健康分破 80（首次 7 天健康分 ≥80）
- **`/dex` 病例档案**：7×7 形态色矩阵的中性记录，**异常颜色（灰白 / 黑褐 / 暗红）反复出现**自动顶部弹出就医提示横幅
- **`/history` 屎相日记**：时间轴 + 第二天回看打反馈"准 / 一般 / 不准"
- **`/insights` 趋势**：4 张总览卡（streak / 7 天 / 命中率 / 日均 kcal）+ 形态分布柱状图 + 颜色排行 + 食物排行
- **昨日验证回路**：反馈写回校准 bias，下次预测自动微调形态/体积

### AI 功能

- **流式 AI 吐槽**（SSE）：reasoning 模型思考完毕即逐字推送，绕开"几秒空等"
- **「问问肠子」AI 答疑**（首页 💬 Modal）：基于本地 history + stats 让 AI 回答"为什么这周老便秘 / 我应该多吃啥 / 我的肠道在变好还是变差"等问题，引用具体数字 + 给可执行建议
- **「肠道月报」**（`/insights` 顶部）：AI 写一段 200 字本月剧本，引用 2-3 个具体数字 + 一个下月小目标，缓存到 localStorage 避免重复花 token
- **AI 真实可见**（`/settings` AI 状态面板）：每次调用记录 `source: ai | template | error`、latency、错误信息；拍立得卡右上角显示「✨ AI 写」/「📋 模板兜底」/「⚠ AI 失败」徽章
- **「偏好真实 AI」开关**：勾上后 AI 失败不走本地模板兜底，直接显示错误（用来验证当前是不是真 AI）

### 工程能力

- **Auth.js v5**：Demo（邮箱+昵称）+ GitHub OAuth，env 没配也能本地跑
- **云端同步**：Upstash REST KV / Vercel KV，登录后自动节流上传整张本地 snapshot
- **PWA**：webmanifest + 多尺寸 icon + Apple Web App + 适配 reduced-motion
- **完整 Error UI**：error.tsx / global-error.tsx / not-found.tsx，配 mascot 插画
- **a11y**：跳到主内容、全局 :focus-visible 焦点环、Esc 关菜单
- **54 个单测**：预测引擎 / 健康成就规则 / 健康分 / 流式 JSON / stats 聚合 / 核心模块纯度

---

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 15 (App Router) · React 19 |
| 类型 | TypeScript 严格模式 |
| AI | OpenAI 兼容接口（默认 `MiniMax-M2` reasoning），server-side only，SSE 流式 |
| 鉴权 | Auth.js v5 · JWT session · GitHub + Demo provider |
| 存储 | localStorage（默认）· Upstash REST KV（登录态可选）|
| 部署 | Vercel（默认）· 任何 Node 20+ 节点都能跑 |

代码切面：

```
src/
  core/                    # 平台无关纯逻辑（小程序可移植）
    index.ts               # 公开 barrel：predict / foods / stats / schemas / ...
    __purity__.test.ts     # 拒绝 DOM 全局的 guard 测试
  lib/
    storage.ts             # localStorage + 变更事件总线
    health-track.ts        # 7 条健康成就规则 + detectHealthAchievements()
    stats.ts               # computeStats + computeHealthScore
    ai.ts                  # chat / chatStream / extractPartialString / stripThink
    sfx.ts                 # Web Audio + 震动
    cloud-sync.ts          # /api/sync 客户端 adapter
    server/kv.ts           # Upstash REST 抽象
    *.test.ts              # 单测 54 条
  app/                     # Next.js 路由
    page.tsx               # 主页（描述输入 + 摄入清单 + 开拉）
    dex/                   # 病例档案（中性记录）
    history/               # 屎相日记
    insights/              # 趋势 + 月报
    settings/              # 体验 / 调性 / AI 状态 / 校准 / 云端 / 常用 / 数据
    sign-in/
    error.tsx global-error.tsx not-found.tsx
    api/
      generate-roast/      # 流式 SSE 吐槽
      parse-meal/          # 食物 NLP 解析
      ask/                 # 问问肠子 AI 答疑
      recap/               # 肠道月报 AI 生成
      share-card/          # 服务端 PNG（edge）
      auth/[...nextauth]/  # Auth.js 路由
      sync/                # 云端 KV 同步
  components/
    food-picker-modal.tsx  # 食物搜索 Modal（取代旧折叠）
    ask-gut-modal.tsx      # 问问肠子 Modal
    monthly-recap.tsx      # 月报组件
    poop-card.tsx          # 拍立得卡（含 AI source 徽章）
    ...
  auth.ts                  # Auth.js 配置
public/illustrations/      # 手绘 SVG mascot + empty state
```

---

## 本地开发

```bash
cp .env.example .env.local   # 填入需要的 key（最少 0 个，全没配也能跑）
npm install
npm run dev                  # http://localhost:3000
```

| 命令 | 干啥 |
|---|---|
| `npm run dev` | 开发模式 |
| `npm run build` | 生产构建 |
| `npm run typecheck` | 仅类型检查 |
| `npm run lint` | ESLint（flat config + ESLint CLI）|
| `npm test` | node:test + tsx 跑 54 个单测 |
| `npm run ci` | 一口气：lint + typecheck + test + build（与 GitHub Actions 同步）|

Node ≥ 20（见 [`.nvmrc`](.nvmrc)）。CI：[`.github/workflows/ci.yml`](.github/workflows/ci.yml) 每次 push / PR 跑全套。

> ⚠️ 如果你跑过 `npm run build` 之后又回到 `npm run dev`，dev server 会引用已被覆盖的 `.next/server/vendor-chunks/*` 路径致 500。重启 dev 即恢复（`/bin/rm -rf .next` 后再 `npm run dev`）。

---

## 配置（按需）

`.env.local` 全部为可选；不填 = 走兜底模板 + 本地存储。

```bash
# AI 接口（不填则一句吐槽走本地模板池，parse 解析直接报错）
MINIMAX_API_KEY=
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_MODEL=MiniMax-M2

# 鉴权（不填则只有 demo 邮箱+昵称登录）
AUTH_SECRET=                    # openssl rand -base64 32
AUTH_URL=                       # 部署后填真实 URL，含协议
AUTH_GITHUB_ID=                 # github.com/settings/applications/new
AUTH_GITHUB_SECRET=
AUTH_DEMO=on                    # 生产 off 关掉 demo provider

# 云端同步（不填则服务端走进程内 Map，多实例不共享、重启即丢）
KV_REST_API_URL=                # Upstash 控制台 REST URL
KV_REST_API_TOKEN=
NEXT_PUBLIC_SITE_URL=           # robots/sitemap/og 取这个
```

---

## 部署

最快路径（Vercel）：

```bash
gh repo create lasa --public --source=. --remote=origin --push
# 在 vercel.com 一键 Import；Project Settings → Environment Variables
# 把 .env.local 里需要的项搬进去
```

**Auth.js GitHub provider 注册**：
1. https://github.com/settings/applications/new 新建 OAuth App
2. Authorization callback URL：`${AUTH_URL}/api/auth/callback/github`
3. 把 Client ID / Secret 填到 `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`

**Upstash KV（用户跨设备同步）**：
1. https://console.upstash.com/ 创建 Redis Database
2. REST API → 拷 URL + Token，填 `KV_REST_API_URL` / `KV_REST_API_TOKEN`

**国内访问**：Vercel 国内不稳，备选路径：
- 过渡（免备案）：腾讯云 EdgeOne Pages / Cloudflare Pages + 自有域名
- 长期：阿里云函数计算 / 静态托管 + ICP 备案域名（30 工作日）

---

## 设计立场

**激励轴对齐健康**。早期 v2 设计过"集齐 49 格 BINGO"机制，但这隐式鼓励吃出异常状态（灰白 / 黑褐 / 暗红、Type 1 / Type 7）—— 跟"想越来越健康"的真实诉求相反。v2.2 把整个 BINGO 机制删掉，改成"做对了才奖励"的健康成就 + 健康分。

异常颜色（灰白 / 黑褐 / 暗红）反复出现时，档案页主动弹出**就医提示横幅**——本工具不构成医学建议，但这一栏特地拉出来提示用户。

---

## 微信小程序移植（计划中）

业务核心在 [`src/core/`](src/core/index.ts) 里已经按"零浏览器全局"的约束抽好了。

落地方案（待执行）：

1. 新仓库或同仓库 `mini/` 子目录初始化 Taro 项目
2. `npm link ../lasa/src/core` 或单独发包，把核心层装进去
3. 替换的薄壳：
   - 摄入 / 出卡按钮 → Taro `<View>` + `<Button>`
   - 拍立得卡 → `<canvas>` 服务端导图（用现有 `/api/share-card` edge 路由）
   - localStorage → `wx.setStorageSync`
   - SFX → 小程序原生 audio + `wx.vibrateShort`
   - Web Share → 小程序 `onShareAppMessage`
4. AI 接口走 H5 站同一组 `/api/*`（小程序合规需在公众号后台配 server domain）

阻塞项：上架需主体 + 类目，等 H5 这版稳了再走。

---

## 文档

- 开发规范：[CLAUDE.md](CLAUDE.md)
- 完整文档索引：[docs/README.md](docs/README.md)
- 设计原型：[prototype/index.html](prototype/index.html) · [prototype/animation.html](prototype/animation.html)
- v2 阶段日志：[V2_CHANGELOG.md](V2_CHANGELOG.md)
