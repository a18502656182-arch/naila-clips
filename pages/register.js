// pages/register.js
import { useState } from "react";
import { useRouter } from "next/router";

const THEME = {
  colors: {
    bg: "#f6f7fb", surface: "#ffffff", ink: "#0b1220",
    muted: "rgba(11,18,32,0.62)", faint: "rgba(11,18,32,0.42)",
    border: "rgba(11,18,32,0.10)", border2: "rgba(11,18,32,0.16)",
    accent: "#4f46e5", accent2: "#06b6d4", vip: "#7c3aed",
  },
  radii: { sm: 10, md: 14, lg: 18, pill: 999 },
};

function prettifyError(e) {
  const s = String(e || "");
  if (s.includes("INVALID_CODE")) return "兑换码无效 / 已过期 / 已用完";
  if (s.toLowerCase().includes("already registered")) return "这个邮箱/账号已注册过了";
  if (s.toLowerCase().includes("password")) return "密码不符合要求（建议至少8位，包含大小写+数字）";
  return s || "注册失败";
}

export default function RegisterPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(""); setSuccess(null); setLoading(true);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, code }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setMsg(prettifyError(j.error)); return; }
      if (j.needs_login) {
        router.push(`/login?email=${encodeURIComponent(j.email_hint || "")}`);
        return;
      }
      setSuccess({ plan: j.plan || "member", expires_at: j.expires_at || null });
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setMsg(prettifyError(err.message));
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

      <div style={{
        width: "100%", maxWidth: 400,
        background: THEME.colors.surface, borderRadius: THEME.radii.lg,
        border: `1px solid ${THEME.colors.border}`,
        boxShadow: "0 10px 40px rgba(11,18,32,0.10)",
        padding: 28,
      }}>
        {success ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 950, color: THEME.colors.ink, marginBottom: 8 }}>开通成功！</div>
            <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.7 }}>
              会员类型：{success.plan === "year" ? "年卡" : success.plan === "month" ? "月卡" : success.plan}
              {success.expires_at && (
                <><br />到期时间：{new Date(success.expires_at).toLocaleDateString("zh-CN")}</>
              )}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: THEME.colors.faint }}>正在跳转首页...</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 20, fontWeight: 950, color: THEME.colors.ink, marginBottom: 6 }}>注册并开通会员</div>
            <div style={{ fontSize: 13, color: THEME.colors.muted, marginBottom: 22 }}>填写账号信息 + 输入兑换码，一步完成注册和开通</div>

            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.colors.ink, marginBottom: 6 }}>邮箱或用户名</div>
                <input
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="邮箱 或 你想要的用户名"
                  style={{
                    width: "100%", padding: "11px 14px", boxSizing: "border-box",
                    border: `1px solid ${THEME.colors.border2}`, borderRadius: THEME.radii.md,
                    fontSize: 14, background: THEME.colors.bg, outline: "none", color: THEME.colors.ink,
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.colors.ink, marginBottom: 6 }}>密码</div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="至少 8 位，建议包含大小写+数字"
                  style={{
                    width: "100%", padding: "11px 14px", boxSizing: "border-box",
                    border: `1px solid ${THEME.colors.border2}`, borderRadius: THEME.radii.md,
                    fontSize: 14, background: THEME.colors.bg, outline: "none", color: THEME.colors.ink,
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.colors.ink, marginBottom: 6 }}>兑换码</div>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="输入你的月卡 / 年卡兑换码"
                  style={{
                    width: "100%", padding: "11px 14px", boxSizing: "border-box",
                    border: `1px solid rgba(124,58,237,0.3)`, borderRadius: THEME.radii.md,
                    fontSize: 14, background: "rgba(124,58,237,0.04)", outline: "none", color: THEME.colors.ink,
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
                  background: loading ? THEME.colors.border2 : THEME.colors.vip,
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 150ms",
                }}
              >{loading ? "注册中..." : "注册并开通会员 ✨"}</button>
            </form>

            <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: THEME.colors.muted }}>
              已有账号？{" "}
              <a href="/login" style={{ color: THEME.colors.accent, fontWeight: 600, textDecoration: "none" }}>去登录</a>
              {" · "}
              <a href="/redeem" style={{ color: THEME.colors.vip, fontWeight: 600, textDecoration: "none" }}>已登录？去兑换</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
