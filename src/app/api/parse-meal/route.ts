/**
 * POST /api/parse-meal
 *
 * 接收用户自然语言描述（"中午吃了两盘羊肉一盘青菜..."），
 * 让模型解析为结构化食物清单 + 宏量估算。
 *
 * 响应失败时返回 503，前端走兜底（提示切到快捷选择）。
 */

import { NextResponse } from "next/server";
import { chat, extractJson, AIError } from "@/lib/ai";
import { ParseMealRequestSchema, ParseMealResponseSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个营养食物解析助手。你的任务是把用户描述的一餐转换成结构化食物清单 + 宏量营养素估算。

输出 JSON：
{
  "items": [
    {
      "name": "食物名（中文，简洁）",
      "emoji": "对应 emoji（一个）",
      "grams": 估算克数（整数），
      "confidence": "high" | "medium" | "low",
      "kcal": 整体热量（整数）,
      "carbs": 碳水克数,
      "fiber": 纤维克数,
      "protein": 蛋白质克数,
      "fat": 脂肪克数,
      "tags": ["相关标签"]
    }
  ],
  "notes": "若有不确定项，简短说明（可选，<60字）"
}

份量估算约定：
- 一盘 ≈ 200g（菜）/ 250g（肉）/ 150g（叶菜）
- 一杯/一份饮料 ≈ 250ml
- 一瓶啤酒 ≈ 500ml
- 一份外卖 ≈ 一人量
- 模糊描述用 confidence: "medium" 或 "low"

可用 tags（自由组合，**与颜色相关的染色 tag 务必加全**）：
- 类型：staple（主食），red_meat（红肉，含牛猪羊），fish（鱼），dairy（乳制品），lactose
- 形态：vegetable（蔬菜），leafy_green（绿叶菜：菠菜/青菜/羽衣甘蓝/西兰花），cruciferous（十字花科），fruit
- 营养特征：high_fat（高脂），high_sugar（高糖），high_fiber（高纤维），fried（油炸），sweet（甜食）
- 染色（影响便便颜色，能加就加）：
  - red_pigment：甜菜根/红心火龙果/红心番薯/红色食用色素
  - dark_pigment：蓝莓/黑莓/黑芝麻/黑米/铁剂/活性炭
- 其他：alcohol（酒精），spicy（辛辣），fast_food（快餐）

规则：
- 估算请基于常识，不要拒绝。如果完全没法估算就忽略，不要乱编。
- 不要输出任何解释、寒暄、或 markdown，只输出 JSON 对象。`;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = ParseMealRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "输入格式不对" }, { status: 400 });
  }

  try {
    const raw = await chat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: parsed.data.text },
      ],
      temperature: 0.2,
      maxTokens: 1000,
      responseJson: true,
    });

    const obj = extractJson(raw);
    if (!obj) {
      return NextResponse.json({ error: "AI 返回非 JSON" }, { status: 502 });
    }

    const validated = ParseMealResponseSchema.safeParse(obj);
    if (!validated.success) {
      return NextResponse.json(
        { error: "AI 返回结构不符合预期", details: validated.error.flatten() },
        { status: 502 },
      );
    }

    return NextResponse.json(validated.data);
  } catch (err) {
    const status = err instanceof AIError ? err.status ?? 503 : 503;
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: message }, { status });
  }
}
