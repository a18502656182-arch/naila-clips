"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../components/home/theme";

// 高级感主题配置：两套为社交分享打造的流光配色
const POSTER_THEMES =[
  {
    name: "暗夜极光流",
    bg: ["#0B101E", "#111827", "#09090b"],
    orb1: "rgba(99, 102, 241, 0.35)", // Indigo
    orb2: "rgba(236, 72, 153, 0.25)", // Pink
    orb3: "rgba(6, 182, 212, 0.20)",  // Cyan
    textHero:["#818cf8", "#c084fc", "#f472b6"], // 大数字渐变
    textMain: "#ffffff",
    textSub: "rgba(255, 255, 255, 0.8)",
    textFaint: "rgba(255, 255, 255, 0.4)",
    glassBg: "rgba(30, 41, 59, 0.5)",
    glassBorder: "rgba(255, 255, 255, 0.12)",
    glassShadow: "rgba(0, 0, 0, 0.3)",
    heatmapEmpty: "rgba(255, 255, 255, 0.04)",
    heatmapActive:["rgba(52, 211, 153, 0.3)", "rgba(52, 211, 153, 0.6)", "rgba(52, 211, 153, 1)"],
    heatmapGlow: "rgba(52, 211, 153, 0.8)",
  },
  {
    name: "晨雾玻璃光",
    bg: ["#ffffff", "#f8fafc", "#f1f5f9"],
    orb1: "rgba(99, 102, 241, 0.15)",
    orb2: "rgba(236, 72, 153, 0.12)",
    orb3: "rgba(6, 182, 212, 0.10)",
    textHero:["#4f46e5", "#9333ea", "#db2777"],
    textMain: "#0f172a",
    textSub: "rgba(15, 23, 42, 0.7)",
    textFaint: "rgba(15, 23, 42, 0.35)",
    glassBg: "rgba(255, 255, 255, 0.65)",
    glassBorder: "rgba(255, 255, 255, 0.9)",
    glassShadow: "rgba(15, 23, 42, 0.06)",
    heatmapEmpty: "rgba(15, 23, 42, 0.04)",
    heatmapActive:["rgba(16, 185, 129, 0.4)", "rgba(16, 185, 129, 0.7)", "rgba(16, 185, 129, 1)"],
    heatmapGlow: "rgba(16, 185, 129, 0.6)",
  }
];

