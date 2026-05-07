/**
 * GET  /api/sync —— 拉用户云端备份（如有）
 * PUT  /api/sync —— 推本地备份覆盖云端
 *
 * 都需要登录会话；KV 未配置时仍然 200，但靠进程内 Map 兜底（重启即丢）。
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { kv, userKey } from "@/lib/server/kv";

export const runtime = "nodejs";

const SyncPayloadSchema = z.object({
  schemaVersion: z.number().int(),
  exportedAt: z.number().int().optional(),
  history: z.array(z.unknown()),
  dex: z.array(z.unknown()),
  achievements: z.array(z.unknown()),
  settings: z.unknown(),
  customFoods: z.array(z.unknown()).optional().default([]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const raw = await kv.get(userKey(session.user.id));
  if (!raw) {
    return NextResponse.json({ exists: false, kvConfigured: kv.configured });
  }
  try {
    return NextResponse.json({
      exists: true,
      kvConfigured: kv.configured,
      data: JSON.parse(raw),
    });
  } catch {
    return NextResponse.json({
      exists: false,
      kvConfigured: kv.configured,
      error: "云端数据损坏，已忽略",
    });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = SyncPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "数据结构不对" }, { status: 400 });
  }
  const payload = {
    ...parsed.data,
    syncedAt: Date.now(),
  };
  await kv.set(userKey(session.user.id), JSON.stringify(payload));
  return NextResponse.json({ ok: true, kvConfigured: kv.configured });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  await kv.del(userKey(session.user.id));
  return NextResponse.json({ ok: true });
}
