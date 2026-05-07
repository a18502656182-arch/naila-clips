"use client";
import { useState } from "react";

function WechatIcon({ size = 15, color = "#059669" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c-.276-.94-.418-1.92-.418-2.93 0-3.94 3.567-7.12 7.945-7.12.3 0 .596.017.886.05C15.86 4.237 12.557 2.188 8.69 2.188zm-2.72 3.38c.574 0 1.04.46 1.04 1.03 0 .57-.466 1.03-1.04 1.03-.573 0-1.04-.46-1.04-1.03 0-.57.467-1.03 1.04-1.03zm5.44 0c.573 0 1.04.46 1.04 1.03 0 .57-.467 1.03-1.04 1.03-.574 0-1.04-.46-1.04-1.03 0-.57.466-1.03 1.04-1.03z"/>
      <path d="M23.95 14.17c0-3.44-3.373-6.22-7.527-6.22-4.155 0-7.528 2.78-7.528 6.22 0 3.44 3.373 6.22 7.528 6.22.976 0 1.91-.165 2.77-.464a.696.696 0 0 1 .574.08l1.522.89a.261.261 0 0 0 .133.044.236.236 0 0 0 .232-.236c0-.058-.023-.115-.038-.17l-.312-1.184a.472.472 0 0 1 .17-.532c1.468-1.1 2.477-2.748 2.477-4.648zm-10.04-1.048c-.46 0-.833-.368-.833-.823 0-.456.373-.824.834-.824.46 0 .833.368.833.824 0 .455-.373.823-.833.823zm5.025 0c-.46 0-.833-.368-.833-.823 0-.456.373-.824.834-.824.46 0 .833.368.833.824 0 .455-.373.823-.833.823z"/>
    </svg>
  );
}

export default function WechatButton({ btnStyle = "light", compact = false, wechatQrUrl = "" }) {
  const [open, setOpen] = useState(false);
  const isLight = btnStyle === "light";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: compact ? "7px 12px" : "10px 18px", borderRadius: 999, cursor: "pointer",
          fontSize: compact ? 12 : 13, fontWeight: 800, flexShrink: 0,
          background: isLight ? "rgba(255,255,255,0.15)" : "rgba(5,150,105,0.08)",
          border: isLight ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(5,150,105,0.2)",
          color: isLight ? "#fff" : "#059669",
          boxShadow: isLight ? "0 4px 14px rgba(0,0,0,0.2)" : "none",
          transition: "all 160ms ease",
        }}
      >
        <WechatIcon size={14} color={isLight ? "#fff" : "#059669"} />
        联系客服
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 10002,
            background: "rgba(11,18,32,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 24,
              border: "1px solid rgba(11,18,32,0.08)",
              boxShadow: "0 40px 100px rgba(11,18,32,0.20)",
              padding: "24px 24px 20px",
              width: "100%", maxWidth: 360,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(5,150,105,0.10)", border: "1px solid rgba(5,150,105,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <WechatIcon size={15} color="#059669" />
                </div>
                <span style={{ fontSize: 15, fontWeight: 900, color: "#0b1220" }}>联系客服</span>
              </div>
              <button onClick={() => setOpen(false)} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(11,18,32,0.10)", background: "rgba(11,18,32,0.04)", cursor: "pointer", color: "#94a3b8", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(11,18,32,0.08)", marginBottom: 12 }}>
              <div style={{ background: "#fff", padding: 12 }}>
                <img src={wechatQrUrl} alt="客服二维码" style={{ width: "100%", display: "block", borderRadius: 8 }}
                  onError={e => { e.target.style.display = "none"; e.target.parentNode.innerHTML = '<div style="font-size:13px;color:rgba(11,18,32,0.38);text-align:center;padding:40px 16px;line-height:1.8">图片加载失败，请联系客服</div>'; }} />
              </div>
              <div style={{ padding: "9px 14px", background: "rgba(99,102,241,0.04)", borderTop: "1px solid rgba(11,18,32,0.06)", fontSize: 12, color: "rgba(11,18,32,0.55)", lineHeight: 1.6, textAlign: "center" }}>
                截图后在微信扫一扫识别二维码添加客服
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
