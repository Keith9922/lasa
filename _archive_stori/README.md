# Stori — AI 简历教练

**讲好你的故事，拿到心仪的 Offer**

Stori 是一款对话式 AI 简历教练。它不是传统的表单式简历编辑器，而是像面试官一样追问你的真实经历，把口语故事沉淀为可验证的故事卡，再按 JD 定制生成简历。

---

## 核心功能

- **AI 对话采集**：用自然语言讲经历，AI 追问背景、行动、结果和数据
- **故事卡确认**：每段经历结构化为可确认的事实卡，绝不编造
- **JD 智能匹配**：粘贴岗位 JD，自动分析覆盖/弱覆盖/缺口并针对性追问
- **简历一键生成**：基于已确认素材生成简历，打印或导出 PDF
- **语音输入**：支持 Chrome/Edge 浏览器原生语音识别（中文）
- **移动端支持**：底部导航栏 + 全屏面板，在手机上也能完整使用

---

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（可选）
cp .env.example .env.local
# 填写 MINIMAX_API_KEY 启用 AI 能力
# 不填时使用本地规则引擎，基础功能仍可用

# 3. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MINIMAX_API_KEY` | MiniMax API Key，填写后启用 AI | 空（使用本地引擎）|
| `MINIMAX_BASE_URL` | MiniMax API Base URL | `https://api.minimax.io/v1` |
| `MINIMAX_MODEL` | 使用的模型 | `MiniMax-M1` |

---

## 技术栈

- **框架**：Next.js 15 (App Router)
- **语言**：TypeScript
- **样式**：原生 CSS（无 Tailwind，保持零运行时依赖）
- **AI**：MiniMax API（OpenAI 兼容），本地规则引擎降级
- **语音**：Web Speech API（浏览器原生）+ MiniMax ASR（可选）
- **PDF**：浏览器打印（`window.print()`）

---

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── coach/route.ts       # AI 教练主接口
│   │   └── transcribe/route.ts  # 语音转录接口
│   ├── globals.css              # 完整设计系统
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── resume-workspace.tsx     # 主工作台组件
└── lib/
    ├── types.ts                 # 核心类型定义
    ├── minimax.ts               # MiniMax API 封装
    ├── resume-engine.ts         # 本地规则引擎
    ├── coach-schemas.ts         # Zod 验证
    ├── storage.ts               # localStorage 持久化
    ├── initial-state.ts
    └── ids.ts
```

---

## 产品设计原则

1. **真实优先**：AI 不编造经历、数据、公司、学历
2. **追问驱动**：宁可追问，不自行补全
3. **确认机制**：所有故事卡需用户确认才写入简历
4. **降级可用**：无 API Key 时本地引擎保证核心链路可走通

---

*Stori — 你的经历值得被好好讲出来。*
