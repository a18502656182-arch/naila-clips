import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data?.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  async function refreshMe(token) {
    const r = await fetch("/api/me", {
      headers: { Authorization: "Bearer " + token },
    });
    const j = await r.json();
    setMe(j);
    return j;
  }

  async function onRegister() {
    setMsg("");
    const e = email.trim();
    if (!e || !pw) return setMsg("请填写邮箱和密码");

    // 1) 注册
    const { data, error } = await supabase.auth.signUp({
      email: e,
      password: pw,
    });
    if (error) return setMsg("注册失败：" + error.message);

    // 2) 有些配置下 signUp 会直接给 session；若没有 session，就提示去登录页
    const token = data?.session?.access_token || "";
    if (!token) {
      setMsg("注册成功，但当前未自动登录。请去 /login 用邮箱+密码登录后再输入兑换码。");
      return;
    }

    // 3) 如果填了兑换码，自动兑换
    const c = code.trim();
    if (c) {
      const rr = await fetch("/api/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ code: c }),
      });
      const rj = await rr.json();
      if (!rr.ok) {
        setMsg("注册成功，但兑换失败：" + (rj?.error || "unknown"));
        await refreshMe(token);
        return;
      }
      setMsg("注册+兑换成功✅ 会员已激活，ends_at=" + rj.ends_at);
      await refreshMe(token);
      return;
    }

    setMsg("注册成功✅（未填兑换码，当前为访客权限）");
    await refreshMe(token);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setMe(null);
    setMsg("已退出登录");
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10 }}>注册（邮箱 + 密码 + 兑换码）</h1>
      <div style={{ color: "#666", marginBottom: 14 }}>
        目标流程：注册时可直接输入兑换码 → 自动激活会员；到期后仍能登录，但会员权限消失。
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱（可用QQ邮箱）"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          />
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            placeholder="密码（随便先设一个测试）"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="兑换码（可选，例如 TEST30）"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={onRegister}
              style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 10, background: "#fff", cursor: "pointer" }}
            >
              注册并（可选）兑换
            </button>
            <button
              onClick={logout}
              style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 10, background: "#fff", cursor: "pointer" }}
            >
              退出登录
            </button>
          </div>

          {msg ? <div style={{ marginTop: 6, color: "#111" }}>{msg}</div> : null}
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>当前状态（调试用）</div>
        <div style={{ color: "#444" }}>
          <div>session：{session ? "✅有" : "❌无"}</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>/api/me 返回：</div>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(me, null, 2)}</pre>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <a href="/" style={{ color: "#111" }}>← 返回首页</a>
        <span style={{ margin: "0 10px" }}>|</span>
        <a href="/login" style={{ color: "#111" }}>去临时 token 页</a>
      </div>
    </div>
  );
}
