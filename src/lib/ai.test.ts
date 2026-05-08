/**
 * 流式 JSON 解码 helper 的单测
 *
 * 跑法：node --import tsx --test src/lib/*.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import { extractPartialString, extractJson } from "./ai";

test("extractPartialString: 完整 JSON 串里抠出值", () => {
  assert.equal(extractPartialString('{"roast": "你今天吃得跟北漂一周没回家一样"}', "roast"), "你今天吃得跟北漂一周没回家一样");
});

test("extractPartialString: 流式中段（值未闭合）也能抠出当前累积", () => {
  assert.equal(extractPartialString('{"roast": "你今天吃得', "roast"), "你今天吃得");
});

test("extractPartialString: 中间出现转义引号", () => {
  assert.equal(extractPartialString('{"roast": "他说\\"行\\"', "roast"), '他说"行"');
});

test("extractPartialString: 末尾遇到孤立反斜杠（escape 头还没补全）", () => {
  // 流可能停在一个 backslash 上，下一刀才到来真正的转义字符
  assert.equal(extractPartialString('{"roast": "abc\\', "roast"), "abc");
});

test("extractPartialString: 中文 unicode 转义解码", () => {
  assert.equal(extractPartialString('{"roast": "\\u4f60\\u597d', "roast"), "你好");
});

test("extractPartialString: key 不存在返回 null", () => {
  assert.equal(extractPartialString('{"x": "y"}', "roast"), null);
});

test("extractPartialString: 空对象返回 null", () => {
  assert.equal(extractPartialString("{}", "roast"), null);
});

test("extractPartialString: prefix 还没出现 quote", () => {
  // "roast": 后面还没开始引号
  assert.equal(extractPartialString('{"roast":', "roast"), null);
  // 已经开了引号但内容是空
  assert.equal(extractPartialString('{"roast": "', "roast"), "");
});

test("extractPartialString: 还在 <think> 段里 → 不应抓任何内容", () => {
  // 模拟 MiniMax-M2 流式中：思考段未闭合，里面出现"roast"字面字符串
  const buf = '<think>\n用户说我要写"roast"字段，';
  assert.equal(extractPartialString(buf, "roast"), null);
});

test("extractPartialString: think 闭合后从答案段抓出 roast", () => {
  const buf = '<think>\n思考过程，提到"roast"字段</think>\n\n```json\n{"roast": "火锅配啤酒';
  assert.equal(extractPartialString(buf, "roast"), "火锅配啤酒");
});

test("extractJson: 完整含 <think> 的 M2 响应能抠出最终 JSON", () => {
  const raw = '<think>\n这是思考</think>\n\n```json\n{"roast": "痛风套餐"}\n```';
  const obj = extractJson(raw) as { roast?: string };
  assert.equal(obj.roast, "痛风套餐");
});

test("extractJson: 还在 think 中（流式中段） → 返回 null", () => {
  assert.equal(extractJson("<think>\n思考中..."), null);
});