// 全局字体栈，确保高级感
const FONT_FAMILY = `system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;

function PosterGenerator({ me, streakDays, totalVideos, vocabCount, heatmapData, activeDays }) {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
  const[showModal, setShowModal] = useState(false);
  const [themeIdx, setThemeIdx] = useState(0);

  // 基础圆角矩形路径
  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // 核心：毛玻璃质感卡片绘制
  function drawGlassCard(ctx, x, y, w, h, radius, bgColor, borderColor, shadowColor) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, radius);
    
    // 发光与深度阴影
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = bgColor;
    ctx.fill();

    // 细微的高光描边
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 2;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    
    ctx.restore();
  }

  async function generate(forceTheme) {
    setGenerating(true);
    // 制造微小延迟，让 Loading UI 有机会渲染
    await new Promise((r) => setTimeout(r, 80));

    const nextTheme = forceTheme !== undefined ? forceTheme : themeIdx;
    setThemeIdx(nextTheme);
    const T = POSTER_THEMES[nextTheme];

    const canvas = canvasRef.current;
    const W = 1080;
    const H = 1920; // 黄金分享比例 9:16
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const PAD = 90; // 极其宽裕的留白呼吸感

    // --- 1. 沉浸式动态背景 ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, T.bg[0]);
    bgGrad.addColorStop(0.6, T.bg[1]);
    bgGrad.addColorStop(1, T.bg[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 绘制超级模糊的巨大光晕
    const drawOrb = (x, y, r, color) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    };
    drawOrb(200, 300, 800, T.orb1);
    drawOrb(W - 100, 800, 700, T.orb2);
    drawOrb(400, H - 200, 900, T.orb3);

    // --- 2. 优雅的顶部身份区 ---
    let currentY = PAD + 40;
    
    ctx.font = `800 26px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textSub;
    ctx.letterSpacing = "2px";
    ctx.fillText("ENGLISH JOURNAL", PAD, currentY);

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
    ctx.textAlign = "right";
    ctx.fillText(dateStr, W - PAD, currentY);
    ctx.textAlign = "left";

    currentY += 80;
    const userName = me?.email?.split("@")[0] || "Learner";
    ctx.font = `900 64px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textMain;
    ctx.fillText(`Hello, ${userName}`, PAD, currentY);

    currentY += 60;
    ctx.font = `500 32px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textSub;
    // 动态走心文案
    let insightQuote = "「每一句真实的表达，都在成为我的语境」";
    if (streakDays >= 7) insightQuote = "「正在重塑属于我的英语肌肉记忆」";
    if (vocabCount >= 100) insightQuote = "「我的专属表达库正在逐渐长成」";
    ctx.fillText(insightQuote, PAD, currentY);

    // --- 3. 视觉锤（绝对焦点的巨大成就） ---
    currentY += 240;
    const isVocabHero = vocabCount > 0 && streakDays < 3; 
    const heroNum = isVocabHero ? vocabCount : (streakDays || 0);
    const heroLabel = isVocabHero ? "沉淀表达 / Words" : "连续沉浸 / Days";

    // 绘制发光渐变大数字
    ctx.font = `900 280px ${FONT_FAMILY}`;
    const numStr = String(heroNum);
    const numWidth = ctx.measureText(numStr).width;
    
    const textGrad = ctx.createLinearGradient(PAD, currentY - 280, PAD + numWidth, currentY);
    textGrad.addColorStop(0, T.textHero[0]);
    textGrad.addColorStop(0.5, T.textHero[1]);
    textGrad.addColorStop(1, T.textHero[2]);
    
    ctx.fillStyle = textGrad;
    ctx.fillText(numStr, PAD - 15, currentY); // 微调左侧视觉对齐

    // 标签
    ctx.font = `800 36px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textSub;
    ctx.fillText(heroLabel, PAD, currentY + 60);

    // --- 4. 悬浮玻璃卡片：核心数据切片 ---
    currentY += 180;
    const cardH = 280;
    drawGlassCard(ctx, PAD, currentY, W - PAD * 2, cardH, 48, T.glassBg, T.glassBorder, T.glassShadow);

    // 卡片内部分割线与数据
    const statCols =[
      { label: "累计场景输入", val: totalVideos || 0, unit: "次" },
      { label: "专属语料库", val: vocabCount || 0, unit: "词" },
      { label: "总活跃跨度", val: activeDays || 0, unit: "天" },
    ];
    
    const colW = (W - PAD * 2) / 3;
    statCols.forEach((stat, i) => {
      const centerX = PAD + colW * i + colW / 2;
      
      // 数据
      ctx.textAlign = "center";
      ctx.font = `900 72px ${FONT_FAMILY}`;
      ctx.fillStyle = T.textMain;
      ctx.fillText(String(stat.val), centerX, currentY + 140);
      
      // 标签
      ctx.font = `600 24px ${FONT_FAMILY}`;
      ctx.fillStyle = T.textSub;
      ctx.fillText(stat.label, centerX, currentY + 200);

      // 竖向细微分割线 (前两个画线)
      if (i < 2) {
        ctx.beginPath();
        ctx.moveTo(PAD + colW * (i + 1), currentY + 60);
        ctx.lineTo(PAD + colW * (i + 1), currentY + cardH - 60);
        ctx.strokeStyle = T.glassBorder;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    ctx.textAlign = "left";

    // --- 5. 艺术点阵足迹 (Artistic Heatmap) ---
    currentY += cardH + 120;
    
    ctx.font = `800 32px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textMain;
    ctx.fillText("近 35 天学习图谱", PAD, currentY);

    currentY += 80;
    
    // 获取最近 35 天的数据 (5 行 7 列的完美阵列)
    const dotDays = 35;
    const dotsData =[];
    const today = new Date();
    for (let i = dotDays - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dotsData.push({ count: heatmapData?.[key] || 0 });
    }

    const dotRadius = 24; // 大圆点
    const dotGap = 56;
    // 计算居中起始 X
    const matrixW = 7 * (dotRadius * 2) + 6 * dotGap;
    const startX = (W - matrixW) / 2;

    dotsData.forEach((dot, idx) => {
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const x = startX + col * (dotRadius * 2 + dotGap) + dotRadius;
      const y = currentY + row * (dotRadius * 2 + dotGap) + dotRadius;

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);

      if (dot.count === 0) {
        ctx.fillStyle = T.heatmapEmpty;
        ctx.shadowBlur = 0;
        ctx.fill();
      } else {
        // 活跃点颜色与发光
        const colorIdx = Math.min(dot.count - 1, 2);
        ctx.fillStyle = T.heatmapActive[colorIdx];
        
        ctx.shadowColor = T.heatmapGlow;
        ctx.shadowBlur = dot.count >= 2 ? 30 : 15;
        ctx.fill();
        
        // 重置阴影避免污染其他渲染
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
      }
    });

    // --- 6. 底部品牌区 ---
    currentY += 5 * (dotRadius * 2 + dotGap) + 120;

    ctx.beginPath();
    ctx.moveTo(PAD, currentY);
    ctx.lineTo(W - PAD, currentY);
    ctx.strokeStyle = T.textFaint;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    currentY += 60;
    ctx.textAlign = "center";
    ctx.font = `900 36px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textMain;
    ctx.fillText("nailaobao.top", W / 2, currentY);

    ctx.font = `600 24px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textSub;
    ctx.fillText("语境输入 · 词汇沉淀 · 习惯养成", W / 2, currentY + 45);
    ctx.textAlign = "left";

    // 导出并打开弹窗
    const url = canvas.toDataURL("image/png");
    setPosterUrl(url);
    setGenerating(false);
    setTimeout(() => setShowModal(true), 0);
  }

  async function handleSwitchTheme() {
    const nextTheme = (themeIdx + 1) % POSTER_THEMES.length;
    await generate(nextTheme);
  }

  function handleDownload() {
    if (!posterUrl) return;
    const a = document.createElement("a");
    a.href = posterUrl;
    a.download = `语感重塑日记_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      
      {/* 入口按钮区域 */}
      <div
        style={{
          padding: "22px",
          borderRadius: 24,
          background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.85))",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 18px 40px rgba(15,23,42,0.04)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 1000, color: THEME.colors.ink }}>📸 生成专属成就卡</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: THEME.colors.faint, marginTop: 8 }}>
          将你的学习轨迹转化为一张拥有高级光泽质感的数据海报，极其适合分享到朋友圈记录改变。
        </div>
        <button
          onClick={() => generate()}
          disabled={generating}
          style={{
            marginTop: 18,
            width: "100%",
            padding: "16px 0",
            borderRadius: 16,
            border: "none",
            background: generating ? "rgba(79,70,229,0.5)" : "linear-gradient(135deg, #0f172a 0%, #312e81 100%)",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 1000,
            cursor: generating ? "not-allowed" : "pointer",
            boxShadow: generating ? "none" : "0 12px 24px rgba(15,23,42,0.2)",
            transition: "all 0.2s ease",
            letterSpacing: "0.5px"
          }}
        >
          {generating ? "⏳ 潜心绘制中..." : "生成高清成就海报 ✦"}
        </button>
      </div>

      {/* 预览弹窗 */}
      {showModal && posterUrl && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15,23,42,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 32,
              padding: "24px",
              width: "100%",
              maxWidth: 460,
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* 弹窗 Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 1000, color: "#0f172a" }}>🎉 你的专属记录</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, fontWeight: 800 }}>
                  当前质感：<span style={{ color: "#4f46e5" }}>{POSTER_THEMES[themeIdx].name}</span>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: "none",
                  background: "rgba(241,245,249,1)",
                  cursor: "pointer",
                  fontSize: 18,
                  color: "#64748b",
                  fontWeight: 900,
                }}
              >
                ✕
              </button>
            </div>

            {/* 海报缩略图 */}
            <div
              style={{
                borderRadius: 24,
                padding: 8,
                background: "rgba(248,250,252,1)",
                border: "1px solid rgba(15,23,42,0.06)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <img
                src={posterUrl}
                alt="打卡成就卡"
                style={{
                  width: "100%",
                  maxHeight: "54vh",
                  objectFit: "contain",
                  borderRadius: 16,
                  boxShadow: "0 12px 34px rgba(15,23,42,0.12)",
                  display: "block",
                }}
              />
            </div>

            <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", fontWeight: 800 }}>
              📱 手机长按图片可直存相册，电脑端点击保存
            </div>

            {/* 操作按钮组 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <button
                onClick={handleDownload}
                style={{
                  padding: "16px 0",
                  borderRadius: 18,
                  border: "none",
                  background: "linear-gradient(135deg, #0f172a, #4f46e5)",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 1000,
                  cursor: "pointer",
                  boxShadow: "0 10px 20px rgba(79,70,229,0.2)"
                }}
              >
                ⬇️ 存入相册
              </button>
              <button
                onClick={handleSwitchTheme}
                style={{
                  padding: "16px 0",
                  borderRadius: 18,
                  border: "1.5px solid rgba(15,23,42,0.1)",
                  background: "rgba(248,250,252,0.8)",
                  color: "#334155",
                  fontSize: 15,
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                🎨 切换质感
              </button>
            </div>
            
            {/* 轮播指示器 */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              {POSTER_THEMES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === themeIdx ? 24 : 8,
                    height: 8,
                    borderRadius: 999,
                    background: i === themeIdx ? "#4f46e5" : "rgba(15,23,42,0.1)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PosterGenerator;
