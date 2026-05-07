"use client";

/**
 * 包一层 NextAuth SessionProvider —— layout 是 server component，
 * SessionProvider 内部用 React Context 必须 client。
 *
 * 顺便把 CloudSyncBridge 也挂在这里，session 一可用就触发拉取。
 */

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { CloudSyncBridge } from "./cloud-sync-bridge";

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CloudSyncBridge />
      {children}
    </SessionProvider>
  );
}
