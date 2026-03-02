"use client";

// app/components/UserMenuClient.js
import { useEffect, useRef, useState } from "react";
import { THEME } from "./home/theme";

// ✅ token 工具（内联避免跨目录 import 问题）
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

function getToken() { try { return localStorage.getItem("sb_access_token") || null; } catch { return null; } }
function clearToken() { try { localStorage.removeItem("sb_access_token"); } catch {} }
function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

function formatExpiry(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  } catch { return null; }
}

export default function UserMenuClient() {
  // 先从 localStorage 读缓存，立即渲染，不等网络
  const [me, setMe] = useState(() => {
    try {
      const cached = localStorage.getItem("sb_me_cache");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    // 无 token 直接显示未登录，不发请求
    if (!getToken()) { setMe({ logged_in: false }); return; }
    authFetch(remote("/api/me"), { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        setMe(data);
        try { localStorage.setItem("sb_me_cache", JSON.stringify(data)); } catch {}
      })
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
      clearToken();
      try { localStorage.removeItem("sb_me_cache"); } catch {}
      await fetch("/api/logout", { method: "POST" });
      setMe({ logged_in: false });
      setOpen(false);
      window.location.reload();
    } catch {}
  }

  if (me === null) return <div style={{ width: 80, height: 34 }} />;

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

  const initial = (me.email || "U").split("@")[0].slice(0, 1).toUpperCase();
  const expiryStr = formatExpiry(me.ends_at || me.expires_at || me.end_at);

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
                {me.is_member && expiryStr && (
                  <div style={{ marginTop: 2, fontSize: 11, color: THEME.colors.faint }}>
                    到期：{expiryStr}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            <a href="/bookmarks" onClick={() => setOpen(false)} style={{
              display: "block", padding: "10px 12px", borderRadius: THEME.radii.md,
              border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface,
              textDecoration: "none", color: THEME.colors.ink, fontSize: 13, fontWeight: 600,
            }}>❤️ 我的收藏</a>

            <a href="/redeem" onClick={() => setOpen(false)} style={{
              display: "block", padding: "10px 12px", borderRadius: THEME.radii.md,
              border: `1px solid rgba(124,58,237,0.25)`,
              background: "rgba(124,58,237,0.06)",
              textDecoration: "none", color: THEME.colors.vip, fontSize: 13, fontWeight: 600,
            }}>{me.is_member ? "✨ 兑换码续期" : "✨ 兑换码开通会员"}</a>

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
