"use client";

/**
 * 包一层 NextAuth SessionProvider —— layout 是 server component，
 * SessionProvider 内部用 React Context 必须 client。
 */

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
