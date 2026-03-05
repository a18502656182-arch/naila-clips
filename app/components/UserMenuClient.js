"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../utils/supabase/client";
import { THEME } from "./home/theme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

function formatExpiry(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  } catch { return null; }
}

export default function UserMenuClient() {
  const [email, setEmail] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [meData, setMeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    const fetchMe = (token) => {
      if (!token) return;
      fetch(remote("/api/me"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "include",
      })
        .then(r => r.json())
        .then(d => { if (mounted) { setIsMember(d.is_member || false); setMeData(d); } })
        .catch(() => {});
    };

    // 初始化：拿当前 session
    Promise.all([supabase.auth.getUser(), supabase.auth.getSession()])
      .then(([{ data: userData }, { data: sessionData }]) => {
        if (!mounted) return;
        setEmail(userData?.user?.email ?? null);
        setLoading(false);
        fetchMe(sessionData?.session?.access_token ?? null);
      });

    // 监听登录/退出，和参考站一样
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);
      setLoading(false);
      if (session?.access_token) {
        fetchMe(session.access_token);
      } else {
        setIsMember(false);
        setMeData(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
      setOpen(false);
      setEmail(null);
      setIsMember(false);
      setMeData(null);
      try { localStorage.removeItem("sb_access_token"); } catch {}
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.refresh();
    } catch {}
  }

  if (loading) return null;

  if (!email) {
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

  const initial = (email || "U").split("@")[0].slice(0, 1).toUpperCase();
  const expiryStr = formatExpiry(meData?.ends_at || meData?.expires_at || meData?.end_at);

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
                  {email}
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: isMember ? THEME.colors.vip : THEME.colors.faint }}>
                  {isMember ? "✨ 会员" : "普通用户"}
                </div>
                {isMember && expiryStr && (
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

            <a href="/journal" onClick={() => setOpen(false)} style={{
              display: "block", padding: "10px 12px", borderRadius: THEME.radii.md,
              border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface,
              textDecoration: "none", color: THEME.colors.ink, fontSize: 13, fontWeight: 600,
            }}>📒 我的手帐</a>

            <a href="/redeem" onClick={() => setOpen(false)} style={{
              display: "block", padding: "10px 12px", borderRadius: THEME.radii.md,
              border: `1px solid rgba(124,58,237,0.25)`,
              background: "rgba(124,58,237,0.06)",
              textDecoration: "none", color: THEME.colors.vip, fontSize: 13, fontWeight: 600,
            }}>{isMember ? "✨ 兑换码续期" : "✨ 兑换码开通会员"}</a>

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
