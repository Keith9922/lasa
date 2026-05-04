# CLAUDE.md — 拉啥 (LASA) 项目开发规范

> 本文是项目根 CLAUDE.md，在每次会话中自动加载。所有开发必须遵守。
> **项目对外/对内语境严格分离**：UI 文案只说"AI 分析"，内部代码注释/文档可写"MiniMax"。

---

## 📁 项目坐标

| 项目 | 凭据 |
|------|------|
| 名称 | 拉啥（LASA） |
| 仓库 | `shit`（私人沙盒仓） |
| 主分支 | `main`（稳定） |
| 集成分支 | `dev`（功能 PR 都合到这） |
| 本 worktree | `feat/lasa-mvp` @ `.claude/worktrees/lasa/` |
| 文档总览 | [docs/README.md](docs/README.md) |
| 设计原型 | [prototype/animation.html](prototype/animation.html) |

---

## 🎯 业务需求（一句话能讲清楚）

**告诉我今天吃了啥，我猜你明天拉啥** —— 用户输入今日饮食 → AI 解析 + 营养计算 → 基于"碳水→量、蛋白质→形、脂肪→质"伪科学理论预测便便（Bristol Type + 颜色 + 油亮 + 漂浮 + 气味）→ 拍立得卡片可分享。

**完整业务链路**：
```
食物输入（快捷选择 / 自然语言描述）
  ↓ AI 解析（描述 → 结构化食物清单）
今日摄入（共享购物车）
  ↓ 「开拉」 CTA
出卡动效（马桶接屎 + 拍立得，3.5s）
  ↓ 预测引擎（规则 + 兜底）
拍立得结果卡（Bristol + 颜色 + AI 吐槽 + 营养环 + 卡路里）
  ↓
分享（截图 PNG / Web Share API）
```

详细：[docs/product-spec.md](docs/product-spec.md)

---

## 🛠️ 开发流程（强制遵循 SuperPowers 体系）

每个开发任务必须按以下顺序，**漏掉就回退到对应步骤**：

### 第 0 步 · 加载 SuperPowers

```
Skill: using-superpowers
```

启动会话／接到任务时**必须**先加载，确认所有相关 skill 可用。

### 第 1 步 · Worktree（强制）

- 任何代码改动**必须**在 worktree 里执行，不在主仓库根目录写代码
- worktree 命名遵循：feature 分支 → `feat/<scope>`，bugfix → `fix/<scope>`，refactor → `refactor/<scope>`
- 当前 LASA 主 worktree 在 `.claude/worktrees/lasa/`
- 涉及独立子任务时，从 dev 拉新 worktree（命名规则同上），不直接堆在主 worktree

```
Skill: git-worktree
```

### 第 2 步 · 任务分类 → 加载对应 skill

| 任务类型 | 必须加载的 skill |
|---------|-----------------|
| 前端 UI / 组件 / 页面 | `frontend-design` + `ui-ux-pro-max` |
| 后端 API / 数据层 | （按需 `simplify`，无强制额外 skill） |
| 全栈（含前端 + 后端） | 上面两类全加载 |
| 修 bug | 先 `debugging` 类（如有相关 skill） |

### 第 3 步 · 写代码

遵循下面 **代码原则**（KISS / 单一职责 / 类型严格 / 不打补丁 / 文档置信度）。

### 第 4 步 · Simplify 审查（强制）

代码改完，调 `simplify` skill 自审：

```
Skill: simplify
```

审查内容：可复用性、质量、效率、是否有冗余、是否最简实现。**改完才能进 PJR**。

### 第 5 步 · PJR（强制）

```
Skill: git-pr-merge
```

PJR = `git-pr-merge`，做这些事：

1. **Lint**：`npm run lint`
2. **Build**：`npm run build`（前后端都要过）
3. **Typecheck**：`npm run typecheck`
4. **逻辑验证**：人工 + 自审通过
5. **合并**：当前分支 → `dev`（**不直接合 main**，dev 是功能集成分支）

### 第 6 步 · 端到端测试（强制，用 Playwright）

**不写测试脚本，是真实用 Playwright 当一个用户跑一遍流程**。

#### 前端验收标准

- **桌面端 + 移动端都要测**（375 / 414 / 768 / 1280 至少各一次）
- 不只是"看到页面就完事"，要**完整模拟用户行为**：每个按钮点一遍、每段输入填一遍、每个跳转走一遍
- 必须覆盖两类场景：
  - **正常流程**：从首页到分享，完整走通
  - **边界情况**：空输入、超长输入、AI 失败、网络断、重复点击、快速切 Tab、移动端键盘弹起遮挡 CTA…
- 找茬思维：**不是验证它对，是验证它有没有错**。检查清单：
  - [ ] 文字挤压 / 溢出 / 截断
  - [ ] 表述不一致（同一概念跨页面叫法不同）
  - [ ] 信息密度排版不合理
  - [ ] 内容不合适（场景错位、文案不对调性）
  - [ ] 无用信息 / 噪音 / 越权信息（比如 UI 出现"MiniMax"字样）
  - [ ] 圆角阴影间距等样式跨页面不一致
  - [ ] emoji 使用过度

