/**
 * 截图前的图片"预烘焙"
 *
 * 背景：iOS Safari 在 SVG <foreignObject> 序列化路径上有两个老 bug：
 *   1. <img> 引用的外部资源经常无法正确序列化（截图后图丢失）
 *   2. img 上的 CSS filter 在 foreignObject 里也常被丢
 *
 * 修法：截图前把每张 <img> 的当前像素（含 CSS filter）通过 canvas
 * 烤成 data URL，临时替换 src + 清空 filter；等新 src decode 完成
 * 再让 html-to-image / modern-screenshot 截图；截完恢复。
 */

/** 把 <img>（含其上 computed CSS filter）烤成 data URL */
async function bakeImageWithFilter(img: HTMLImageElement): Promise<string> {
  const src = img.currentSrc || img.src;
  const filter = getComputedStyle(img).filter;

  // 已经是 data URL 而且没 filter，直接复用
  if (src.startsWith("data:") && (!filter || filter === "none")) return src;

  const loaded = new Image();
  // 同源资源不需要 crossOrigin，加了反而要求服务器 CORS 头，可能反而失败
  loaded.src = src;
  await new Promise<void>((resolve, reject) => {
    if (loaded.complete && loaded.naturalWidth > 0) return resolve();
    loaded.onload = () => resolve();
    loaded.onerror = () => reject(new Error(`load failed: ${src}`));
  });

  const canvas = document.createElement("canvas");
  canvas.width = loaded.naturalWidth;
  canvas.height = loaded.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");
  if (filter && filter !== "none") ctx.filter = filter;
  ctx.drawImage(loaded, 0, 0);
  return canvas.toDataURL("image/png");
}

/** 等 img 的当前 src 真正 decode 完（否则 setSrc 后立即截图会拿到空白）*/
async function waitImageReady(img: HTMLImageElement): Promise<void> {
  if (typeof img.decode === "function") {
    try {
      await img.decode();
      return;
    } catch {
      /* fall through */
    }
  }
  await new Promise<void>((resolve) => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
}

/**
 * 在 root 子树中预烤所有 <img>。返回一个还原函数，截完调用恢复原 src/filter。
 * 单张失败不影响其他张。
 */
export async function inlineImages(root: HTMLElement): Promise<() => void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  const restorers: Array<() => void> = [];

  await Promise.all(
    imgs.map(async (img) => {
      const origSrc = img.getAttribute("src") || "";
      const origInlineFilter = img.style.filter;
      try {
        const dataUrl = await bakeImageWithFilter(img);
        img.setAttribute("src", dataUrl);
        img.style.filter = "none";
        // 关键：等新 data URL decode 完成，否则 toPng 拿到的是空白
        await waitImageReady(img);
        restorers.push(() => {
          if (origSrc) img.setAttribute("src", origSrc);
          else img.removeAttribute("src");
          img.style.filter = origInlineFilter;
        });
      } catch {
        // 单张失败让上层照常截，不阻塞
      }
    }),
  );

  return () => restorers.forEach((fn) => fn());
}

/**
 * 临时移除 root 自身的 transform（rotate/scale 等）。
 * 桌面端 polaroid 有 rotate(-1deg)，截图库测量 bounding box 可能错位。
 * 截图前 reset，截完还原。
 */
export function freezeTransform(root: HTMLElement): () => void {
  const orig = root.style.transform;
  root.style.transform = "none";
  return () => {
    root.style.transform = orig;
  };
}
