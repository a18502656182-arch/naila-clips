"use client";

// app/components/UserMenuClient.js
// 登录状态显示：未登录显示登录/注册，已登录显示头像下拉菜单

import { useEffect, useRef, useState } from "react";
import { THEME } from "./home/theme";

export default function UserMenuClient() {
  const [me, setMe] = useState(null); // null=加载中
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then(r => r.json())
      .then(data => setMe(data))
      .catch(() => setMe({ logged_in: false }));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
      setMe({ logged_in: false });
      setOpen(false);
      window.location.reload();
    } catch {}
  }

  // 加载中：占位
  if (me === null) {
    return <div style={{ width: 80, height: 34 }} />;
  }

  // 未登录
  if (!me.logged_in) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <a href="/login" style={{
          fontSize: 13, padding: "8px 12px", borderRadius: THEME.radii.pill,
          border: `1px solid ${THEME.colors.border2}`, color: THEME.colors.ink,
          textDecoration: "none", fontWeight: 600,
        }}>登录</a>
        <a href="/register" style={{
          fontSize: 13, padding: "8px 12px", borderRadius: THEME.radii.pill,
          background: THEME.colors.ink, color: "#fff",
          textDecoration: "none", fontWeight: 600,
        }}>注册</a>
      </div>
    );
  }

  // 已登录
  const initial = (me.email || "U").split("@")[0].slice(0, 1).toUpperCase();

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        border: `1px solid ${THEME.colors.border2}`, background: THEME.colors.surface,
        borderRadius: THEME.radii.pill, padding: "6px 10px",
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: THEME.radii.pill,
          background: THEME.colors.accent, color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, fontSize: 13,
        }}>{initial}</span>
        <span style={{ fontSize: 12, color: THEME.colors.faint }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 10px)", width: 240, zIndex: 60,
          border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface,
          borderRadius: THEME.radii.lg, boxShadow: "0 18px 50px rgba(11,18,32,0.14)", overflow: "hidden",
        }}>
          {/* 头部 */}
          <div style={{ padding: 12, borderBottom: `1px solid ${THEME.colors.border}`, background: "rgba(11,18,32,0.02)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{
                width: 34, height: 34, borderRadius: THEME.radii.pill, flexShrink: 0,
                background: THEME.colors.accent, color: "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 14,
              }}>{initial}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {me.email || "（无邮箱）"}
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: me.is_member ? THEME.colors.vip : THEME.colors.faint }}>
                  {me.is_member ? "✨ 会员" : "普通用户"}
                </div>
              </div>
            </div>
          </div>

          {/* 菜单项 */}
          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            <a href="/bookmarks" onClick={() => setOpen(false)} style={{
              display: "block", padding: "10px 12px", borderRadius: THEME.radii.md,
              border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface,
              textDecoration: "none", color: THEME.colors.ink, fontSize: 13, fontWeight: 600,
            }}>❤️ 我的收藏</a>
            <button type="button" onClick={handleLogout} style={{
              width: "100%", padding: "10px 12px", borderRadius: THEME.radii.md,
              border: "1px solid #ffd5d5", background: "#fff5f5",
              color: "#b00000", fontSize: 13, fontWeight: 600,
              cursor: "pointer", textAlign: "left",
            }}>退出登录</button>
          </div>
        </div>
      )}
    </div>
  );
}
