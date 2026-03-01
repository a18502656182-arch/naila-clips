// pages/redeem.js
// 已登录用户专用兑换页 — 只需输入兑换码，不用填邮箱密码
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

function getToken() { try { return localStorage.getItem("sb_access_token") || null; } catch { return null; } }
function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

const THEME = {
  colors: {
    bg: "#f6f7fb", surface: "#ffffff", ink: "#0b1220",
    muted: "rgba(11,18,32,0.62)", faint: "rgba(11,18,32,0.42)",
    border: "rgba(11,18,32,0.10)", border2: "rgba(11,18,32,0.16)",
    accent: "#4f46e5", accent2: "#06b6d4", vip: "#7c3aed",
  },
  radii: { sm: 10, md: 14, lg: 18, pill: 999 },
};

export default function RedeemPage() {
  const router = useRouter();
  const [me, setMe] = useState(null); // null=加载中
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    authFetch("/api/me", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setMe(d))
      .catch(() => setMe({ logged_in: false }));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(""); setSuccess(null);
    if (!code.trim()) { setMsg("请输入兑换码"); return; }
    setLoading(true);
    try {
      const r = await authFetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        const errMap = {
          invalid_code: "兑换码无效 / 已过期 / 已用完",
          code_expired: "该兑换码已过期",
          code_used_up: "该兑换码已达使用上限",
          not_logged_in: "请先登录",
        };
        setMsg(errMap[j.error] || j.error || "兑换失败");
        return;
      }
      setSuccess({ plan: j.plan, expires_at: j.expires_at });
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setMsg(err.message || "网络错误，请重试");
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

        {/* 加载中 */}
        {me === null && (
          <div style={{ textAlign: "center", padding: "20px 0", color: THEME.colors.faint, fontSize: 13 }}>加载中...</div>
        )}

        {/* 未登录 */}
        {me !== null && !me.logged_in && (
          <>
            <div style={{ fontSize: 20, fontWeight: 950, color: THEME.colors.ink, marginBottom: 8 }}>兑换会员</div>
            <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.7, marginBottom: 20 }}>
              请先登录，再使用兑换码开通会员。
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="/login" style={{
                textAlign: "center", padding: "12px 0", borderRadius: THEME.radii.pill,
                border: `1px solid ${THEME.colors.border2}`, color: THEME.colors.ink,
                textDecoration: "none", fontSize: 14, fontWeight: 600,
              }}>去登录</a>
              <a href="/register" style={{
                textAlign: "center", padding: "12px 0", borderRadius: THEME.radii.pill,
                background: THEME.colors.vip, color: "#fff",
                textDecoration: "none", fontSize: 14, fontWeight: 700,
              }}>注册并开通会员</a>
            </div>
          </>
        )}

        {/* 已登录 — 兑换成功 */}
        {me !== null && me.logged_in && success && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 950, color: THEME.colors.ink, marginBottom: 8 }}>兑换成功！</div>
            <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.7 }}>
              会员类型：{success.plan === "year" ? "年卡" : success.plan === "month" ? "月卡" : success.plan}
              {success.expires_at && (
                <><br />到期时间：{new Date(success.expires_at).toLocaleDateString("zh-CN")}</>
              )}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: THEME.colors.faint }}>正在跳转首页...</div>
          </div>
        )}

        {/* 已登录 — 兑换表单 */}
        {me !== null && me.logged_in && !success && (
          <>
            <div style={{ fontSize: 20, fontWeight: 950, color: THEME.colors.ink, marginBottom: 4 }}>兑换会员</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: THEME.colors.muted }}>当前账号：{me.email || me.username || "—"}</div>
              {me.is_member && (
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "rgba(124,58,237,0.12)", color: THEME.colors.vip, fontWeight: 700 }}>✨ 会员</span>
              )}
            </div>

            {me.is_member && (
              <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: THEME.radii.md, fontSize: 13, color: THEME.colors.vip }}>
                你已经是会员，继续兑换可以延长到期时间 ⬇️
              </div>
            )}

            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.colors.ink, marginBottom: 6 }}>兑换码</div>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="输入你的月卡 / 年卡兑换码"
                  autoFocus
                  style={{
                    width: "100%", padding: "11px 14px", boxSizing: "border-box",
                    border: `1px solid rgba(124,58,237,0.3)`, borderRadius: THEME.radii.md,
                    fontSize: 14, background: "rgba(124,58,237,0.04)", outline: "none", color: THEME.colors.ink,
                    letterSpacing: "0.05em",
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
              >{loading ? "兑换中..." : "立即兑换 ✨"}</button>
            </form>

            <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: THEME.colors.muted }}>
              <a href="/" style={{ color: THEME.colors.accent, fontWeight: 600, textDecoration: "none" }}>← 返回首页</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
