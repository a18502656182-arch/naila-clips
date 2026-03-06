import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

function getToken() {
  try {
    return localStorage.getItem("sb_access_token") || null;
  } catch {
    return null;
  }
}
function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

const THEME = {
  colors: {
    bg: "#f6f8fc",
    surface: "#ffffff",
    ink: "#0b1220",
    muted: "rgba(11,18,32,0.66)",
    faint: "rgba(11,18,32,0.46)",
    border: "rgba(11,18,32,0.08)",
    accent: "#6366f1",
    accent2: "#8b5cf6",
    vip: "#7c3aed",
    cyan: "#06b6d4",
  },
  radii: { sm: 10, md: 14, lg: 22, xl: 28, pill: 999 },
};

function shellStyle() {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(1000px 420px at 0% 0%, rgba(99,102,241,0.12), transparent 50%), radial-gradient(900px 360px at 100% 0%, rgba(139,92,246,0.10), transparent 46%), linear-gradient(180deg, #f7f8fd 0%, #f4f6fb 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  };
}

function logoStyle() {
  return {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.cyan})`,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontWeight: 900,
    fontSize: 14,
    boxShadow: "0 14px 28px rgba(99,102,241,0.22)",
  };
}

function cardStyle() {
  return {
    width: "100%",
    maxWidth: 430,
    background: "rgba(255,255,255,0.92)",
    borderRadius: THEME.radii.xl,
    border: `1px solid ${THEME.colors.border}`,
    boxShadow: "0 22px 60px rgba(11,18,32,0.10)",
    padding: 28,
    backdropFilter: "blur(14px)",
  };
}

export default function RedeemPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(null);

  const redirectTo = router.query.redirectTo || "/";

  useEffect(() => {
    authFetch(remote("/api/me"), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d))
      .catch(() => setMe({ logged_in: false }));
  }, []);

  async function onSubmit(e) {
    if (e?.preventDefault) e.preventDefault();
    setMsg("");
    setSuccess(null);
    if (!code.trim()) {
      setMsg("请输入兑换码");
      return;
    }
    setLoading(true);
    try {
      const r = await authFetch(remote("/api/redeem"), {
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
      setTimeout(() => router.push(redirectTo), 2000);
    } catch (err) {
      setMsg(err.message || "网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={shellStyle()}>
      <a
        href="/"
        style={{
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <div style={logoStyle()}>EC</div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 17, fontWeight: 950, color: THEME.colors.ink }}>
            油管英语场景库
          </div>
          <div style={{ fontSize: 12, color: THEME.colors.faint }}>
            Real scenes · bilingual subtitles · vocabulary cards
          </div>
        </div>
      </a>

      <div style={cardStyle()}>
        {me === null && (
          <div
            style={{
              textAlign: "center",
              padding: "20px 0",
              color: THEME.colors.faint,
              fontSize: 13,
            }}
          >
            加载中...
          </div>
        )}

        {me !== null && !me.logged_in && (
          <>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.12)",
                color: THEME.colors.vip,
                fontSize: 12,
                fontWeight: 900,
                marginBottom: 16,
              }}
            >
              会员激活
            </div>

            <div
              style={{
                fontSize: 28,
                lineHeight: 1.1,
                letterSpacing: "-0.04em",
                fontWeight: 980,
                color: THEME.colors.ink,
                marginBottom: 8,
              }}
            >
              激活会员
            </div>

            <div
              style={{
                fontSize: 14,
                color: THEME.colors.muted,
                lineHeight: 1.7,
                marginBottom: 22,
              }}
            >
              请先登录账号，再使用兑换码开通或续期会员。
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a
                href={`/login?next=${encodeURIComponent(router.asPath)}`}
                style={{
                  textAlign: "center",
                  minHeight: 46,
                  borderRadius: THEME.radii.pill,
                  border: "1px solid rgba(99,102,241,0.22)",
                  color: THEME.colors.accent,
                  background: "rgba(255,255,255,0.82)",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                去登录
              </a>
              <a
                href={`/register?next=${encodeURIComponent(router.asPath)}`}
                style={{
                  textAlign: "center",
                  minHeight: 48,
                  borderRadius: THEME.radii.pill,
                  border: "none",
                  background: `linear-gradient(135deg, ${THEME.colors.accent2}, ${THEME.colors.vip})`,
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 16px 30px rgba(124,58,237,0.24)",
                }}
              >
                注册并开通会员 ✨
              </a>
            </div>
          </>
        )}

        {me !== null && me.logged_in && success && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.2,
                fontWeight: 980,
                color: THEME.colors.ink,
                marginBottom: 8,
              }}
            >
              兑换成功
            </div>
            <div
              style={{
                fontSize: 14,
                color: THEME.colors.muted,
                lineHeight: 1.7,
              }}
            >
              会员类型：
              {success.plan === "year" ? "年卡" : success.plan === "month" ? "月卡" : success.plan}
              {success.expires_at && (
                <>
                  <br />
                  到期时间：{new Date(success.expires_at).toLocaleDateString("zh-CN")}
                </>
              )}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: THEME.colors.faint }}>
              正在跳转{redirectTo === "/" ? "首页" : "视频"}...
            </div>
          </div>
        )}

        {me !== null && me.logged_in && !success && (
          <>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.12)",
                color: THEME.colors.vip,
                fontSize: 12,
                fontWeight: 900,
                marginBottom: 16,
              }}
            >
              会员兑换
            </div>

            <div
              style={{
                fontSize: 28,
                lineHeight: 1.1,
                letterSpacing: "-0.04em",
                fontWeight: 980,
                color: THEME.colors.ink,
                marginBottom: 8,
              }}
            >
              输入兑换码
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, color: THEME.colors.muted }}>
                当前账号：{me.email || me.username || "—"}
              </div>
              {me.is_member && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "rgba(124,58,237,0.12)",
                    color: THEME.colors.vip,
                    fontWeight: 800,
                  }}
                >
                  ✨ 会员
                </span>
              )}
            </div>

            {me.is_member && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "10px 14px",
                  background: "rgba(124,58,237,0.06)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  borderRadius: THEME.radii.md,
                  fontSize: 13,
                  color: THEME.colors.vip,
                  lineHeight: 1.6,
                }}
              >
                你已经是会员，继续兑换可以延长到期时间。
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.colors.ink,
                    marginBottom: 6,
                  }}
                >
                  兑换码
                </div>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmit(e);
                  }}
                  placeholder="输入你的月卡 / 年卡兑换码"
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    boxSizing: "border-box",
                    border: "1px solid rgba(124,58,237,0.24)",
                    borderRadius: THEME.radii.md,
                    fontSize: 14,
                    background: "rgba(124,58,237,0.04)",
                    outline: "none",
                    color: THEME.colors.ink,
                    letterSpacing: "0.04em",
                  }}
                />
              </div>

              {msg && (
                <div
                  style={{
                    padding: "11px 14px",
                    background: "#fff1f1",
                    border: "1px solid #ffd4d4",
                    borderRadius: THEME.radii.md,
                    fontSize: 13,
                    color: "#b00000",
                    lineHeight: 1.6,
                  }}
                >
                  {msg}
                </div>
              )}

              <button
                type="button"
                onClick={onSubmit}
                disabled={loading}
                style={{
                  minHeight: 48,
                  borderRadius: THEME.radii.pill,
                  border: "none",
                  background: loading
                    ? "rgba(124,58,237,0.42)"
                    : `linear-gradient(135deg, ${THEME.colors.accent2}, ${THEME.colors.vip})`,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 16px 30px rgba(124,58,237,0.24)",
                }}
              >
                {loading ? "兑换中..." : "立即兑换 ✨"}
              </button>
            </div>

            <div
              style={{
                marginTop: 18,
                textAlign: "center",
                fontSize: 13,
                color: THEME.colors.muted,
              }}
            >
              <a
                href="/"
                style={{
                  color: THEME.colors.accent,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                ← 返回首页
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
