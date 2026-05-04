/**
 * 截图前的图片"预烘焙"
 *
 * 背景：iOS Safari 的 html-to-image（基于 SVG foreignObject 序列化）有两个已知坑：
 *   1. <img> 引用的外部资源在 foreignObject 里时常无法被序列化
 *   2. img 上的 CSS filter（hue-rotate / brightness 等）即便在屏幕上能看见，
 *      在 foreignObject 里也常常被丢失
 *
 * 修法：截图前把每张 <img> 的当前像素（含 CSS filter）通过 canvas 烤成 data URL，
 * 临时替换 src + 清空 filter；截完恢复。这样 foreignObject 里只有内联像素，
 * iOS 也能正确序列化。
 */

/** 把 <img>（含其上 computed CSS filter）烤成 data URL */
async function bakeImageWithFilter(img: HTMLImageElement): Promise<string> {
  const src = img.currentSrc || img.src;
  const filter = getComputedStyle(img).filter;

  // 如果已经是 data URL 而且没 filter，跳过
  if (src.startsWith("data:") && (!filter || filter === "none")) return src;

  const loaded = new Image();
  loaded.crossOrigin = "anonymous";
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
        restorers.push(() => {
          if (origSrc) img.setAttribute("src", origSrc);
          else img.removeAttribute("src");
          img.style.filter = origInlineFilter;
        });
      } catch {
        // 单张失败就让 html-to-image 直接处理（多半还会失败，但不阻塞别的）
      }
    }),
  );

  return () => restorers.forEach((fn) => fn());
}
