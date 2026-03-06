"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "../../utils/supabase/client";

const THEME = {
  colors: {
    bg: "#f6f8fc",
    surface: "#ffffff",
    ink: "#0b1220",
    muted: "rgba(11,18,32,0.66)",
    faint: "rgba(11,18,32,0.46)",
    border: "rgba(11,18,32,0.08)",
    border2: "rgba(11,18,32,0.14)",
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

function inputStyle() {
  return {
    width: "100%",
    padding: "12px 14px",
    boxSizing: "border-box",
    border: "1px solid rgba(99,102,241,0.16)",
    borderRadius: THEME.radii.md,
    fontSize: 14,
    background: "rgba(99,102,241,0.03)",
    outline: "none",
    color: THEME.colors.ink,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
  };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo =
    searchParams.get("redirectTo") || searchParams.get("next") || "/";
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
      let email = identifier.trim().toLowerCase();
      if (!email.includes("@")) {
        const username = email
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/_+/g, "_")
          .slice(0, 32);
        email = `${username}@users.nailaobao.local`;
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg(error.message || "登录失败");
        setLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) localStorage.setItem("sb_access_token", session.access_token);
      } catch {}

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setMsg(err.message || "未知错误");
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
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 999,
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.12)",
            color: THEME.colors.accent,
            fontSize: 12,
            fontWeight: 900,
            marginBottom: 16,
          }}
        >
          账号登录
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
          欢迎回来
        </div>

        <div
          style={{
            fontSize: 14,
            color: THEME.colors.muted,
            lineHeight: 1.7,
            marginBottom: 22,
          }}
        >
          登录后即可继续浏览视频、收藏词汇，并使用你的学习记录。
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
              placeholder="输入邮箱或用户名"
              style={inputStyle()}
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
              placeholder="输入你的密码"
              style={inputStyle()}
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
                ? "rgba(99,102,241,0.42)"
                : `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.vip})`,
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 16px 30px rgba(99,102,241,0.24)",
            }}
          >
            {loading ? "登录中..." : "登录"}
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
          没有账号？{" "}
          <a
            href="/register"
            style={{
              color: THEME.colors.accent,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            注册并开通会员
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={shellStyle()}>
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              padding: 28,
              background: "#fff",
              borderRadius: 22,
              border: "1px solid rgba(11,18,32,0.10)",
            }}
          >
            <div
              style={{
                height: 24,
                width: "40%",
                borderRadius: 10,
                background: "#f0f1f7",
                marginBottom: 16,
              }}
            />
            <div
              style={{
                height: 46,
                borderRadius: 14,
                background: "#f0f1f7",
                marginBottom: 12,
              }}
            />
            <div
              style={{
                height: 46,
                borderRadius: 14,
                background: "#f0f1f7",
                marginBottom: 12,
              }}
            />
            <div style={{ height: 48, borderRadius: 999, background: "#eceef8" }} />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
