// pages/order-query.js
import Head from "next/head";
import { useState } from "react";

const C = {
  bg: "#f6f8fc",
  surface: "#fff",
  ink: "#0b1220",
  muted: "rgba(11,18,32,0.55)",
  faint: "rgba(11,18,32,0.35)",
  accent: "#6366f1",
  border: "rgba(15,23,42,0.08)",
  success: "#059669",
};

const PLAN_LABEL = { month: "月卡（30天）", quarter: "季卡（90天）", year: "年卡（365天）", lifetime: "永久卡" };

export default function OrderQuery() {
  const [orderNo, setOrderNo] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleQuery() {
    const no = orderNo.trim();
    if (!no) { setError("请输入订单号"); return; }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/pay_query?order=${encodeURIComponent(no)}`);
      const d = await res.json();
      if (!d.ok) { setError("未找到该订单，请确认订单号是否正确"); }
      else setResult(d);
    } catch {
      setError("查询失败，请稍后重试");
    }
    setLoading(false);
  }

  function handleCopy() {
    if (!result?.redeem_code) return;
    navigator.clipboard.writeText(result.redeem_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Head><title>查询兑换码 — 奶酪包英语场景库</title></Head>
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        <div style={{ width: "100%", maxWidth: 420, background: C.surface, borderRadius: 20, padding: "36px 28px", boxShadow: "0 8px 40px rgba(11,18,32,0.10)" }}>
          {/* 标题 */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: C.ink, margin: "0 0 8px" }}>查询兑换码</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
              输入支付宝订单号，即可找回您的兑换码
            </p>
          </div>

          {/* 输入框 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>支付宝订单号</div>
            <input
              type="text"
              value={orderNo}
              onChange={e => { setOrderNo(e.target.value); setError(""); setResult(null); }}
              onKeyDown={e => e.key === "Enter" && handleQuery()}
              placeholder="请输入支付宝订单号"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "12px 14px", borderRadius: 12, fontSize: 14,
                border: `1.5px solid ${error ? "#ef4444" : C.border}`,
                background: "#f8f9ff", color: C.ink, outline: "none",
              }}
            />
            <div style={{ fontSize: 11, color: C.faint, marginTop: 5 }}>
              在支付宝 → 我的 → 账单 里可以找到订单号
            </div>
          </div>

          {/* 查询按钮 */}
          <button
            onClick={handleQuery}
            disabled={loading}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
              background: loading ? "#a5b4fc" : "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              marginBottom: 16,
            }}
          >
            {loading ? "查询中..." : "查询兑换码"}
          </button>

          {/* 错误提示 */}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#dc2626", textAlign: "center" }}>
              {error}
            </div>
          )}

          {/* 查询结果 */}
          {result && (
            <div style={{ background: "rgba(5,150,105,0.05)", border: "1px solid rgba(5,150,105,0.2)", borderRadius: 14, padding: "18px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: C.muted }}>套餐</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{PLAN_LABEL[result.plan] || result.plan}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: C.muted }}>金额</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>¥{result.amount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: C.muted }}>支付时间</span>
                <span style={{ fontSize: 13, color: C.ink }}>{result.paid_at ? new Date(result.paid_at).toLocaleString("zh-CN") : "—"}</span>
              </div>
              <div style={{ background: "#fff", borderRadius: 10, padding: "14px", border: "1.5px dashed rgba(5,150,105,0.4)" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>您的兑换码</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: C.success, letterSpacing: "0.08em", flex: 1 }}>{result.redeem_code}</span>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: copied ? C.success : C.accent,
                      color: "#fff", fontSize: 12, fontWeight: 700,
                    }}
                  >{copied ? "已复制 ✓" : "复制"}</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 12, textAlign: "center" }}>
                复制兑换码后，前往
                <a href="/register" style={{ color: C.accent, fontWeight: 700, margin: "0 4px" }}>注册页</a>
                填入即可开通会员
              </div>
            </div>
          )}

          {/* 返回首页 */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a href="/" style={{ fontSize: 13, color: C.faint, textDecoration: "none" }}>← 返回首页</a>
          </div>
        </div>
      </div>
    </>
  );
}
