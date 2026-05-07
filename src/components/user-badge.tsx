"use client";

/**
 * 头部右上角的小用户徽章。
 *
 *  - 未登录：渲染「登录」icon-btn
 *  - 已登录：渲染 头像 + 名字（点开是个简易菜单：登出）
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogIn, LogOut, UserCircle2 } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export function UserBadge() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  if (status === "loading") {
    return (
      <span
        className="user-badge-skel skeleton-shimmer"
        aria-label="读取登录状态"
      />
    );
  }

  if (!session?.user) {
    return (
      <Link className="icon-btn" href="/sign-in" aria-label="登录">
        <LogIn size={14} aria-hidden />
        <span>登录</span>
      </Link>
    );
  }

  const u = session.user;
  const display = u.name || u.email || "已登录";
  const initial = (display[0] ?? "?").toUpperCase();

  return (
    <div className="user-badge-wrap" ref={ref}>
      <button
        className="icon-btn user-badge-trigger"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`已登录：${display}`}
      >
        <span className="user-badge-avatar" aria-hidden>{initial}</span>
        <span className="user-badge-name">{display.slice(0, 8)}</span>
      </button>
      {open && (
        <div className="user-badge-menu" role="menu">
          <p className="user-badge-meta">
            <UserCircle2 size={14} aria-hidden />
            <span>{u.email ?? display}</span>
          </p>
          <button
            className="user-badge-action"
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut size={14} aria-hidden /> 登出
          </button>
        </div>
      )}
    </div>
  );
}
