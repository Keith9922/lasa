/**
 * 极简 KV 抽象 —— Upstash REST API 模式
 *
 * 配置：
 *  - KV_REST_API_URL  : Upstash 控制台 REST URL
 *  - KV_REST_API_TOKEN: Upstash 控制台 REST Token
 *
 * 没配则走进程内 Map，dev 友好 / 生产无效。
 *
 * 与 Vercel KV / Upstash Redis 的官方 SDK 完全兼容，
 * 不依赖任何 npm 包，节省 ~50KB cold-start。
 */

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

const memory = new Map<string, string>();

async function upstash<T>(path: string, init?: RequestInit): Promise<T> {
  if (!url || !token) throw new Error("KV not configured");
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV upstream ${res.status}`);
  return res.json() as Promise<T>;
}

export const kv = {
  configured: !!(url && token),

  async get(key: string): Promise<string | null> {
    if (!url) return memory.get(key) ?? null;
    const data = await upstash<{ result: string | null }>(
      `/get/${encodeURIComponent(key)}`,
    );
    return data.result;
  },

  async set(key: string, value: string): Promise<void> {
    if (!url) {
      memory.set(key, value);
      return;
    }
    // Upstash POST /set/<key> with body = value
    await upstash<unknown>(`/set/${encodeURIComponent(key)}`, {
      method: "POST",
      body: value,
    });
  },

  async del(key: string): Promise<void> {
    if (!url) {
      memory.delete(key);
      return;
    }
    await upstash<unknown>(`/del/${encodeURIComponent(key)}`, {
      method: "POST",
    });
  },
};

export const userKey = (userId: string) => `lasa:user:${userId}`;
