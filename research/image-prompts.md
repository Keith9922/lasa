# 💩 Bristol 7 类便便 · 图片生成 Prompt 包

给 GPT-4o / DALL·E / Midjourney / Sora 等图片生成模型用。生成完后做 PNG 抠图（透明底），放到 `public/poo/` 目录。

## 整体策略

**只出 1 套基础色（健康棕 #6F4E37）的 7 张图**，颜色变体在前端用 CSS filter 动态调：

```css
/* 健康棕 → 其他颜色 */
.poo-dark-brown   { filter: brightness(.55); }                              /* 深褐 */
.poo-yellow       { filter: brightness(1.2) sepia(.3) hue-rotate(-15deg); } /* 黄褐 */
.poo-pale         { filter: brightness(1.4) saturate(.4); }                 /* 灰白 */
.poo-green        { filter: hue-rotate(40deg) saturate(.7); }               /* 绿褐 */
.poo-red-brown    { filter: hue-rotate(-15deg) brightness(.85); }           /* 暗红褐 */
.poo-black        { filter: brightness(.3); }                               /* 黑褐 */
.poo-greasy       { filter: contrast(1.1) brightness(1.05); }               /* + 油亮 */
```

省力 + 风格统一。

---

## 通用风格基底（每个 prompt 都加这段）

```
Style: Cartoon mascot illustration in the style of Pixar / Sanrio / cute kawaii character design.
Soft 3D clay-render look with gentle gradient shading, rounded chunky proportions, friendly
approachable feel, slightly waxy matte surface with subtle soft highlights and a soft drop shadow
beneath. Bold smooth outlines (or no outlines, just shape). Exaggerated cuteness — think Mario-game
prop or a children's mobile game asset. Front-three-quarter view, eye level. Color: warm medium
brown #6F4E37 base with darker #4E342E shadows and lighter #8D6E5C highlights. Fully opaque.
Centered subject filling 70% of frame. Plain pure white #FFFFFF background (will be removed later).
No face, no eyes, no expression — pure shape character. Soft ambient light from upper left.
Render quality: 2K, sharp edges, no noise, no text, no watermark, no signature.

Negative: photorealistic, gross, scatological-disgust, real feces photograph, anatomical, medical
illustration, dark moody, horror, blood, hair, flies, insects, dirty surface, sketchy, hand-drawn,
watercolor, low-poly, pixelated, anime, manga, complex background.
```

---

## 类型 1 · 硬球（Type 1）

> 状态：严重便秘。"像羊粪/坚果一样的一颗颗硬球"

**Prompt：**
```
[通用风格基底]
Subject: A small cluster of 4 to 5 separate round hard pellets, like rabbit droppings or large
hazelnuts, arranged loosely in a flat group as if just dropped. Each pellet is roughly spherical
with very slight irregularity, hard and dry-looking surface texture (subtle bumps, no cracks).
Pellets vary slightly in size, the largest in front. They are NOT touching each other; small gaps
between them suggest they are separate.
```

---

## 类型 2 · 凹凸香肠（Type 2）

> 轻度便秘。"香肠状但表面凹凸不平、由小球粘连"

**Prompt：**
```
[通用风格基底]
Subject: A short, fat sausage-shaped log made of multiple small ball-like lumps fused together,
visible bumps and dimples on the surface like a string of pearls compressed into one mass. About 3
times as long as it is wide. Slightly curved. Surface looks knobbly and uneven but solid. End caps
rounded. NO smooth sections.
```

---

## 类型 3 · 裂纹香肠（Type 3）

> 正常偏干。"香肠状，表面有裂痕"

**Prompt：**
```
[通用风格基底]
Subject: A medium-length sausage-shaped log, mostly smooth cylindrical body with several
characteristic surface cracks running across and along the length, like dried mud or a baked bread
loaf surface. Cracks are shallow grooves, not splits. Slight gentle curve. Both ends slightly
tapered. Solid and well-formed.
```

---

## 类型 4 · 光滑香肠（Type 4，理想）⭐

> 健康理想型。"光滑柔软的香肠/蛇形"

**Prompt：**
```
[通用风格基底]
Subject: A long, smooth, perfectly formed sausage shape with one gentle S-curve, like a small snake
or a fat smooth coil. Surface is glossy-smooth with NO cracks, NO bumps. Uniform diameter along
its length, ends gently rounded. Looks soft yet well-formed, holds its shape. The ideal healthy
poop shape. Subtle highlight along the top to suggest soft sheen.
```

---

## 类型 5 · 软团（Type 5）

> 缺纤维偏稀。"软团块、边缘清晰"

**Prompt：**
```
[通用风格基底]
Subject: 3 separate soft blob-like pieces of different sizes, each with rounded clean-cut edges,
sitting in a loose group. Each blob looks soft, slightly squishy, slightly flattened on the bottom
as if they slumped a bit when landing. NO cracks, NO bumps. Edges are soft but well-defined.
```

---

## 类型 6 · 糊状（Type 6）

> 轻度腹泻。"糊状、毛糙边缘的碎片"

