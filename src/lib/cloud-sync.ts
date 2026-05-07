/**
 * 云端同步客户端 —— 把 storage 里的几张表打包推到 /api/sync
 *
 * 设计：
 *  - "整张图同步"：每次 PUT 都是完整 snapshot，"最后写入者赢"
 *  - 节流：localStorage 写完后调 schedulePush()，1.5s 内合并多次写
 *  - 拉取策略：登录后调 pullOnce()，把云端数据原样灌回各张表
 *  - 不登录直接 short-circuit
 */

import { exportAll, getCustomFoods } from "./storage";

const PUSH_DEBOUNCE_MS = 1500;

let pushTimer: number | null = null;
let pushInflight: Promise<unknown> | null = null;

export type SyncStatus =
  | { kind: "idle" }
  | { kind: "pulling" }
  | { kind: "pushing" }
  | { kind: "ok"; lastSyncedAt: number }
  | { kind: "error"; message: string };

export type SyncListener = (s: SyncStatus) => void;
const listeners = new Set<SyncListener>();
let currentStatus: SyncStatus = { kind: "idle" };

export function onSyncStatus(fn: SyncListener): () => void {
  listeners.add(fn);
  fn(currentStatus);
  return () => {
    listeners.delete(fn);
  };
}

function setStatus(s: SyncStatus) {
  currentStatus = s;
  listeners.forEach((l) => l(s));
}

/**
 * 把当前本地所有数据打到云端。
 * 若没登录 / 没配 KV，会拿到 401 / 500，已捕获并落 status，不抛。
 */
export async function pushNow(): Promise<SyncStatus> {
  if (typeof window === "undefined") return currentStatus;
  if (pushInflight) await pushInflight;
  setStatus({ kind: "pushing" });
  pushInflight = (async () => {
    try {
      const res = await fetch("/api/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: exportAll(),
      });
      if (res.status === 401) {
        setStatus({ kind: "idle" });
      } else if (!res.ok) {
        setStatus({ kind: "error", message: `服务器返回 ${res.status}` });
      } else {
        setStatus({ kind: "ok", lastSyncedAt: Date.now() });
      }
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      pushInflight = null;
    }
  })();
  await pushInflight;
  return currentStatus;
}

/** 节流 push：N 次写入 1.5s 内合并成一次上送 */
export function schedulePush(): void {
  if (typeof window === "undefined") return;
  if (pushTimer) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, PUSH_DEBOUNCE_MS);
}

/**
 * 拉取云端数据；若有则把每张表覆盖回 localStorage 并返回 true。
 * 调用方负责重新读取本地状态（推荐：window.location.reload() 或 setState 重读）。
 */
export async function pullOnce(): Promise<{
  pulled: boolean;
  exists: boolean;
  reason?: string;
}> {
  if (typeof window === "undefined") return { pulled: false, exists: false };
  setStatus({ kind: "pulling" });
  try {
    const res = await fetch("/api/sync", { cache: "no-store" });
    if (res.status === 401) {
      setStatus({ kind: "idle" });
      return { pulled: false, exists: false, reason: "未登录" };
    }
    if (!res.ok) {
      setStatus({ kind: "error", message: `服务器返回 ${res.status}` });
      return { pulled: false, exists: false, reason: `${res.status}` };
    }
    const json = (await res.json()) as {
      exists: boolean;
      data?: {
        history?: unknown[];
        dex?: unknown[];
        achievements?: unknown[];
        settings?: unknown;
        customFoods?: unknown[];
      };
    };
    if (!json.exists || !json.data) {
      setStatus({ kind: "ok", lastSyncedAt: Date.now() });
      return { pulled: false, exists: false };
    }
    // 全量覆盖 —— "云端是真理"。本地只在没登录时存活。
    const ls = window.localStorage;
    if (Array.isArray(json.data.history)) ls.setItem("lasa.history.v1", JSON.stringify(json.data.history));
    if (Array.isArray(json.data.dex)) ls.setItem("lasa.dex.v1", JSON.stringify(json.data.dex));
    if (Array.isArray(json.data.achievements)) ls.setItem("lasa.achievements.v1", JSON.stringify(json.data.achievements));
    if (json.data.settings) ls.setItem("lasa.settings.v1", JSON.stringify(json.data.settings));
    if (Array.isArray(json.data.customFoods)) ls.setItem("lasa.customFoods.v1", JSON.stringify(json.data.customFoods));
    setStatus({ kind: "ok", lastSyncedAt: Date.now() });
    return { pulled: true, exists: true };
  } catch (e) {
    setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    return { pulled: false, exists: false, reason: "网络错误" };
  }
}

/** 从云端彻底删除当前用户备份 */
export async function deleteCloud(): Promise<boolean> {
  try {
    const res = await fetch("/api/sync", { method: "DELETE" });
    if (res.ok) {
      setStatus({ kind: "idle" });
      return true;
    }
  } catch {
    /* swallow */
  }
  return false;
}

/** 调试用：当前用户保存的常用食物数（不依赖云端） */
export function localCustomFoodsCount(): number {
  return getCustomFoods().length;
}
