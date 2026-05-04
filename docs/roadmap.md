# 进度跟踪

## ✅ 已完成（前期准备阶段）

### 研究 [research/](../research/)
- [x] 三大营养素 → 粪便特征理论梳理（[theory.md](../research/theory.md)）
- [x] Bristol Stool Scale 7 类详解（[bristol-stool-scale.md](../research/bristol-stool-scale.md)）
- [x] 大便颜色 → 食物映射（[stool-colors.md](../research/stool-colors.md)）
- [x] 40+ 常见食物宏量营养素数据库（[food-macros.json](../research/food-macros.json)）
- [x] 预测引擎规则草案 + TS 类型签名（[prediction-rules.md](../research/prediction-rules.md)）
- [x] AI 生图 prompt 包（[image-prompts.md](../research/image-prompts.md)）
- [x] 全部研究来源汇总（[sources.md](../research/sources.md)）

### 原型 [prototype/](../prototype/)
- [x] 3 屏低保真线框图（双 Tab + 结果页）：[index.html](../prototype/index.html)
- [x] 出卡动效原型（马桶接屎 + 拍立得）：[animation.html](../prototype/animation.html)
- [x] 7 类 Bristol 形态参数化 SVG 渲染（含颜色 / 油亮可调）

### 决策 [docs/](.)
- [x] 完整产品定义 v0.1
- [x] 交互细节规范
- [x] 动效规范
- [x] 设计系统（写实色板）
- [x] AI 集成方案
- [x] 决策日志

### 配置
- [x] MiniMax API Key 已配置到 [.env.local](../.env.local)（gitignored）

---

## 🚧 进行中

无（等用户拍板出图方案 + 是否进入开发）

---

## 📋 下一步（按优先级）

### P0 · 必须完成才能上线

#### 阻塞项（等用户）
- [ ] **确认动效 OK**：用户看完 [animation.html](../prototype/animation.html) 反馈
- [ ] **图片素材决策**：
  - 选项 A：用 GPT 出 7 张 Bristol 插画（用 [image-prompts.md](../research/image-prompts.md) 里的 prompt）
  - 选项 B：直接用现有 SVG 上线，后续再优化
- [ ] **品牌名最终敲定**（当前占位"拉啥 LASA"）

#### Next.js 集成开发
- [ ] 决定项目结构：是替换现有 Stori，还是作为子项目共存
- [ ] 把动效组件迁入 `src/components/`
- [ ] 把首屏（双 Tab + 今日摄入）迁入 `src/app/page.tsx`
- [ ] 写 `src/lib/predict-engine.ts`：实现 [prediction-rules.md](../research/prediction-rules.md) 的算法
- [ ] 写 `src/lib/food-db.ts`：load + 查询 food-macros
- [ ] 写 `POST /api/parse-meal` route
- [ ] 写 `POST /api/generate-roast` route
- [ ] 写 `<PoopCard />` 组件（参数化 SVG / 后期换 PNG）
- [ ] 写 `<NutritionRing />` 组件（碳水/蛋白/脂肪环）
- [ ] 写 `<FoodChip />` 组件（食物芯片，可选 + 改份量）
- [ ] 写 `<IntakeList />` 组件（共享今日摄入，常驻）
- [ ] 写 `<MealParser />` 组件（文本输入 + AI 解析按钮 + 结果列表）
- [ ] 写 `<ToiletAnimation />` 组件（出卡动效封装）

#### 样式
- [ ] 实现 [design-system.md](design-system.md) 里的 token，写入 `globals.css`
- [ ] 移动端适配测试（375 / 414 / 768）
- [ ] 暗色模式 — **暂不做**（沙雕产品白底就够）

#### 分享
- [ ] 集成 `html2canvas`（或 `dom-to-image`）实现卡片导出
- [ ] Web Share API 实现一键分享
- [ ] OG 图模板（用结果卡截图）

#### 内容
- [ ] 写吐槽文案兜底模板池（API 失败时用，30-50 条）
- [ ] 写"科学小课堂"展开内容（Bristol 1-7 各一条）
- [ ] 写帮助页面 / "怎么玩" 弹窗

#### 上线准备
- [ ] favicon
- [ ] PWA manifest（可选）
- [ ] Vercel 部署配置
- [ ] 域名（如果要买）
- [ ] 简单埋点（点击量、分享量、热门食物组合）

---

### P1 · 上线后第一波迭代

- [ ] 历史记录（纯 localStorage 存最近 10 条）
- [ ] 神预测榜单 / 沙雕组合 Top 10
- [ ] 朋友 PK：两人同时输入比谁更"惨"
- [ ] 分享卡的设计模板可选（多套皮肤）
- [ ] 食物库扩充（基于真实用户输入分析）

### P2 · 远期可玩

- [ ] 微信小程序版
- [ ] AI 真的"拉"个语音播报（带搞笑配音）
- [ ] 与营养追踪 APP 联动（OpenFoodFacts API）
- [ ] 国际化（英文版 / 日文版）

---

## ⚠️ 开放问题

| 问题 | 影响 | 建议 |
|------|------|------|
| 项目结构：替换 Stori 还是共存？ | 大 | 等用户决定。如果共存，建议放 `apps/lasa/` |
| API 限流策略 | 中 | MVP 用简单内存计数，后期换 Vercel KV |
| AI 失败率 | 中 | 必须做兜底，模板池要写够 50+ 条 |
| 移动端键盘遮挡 CTA | 中 | 不用 fixed bottom，改用文档流 + 滚动跟随 |
| 用户上传食物图片识别 | 低 | 后续可加，用 GPT-4V，成本较高 |
