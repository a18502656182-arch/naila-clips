import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let ignore = false;

    supabase.auth.getSession().then(({ data }) => {
      if (ignore) return;
      setToken(data?.session?.access_token || "");
      setUser(data?.session?.user || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (ignore) return;
      setToken(session?.access_token || "");
      setUser(session?.user || null);
    });

    return () => {
      ignore = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  async function sendLoginLink() {
    setMsg("");
    const e = email.trim();
    if (!e) return setMsg("请输入邮箱");

    // ✅ 关键：让 supabase 回调走 /api/auth/callback（服务端写 cookie）
    const redirectTo = `${window.location.origin}/api/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) return setMsg("发送失败：" + error.message);
    setMsg("已发送登录邮件：去邮箱点击链接 → 会自动写入登录状态（cookie）。");
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setToken("");
    setMsg("已退出登录");
  }

  async function copyToken() {
    if (!token) return setMsg("当前没有 token（可能还没登录成功）");
    await navigator.clipboard.writeText(token);
    setMsg("已复制 access_token");
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10 }}>
        登录（magic link）
      </h1>

      <div style={{ color: "#666", marginBottom: 14 }}>
        登录后：
        <b> /api/me </b>应变成 logged_in:true（因为 cookie 已写入）
        <br />
        也可复制 access_token 用于 Bearer 测试 /api/redeem
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>邮箱登录</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="输入邮箱"
            style={{
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 10,
              minWidth: 260,
            }}
          />
          <button
            onClick={sendLoginLink}
            style={{
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: 10,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            发送登录邮件
          </button>
          <button
            onClick={logout}
            style={{
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: 10,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            退出登录
          </button>
        </div>

        {msg ? <div style={{ marginTop: 10, color: "#111" }}>{msg}</div> : null}
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 8 }}>当前登录状态</div>

        {user ? (
          <>
            <div>已登录：{user.email}</div>

            <div style={{ marginTop: 10, fontWeight: 700 }}>access_token：</div>
            <textarea
              value={token}
              readOnly
              style={{
                width: "100%",
                height: 140,
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 10,
              }}
            />

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button
                onClick={copyToken}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                一键复制 token
              </button>

              <a
                href="/api/me"
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "10px 14px",
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  background: "#fff",
                  display: "inline-block",
                  textDecoration: "none",
                  color: "#111",
                }}
              >
                打开 /api/me 验证
              </a>
            </div>
          </>
        ) : (
          <div>未登录</div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <a href="/" style={{ color: "#111" }}>
          ← 返回首页
        </a>
      </div>
    </div>
  );
}
