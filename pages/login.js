import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createPagesBrowserClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    options: {
      auth: {
        // ✅ 关键：让 magic link 走 code (PKCE) 流程，服务端 callback 才能 exchange 并写 cookie
        flowType: "pkce",
      },
    },
  });

  const [email, setEmail] = useState("");
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState("");

  // 读取当前 session（cookie + localStorage 都能兼容）
  useEffect(() => {
    let ignore = false;

    supabase.auth.getSession().then(({ data }) => {
      if (ignore) return;
      setUser(data?.session?.user || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      ignore = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  async function sendLoginLink() {
    setMsg("");
    const e = email.trim();
    if (!e) return setMsg("请输入邮箱");

    // ✅ 关键：回跳必须到 /api/auth/callback，让服务端写 cookie
    const redirectTo = `${window.location.origin}/api/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) return setMsg("发送失败：" + error.message);
    setMsg("已发送登录邮件：去邮箱点链接。成功后会自动回到网站。");
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setMsg("已退出登录");
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10 }}>
        登录（magic link）
      </h1>

      <div style={{ color: "#666", marginBottom: 14 }}>
        登录后 /api/me 应该变成 logged_in:true（因为 cookie 已写入）
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

        {msg ? <div style={{ marginTop: 10 }}>{msg}</div> : null}
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
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => router.push("/")}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                返回首页
              </button>
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
