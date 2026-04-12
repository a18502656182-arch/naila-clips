// pages/buy.js
import { useState } from "react";
import Head from "next/head";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const PLANS = [
  {
    id: "month",
    daysNum: 30,
    label: "月卡",
    days: "30天",
    price: "13.80",
    desc: "适合先体验一个月",
    hot: false,
  },
  {
    id: "quarter",
    daysNum: 90,
    label: "季卡",
    days: "90天",
    price: "29.80",
    desc: "最划算的短期选择",
    hot: true,
  },
  {
    id: "year",
    daysNum: 365,
    label: "年卡",
    days: "365天",
    price: "66.80",
    desc: "深度学习推荐",
    hot: false,
  },
  {
    id: "lifetime",
    daysNum: null,
    label: "永久卡",
    days: "永久有效",
    price: "168.80",
    desc: "一次买断，终身使用",
    hot: false,
  },
];

const C = {
  bg: "#f4f6fb",
  surface: "#ffffff",
  ink: "#0b1220",
  muted: "rgba(11,18,32,0.6)",
  faint: "rgba(11,18,32,0.38)",
  border: "rgba(15,23,42,0.08)",
  accent: "#4f46e5",
  accentLight: "rgba(79,70,229,0.08)",
  good: "#10b981",
  vip: "#7c3aed",
};

export default function BuyPage() {
  const [selectedPlan, setSelectedPlan] = useState("quarter");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/pay_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          return_url: window.location.origin + "/buy/result",
          notify_url: "https://naila-api-meiju-production.up.railway.app/api/pay_notify",
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "创建订单失败");
      // 跳转到 zpay 支付页
      window.location.href = data.pay_url;
    } catch (e) {
      setError(e.message || "出错了，请稍后重试");
      setLoading(false);
    }
  }

  const plan = PLANS.find(p => p.id === selectedPlan);

  return (
    <>
      <Head>
        <title>开通会员 — 油管英语场景库</title>
      </Head>
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif" }}>

        {/* 顶部导航 */}
        <div style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <a href="/" style={{ textDecoration: "none", color: C.muted, fontSize: 22, lineHeight: 1 }}>‹</a>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>开通会员</span>
        </div>

        <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px 60px" }}>

          {/* 标题 */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎬</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: "0 0 8px" }}>
              解锁全部影视片段
            </h1>
            <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.6 }}>
              支付后自动生成兑换码，前往注册页填入即可开通
            </p>
          </div>

          {/* 套餐选择 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {PLANS.map(p => {
              const isSelected = selectedPlan === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  style={{
                    background: C.surface,
                    border: `2px solid ${isSelected ? C.accent : C.border}`,
                    borderRadius: 16,
                    padding: "16px 18px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    position: "relative",
                    transition: "all 0.15s",
                    background: isSelected ? "rgba(79,70,229,0.04)" : C.surface,
                  }}
                >
                  {p.hot && (
                    <div style={{
                      position: "absolute", top: -10, left: 18,
                      background: "#ef4444", color: "#fff",
                      fontSize: 11, fontWeight: 800,
                      padding: "2px 10px", borderRadius: 999,
                    }}>热门</div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: `2px solid ${isSelected ? C.accent : C.faint}`,
                      background: isSelected ? C.accent : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{p.label}</span>
                        <span style={{ fontSize: 12, color: C.faint }}>{p.days}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.desc}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {p.daysNum ? (
                      <>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 2 }}>
                          <span style={{ fontSize: 11, color: isSelected ? C.accent : C.muted }}>¥</span>
                          <span style={{ fontSize: 26, fontWeight: 900, color: isSelected ? C.accent : C.ink, lineHeight: 1 }}>{(Math.floor(Number(p.price) / p.daysNum * 100) / 100).toFixed(2)}</span>
                          <span style={{ fontSize: 12, color: isSelected ? C.accent : C.muted, fontWeight: 700 }}>/ 天</span>
                        </div>
                        <div style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>共¥{p.price}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 1 }}>
                          <span style={{ fontSize: 11, color: isSelected ? C.accent : C.muted }}>¥</span>
                          <span style={{ fontSize: 26, fontWeight: 900, color: isSelected ? C.accent : C.ink, lineHeight: 1 }}>{p.price.split(".")[0]}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: isSelected ? C.accent : C.ink }}>.{p.price.split(".")[1]}</span>
                        </div>
                        <div style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>一次买断</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 支付说明 */}
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

          {/* 错误提示 */}
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 12, padding: "10px 14px", marginBottom: 16,
              fontSize: 13, color: "#991b1b",
            }}>{error}</div>
          )}

          {/* 支付按钮 */}
          <button
            onClick={handlePay}
            disabled={loading}
            style={{
              width: "100%", padding: "16px 0",
              borderRadius: 16, border: "none",
              background: loading ? "rgba(79,70,229,0.5)" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "#fff", fontSize: 16, fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 8px 24px rgba(79,70,229,0.35)",
              transition: "all 0.2s",
            }}
          >
            {loading ? "跳转中..." : `支付宝支付 ¥${plan?.price}`}
          </button>

          <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.faint }}>
            支付由支付宝提供安全保障 · 如有问题请联系客服
          </div>
        </div>
      </div>
    </>
  );
}