#### 后端验收标准

**两类接口分别验**：

1. **非 AI 接口**（如 `/api/parse-cart` 这种纯数据处理）
   - 正常输入 → 预期输出
   - 异常输入（空 / null / 超长 / 格式错）→ 拦截预期错误
2. **AI 接口**（如 `/api/parse-meal`、`/api/generate-roast`）
   - **决策能力**：用复杂场景测——"周末火锅 + 啤酒 + 红糖糍粑"、"减脂日三餐沙拉"、"乳糖不耐患者喝奶茶"——看 prompt + 上下文 + 约束能不能让 AI 给出合理输出
   - **执行能力**：返回的 JSON 是否能被代码消费、字段是否齐全、份量数字是否合理

模块级任务（前后端都改）→ **两端都要测**。

### 第 7 步 · 合并

PJR + E2E 都过了之后，按 `git-pr-merge` 流程合到 `dev`。

---

## 📐 代码原则（不可妥协）

按重要性排序：

1. **单一职责**：每个服务、方法只负责一个明确的职责域
2. **最简代码**：**不做向后兼容**，宁愿破坏性更新也要保证最简化。删掉所有冗余
3. **类型严格**：TypeScript 严格模式，**绝不用 `any`**，编译错误立刻修
4. **KISS**：保持简单。如果需要解释才能懂，那就是太复杂了
5. **文档置信度**：绝不基于推测写代码。涉及支付 / 数据库 / API 时，文档置信度不够就**停下来要资料**，不猜
6. **不打补丁**：任何修改不得以"打补丁"的方式实现。必须遵循最佳实践，深度融合到代码逻辑里——通过重构 / 调整 / 结合现有逻辑改变。绝对禁止"为了解决某个需求绕过去"。
7. **最简结果**：不是"修改过程简单"，是"结果简洁却完整地实现了需求"。

---

## 🚫 严格禁止

- ❌ 直接在 `main` 或 `dev` 分支上写代码
- ❌ 跳过 worktree 直接在主仓库改文件
- ❌ 在用户可见 UI 文案里出现"MiniMax / GPT / Claude"等服务商名（仅"AI"）
- ❌ 用 `any` 类型逃避 TypeScript
- ❌ 不跑 lint/build/typecheck 就声明任务完成
- ❌ 不跑 Playwright E2E 就声明前端任务完成
- ❌ 跳过 `simplify` 审查直接进 PJR
- ❌ 跳过 `git-pr-merge` 直接 merge
- ❌ 在 UI 里出现下三路 / 粗俗 / 暗示性内容（沙雕 ≠ 低俗）
- ❌ 提交涉及 `.env.local` 等密钥文件（已 gitignore 但仍要警惕）

---

## 🌳 分支策略

```
main ──────────────────────●──────●─── (稳定，定期从 dev 合)
                          /      /
dev ──────────●──●──●────●──●───● (功能集成分支)
              /  /  /       /
   feat/X ──●  /  /        /
   feat/Y ──●─●  /       (合 dev)
   fix/Z ──────●
```

- `main`：稳定。**只**接受从 `dev` 来的合并
- `dev`：功能集成。所有 feature/fix 分支合到这里
- `feat/<scope>` / `fix/<scope>` / `refactor/<scope>`：feature 分支，从 `dev` 拉，做完合回 `dev`

---

## 🔌 AI 接入（内部技术细节）

- **服务商**：MiniMax（OpenAI 兼容接口）
- **环境变量**：`.env.local`（已 gitignored）
  - `MINIMAX_API_KEY`
  - `MINIMAX_BASE_URL`（默认 `https://api.minimax.io/v1`）
  - `MINIMAX_MODEL`（默认 `MiniMax-Text-01`）
- **调用位置**：仅 server-side（Next.js API Route），前端绝不直调
- **降级**：API 失败 → 本地规则引擎 + 模板池兜底，保持产品可用

详细：[docs/ai-integration.md](docs/ai-integration.md)

---

## 📚 关键文档

| 文档 | 内容 |
|------|------|
| [docs/product-spec.md](docs/product-spec.md) | 产品定义（功能边界、用户流程、数据流） |
| [docs/interaction.md](docs/interaction.md) | UI 交互规范（双 Tab、今日摄入、结果页） |
| [docs/animation.md](docs/animation.md) | 出卡动效（马桶接屎 + 拍立得） |
| [docs/design-system.md](docs/design-system.md) | 设计令牌（写实便便色系、字体、间距） |
| [docs/ai-integration.md](docs/ai-integration.md) | AI 接入与 prompt 设计 |
| [docs/decisions.md](docs/decisions.md) | 决策日志（按时间倒序） |
| [docs/roadmap.md](docs/roadmap.md) | 进度跟踪 |
| [research/](research/) | 背景研究（理论、食物库、图片 prompt） |
| [prototype/](prototype/) | 可运行原型（线框 + 动效） |

---

## 🚀 常用命令

```bash
# 开发
npm run dev          # 启动 dev server
npm run build        # 生产构建
npm run typecheck    # 仅类型检查
npm run lint         # ESLint

# Git
git status
git branch --show-current
git worktree list
```
