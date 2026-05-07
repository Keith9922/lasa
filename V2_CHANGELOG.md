# LASA v2 Changelog · 2026-05-07

> Claude 在 Cowork 沙盒里完成的全部改动汇总。
> 主分支：`feat/v2-progression`（基于 main）。
> 回滚锚点：`git reset --hard checkpoint/pre-v2-2026-05-07`。

---

## 阶段 0 · 工程清理

| 文件 | 改动 |
|------|------|
| `src/app/layout.tsx` | 完整 metadata（icon/manifest/og/twitter/apple-web-app）；视口允许缩放（A11y） |
| `public/manifest.webmanifest` | **新增** PWA 清单 |
| `public/icon.svg` | **新增** 主图标矢量 |
| `public/icon-192.png` `icon-512.png` `apple-touch-icon.png` `favicon.ico` | **新增** 由 ImageMagick 从 SVG 生成 |
| `public/og.svg` `og-image.png` | **新增** 1200×630 社交卡片 |

> `lucide-react ^1.14.0` 实际是 npm latest tag（与 0.5xx 是平行版本线），无需改。
> `npm install` 后用户可手动加 `@vercel/analytics` 进 layout（沙盒 npm install 跑不动）。

## 阶段 1 · 本地数据层

| 文件 | 改动 |
|------|------|
| `src/lib/storage.ts` | **新增** 4 张表：history / dex / achievements / settings；SSR-safe；一站式 `recordCard()`；`findPendingVerdict()`；`exportAll()` / `clearAll()` |
| `src/app/page.tsx` | 出卡流程 hooks 进 `recordCard()` |

## 阶段 2 · 历史 + 明日验证回路

| 文件 | 改动 |
|------|------|
| `src/app/history/page.tsx` | **新增** 时间轴；按日分组；卡片缩略圆；"准/一般/不准"反馈按钮 |
| `src/app/dex/page.tsx` | **新增** 49 格图鉴 + 成就墙 + 解锁进度条 |
| `src/components/yesterday-prompt.tsx` | **新增** 首页「昨天那张准不准」插槽 |
| `src/app/page.tsx` | brand-actions 加图鉴/日记入口 + 图鉴解锁数徽章 |
| `src/app/globals.css` | +260 行：history / dex / yesterday-prompt 样式；reduced-motion 适配新组件 |

## 阶段 3 · 预测引擎升级

| 文件 | 改动 |
|------|------|
| `src/lib/predict.ts` | **重写**：加权打分代替 if-else 链；`computeHydration()` 水合维度；`computeTimeProfile()` 进食时段；`bristolBias` / `volumeBias` 校准接口；空摄入守卫；总热量并入体积 |
| `src/lib/schemas.ts` | KNOWN_TAGS 扩展（hydration_high / hydration / meal_* / probiotic / fermented / 烹饪方式）；`ParseMealResponseSchema` 加 `totalWaterMl` |
| `src/app/api/parse-meal/route.ts` | prompt 加水分 / 时段 / 益生菌标签说明 + 新示例 |
| `src/lib/foods.ts` | 12 → 23 项；按 main / drink / fruit / snack 分组；补 v2 标签 |
| `src/components/quick-pick-pane.tsx` | 按 category 分组渲染；新提示文案 |
| `src/components/describe-pane.tsx` | 透传 `totalWaterMl` 上去 |
| `src/lib/predict.test.ts` | **新增** 10 个单测，覆盖空态、纯肉、高纤、高脂、染色、益生菌、bias、水分、巨量、时段；全 pass |
| `package.json` | `npm test` 脚本 + `tsx` devDep |

## 附加 1 · SFX + 震动

| 文件 | 改动 |
|------|------|
| `src/lib/sfx.ts` | **新增** Web Audio API 合成 4 音色（drop/polaroid/fanfare/tick）+ navigator.vibrate；走 settings 开关 |
| `src/components/toilet-animation.tsx` | drop/polaroid 时点同步音效 |
| `src/components/achievement-overlay.tsx` | legendary 触发 fanfare |

## 附加 2 · /settings 页 + tone 双调性

