# AI 集成（内部技术文档）

⚠️ **对内文档** —— 提及具体服务商。**对外（UI 文案）一律称"AI 分析" / "AI 解析"，不出现服务商名字**。

## 服务商

- **MiniMax**（OpenAI 兼容接口）
- 配置：见 [.env.local](../.env.local)
- 文档：
  - https://platform.minimaxi.com/docs/token-plan/quickstart
  - https://platform.minimaxi.com/docs/token-plan/best-practices

## 环境变量

```bash
MINIMAX_API_KEY=sk-cp-xxx     # 已在 .env.local 配置
MINIMAX_BASE_URL=https://api.minimax.io/v1
MINIMAX_MODEL=MiniMax-Text-01
```

## 调用方式

**Server-side only**（Next.js API Route）—— 严禁前端直调，避免 key 泄露。

```ts
// 推荐复用 Stori 项目里的 src/lib/minimax.ts
import { minimaxChat } from "@/lib/minimax";

const response = await minimaxChat({
  messages: [...],
  responseFormat: { type: "json_object" },  // 强制 JSON
  temperature: 0.3,                          // 解析任务低温度
});
```

## 两个 AI 调用点

### 调用 1：自然语言 → 食物清单（解析任务）

**场景**：Tab 2 用户输入 "吃了两盘羊肉一盘青菜还喝了瓶啤酒"

**API Route**：`POST /api/parse-meal`

**Prompt（System）**：
```
你是一个营养食物解析助手。把用户描述的一餐转换成结构化食物清单。

输出 JSON：
{
  "items": [
    {
      "name": "食物名（简洁中文）",
      "emoji": "对应 emoji",
      "grams": 数字（估算克数）,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "notes": "如果有不确定项，简短说明"
}

规则：
- 不要询问，直接合理估算份量。一盘 = 200g，一杯 = 250ml，一瓶啤酒 = 500ml，一份 = 一人量
- 中式餐厅常见菜按一人份估算
- 模糊描述用 confidence: "medium" 或 "low"
- 不要拒绝、不要解释、只返回 JSON
```

**温度**：0.2（要稳定可预测）
**max_tokens**：500

**前端处理**：
- 拿到 `items` 后展示在解析结果卡，每项可手动调份量
- `confidence: low` 的食物 → 高亮提示"AI 不太确定"

---

### 调用 2：预测结果 → 吐槽文案（创作任务）

**场景**：预测引擎算出 `{ bristol: 6, color: "黄褐", greasy: true, ... }` 后，让 AI 生成一句沙雕吐槽

**API Route**：`POST /api/generate-roast`

**Prompt（System）**：
```
你是一个网感十足、嘴贱但善意的"💩预言家"。根据用户今天的食物和预测的便便属性，生成一句 30-60 字的沙雕吐槽。

风格要求：
- 网络梗、口语化、有节奏
- 玩梗但不下三路、不粗俗
- 适度夸张、自嘲调侃
- 末尾可以来个小建议或调侃式安慰

输出 JSON：
{
  "roast": "吐槽文案",
  "advice": "一句话建议（可选，比如'明天多喝水'）"
}

不要长篇大论，不要严肃说教。
```

**Prompt（User）**：动态拼接食物清单 + 预测结果 JSON

**温度**：1.0（要有创意有变化）
**max_tokens**：200
**top_p**：0.9

**前端处理**：
- `roast` 直接展示在结果卡的"AI 吐槽"区
- `advice` 显示在卡片下方小字
- 如果 API 失败 → fallback 到本地 [research/prediction-rules.md](../research/prediction-rules.md) 里的模板池

## 失败兜底策略

| 失败场景 | 降级方案 |
|---------|---------|
| 解析 API 超时/出错 | 返回错误 toast，让用户切到 Tab 1 手动选 |
| 解析返回空 / JSON 格式错 | 同上，前端不崩 |
| 吐槽 API 失败 | 用本地模板池随机抽一句（保持产品可用） |
| 没有 API Key（开发模式） | 解析走本地关键词匹配；吐槽走模板池 |

## 速率限制 & 成本

- 每次"开拉"最多调 2 次 API（解析 + 吐槽）
- 单次成本估算：~3000 token in + 200 token out ≈ ¥0.005-0.01
- **前端节流**：相同输入 5 分钟内不重复调用（用 hash 缓存到 localStorage）
- **服务端限流**：单 IP 每分钟 ≤ 10 次（用 Vercel KV 或简单内存计数）

## 安全 & 隐私

- ✅ Key 仅在 server-side 使用
- ✅ 不记录用户输入到日志
- ✅ 不传 PII（用户输入纯食物文本，无个人信息）
- ⚠️ 第三方风险：用户可能在文本里写敏感内容 → server 接收时做基础过滤（屏蔽明显的 prompt injection 关键词）

## 开发联调清单

- [ ] 接入 `src/lib/minimax.ts`（或新建 `src/lib/ai.ts`）
- [ ] 写 `POST /api/parse-meal` route
- [ ] 写 `POST /api/generate-roast` route
- [ ] 前端 hook `useMealParser()` / `useRoaster()`
- [ ] 失败兜底链路测试
- [ ] 速率限制测试
- [ ] 移除任何 console.log 涉及 key 或完整 prompt
