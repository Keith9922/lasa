/**
 * NextAuth catchall handler —— `/api/auth/signin`、`/api/auth/callback/...` 等都到这里
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
export const runtime = "nodejs";
