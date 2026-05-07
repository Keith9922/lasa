"use client";

/**
 * 把 NextAuth session 跟 cloud-sync 接起来：
 *
 *  - 用户登录后第一次打开页面：pullOnce → 把云端数据灌回 localStorage，触发 storage 事件 → 各 page 的 useEffect 重读
 *  - 之后每次本地写入：通过 onStorageMutation 注册的回调 schedulePush 节流上传
 *
 * 这个组件不渲染任何 UI，挂在 layout 里就行。
 */

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { onStorageMutation } from "@/lib/storage";
import { pullOnce, schedulePush } from "@/lib/cloud-sync";

export function CloudSyncBridge() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    let mounted = true;
    let unsub: (() => void) | undefined;
    (async () => {
      // 拉一次；之后订阅本地变更，节流推送
      await pullOnce();
      if (!mounted) return;
      // 强制其他 page 的 useEffect 重读 localStorage（写入事件已触发）
      // 这里再额外发一次 storage 事件，提高保险
      window.dispatchEvent(new Event("lasa:cloud-sync-pulled"));
      unsub = onStorageMutation(() => schedulePush());
    })();
    return () => {
      mounted = false;
      unsub?.();
    };
  }, [status]);

  return null;
}
