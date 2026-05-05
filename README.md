# 💩 拉啥（LASA）

> 告诉我今天吃了啥，我猜你明天拉啥。

**🌐 在线体验：https://lasa-gilt.vercel.app/**

基于「碳水 → 量、蛋白质 → 形、脂肪 → 质」的伪科学理论，把今日饮食换算成明日便便预测：Bristol 类型 + 颜色 + 油亮 + 漂浮 + 气味，输出可分享的拍立得卡片。

仅供娱乐 · 不构成医学建议。

---

## 技术栈

- **Next.js 15** · React 19 · TypeScript（严格模式）
- **AI**：OpenAI 兼容接口，server-side only，失败走本地规则兜底
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
```

## 文档

- 开发规范：[CLAUDE.md](CLAUDE.md)
- 完整文档索引：[docs/README.md](docs/README.md)
- 设计原型：[prototype/index.html](prototype/index.html) · [prototype/animation.html](prototype/animation.html)
