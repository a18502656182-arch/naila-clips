// pages/buy-lifetime.js
import { useState, useEffect } from "react";
import Head from "next/head";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const C = {
  bg: "#f4f6fb",
  surface: "#ffffff",
  ink: "#0b1220",
  muted: "rgba(11,18,32,0.6)",
  faint: "rgba(11,18,32,0.38)",
  border: "rgba(15,23,42,0.08)",
  accent: "#4f46e5",
  good: "#10b981",
  vip: "#7c3aed",
};

const FEATURES = [
  "解锁全部视频内容",
  "至少200期视频永久更新无上限",
  "终身有效，一次付费",
  "优先功能更新",
];

export default function BuyLifetimePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [price, setPrice] = useState("38.80");

  useEffect(() => {
    // 从后端读取永久卡定价
    fetch(`${API_BASE}/api/site_config?key=lifetime_price`)
      .then(r => r.json())
      .then(d => { if (d?.value) setPrice(d.value); })
      .catch(() => {});
  }, []);

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/pay_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "lifetime",
          return_url: window.location.origin + "/buy/result",
          notify_url: "https://railway.nailaobao.top/api/pay_notify",
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "创建订单失败");
      window.location.href = data.pay_url;
    } catch (e) {
      setError(e.message || "出错了，请稍后重试");
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>永久会员 — 油管英语场景库</title>
      </Head>
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif" }}>

        {/* 顶部导航 */}
        <div style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <a href="/" style={{ textDecoration: "none", color: C.muted, fontSize: 22, lineHeight: 1 }}>‹</a>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>永久会员</span>
        </div>

        <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px 60px" }}>

          {/* 标题 */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎬</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: C.ink, margin: "0 0 8px" }}>
              一次付费，终身使用
            </h1>
            <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.6 }}>
              支付后自动生成兑换码，前往注册页填入即可开通
            </p>
          </div>

          {/* 权益卡片 */}
          <div style={{
            background: C.surface,
            border: `2px solid ${C.vip}`,
            borderRadius: 20,
            padding: "24px 24px",
            marginBottom: 24,
            background: "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(79,70,229,0.04))",
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.vip, marginBottom: 16, letterSpacing: "0.05em" }}>
              ✦ 永久会员权益
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: C.vip, display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}>
                    <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>✓</span>
                  </div>
                  <span style={{ fontSize: 15, color: C.ink, fontWeight: 600 }}>{f}</span>
                </div>
              ))}
            </div>

            {/* 价格 */}
            <div style={{
              marginTop: 24, paddingTop: 20,
              borderTop: `1px solid rgba(124,58,237,0.15)`,
              display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4,
            }}>
              <span style={{ fontSize: 16, color: C.vip, fontWeight: 700 }}>¥</span>
              <span style={{ fontSize: 48, fontWeight: 900, color: C.vip, lineHeight: 1 }}>
                {price.split(".")[0]}
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: C.vip }}>
                .{price.split(".")[1] || "00"}
              </span>
              <span style={{ fontSize: 13, color: C.muted, marginLeft: 4 }}>一次性</span>
            </div>
          </div>

          {/* 购买说明 */}
          <div style={{
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 12, padding: "12px 16px", marginBottom: 24,
            fontSize: 13, color: "#065f46", lineHeight: 1.7,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>📋 购买说明</div>
            <div>1. 点击下方按钮，跳转支付宝完成付款</div>
            <div>2. 付款后自动生成专属兑换码并显示</div>
            <div>3. 前往网站注册页，填入兑换码完成注册</div>
            <div>4. 已有账号可在兑换页直接激活</div>
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 12, padding: "10px 14px", marginBottom: 16,
              fontSize: 13, color: "#991b1b",
            }}>{error}</div>
          )}

          <button
            onClick={handlePay}
            disabled={loading}
            style={{
              width: "100%", padding: "16px 0",
              borderRadius: 16, border: "none",
              background: loading ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "#fff", fontSize: 16, fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 8px 24px rgba(124,58,237,0.35)",
              transition: "all 0.2s",
            }}
          >
            {loading ? "跳转中..." : `支付宝支付 ¥${price}`}
          </button>

          <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.faint }}>
            支付由支付宝提供安全保障 · 如有问题请联系客服
          </div>
        </div>
      </div>
    </>
  );
}
