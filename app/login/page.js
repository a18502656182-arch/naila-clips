"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "../../utils/supabase/client";

const THEME = {
  colors: {
    bg: "#f6f7fb", surface: "#ffffff", ink: "#0b1220",
    muted: "rgba(11,18,32,0.62)", faint: "rgba(11,18,32,0.42)",
    border: "rgba(11,18,32,0.10)", border2: "rgba(11,18,32,0.16)",
    accent: "#4f46e5", accent2: "#06b6d4",
  },
  radii: { sm: 10, md: 14, lg: 18, pill: 999 },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const defaultEmail = searchParams.get("email") || "";

  const [identifier, setIdentifier] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      // 用户名转邮箱格式（和后端保持一致）
      let email = identifier.trim().toLowerCase();
      if (!email.includes("@")) {
        const username = email.replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").slice(0, 32);
        email = `${username}@users.nailaobao.local`;
      }
      // 和参考站完全一样：直接用 Supabase 客户端登录，SDK 自动写 cookie
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMsg(error.message || "登录失败"); setLoading(false); return; }
      // 同时存 localStorage 兼容其他客户端组件
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) localStorage.setItem("sb_access_token", session.access_token);
      } catch {}
      // 和参考站一样：router.push + router.refresh()
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setMsg(err.message || "未知错误");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>

      {/* Logo */}
      <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`,
          display: "grid", placeItems: "center", color: "#fff", fontWeight: 900, fontSize: 14,
        }}>EC</div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 16, fontWeight: 950, color: THEME.colors.ink }}>油管英语场景库</div>
          <div style={{ fontSize: 12, color: THEME.colors.faint }}>精选场景短片 · 双语字幕</div>
        </div>
      </a>

      {/* 卡片 */}
      <div style={{
        width: "100%", maxWidth: 400,
        background: THEME.colors.surface, borderRadius: THEME.radii.lg,
        border: `1px solid ${THEME.colors.border}`,
        boxShadow: "0 10px 40px rgba(11,18,32,0.10)",
        padding: 28,
      }}>
        <div style={{ fontSize: 20, fontWeight: 950, color: THEME.colors.ink, marginBottom: 6 }}>登录账号</div>
        <div style={{ fontSize: 13, color: THEME.colors.muted, marginBottom: 22 }}>登录后即可收藏视频、观看会员内容</div>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.colors.ink, marginBottom: 6 }}>邮箱或用户名</div>
            <input
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="邮箱 或 你的用户名"
              style={{
                width: "100%", padding: "11px 14px", boxSizing: "border-box",
                border: `1px solid ${THEME.colors.border2}`, borderRadius: THEME.radii.md,
                fontSize: 14, background: THEME.colors.bg, outline: "none",
                color: THEME.colors.ink,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.colors.ink, marginBottom: 6 }}>密码</div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入你的密码"
              style={{
                width: "100%", padding: "11px 14px", boxSizing: "border-box",
                border: `1px solid ${THEME.colors.border2}`, borderRadius: THEME.radii.md,
                fontSize: 14, background: THEME.colors.bg, outline: "none",
                color: THEME.colors.ink,
              }}
            />
          </div>

          {msg && (
            <div style={{ padding: "10px 14px", background: "#fff0f0", border: "1px solid #ffd0d0", borderRadius: THEME.radii.md, fontSize: 13, color: "#b00000" }}>
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 0", borderRadius: THEME.radii.pill, border: "none",
              background: loading ? THEME.colors.border2 : THEME.colors.ink,
              color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 150ms",
            }}
          >{loading ? "登录中..." : "登录"}</button>
        </form>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: THEME.colors.muted }}>
          没有账号？{" "}
          <a href="/register" style={{ color: THEME.colors.accent, fontWeight: 600, textDecoration: "none" }}>注册并开通会员</a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#f6f7fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 400, padding: 28, background: "#fff", borderRadius: 18, border: "1px solid rgba(11,18,32,0.10)" }}>
          <div style={{ height: 24, width: "50%", borderRadius: 8, background: "#f0f0f0", marginBottom: 16 }} />
          <div style={{ height: 44, borderRadius: 12, background: "#f0f0f0", marginBottom: 12 }} />
          <div style={{ height: 44, borderRadius: 12, background: "#f0f0f0", marginBottom: 12 }} />
          <div style={{ height: 44, borderRadius: 12, background: "#f0f0f0" }} />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
