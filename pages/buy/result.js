// pages/buy/result.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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
};

const PLAN_LABELS = {
  month: "月卡（30天）",
  quarter: "季卡（90天）",
  year: "年卡（365天）",
  lifetime: "永久卡",
};

export default function BuyResultPage() {
  const router = useRouter();
  const { order } = router.query;

  const [status, setStatus] = useState("loading"); // loading | paid | pending | error
  const [orderData, setOrderData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!order) return;
    poll();
  }, [order]);

  // 轮询订单状态，最多轮询 20 次（每次 3 秒）
  async function poll() {
    if (!order) return;
    try {
      const res = await fetch(`${API_BASE}/api/pay_query?order=${order}`);
      const data = await res.json();
      if (!data.ok) { setStatus("error"); return; }

      setOrderData(data);
      if (data.status === "paid") {
        setStatus("paid");
      } else {
        // 还没支付成功，继续轮询
        setPollCount(c => {
          if (c < 20) {
            setTimeout(poll, 3000);
            return c + 1;
          }
          setStatus("pending");
          return c;
        });
      }
    } catch {
      setStatus("error");
    }
  }

  function copyCode() {
    if (!orderData?.redeem_code) return;
    navigator.clipboard.writeText(orderData.redeem_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <Head>
        <title>支付结果 — 影视英语片段库</title>
      </Head>
      <div style={{
        minHeight: "100vh", background: C.bg,
        fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
        display: "flex", flexDirection: "column",
      }}>

        {/* 顶部 */}
        <div style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <a href="/" style={{ textDecoration: "none", color: C.muted, fontSize: 22, lineHeight: 1 }}>‹</a>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>支付结果</span>
        </div>

        <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 16px 60px", width: "100%" }}>

          {/* 加载中 */}
          {status === "loading" && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 8 }}>正在确认支付结果</div>
              <div style={{ fontSize: 13, color: C.faint }}>请稍候，正在查询订单状态...</div>
            </div>
          )}

          {/* 支付成功 */}
          {status === "paid" && orderData && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: "0 0 8px" }}>
                  支付成功！
                </h1>
                <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
                  你的专属兑换码已生成，请妥善保存
                </p>
              </div>

              {/* 重要提示 */}
              <div style={{
                background: "linear-gradient(135deg, rgba(239,68,68,0.10), rgba(239,68,68,0.06))",
                border: "2px solid rgba(239,68,68,0.35)",
                borderRadius: 14, padding: "12px 16px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>⚠️</span>
                <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 800, lineHeight: 1.6 }}>
                  请立即截图或复制保存兑换码！丢失后需联系客服找回。
                </div>
              </div>

              {/* 兑换码展示 */}
              <div style={{
                background: C.surface,
                border: `2px solid ${C.accent}`,
                borderRadius: 20, padding: "24px 20px",
                textAlign: "center", marginBottom: 20,
              }}>
                <div style={{ fontSize: 12, color: C.faint, marginBottom: 10, fontWeight: 700 }}>
                  你的兑换码
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 900, letterSpacing: 4,
                  color: C.accent, fontFamily: "monospace",
                  marginBottom: 16, wordBreak: "break-all",
                }}>
                  {orderData.redeem_code}
                </div>
                <button
                  onClick={copyCode}
                  style={{
                    padding: "10px 28px", borderRadius: 999, border: "none",
                    background: copied ? C.good : C.accent,
                    color: "#fff", fontSize: 14, fontWeight: 800,
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  {copied ? "✓ 已复制" : "复制兑换码"}
                </button>
              </div>

              {/* 订单信息 */}
              <div style={{
                background: C.surface, borderRadius: 16,
                border: `1px solid ${C.border}`,
                padding: "16px 18px", marginBottom: 24,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12 }}>订单详情</div>
                {[
                  ["套餐", PLAN_LABELS[orderData.plan] || orderData.plan],
                  ["金额", `¥${orderData.amount}`],
                  ["订单号", orderData.out_trade_no || order],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: 13, color: C.muted, padding: "5px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    <span>{label}</span>
                    <span style={{ color: C.ink, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* 使用说明 */}
              <div style={{
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 12, padding: "14px 16px", marginBottom: 24,
                fontSize: 13, color: "#065f46", lineHeight: 1.8,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>📋 如何使用兑换码</div>
                <div>• 没有账号：前往注册页，填入兑换码完成注册</div>
                <div>• 已有账号：登录后前往兑换页，输入兑换码激活</div>
              </div>

              {/* 永久卡专属：定制视频引导 */}
              {orderData?.plan === "lifetime" && (
                <div style={{
                  background: "linear-gradient(135deg, rgba(220,38,38,0.06), rgba(251,146,60,0.06))",
                  border: "1.5px solid rgba(220,38,38,0.25)",
                  borderRadius: 14, padding: "16px 18px", marginBottom: 24,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#dc2626", marginBottom: 8 }}>
                    🎁 你的专属福利：10 期定制油管博主视频
                  </div>
                  <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.8, marginBottom: 12 }}>
                    恭喜你成为永久会员！我们将为你定制 10 期专属的油管博主视频内容。<br />
                    请添加客服微信，发送「永久卡定制」，我们会与你确认定制需求。
                  </div>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    background: "#fff", border: "1.5px solid rgba(220,38,38,0.3)",
                    borderRadius: 999, padding: "8px 16px", cursor: "pointer",
                    fontSize: 13, fontWeight: 800, color: "#dc2626",
                  }}
                    onClick={() => {
                      navigator.clipboard?.writeText("wll74748585").catch(() => {});
                      alert("客服微信号已复制，请打开微信添加");
                    }}
                  >
                    💬 联系客服领取定制内容
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <a href="/register" style={{
                  flex: 1, textAlign: "center", padding: "13px 0",
                  borderRadius: 14, border: `1px solid ${C.border}`,
                  color: C.ink, textDecoration: "none",
                  fontSize: 14, fontWeight: 700, background: C.surface,
                }}>去注册</a>
                <a href="/redeem" style={{
                  flex: 1, textAlign: "center", padding: "13px 0",
                  borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "#fff", textDecoration: "none",
                  fontSize: 14, fontWeight: 700,
                }}>去兑换激活</a>
              </div>
            </div>
          )}

          {/* 等待支付（超时未收到回调） */}
          {status === "pending" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
                支付确认中
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.7 }}>
                支付结果还未到达，可能需要几分钟。<br />
                请稍后刷新页面查看，或联系客服提供订单号。
              </div>
              <div style={{
                background: C.surface, borderRadius: 12,
                border: `1px solid ${C.border}`,
                padding: "12px 16px", marginBottom: 20,
                fontSize: 13, color: C.muted,
              }}>
                订单号：<span style={{ fontFamily: "monospace", color: C.ink, fontWeight: 700 }}>{order}</span>
              </div>
              <button
                onClick={() => { setStatus("loading"); setPollCount(0); poll(); }}
                style={{
                  padding: "12px 28px", borderRadius: 999, border: `1px solid ${C.accent}`,
                  background: "transparent", color: C.accent,
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                重新查询
              </button>
            </div>
          )}

          {/* 错误 */}
          {status === "error" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 8 }}>查询失败</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
                订单号：{order}，请联系客服处理
              </div>
              <a href="/buy" style={{
                display: "inline-block", padding: "12px 28px", borderRadius: 999,
                background: C.accent, color: "#fff",
                textDecoration: "none", fontSize: 14, fontWeight: 700,
              }}>重新购买</a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
