// pages/login.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

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

      if (!r.ok || !j.ok) {
        setMsg(j.error || "登录失败");
        return;
      }

      router.push("/");
    } catch (err) {
      setMsg(err.message || "未知错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>登录</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div>邮箱或用户名</div>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="邮箱 或 你的用户名"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div>密码</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入你的密码"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <button
          disabled={loading}
          style={{ padding: 12, borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600 }}
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>

      {msg ? <div style={{ marginTop: 12, color: "#b00020" }}>{msg}</div> : null}

      <div style={{ marginTop: 14, fontSize: 14 }}>
        没有账号？ <a href="/register">去注册</a>
      </div>
    </div>
  );
}
