# 📦 _archive_stori — Stori 简历教练 项目残留

> ⚠️ 这些文件**不属于 💩 拉啥 项目**，是上一个项目（Stori AI 简历教练）残留下来的。
> 移到这里只是为了**视觉屏蔽**，不影响开发，也不会影响 Stori 在 main 分支的代码。

## 这里有什么

- `README.md` — Stori 的原 README
- `eslint.config.mjs` / `next.config.ts` / `tsconfig.json` — Stori 的工程配置
- `package.json` / `package-lock.json` — Stori 的依赖清单
- `src/` — Stori 的全部源码
- `public/manifest.json` — Stori 的 PWA manifest

## 何时回来取

如果未来要继续 Stori：

```bash
# 从 main 拉一份新 worktree
git worktree add ../stori-revival main

# 或者直接把这里的文件 mv 回根目录（git 会识别为重命名）
mv _archive_stori/{src,package.json,...} .
```

git 历史里 Stori 的 commit (`752ee05 feat: launch Stori AI 简历教练`) 永远不会受影响。

---

📝 见 [docs/decisions.md](../docs/decisions.md) D-009
