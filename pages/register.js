import { useState } from "react";
import { useRouter } from "next/router";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

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

function inputStyle(emphasis = false) {
  return {
    width: "100%",
    padding: "12px 14px",
    boxSizing: "border-box",
    border: emphasis
      ? "1px solid rgba(124,58,237,0.24)"
      : "1px solid rgba(99,102,241,0.16)",
    borderRadius: THEME.radii.md,
    fontSize: 14,
    background: emphasis ? "rgba(124,58,237,0.04)" : "rgba(99,102,241,0.03)",
    outline: "none",
    color: THEME.colors.ink,
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const next = router.query.next || "/";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setSuccess(null);
    setLoading(true);

    try {
      const r = await fetch(remote("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          code: code.trim(),
        }),
      });

      const j = await r.json();
      if (!r.ok || !j.ok) {
        const errMap = {
          identifier_required: "请输入邮箱或用户名",
          password_too_short: "密码至少 8 位",
          code_required: "请输入兑换码",
          invalid_code: "兑换码无效 / 已过期 / 已用完",
          code_expired: "该兑换码已过期",
          code_used_up: "该兑换码已达使用上限",
          email_exists: "该邮箱已注册",
          username_exists: "该用户名已被占用",
          register_failed: "注册失败，请稍后重试",
          db_read_failed: "服务器繁忙，请稍后重试",
          server_error: "服务器错误，请稍后重试",
        };
        setMsg(errMap[j.error] || "注册失败，请稍后重试");
        setLoading(false);
        return;
      }

      setSuccess({
        email: j.email,
        expires_at: j.expires_at,
      });

      // 如果后端返回了 token，直接写入 localStorage 实现自动登录
      if (j.access_token) {
        try {
          localStorage.setItem("sb_access_token", j.access_token);
          if (j.refresh_token) localStorage.setItem("sb_refresh_token", j.refresh_token);
        } catch (e) {}
      }

      setTimeout(() => {
        if (j.access_token) {
          // 已自动登录，直接跳目标页（首页或来源页）
          router.push(next || "/");
        } else {
          // 极少数情况自动登录失败，跳登录页并预填邮箱
          router.push(`/login?email=${encodeURIComponent(j.email || "")}&redirectTo=${encodeURIComponent(next)}`);
        }
      }, 1800);
    } catch (err) {
      setMsg(err.message || "网络错误，请重试");
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
        {success ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.2,
                fontWeight: 980,
                color: THEME.colors.ink,
                marginBottom: 8,
              }}
            >
              注册成功
            </div>
            <div
              style={{
                fontSize: 14,
                color: THEME.colors.muted,
                lineHeight: 1.7,
              }}
            >
              账号：{success.email}
              {success.expires_at && (
                <>
                  <br />
                  到期时间：{new Date(success.expires_at).toLocaleDateString("zh-CN")}
                </>
              )}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: THEME.colors.faint }}>
              正在跳转首页...
            </div>
          </div>
        ) : (
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
              会员注册
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
              注册并开通会员
            </div>

            <div
              style={{
                fontSize: 14,
                color: THEME.colors.muted,
                lineHeight: 1.7,
                marginBottom: 22,
              }}
            >
              填写账号信息并输入兑换码，一步完成注册和开通。
            </div>

            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.colors.ink,
                    marginBottom: 6,
                  }}
                >
                  邮箱或用户名
                </div>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="邮箱 或 你想要的用户名"
                  style={inputStyle(false)}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.colors.ink,
                    marginBottom: 6,
                  }}
                >
                  密码
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 8 位，建议包含大小写和数字"
                  style={inputStyle(false)}
                />
              </div>

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
                  placeholder="输入你的月卡 / 年卡兑换码"
                  style={inputStyle(true)}
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
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 4,
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
                {loading ? "注册中..." : "注册并开通会员 ✨"}
              </button>
            </form>

            <div
              style={{
                marginTop: 18,
                textAlign: "center",
                fontSize: 13,
                color: THEME.colors.muted,
              }}
            >
              已有账号？{" "}
              <a
                href="/login"
                style={{
                  color: THEME.colors.accent,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                去登录
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
