// pages/register.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function RegisterPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, code }),
      });

      const j = await r.json();

      // 失败：显示错误
      if (!r.ok || !j.ok) {
        setMsg(j.error || "注册失败");
        return;
      }

      // 后端说需要去登录（极少数：写 cookie 失败 / 登录失败）
      if (j.needs_login) {
        router.push(`/login?email=${encodeURIComponent(j.email_hint || "")}`);
        return;
      }

      // ✅ 成功：后端已经写好 cookie，直接回首页
      router.push("/");
    } catch (err) {
      setMsg(err.message || "未知错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>注册（输入兑换码直接开通会员）</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div>邮箱或用户名</div>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="邮箱 或 你想要的用户名"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div>密码</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 8 位，建议包含大小写+数字"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div>兑换码</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="月/季/年兑换码"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <button
          disabled={loading}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "注册中..." : "注册并开通"}
        </button>
      </form>

      {msg ? <div style={{ marginTop: 12, color: "#b00020" }}>{msg}</div> : null}

      <div style={{ marginTop: 14, fontSize: 14 }}>
        已有账号？ <a href="/login">去登录</a>
      </div>
    </div>
  );
}