| 文件 | 改动 |
|------|------|
| `src/app/settings/page.tsx` | **新增** 音效/震动开关 + tone radio + 校准状态 + JSON 数据导出 + 二次确认清空 |
| `src/app/api/generate-roast/route.ts` | 接受 `tone: "savage" \| "gentle"`，gentle 走营养师 prompt + 温度 0.6 |
| `src/app/page.tsx` | fetchRoast 透传 tone；brand-actions 加 settings 入口 |
| `src/app/globals.css` | settings group / iOS-toggle / radio / btn-danger 样式 |

## 附加 3 · 首页"随便来一顿" demo

| 文件 | 改动 |
|------|------|
| `src/app/page.tsx` | `handleSurprise()`：随机 main+drink (+fruit) → 自动开拉；intake 为空时副 CTA |
| `src/app/globals.css` | `.cta-secondary` 虚线按钮样式 |

---

## 验证

- ✅ `tsc --noEmit -p .` —— 0 类型错误
- ✅ `eslint src/` —— 0 警告
- ✅ `node --import tsx --test src/lib/predict.test.ts` —— 10/10 pass
- ⚠ `next build` —— 沙盒 SHM 不足 bus error，需在你本机跑

## 下一步（你来做）

1. **清掉沙盒留下的死锁**：
   ```bash
   cd /Users/ronggang/code/funcode/shit/lasa
   rm -f .git/index.lock
   ```

2. **本机验证一遍**：
   ```bash
   npm install              # 装新增的 tsx
   npm run typecheck        # 应该 0 错
   npm run lint             # 应该 0 警告
   npm test                 # 10 用例 pass
   npm run build            # 生产构建
   npm run dev              # 在浏览器走一遍：开拉 / 图鉴 / 历史 / 设置 / 随便来一顿
   ```

3. **commit & push**（建议拆成 5 个 commit）：
   ```bash
   git add public/ src/app/layout.tsx README.md
   git commit -m "chore(v2): PWA manifest + icons + OG image + metadata"

   git add src/lib/storage.ts src/app/page.tsx
   git commit -m "feat(v2): localStorage data layer (history/dex/settings)"

   git add src/app/history/ src/app/dex/ src/components/yesterday-prompt.tsx src/app/globals.css
   git commit -m "feat(v2): history timeline + dex grid + yesterday verification loop"

   git add src/lib/predict.ts src/lib/predict.test.ts src/lib/schemas.ts src/lib/foods.ts \
           src/app/api/parse-meal/route.ts src/components/quick-pick-pane.tsx \
           src/components/describe-pane.tsx package.json
   git commit -m "feat(v2): prediction engine v2 (hydration + time + calibration)"

   git add src/lib/sfx.ts src/app/settings/ src/app/api/generate-roast/route.ts \
           src/components/achievement-overlay.tsx src/components/toilet-animation.tsx
   git commit -m "feat(v2): SFX/haptics + settings page + gentle tone"

   git push -u origin feat/v2-progression
   git push origin checkpoint/pre-v2-2026-05-07  # 把回滚锚点也推上去
   ```

4. **PR 流程**：在 GitHub 开 PR `feat/v2-progression → main`（或先合到 dev 如果你建了 dev 分支）。
   关键自检点：
   - [ ] 移动端（375px）首页打开，brand-actions 是否换行不挤
   - [ ] 出第一张卡，看 history/dex 是否落本地
   - [ ] 第二天回来：YesterdayPrompt 是否出现
   - [ ] /settings 切到 gentle，重新出卡，roast 是否变温柔
   - [ ] /settings 切关音效，再出卡，应该静音
   - [ ] /settings 导出 JSON，看格式是否完整

5. **可选**：把 `feat/lasa-mvp` 远端死分支删了（已并入 main）：
   ```bash
   git push origin --delete feat/lasa-mvp
   ```

## 回滚

任何时候发现哪里崩了：

```bash
git checkout main
git branch -D feat/v2-progression       # 扔掉 v2 分支
# 或者只回到出问题前的 commit：
git reset --hard checkpoint/pre-v2-2026-05-07
```
