# 预测引擎规则草案

把"用户输入的食物 + 份量"转换成"💩 预测结果"的算法草稿。开发时可以直接照搬。

## 输入

```ts
type FoodEntry = { food_id: string; grams: number };
type MealInput = FoodEntry[];
```

## 输出

```ts
type PoopPrediction = {
  bristol_type: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  color: "brown" | "dark_brown" | "green" | "orange" | "yellow" | "pale_yellow" | "red_purple" | "dark";
  volume: "small" | "medium" | "large" | "huge";
  smell: 1 | 2 | 3 | 4 | 5;        // 1 = 几乎无味, 5 = 邻居敲门
  floats: boolean;                  // 漂浮 = 脂肪过多
  greasy: boolean;                  // 油亮
  comment: string;                  // 一句话吐槽
  warnings?: string[];              // 健康提示
};
```

## 第 1 步：聚合宏量营养素

遍历每个 food entry，按 `grams / 100` 缩放后加总：

```ts
total = {
  kcal:     sum(food.kcal     * grams / 100),
  carbs:    sum(food.carbs    * grams / 100),
  fiber:    sum(food.fiber    * grams / 100),
  protein:  sum(food.protein  * grams / 100),
  fat:      sum(food.fat      * grams / 100),
}
```

也累计标签计数：`tag_counts = { high_fat: 2, dairy: 1, ... }`

## 第 2 步：计算各项指标

### 2.1 Bristol Type（形态）

主要看 **纤维 vs (蛋白质 + 脂肪)** 的平衡：

```
fiber_ratio = fiber / (total_grams_food / 100)   // 每 100g 食物含纤维
fat_pct     = fat * 9 / kcal
protein_pct = protein * 4 / kcal

if fat_pct > 0.5:                  return 6 or 7    // 油性腹泻
elif fiber < 5:                    return 1 or 2    // 便秘倾向
elif fiber < 15 && protein_pct > 0.3: return 2 or 3
elif fiber >= 25:                  return 4         // 理想
elif has_tag("lactose") && lactose_intolerant: return 6
elif has_tag("high_sugar") && fiber < 10: return 5 or 6
else:                              return 3 or 4
```

### 2.2 颜色

按"主导色彩食物的克数"投票，加权：
- `red_purple` / `green` / `orange` / `dark` 这些"染色力强"的颜色 → 只要超过 50g 就压过 brown
- 多种染色食物时，按摄入克数决定胜者
- 高脂肪（fat_pct > 0.45）→ `pale_yellow`
- 默认 → `brown`

### 2.3 体积

```
volume_score = fiber * 5 + carbs * 0.5 + total_grams * 0.1
< 50:    "small"
50-150:  "medium"
150-300: "large"
> 300:   "huge"
```

### 2.4 气味（1-5）

```
smell = 1
+ has_tag("red_meat")      → +1
+ has_tag("dairy") > 200g  → +1
+ has_tag("cruciferous")   → +1   // 西兰花、白菜产硫
+ protein > 50g            → +1
+ has_tag("alcohol")       → +1
clamp 1..5
```

### 2.5 漂浮 / 油腻

```
floats = fat_pct > 0.45 || fat > 60g
greasy = fat_pct > 0.4
```

### 2.6 一句话吐槽（comment）

按主导特征选模板，比如：

| 触发条件 | 模板 |
|---------|------|
| Bristol 7 + floats | "这顿油得能煎鸡蛋，建议明天蹲坑别看手机。" |
| Bristol 1 + low fiber | "你这便便硬得能当弹珠用，多吃点菜吧朋友。" |
| color = green + fiber 高 | "绿油油的，像踩了一脚草坪，但这是健康的颜色。" |
| color = red_purple | "别慌，是你昨天吃的火龙果/甜菜，不是出血。" |
| 高纤维 + Bristol 4 | "教科书级排便，今天的你 win 了。" |

### 2.7 警告

- 持续 fat_pct > 0.5 → "长期高脂可能影响胆胰健康"
- 摄入 < 5g 纤维 → "今天纤维严重不足，便便会很难受"
- 含 `alcohol` 且 > 500ml → "酒精会脱水，便便会变硬"

## 第 3 步：序列化结果

返回 JSON 给前端，前端配上对应的 Bristol 卡通图、颜色 swatch、气味"臭味线"动效、漂浮波纹动画即可。

## 第 4 步（可选）：LLM 增强

把 `total` + `tag_counts` 喂给一个小 LLM（或用模板 + 随机种子），生成更搞笑的吐槽文案，让结果更有传播性。Claude API 集成参考根目录 `package.json`。
