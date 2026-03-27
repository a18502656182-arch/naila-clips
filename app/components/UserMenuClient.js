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
  } catch {
    return null;
  }
}

const btnBase = {
  textDecoration: "none",
  borderRadius: THEME.radii.pill,
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  transition: "all 160ms ease",
};

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
      if (!token) return Promise.resolve();
      return fetch(remote("/api/me"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "include",
      })
        .then((r) => r.json())
        .then((d) => {
          if (mounted) {
            setIsMember(d.is_member || false);
            setMeData(d);
          }
        })
        .catch(() => {});
    };

    Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]).then(
      async ([{ data: userData }, { data: sessionData }]) => {
        if (!mounted) return;
        setEmail(userData?.user?.email ?? null);
        await fetchMe(sessionData?.session?.access_token ?? null);
        if (mounted) setLoading(false);
      }
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);
      setLoading(false);
      if (session?.access_token) {
        // 同步最新 token 到 localStorage，供其他页面的 authFetch 使用
        try { localStorage.setItem("sb_access_token", session.access_token); } catch {}
        fetchMe(session.access_token);
      } else {
        try { localStorage.removeItem("sb_access_token"); } catch {}
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
      try {
        localStorage.removeItem("sb_access_token");
      } catch {}
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.refresh();
    } catch {}
  }

  if (loading) return null;

  if (!email) {
    return (
      <>
        <style>{`
          .um-auth-row {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: nowrap;
          }
          .um-auth-btn {
            min-height: 38px;
            padding: 0 14px;
            font-size: 13px;
            line-height: 1;
          }
          .um-auth-login {
            color: #fff;
            background: linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.vip});
            box-shadow: 0 10px 24px rgba(99,102,241,0.22);
            border: 1px solid rgba(99,102,241,0.22);
          }
          .um-auth-register {
            color: ${THEME.colors.accent};
            background: rgba(255,255,255,0.82);
            border: 1px solid rgba(99,102,241,0.22);
            box-shadow: 0 8px 20px rgba(15,23,42,0.05);
          }
          @media (max-width: 640px) {
            .um-auth-row {
              gap: 6px;
            }
            .um-auth-btn {
              min-height: 34px;
              padding: 0 12px;
              font-size: 12px;
            }
          }
        `}</style>

        <div className="um-auth-row">
          <a
            href="/login"
            className="um-auth-btn um-auth-login"
            style={btnBase}
          >
            登录
          </a>
          <a
            href="/register"
            className="um-auth-btn um-auth-register"
            style={btnBase}
          >
            注册
          </a>
        </div>
      </>
    );
  }

  const displayName = meData?.username || (email || "U").split("@")[0];
  const initial = displayName.slice(0, 1).toUpperCase();
  const expiryStr = formatExpiry(meData?.ends_at || meData?.expires_at || meData?.end_at);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          border: `1px solid rgba(99,102,241,0.16)`,
          background: "rgba(255,255,255,0.84)",
          borderRadius: THEME.radii.pill,
          padding: "6px 10px",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
          backdropFilter: "blur(10px)",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: THEME.radii.pill,
            background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.vip})`,
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 13,
            boxShadow: "0 8px 18px rgba(99,102,241,0.24)",
          }}
        >
          {initial}
        </span>
        <span style={{ fontSize: 12, color: THEME.colors.faint }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            width: 246,
            zIndex: 60,
            border: `1px solid ${THEME.colors.border}`,
            background: "rgba(255,255,255,0.96)",
            borderRadius: THEME.radii.lg,
            boxShadow: "0 20px 54px rgba(11,18,32,0.14)",
            overflow: "hidden",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: `1px solid ${THEME.colors.border}`,
              background:
                "linear-gradient(180deg, rgba(99,102,241,0.06), rgba(255,255,255,0.84))",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: THEME.radii.pill,
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.vip})`,
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                {initial}
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayName}
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    color: isMember ? THEME.colors.vip : THEME.colors.faint,
                    fontWeight: 700,
                  }}
                >
                  {isMember ? "✨ 会员" : "普通用户"}
                </div>
                {isMember && (
                  <div style={{ marginTop: 2, fontSize: 11, color: THEME.colors.faint }}>
                    到期：{expiryStr || "永久"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            <a
              href="/bookmarks"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: THEME.radii.md,
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface,
                textDecoration: "none",
                color: THEME.colors.ink,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ❤️ 我的收藏
            </a>

            <a
              href="/journal"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: THEME.radii.md,
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface,
                textDecoration: "none",
                color: THEME.colors.ink,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              📒 我的手帐
            </a>

            <a
              href="/practice"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: THEME.radii.md,
                border: `1px solid rgba(99,102,241,0.20)`,
                background: "rgba(99,102,241,0.07)",
                textDecoration: "none",
                color: THEME.colors.accent,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              🎮 考试游戏
            </a>

            <a
              href="/redeem"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: THEME.radii.md,
                border: `1px solid rgba(124,58,237,0.22)`,
                background: "rgba(124,58,237,0.08)",
                textDecoration: "none",
                color: THEME.colors.vip,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {isMember ? "✨ 兑换码续期" : "✨ 兑换码开通会员"}
            </a>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: THEME.radii.md,
                border: "1px solid #ffd5d5",
                background: "#fff5f5",
                color: "#b00000",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
