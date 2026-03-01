// pages/login.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

// ✅ token 工具
function saveToken(token) {
  try { localStorage.setItem("sb_access_token", token); } catch {}
}

const THEME = {
  colors: {
    bg: "#f6f7fb", surface: "#ffffff", ink: "#0b1220",
    muted: "rgba(11,18,32,0.62)", faint: "rgba(11,18,32,0.42)",
    border: "rgba(11,18,32,0.10)", border2: "rgba(11,18,32,0.16)",
    accent: "#4f46e5", accent2: "#06b6d4",
  },
  radii: { sm: 10, md: 14, lg: 18, pill: 999 },
};

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (router.query.email) setIdentifier(String(router.query.email));
  }, [router.query.email]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setMsg(j.error || "登录失败"); return; }
      // ✅ 保存 token
      if (j.access_token) saveToken(j.access_token);
      router.push("/");
    } catch (err) {
      setMsg(err.message || "未知错误");
    } finally {
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
