// pages/buy.js
import { useState, useEffect } from "react";
import Head from "next/head";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const PLANS = [
  { id: "month",    label: "月卡", days: "30天",   price: "13.80", desc: "适合先体验一个月",   hot: false },
  { id: "quarter",  label: "季卡", days: "90天",   price: "29.80", desc: "最划算的短期选择",   hot: true  },
  { id: "year",     label: "年卡", days: "365天",  price: "66.80", desc: "深度学习推荐",       hot: false },
  { id: "lifetime", label: "永久卡", days: "永久有效", price: "168.80", desc: null,           hot: false },
];

const SITE_CONFIG = {
  yt: {
    label: "🎥 油管博主会员",
    title: "解锁全部油管视频",
    desc: "海量真实英语母语者vlog、生活、学习视频片段",
    icon: "🎥",
    site: "yt",
  },
  drama: {
    label: "🎬 影视美剧会员",
    title: "解锁全部影视片段",
    desc: "精选英美剧、电影、动画高质量片段",
    icon: "🎬",
    site: "drama",
  },
};

const C = {
  bg: "#f4f6fb", surface: "#ffffff", ink: "#0b1220",
  muted: "rgba(11,18,32,0.6)", faint: "rgba(11,18,32,0.38)",
  border: "rgba(15,23,42,0.08)", accent: "#4f46e5",
  accentLight: "rgba(79,70,229,0.08)", good: "#10b981", vip: "#7c3aed",
};

export default function BuyPage() {
  const [selectedSite, setSelectedSite] = useState("yt");
  const [selectedPlan, setSelectedPlan] = useState("quarter");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/site_config?key=buy_mode`)
      .then(r => r.json())
      .then(d => {
        if (d?.value === "lifetime") {
          window.location.replace("/buy-lifetime");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, []);

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/pay_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          site: selectedSite,
          return_url: window.location.origin + "/buy/result",
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

  if (checking) return <div style={{ minHeight: "100vh", background: C.bg }} />;

  const plan = PLANS.find(p => p.id === selectedPlan);
  const siteInfo = SITE_CONFIG[selectedSite];

  return (
    <>
      <Head><title>开通会员 — 油管英语场景库</title></Head>
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif" }}>
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ textDecoration: "none", color: C.muted, fontSize: 22, lineHeight: 1 }}>‹</a>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>开通会员</span>
        </div>

        <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px 60px" }}>

          {/* 站点选择 Tab */}
          <div style={{ display: "flex", gap: 8, marginBottom: 28, background: "rgba(15,23,42,0.05)", borderRadius: 14, padding: 4 }}>
            {Object.values(SITE_CONFIG).map(s => (
              <button
                key={s.site}
                onClick={() => setSelectedSite(s.site)}
                style={{
                  flex: 1, padding: "10px 0", border: "none", borderRadius: 10, cursor: "pointer",
                  fontSize: 14, fontWeight: selectedSite === s.site ? 800 : 500,
                  background: selectedSite === s.site ? C.surface : "transparent",
                  color: selectedSite === s.site ? C.accent : C.muted,
                  boxShadow: selectedSite === s.site ? "0 2px 8px rgba(11,18,32,0.10)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{siteInfo.icon}</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: "0 0 8px" }}>{siteInfo.title}</h1>
            <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.6 }}>{siteInfo.desc}</p>
            <p style={{ fontSize: 13, color: C.faint, margin: "8px 0 0", lineHeight: 1.6 }}>支付后自动生成兑换码，前往注册页填入即可开通</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {PLANS.map(p => {
              const isSelected = selectedPlan === p.id;
              return (
                <div key={p.id} onClick={() => setSelectedPlan(p.id)} style={{
                  background: isSelected ? "rgba(79,70,229,0.04)" : C.surface,
                  border: `2px solid ${isSelected ? C.accent : C.border}`,
                  borderRadius: 16, padding: "16px 18px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  position: "relative", transition: "all 0.15s",
                }}>
                  {p.hot && <div style={{ position: "absolute", top: -10, left: 18, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 800, padding: "2px 10px", borderRadius: 999 }}>热门</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isSelected ? C.accent : C.faint}`, background: isSelected ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{p.label}</span>
                        <span style={{ fontSize: 12, color: C.faint }}>{p.days}</span>
                      </div>
                      {p.id === "lifetime" ? (
                        <div style={{ marginTop: 2, fontSize: 12, fontWeight: 800, color: "#dc2626", lineHeight: 1.6 }}>
                          🎁 赠送 10 期定制视频
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.desc}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: C.muted }}>¥</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: isSelected ? C.accent : C.ink }}>{p.price.split(".")[0]}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isSelected ? C.accent : C.ink }}>.{p.price.split(".")[1]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#065f46", lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>📋 购买说明</div>
            <div>1. 点击下方按钮，跳转支付宝完成付款</div>
            <div>2. 付款后自动生成专属兑换码并显示</div>
            <div>3. 前往网站注册页，填入兑换码完成注册</div>
            <div>4. 已有账号可在兑换页直接激活</div>
          </div>

          {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#991b1b" }}>{error}</div>}

          <button onClick={handlePay} disabled={loading} style={{ width: "100%", padding: "16px 0", borderRadius: 16, border: "none", background: loading ? "rgba(79,70,229,0.5)" : "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff", fontSize: 16, fontWeight: 900, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 8px 24px rgba(79,70,229,0.35)", transition: "all 0.2s" }}>
            {loading ? "跳转中..." : `支付宝支付 ¥${plan?.price}`}
          </button>
          <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.faint }}>支付由支付宝提供安全保障 · 如有问题请联系客服</div>
        </div>
      </div>
    </>
  );
}
