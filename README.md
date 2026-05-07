# 💩 拉啥（LASA）

> 告诉我今天吃了啥，我猜你明天拉啥。

**🌐 在线体验：https://lasa-gilt.vercel.app/**

基于「碳水 → 量、蛋白质 → 形、脂肪 → 质」的伪科学理论，把今日饮食换算成明日便便预测：Bristol 类型 + 颜色 + 油亮 + 漂浮 + 气味，输出可分享的拍立得卡片。

仅供娱乐 · 不构成医学建议。

---

## v2 新增（2026-05）

- **💩 图鉴**：Bristol 7 × 颜色 7 = 49 格收藏册，每出一张卡解锁一格（`/dex`）
- **屎相日记**：历史时间轴 + 第二天回看打反馈"准/一般/不准"（`/history`）
- **昨日验证回路**：反馈数据写回校准 bias，下次预测自动微调
- **设置页**：音效 / 震动 / 沙雕 vs 温柔双调性 / 数据导出 / 清空（`/settings`）
- **预测引擎 v2**：加权打分代替 if-else 链，引入水分 / 进食时段 / 益生菌维度
- **音效 + 震动**：Web Audio API 合成（零下载），navigator.vibrate 同步
- **首页"随便来一顿"**：零输入 demo 路径，降低首跳门槛
- **食物库扩到 23 项**，按"主食 / 喝的 / 水果 / 零食"分组

## 技术栈

- **Next.js 15** · React 19 · TypeScript（严格模式）
- **AI**：OpenAI 兼容接口，server-side only，失败走本地规则兜底
- **存储**：localStorage（无后端、无登录）
- **部署**：Vercel

## 本地开发

```bash
cp .env.example .env.local   # 填入 API key
npm install
npm run dev                  # http://localhost:3000
```

其它命令：

```bash
npm run build       # 生产构建
npm run typecheck   # 类型检查
npm run lint        # ESLint
npm test            # 预测引擎单测（10 用例）
```

## 国内访问（待办）

Vercel 国内不稳。建议路径：
1. **过渡（免备案）**：腾讯云 EdgeOne Pages 或 Cloudflare Pages + 自有域名
2. **长期**：阿里云函数计算 / 静态托管 + ICP 备案域名

备案需本人 30 工作日内完成；建议立刻启动。

## 文档

- 开发规范：[CLAUDE.md](CLAUDE.md)
- 完整文档索引：[docs/README.md](docs/README.md)
- 设计原型：[prototype/index.html](prototype/index.html) · [prototype/animation.html](prototype/animation.html)
