# 动效规范：马桶接屎 + 拍立得吐卡

参考实现：[prototype/animation.html](../prototype/animation.html)（点"开拉"看完整序列）

## 总时长

**3.5 秒**（含主体动画 + 卡片入位）—— 可在最终调优时压到 2.8-3.2 秒

## 序列时间线

| 时间 | 元素 | 动作 | CSS 关键帧 |
|------|------|------|----------|
| 0.00s | 整个 stage | 屏幕震动一下 | `shake .35s ease-in-out` |
| 0.20s | 马桶 | 从底部弹出（带回弹） | `transform: translateY(200% → 0)` `cubic-bezier(.34,1.56,.64,1)` |
| 1.10s | 屎 | 从顶部掉落 | `drop 1.0s cubic-bezier(.55,.06,.68,.19)` 含挤压拉伸 |
| 1.90s | 水花 + 涟漪 | 落水时同时触发 | `splash .6s` + `ripple 1.2s` |
| 2.40s | 拍立得卡片 | 从马桶里"打印"出来 → 上移 → 摆动停稳 | `print 1.2s cubic-bezier(.34,1.56,.64,1)` |
| 3.60s | 臭气线 | 卡片就位后开始循环飘 | `stink 2.5s ease-in-out infinite` |

## 各段动效细节

### ① 屏幕震动

```css
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-4px); }
  40%     { transform: translateX(5px); }
  60%     { transform: translateX(-3px); }
  80%     { transform: translateX(2px); }
}
```

营造"诶？要发生事情了"的预期。

### ② 马桶弹出

- 起始位置：`translateY(200%)`（完全藏在屏幕下方）
- 终点：`translateY(0)`
- 缓动：`cubic-bezier(.34, 1.56, .64, 1)` —— overshoot 回弹，像玩具弹出
- 时长：0.8s

### ③ 屎掉落（带物理感）

不是简单的"top: 0 → 100%"，而是**模拟挤压拉伸**：

```css
@keyframes drop {
  0%   { top: -80px;   transform: scaleY(.7) scaleX(1.2); }  /* 出生时被挤压（横扁）*/
  20%  {                transform: scaleY(1.2) scaleX(.85); } /* 加速时拉长 */
  70%  { top: ~75%;    transform: scaleY(1.1) scaleX(.9); }
  85%  { top: ~76%;    transform: scaleY(.6)  scaleX(1.4); }  /* 撞水时再次挤扁 */
  100% { top: ~77%;    transform: scaleY(.8)  scaleX(1.1); opacity: 0; } /* 没入水 */
}
```

缓动用 `cubic-bezier(.55,.06,.68,.19)` —— ease-in，模拟自由落体加速。

### ④ 水花 + 涟漪

**水花**：5 条向上的弧线 SVG，从中心放大消失：

```css
@keyframes splash {
  0%   { opacity: 0; transform: scale(.3); }
  40%  { opacity: 1; }
  100% { opacity: 0; transform: scale(2); }
}
```

**涟漪**：圆环边框，从中心扩散：

```css
@keyframes ripple {
  0%   { opacity: .6; transform: scale(.5); }
  100% { opacity: 0;  transform: scale(2.5); }
}
```

两者同时触发，0.6s 内完成。

### ⑤ 拍立得打印

最有戏的一段，**4 段关键帧**：

```css
@keyframes print {
  0%   { transform: translateY(80%) rotate(-12deg) scale(.85); opacity: 0; }
  30%  { opacity: 1; }                                         /* 渐显 */
  60%  { transform: translateY(-90%) rotate(4deg) scale(1.05); } /* 弹出超过终点 */
  80%  { transform: translateY(-110%) rotate(-2deg) scale(1); }  /* 回摆 */
  100% { transform: translateY(-110%) rotate(0) scale(1); }      /* 摆稳 */
}
```

模拟拍立得相纸"咔嚓"被吐出来，带轻微旋转和缩放摇摆。

### ⑥ 臭气线（循环）

```css
@keyframes stink {
  0%,100% { transform: translateY(0);   opacity: .4; }
  50%     { transform: translateY(-6px); opacity: .9; }
}
```

3 个 `〰️` emoji，错峰 0.5s 启动，营造连续飘动。

## 中断与可用性

- **重放按钮** `↻ 重放`：重置所有动画类，让用户能反复看
- **可跳过**：长按或快速双击 stage → 直接跳到结果（最终版考虑加）
- **prefers-reduced-motion**：检测到用户系统偏好"减少动画" → 直接淡入卡片，跳过马桶序列

```css
@media (prefers-reduced-motion: reduce) {
  .toilet, .poo, .splash, .ripple, .card { animation: none !important; }
  .card { opacity: 1; transform: none; }
}
```

## 性能约束

- 全部用 `transform` + `opacity`（GPU 合成，避免 layout/paint）
- 不用 `top/left` 做位移（改用 `translate`）—— 当前 prototype 里有 `top` 是偷懒，集成时要改
- SVG 复杂度控制：单帧节点数 < 50
- 动画结束后 `animation-fill-mode: forwards`，不留 reflow

## 音效（可选，需用户先交互）

| 时机 | 音效 | 时长 |
|------|------|------|
| 马桶弹出 | "duang" 弹簧声 | 0.3s |
| 屎落水 | "扑通" | 0.4s |
| 涟漪 | 水波 reverb | 0.8s |
| 拍立得打印 | "咔嚓 / 嗡嗡" 相机马达 | 0.7s |

**默认关**，给个🔇按钮让用户主动开。文件不超过 50KB / 个，用 `<audio>` 预加载。

## 参数化💩 SVG（核心可视化）

最重要的一部分：根据预测结果**动态绘制**不同形态。

| Bristol | 形状描述 | SVG 实现要点 |
|---------|---------|-------------|
| 1 | 一颗颗硬球 | 4 个错位圆形 + 边缘描边 |
| 2 | 凹凸香肠 | 闭合 path，多个凸起节点 |
| 3 | 裂纹香肠 | 椭圆 + 数条曲线裂纹 |
| 4 | 光滑 S 型 | 单 path 平滑曲线 + 高光 |
| 5 | 软团 3 块 | 3 个椭圆错落 |
| 6 | 糊状 | 不规则 path + 边缘破碎 |
| 7 | 水状 | 半透明扁椭圆 + 飞溅小滴 |

**颜色**：通过 `fill` 属性动态注入，无需重新生成 path。
**油亮**：叠加 `<ellipse>` 白色高光层。

详细 SVG 在 [prototype/animation.html](../prototype/animation.html) 的 `renderPoo()` 函数里。

## 升级路径：换成 AI 生图

参数化 SVG 是 Demo 用的"画师能力上限"。**最终上线建议**用 AI 生成的高保真插画替换：

- 流程见 [research/image-prompts.md](../research/image-prompts.md)
- 7 张 PNG（基础健康棕色）+ CSS filter 动态变色 + 高光叠加层（油亮）
- 结构上 SVG 容器换成 `<img>`，其他动效逻辑不变