**Prompt：**
```
[通用风格基底]
Subject: A messy mushy mound of fluffy fragmented pieces with ragged irregular edges, like soft
oatmeal porridge piled together. Edges are torn and wispy, not clean. Some loose smaller pieces
scattered immediately around the main mass. Surface is matte, soft, not glossy. Looks unstable as
if it's about to spread.
```

---

## 类型 7 · 水状（Type 7）

> 严重腹泻。"完全水样、无固体"

**Prompt：**
```
[通用风格基底]
Subject: A flat liquid puddle splash with very irregular wavy outline, like spilled coffee or thin
mud. Almost no thickness, completely flat. A few small splatter droplets around the main puddle
edge. Slight reflective sheen on top to suggest liquid. NO solid pieces visible at all. Translucent
edge fading to opaque center.
```

---

## 🚽 配套：可爱马桶（动效背景主角）

> 用在出卡动效里"屎掉进马桶"那一段。要和 7 类💩**同一画风家族**，不能一个写实一个卡通。

**Prompt：**
```
Style: Cartoon mascot illustration in the style of Pixar / Sanrio / cute kawaii character design.
Soft 3D clay-render look with gentle gradient shading, rounded chunky proportions, friendly
approachable feel, slightly waxy matte surface with subtle soft highlights and a soft drop shadow
beneath. Bold smooth outlines or no outlines (clean shape). Exaggerated cuteness — think a prop
in a Mario game or a Sanrio collectible figurine.

Subject: A cute cartoon Western-style flush toilet, front-three-quarter view, slightly tilted as
if smiling at the camera. Plump rounded shapes — chubby tank on top, oval seat, round bowl below.
Pure clean white porcelain body #FFFFFF with very soft pale-blue shadow tones #E3F2FD in the
recesses. Inside the bowl: a clear ring of bright cheerful cyan-blue water #4FC3F7 with a tiny
sparkle highlight, sitting at the rim level so things can splash into it. A small flat round
flush button on top of the tank in light gray. NO toilet paper, NO bathroom background, NO floor,
NO wall, NO pipes — just the toilet floating against pure white background.

Centered, filling 70% of frame, leaving headroom above the bowl opening (something will drop in
from above). 2K, sharp edges, no noise, no text, no watermark, no signature.

Negative: photorealistic, dirty, stained, yellow water, urine, brown water, broken, rusty, scary,
cracked, complex bathroom, tiles, plumbing, hands, people, anime, manga, sketchy, hand-drawn,
watercolor, low-poly, pixelated.
```

**额外可选**（如果你想更萌）：
```
Optional cuteness boost: Slight subtle blush spots on the tank cheeks (very pale pink #FFCDD2),
no facial features though — just a hint of warmth, like a Sanrio toy.
```

**出图与集成提示**：
- 让水面位于图片大约 **60% 的高度**，给上方留💩下落空间
- 抠图保存为 `public/toilet.png`（透明底，1024×1024）
- CSS 集成时，💩动画终点对齐水面 Y 坐标即可

---

## 油亮变体（脂肪过多的脂肪泻视觉）

如果上面 7 张已经够用，可以**直接 CSS 加高光层**实现油亮，不用单独出图：

```html
<div class="poo-container" style="position:relative">
  <img src="/poo/type-6.png" />
  <!-- 油亮高光叠加层 -->
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 35% 30%, rgba(255,255,255,.5) 0%, transparent 50%);mix-blend-mode:overlay;pointer-events:none"></div>
</div>
```

**或者**单独再出 7 张油亮版（如果觉得 CSS 高光不够油），prompt 在主体描述前加：

```
EXTRA: Surface has strong wet glossy oily highlights, multiple bright reflective spots, looking
greasy and slick like coated in oil. The shape is otherwise the same.
```

---

## 出图流程建议

1. **先出 Type 4（理想型）做基准**，确认风格、尺寸、留白比例都对
2. 用 Type 4 的 prompt 做模板，生成另外 6 张，**强调"same style as previous, same size, same lighting"**
3. **统一抠成透明底 PNG**，1024×1024，保存为 `public/poo/type-1.png` ~ `type-7.png`
4. 给我，我集成到 `<PoopCard>` 组件里替换 SVG
5. 如果出来效果不行，再迭代 prompt 或者换模型

## 验收清单（每张图必须满足）

- [ ] 透明背景（或纯白便于一键抠图）
- [ ] 主体居中，占画面 65-75%（留呼吸空间）
- [ ] **风格一致**（7 张并排时是同一系列）
- [ ] 形状辨识度高（一眼能看出是哪个 Bristol type）
- [ ] 颜色都是基准的健康棕 #6F4E37 范围（其他颜色用 CSS 滤镜）
- [ ] 没有脸 / 表情 / 文字 / 苍蝇等装饰

## Fallback：如果你懒得出图

我目前的 SVG 已经能用了（Demo 里看得到），上线版我会再精修一轮：
- 加更多渐变层次
- 加边缘扰动让形状更自然
- 加投影
- 7 个形状的辨识度再加强

但插画的"温度感"只有真实图片才有，建议还是出图。
