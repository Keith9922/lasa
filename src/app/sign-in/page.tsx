/**
 * /sign-in —— 登录页（server entry）
 *
 * AUTH_PROVIDER_FLAGS 是 server-only 的（依赖 process.env），
 * 这里读出来作为 props 传给 client form，避免 client 直接 import auth.ts
 * 触发"client 不能读 process.env"的告警。
 */

import { AUTH_PROVIDER_FLAGS } from "@/auth";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return <SignInForm flags={AUTH_PROVIDER_FLAGS} />;
}
