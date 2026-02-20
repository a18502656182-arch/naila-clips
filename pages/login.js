import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(false);

  // 读取 URL 提示（callback 成功/失败）
  useEffect(() => {
    const url = new URL(window.location.href);
    const ok = url.searchParams.get("ok");
    const err = url.searchParams.get("error");
    if (ok) setMsg("✅ 登录成功（cookie 已写入）。现在去打开 /api/me 验证。");
    if (err) setMsg("❌ 登录失败：" + err);
  }, []);

  async function refreshMe() {
    setLoadingMe(true);
    try {
      const r = await fetch("/api/me");
      const d = await r.json();
      setMe(d);
    } catch (e) {
      setMe({ error: "fetch /api/me failed" });
    } finally {
      setLoadingMe(false);
    }
  }

  useEffect(() => {
    refreshMe();
  }, []);

  async function sendLoginLink() {
    setMsg("");
    const e = email.trim();
    if (!e) return setMsg("请输入邮箱");

    // 直接调用 Supabase Auth REST：signInWithOtp（不依赖 supabase-js）
    // 这样你 package.json 里不需要加 auth-helpers 的浏览器包也能发邮件
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return setMsg("❌ 缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    const emailRedirectTo = `${window.location.origin}/api/auth/callback`;

    try {
      const resp = await fetch(`${supabaseUrl}/auth/v1/otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          email: e,
          create_user: true,
          gotrue_meta_security: {},
          data: {},
          options: { emailRedirectTo },
        }),
      });

      const text = await resp.text();
      if (!resp.ok) {
        return setMsg("发送失败：" + text);
      }

      setMsg(
        "✅ 已发送登录邮件：去邮箱点链接 → 会自动跳到 /api/auth/callback 写入登录态 → 再回到本页刷新状态"
      );
    } catch (err) {
      setMsg("发送失败：" + (err?.message || "unknown"));
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10 }}>
        登录 / 获取 Token（临时工具页）
      </h1>
      <div style={{ color: "#666", marginBottom: 14 }}>
        目标：让服务器端 /api/me 读到登录态（cookie），后端接口（/api/bookmarks 等）才能识别登录。
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>方式：邮箱登录（magic link）</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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
            onClick={refreshMe}
            style={{
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: 10,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {loadingMe ? "刷新中..." : "刷新登录状态"}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#444" }}>
          邮件里的链接点完后，会先到：<b>/api/auth/callback</b>（写 cookie）再跳回本页
        </div>

        {msg ? <div style={{ marginTop: 10, color: "#111" }}>{msg}</div> : null}
      </div>

      <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>当前登录状态（来自 /api/me）</div>

        {me ? (
          <pre
            style={{
              margin: 0,
              padding: 12,
              borderRadius: 10,
              background: "#fafafa",
              border: "1px solid #eee",
              overflow: "auto",
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            {JSON.stringify(me, null, 2)}
          </pre>
        ) : (
          <div style={{ color: "#444" }}>暂无</div>
        )}

        <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
          ✅ 成功标准：这里能看到 <b>"logged_in": true</b>。
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <a href="/" style={{ color: "#111" }}>
          ← 返回首页
        </a>
      </div>
    </div>
  );
}
