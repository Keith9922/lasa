# 大便颜色含义参考

| 颜色 | 常见原因 | 是否需要担心 |
|------|----------|-------------|
| **棕色** 🟤 | 正常（胆汁代谢产物）| ✅ 健康 |
| **深棕** | 红肉、可可、铁补充剂 | ✅ 正常 |
| **绿色** 🟢 | 大量绿叶菜、菠菜、人工色素、肠道转运过快 | 通常无碍，频繁则查感染 |
| **黄色** 🟡 | 高脂肪未吸收、姜黄、胡萝卜素、胆汁问题 | 偶发无碍，持续要查 |
| **浅灰/陶土色** ⚪ | 胆汁通路阻塞、严重脂肪泻 | ⚠️ 就医 |
| **黑色** ⚫ | 铁剂、铋制剂、蓝莓、甘草；**或** 上消化道出血 | ⚠️ 排除饮食后就医 |
| **红色** 🔴 | 甜菜、火龙果、番茄；**或** 下消化道出血 | ⚠️ 排除饮食后就医 |
| **橙色** 🟠 | 胡萝卜、南瓜、红薯、β-胡萝卜素 | ✅ 正常 |

## 食物 → 颜色映射（用于预测引擎）

```json
{
  "spinach": "green",
  "kale": "green",
  "matcha": "green",
  "beets": "red_purple",
  "dragon_fruit": "red_purple",
  "blueberries": "dark",
  "black_licorice": "dark",
  "iron_supplement": "dark",
  "carrots": "orange",
  "pumpkin": "orange",
  "sweet_potato": "orange",
  "turmeric": "yellow",
  "high_fat_meal": "pale_yellow",
  "red_meat": "dark_brown",
  "default": "brown"
}
```

## 网站交互建议

可以让用户从下拉/标签里选食物，每选一项就实时调整预测结果的颜色 + Bristol type，最后给出综合预测。
