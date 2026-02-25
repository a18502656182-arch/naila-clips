// pages/register.js
import { useState } from "react";
import { useRouter } from "next/router";

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
    setMsg("");
    setSuccess(null);
    setLoading(true);

    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, code }),
      });

      const j = await r.json();

      if (!r.ok || !j.ok) {
        setMsg(prettifyError(j.error));
        return;
      }

      if (j.needs_login) {
        router.push(`/login?email=${encodeURIComponent(j.email_hint || "")}`);
        return;
      }

      setSuccess({
        plan: j.plan || "member",
        expires_at: j.expires_at || null,
      });

      // 给用户 0.8s 看到成功提示，再跳首页
      setTimeout(() => router.push("/"), 800);
    } catch (err) {
      setMsg(prettifyError(err.message));
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
          style={{ padding: 12, borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600 }}
        >
          {loading ? "注册中..." : "注册并开通"}
        </button>
      </form>

      {msg ? <div style={{ marginTop: 12, color: "#b00020" }}>{msg}</div> : null}

      {success ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
          <div style={{ fontWeight: 700 }}>注册成功 ✅</div>
          <div style={{ marginTop: 6, fontSize: 14 }}>
            会员类型：{success.plan}
            {success.expires_at ? (
              <>
                <br />
                到期时间：{new Date(success.expires_at).toLocaleString()}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 14, fontSize: 14 }}>
        已有账号？ <a href="/login">去登录</a>
      </div>
    </div>
  );
}
