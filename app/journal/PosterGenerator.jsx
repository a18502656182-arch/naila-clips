"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../components/home/theme";

// ═══════════════════════════════════════════════════════════════════════════════
//  主题配置（3 套）
// ═══════════════════════════════════════════════════════════════════════════════
const POSTER_THEMES = [
  {
    name: "暗夜极光流",
    bgTop: "#080C18",
    bgBottom: "#0D0819",
    glows: [
      { cx: 0.15, cy: 0.18, r: 480, color: "rgba(99,102,241,0.42)" },
      { cx: 0.88, cy: 0.34, r: 380, color: "rgba(236,72,153,0.32)" },
      { cx: 0.42, cy: 0.62, r: 420, color: "rgba(6,182,212,0.22)" },
    ],
    labelColor: "rgba(255,255,255,0.38)",
    labelAccent: "rgba(165,180,252,0.90)",
    quoteColor: "rgba(255,255,255,0.88)",
    quoteAccent: "#a5b4fc",
    heroGrad: ["#818cf8", "#ec4899", "#f472b6"],
    heroGlow: "rgba(129,140,248,0.55)",
    heroLabel: "rgba(255,255,255,0.65)",
    heroSub: "rgba(165,180,252,0.88)",
    glassBg: "rgba(255,255,255,0.06)",
    glassBorder: "rgba(255,255,255,0.14)",
    glassShadow: "rgba(0,0,0,0.45)",
    statNum: "#ffffff",
    statLabel: "rgba(255,255,255,0.52)",
    divider: "rgba(255,255,255,0.10)",
    dotEmpty: "rgba(255,255,255,0.07)",
    dotL1: "rgba(99,102,241,0.55)",
    dotL2: "rgba(129,140,248,0.82)",
    dotL3Color: "#818cf8",
    dotL3Glow: "rgba(129,140,248,0.90)",
    hmLabel: "rgba(255,255,255,0.45)",
    footerText: "rgba(255,255,255,0.48)",
    footerUrl: "rgba(255,255,255,0.82)",
  },
  {
    name: "晨雾玻璃拟态",
    bgTop: "#EEF2FF",
    bgBottom: "#FDF2F8",
    glows: [
      { cx: 0.08, cy: 0.10, r: 500, color: "rgba(99,102,241,0.20)" },
      { cx: 0.92, cy: 0.28, r: 400, color: "rgba(236,72,153,0.16)" },
      { cx: 0.50, cy: 0.58, r: 460, color: "rgba(6,182,212,0.13)" },
    ],
    labelColor: "rgba(15,23,42,0.40)",
    labelAccent: "rgba(79,70,229,0.88)",
    quoteColor: "rgba(15,23,42,0.82)",
    quoteAccent: "#4f46e5",
    heroGrad: ["#4f46e5", "#7c3aed", "#ec4899"],
    heroGlow: "rgba(79,70,229,0.30)",
    heroLabel: "rgba(15,23,42,0.52)",
    heroSub: "rgba(79,70,229,0.82)",
    glassBg: "rgba(255,255,255,0.72)",
    glassBorder: "rgba(15,23,42,0.10)",
    glassShadow: "rgba(15,23,42,0.10)",
    statNum: "#0b1220",
    statLabel: "rgba(15,23,42,0.48)",
    divider: "rgba(15,23,42,0.08)",
    dotEmpty: "rgba(15,23,42,0.08)",
    dotL1: "rgba(99,102,241,0.35)",
    dotL2: "rgba(99,102,241,0.65)",
    dotL3Color: "#4f46e5",
    dotL3Glow: "rgba(79,70,229,0.70)",
    hmLabel: "rgba(15,23,42,0.42)",
    footerText: "rgba(15,23,42,0.40)",
    footerUrl: "rgba(15,23,42,0.72)",
  },
  {
    name: "玫金流年",
    bgTop: "#110810",
    bgBottom: "#0F0A14",
    glows: [
      { cx: 0.10, cy: 0.12, r: 520, color: "rgba(251,146,60,0.30)" },
      { cx: 0.90, cy: 0.30, r: 400, color: "rgba(236,72,153,0.38)" },
      { cx: 0.50, cy: 0.65, r: 440, color: "rgba(234,179,8,0.18)" },
    ],
    labelColor: "rgba(255,255,255,0.38)",
    labelAccent: "rgba(251,191,36,0.90)",
    quoteColor: "rgba(255,255,255,0.88)",
    quoteAccent: "#fbbf24",
    heroGrad: ["#fbbf24", "#f97316", "#ec4899"],
    heroGlow: "rgba(251,191,36,0.50)",
    heroLabel: "rgba(255,255,255,0.60)",
    heroSub: "rgba(251,191,36,0.88)",
    glassBg: "rgba(255,255,255,0.06)",
    glassBorder: "rgba(255,215,100,0.18)",
    glassShadow: "rgba(0,0,0,0.50)",
    statNum: "#ffffff",
    statLabel: "rgba(255,255,255,0.48)",
    divider: "rgba(255,255,255,0.10)",
    dotEmpty: "rgba(255,255,255,0.07)",
    dotL1: "rgba(251,146,60,0.50)",
    dotL2: "rgba(251,191,36,0.78)",
    dotL3Color: "#fbbf24",
    dotL3Glow: "rgba(251,191,36,0.90)",
    hmLabel: "rgba(255,255,255,0.42)",
    footerText: "rgba(255,255,255,0.48)",
    footerUrl: "rgba(255,255,255,0.80)",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════════════════════════════════════════

const F = `"PingFang SC", "SF Pro Display", system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;

function getStreakCopy(days) {
  if (!days || days < 1) return "今天是新的起点";
  if (days < 3)  return "学习的种子，正在发芽";
  if (days < 7)  return "连续感，是语感的基础";
  if (days < 14) return "好习惯，正在悄悄成形";
  if (days < 30) return "正在养成真实的语感节奏";
  if (days < 60) return "你的表达库已初具规模";
  return "语感重塑，已融入你的日常";
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h,     x, y + h - r,     r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y,         x + r, y,         r);
  ctx.closePath();
}

function drawGlassCard(ctx, x, y, w, h, radius, bgColor, borderColor, shadowColor) {
  ctx.save();
  ctx.shadowColor = shadowColor || "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // 顶部内高光
  ctx.save();
  const hl = ctx.createLinearGradient(x, y, x + w, y);
  hl.addColorStop(0,   "transparent");
  hl.addColorStop(0.2, "rgba(255,255,255,0.28)");
  hl.addColorStop(0.8, "rgba(255,255,255,0.12)");
  hl.addColorStop(1,   "transparent");
  ctx.beginPath();
  ctx.moveTo(x + radius, y + 1);
  ctx.lineTo(x + w - radius, y + 1);
  ctx.strokeStyle = hl;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function fillGradText(ctx, text, x, y, colors) {
  const w = ctx.measureText(text).width;
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillText(text, x, y);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  主组件
// ═══════════════════════════════════════════════════════════════════════════════
function PosterGenerator({ me, streakDays, totalVideos, vocabCount, masteredCount, heatmapData, tasks, activeDays, topTopic }) {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [themeIdx, setThemeIdx] = useState(0);

  async function generate(forceTheme) {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 80));

    const nextTheme = forceTheme !== undefined ? forceTheme : (themeIdx + 1) % POSTER_THEMES.length;
    setThemeIdx(nextTheme);
    const T = POSTER_THEMES[nextTheme];

    const canvas = canvasRef.current;
    const W = 1080;
    const H = 1920;
    const PAD = 88;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // ── 1. 背景 ──────────────────────────────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, T.bgTop);
    bgGrad.addColorStop(1, T.bgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    T.glows.forEach(({ cx, cy, r, color }) => {
      const grd = ctx.createRadialGradient(W * cx, H * cy, 0, W * cx, H * cy, r);
      grd.addColorStop(0,   color);
      grd.addColorStop(0.55, color.replace(/[\d.]+\)$/, "0.08)"));
      grd.addColorStop(1,   "transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    });

    // ── 2. 顶部身份区 ────────────────────────────────────────────────────────
    const topY = 92;

    ctx.save();
    ctx.font = `600 22px ${F}`;
    ctx.fillStyle = T.labelColor;
    ctx.fillText("ENGLISH  JOURNAL", PAD, topY + 22);
    ctx.restore();

    const now = new Date();
    const dateStr = `${now.getFullYear()} · ${String(now.getMonth() + 1).padStart(2, "0")} · ${String(now.getDate()).padStart(2, "0")}`;
    ctx.font = `400 20px ${F}`;
    ctx.fillStyle = T.labelColor;
    ctx.fillText(dateStr, PAD, topY + 54);

    // 右上 Slogan chip
    const slogan = "语感重塑计划";
    ctx.font = `600 21px ${F}`;
    const sloganW = ctx.measureText(slogan).width;
    const cpx = W - PAD - sloganW - 44;
    const cpy = topY + 4;
    drawGlassCard(ctx, cpx, cpy, sloganW + 44, 44, 22, T.glassBg, T.glassBorder, T.glassShadow);
    ctx.font = `600 21px ${F}`;
    ctx.fillStyle = T.labelAccent;
    ctx.textAlign = "center";
    ctx.fillText(slogan, cpx + (sloganW + 44) / 2, cpy + 29);
    ctx.textAlign = "left";

    // ── 3. 引言 ──────────────────────────────────────────────────────────────
    const quoteY = topY + 100;
    const quote = "「每一句真实的表达，都在成为我的语境」";

    ctx.save();
    ctx.strokeStyle = T.quoteAccent;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(PAD, quoteY + 2);
    ctx.lineTo(PAD, quoteY + 46);
    ctx.stroke();
    ctx.restore();

    ctx.font = `400 29px ${F}`;
    ctx.fillStyle = T.quoteColor;
    ctx.fillText(quote, PAD + 22, quoteY + 34);

    // ── 4. 分割线 ────────────────────────────────────────────────────────────
    const div1Y = quoteY + 76;
    ctx.save();
    ctx.strokeStyle = T.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, div1Y);
    ctx.lineTo(W - PAD, div1Y);
    ctx.stroke();
    ctx.restore();

    // ── 5. Hero Section ──────────────────────────────────────────────────────
    const heroY = div1Y + 80;
    const heroNum = String(streakDays || 0);

    // 副标题
    ctx.font = `500 26px ${F}`;
    ctx.fillStyle = T.heroLabel;
    ctx.textAlign = "center";
    ctx.fillText("连续沉浸", W / 2, heroY);

    // 超大渐变数字（带发光）
    ctx.font = `bold 210px ${F}`;
    const numW = ctx.measureText(heroNum).width;
    const numX = W / 2 - numW / 2;
    const numY = heroY + 220;

    ctx.save();
    ctx.shadowColor = T.heroGlow;
    ctx.shadowBlur = 90;
    fillGradText(ctx, heroNum, numX, numY, T.heroGrad);
    ctx.restore();
    // 再绘一层去掉 shadow，保留渐变清晰度
    fillGradText(ctx, heroNum, numX, numY, T.heroGrad);

    // DAY 单位
    ctx.font = `bold 52px ${F}`;
    ctx.fillStyle = T.heroLabel;
    ctx.textAlign = "center";
    ctx.fillText("DAY", W / 2, heroY + 290);

    // 动态评语胶囊
    const copy = getStreakCopy(streakDays);
    ctx.font = `500 26px ${F}`;
    const copyTextW = ctx.measureText(copy).width;
    const capX = W / 2 - (copyTextW + 56) / 2;
    const capY = heroY + 322;
    const capH = 52;
    drawGlassCard(ctx, capX, capY, copyTextW + 56, capH, 999, T.glassBg, T.glassBorder, T.glassShadow);
    ctx.font = `500 26px ${F}`;
    ctx.fillStyle = T.heroSub;
    ctx.textAlign = "center";
    ctx.fillText(copy, W / 2, capY + capH / 2 + 9);
    ctx.textAlign = "left";

    // ── 6. 玻璃数据卡片 ───────────────────────────────────────────────────────
    const cardY = heroY + 404;
    const cardW = W - PAD * 2;
    const cardH = 218;
    drawGlassCard(ctx, PAD, cardY, cardW, cardH, 44, T.glassBg, T.glassBorder, T.glassShadow);

    const stats = [
      { num: totalVideos || 0,  label: "累计场景视频" },
      { num: vocabCount  || 0,  label: "收藏词汇" },
      { num: activeDays  || 0,  label: "总活跃天数" },
    ];

    const colW = cardW / 3;
    stats.forEach((item, i) => {
      const cx = PAD + i * colW + colW / 2;

      if (i > 0) {
        ctx.save();
        ctx.strokeStyle = T.glassBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD + i * colW, cardY + 32);
        ctx.lineTo(PAD + i * colW, cardY + cardH - 32);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.shadowColor = T.heroGlow;
      ctx.shadowBlur = 22;
      ctx.font = `bold 72px ${F}`;
      const nw = ctx.measureText(String(item.num)).width;
      fillGradText(ctx, String(item.num), cx - nw / 2, cardY + 120, T.heroGrad);
      ctx.restore();

      ctx.font = `500 24px ${F}`;
      ctx.fillStyle = T.statLabel;
      ctx.textAlign = "center";
      ctx.fillText(item.label, cx, cardY + 158);
      ctx.textAlign = "left";
    });

    // ── 7. 热力图谱 ───────────────────────────────────────────────────────────
    const hmY = cardY + cardH + 90;

    ctx.font = `400 24px ${F}`;
    ctx.fillStyle = T.hmLabel;
    ctx.textAlign = "center";
    ctx.fillText("— 近 30 天学习图谱 —", W / 2, hmY);
    ctx.textAlign = "left";

    // 构建近 30 天数据
    const dots = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dots.push(heatmapData?.[key] || 0);
    }

    // 6 列 × 5 行布局
    const COLS = 6;
    const dotArea = W - PAD * 2;
    const dotSpaceX = dotArea / COLS;
    const dotSpaceY = 100;
    const dotR = 30;
    const gridStartX = PAD + dotSpaceX / 2;
    const gridStartY = hmY + 50;

    dots.forEach((count, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const dx = gridStartX + col * dotSpaceX;
      const dy = gridStartY + row * dotSpaceY;

      ctx.save();
      ctx.beginPath();
      ctx.arc(dx, dy, dotR, 0, Math.PI * 2);

      if (count <= 0) {
        ctx.fillStyle = T.dotEmpty;
        ctx.fill();
      } else if (count === 1) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = T.dotL1;
        ctx.fillStyle = T.dotL1;
        ctx.fill();
      } else if (count === 2) {
        ctx.shadowBlur = 32;
        ctx.shadowColor = T.dotL2;
        ctx.fillStyle = T.dotL2;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = T.dotL2;
        ctx.fill();
      } else {
        ctx.shadowBlur = 56;
        ctx.shadowColor = T.dotL3Glow;
        ctx.fillStyle = T.dotL3Color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = T.dotL3Color;
        ctx.fill();
        // 内部高光小点
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(dx - dotR * 0.27, dy - dotR * 0.27, dotR * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.52)";
        ctx.fill();
      }
      ctx.restore();
    });

    // ── 8. 底部品牌区 ─────────────────────────────────────────────────────────
    const footerY = H - 170;

    ctx.save();
    ctx.strokeStyle = T.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, footerY);
    ctx.lineTo(W - PAD, footerY);
    ctx.stroke();
    ctx.restore();

    ctx.font = `bold 36px ${F}`;
    ctx.fillStyle = T.footerUrl;
    ctx.textAlign = "center";
    ctx.fillText("nailaobao.top", W / 2, footerY + 58);

    ctx.font = `400 22px ${F}`;
    ctx.fillStyle = T.footerText;
    ctx.textAlign = "center";
    ctx.fillText("看油管学英语 · 真实场景输入 · 沉淀专属表达库", W / 2, footerY + 100);
    ctx.textAlign = "left";

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
    a.download = `英语手帐_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //  触发按钮 UI
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "24px 22px 22px",
          borderRadius: 24,
          background: "linear-gradient(135deg, #0B101E 0%, #1e1b4b 42%, #2d1b3d 72%, #1a0a1a 100%)",
          color: "#fff",
          boxShadow: "0 28px 80px rgba(99,102,241,0.28), 0 8px 24px rgba(0,0,0,0.30)",
        }}
      >
        {/* 背景光晕装饰 */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -60, left: -40,
            width: 220, height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -50, right: -30,
            width: 180, height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236,72,153,0.30) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 13px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
              fontSize: 11,
              fontWeight: 800,
              color: "rgba(165,180,252,0.95)",
              marginBottom: 14,
              letterSpacing: "0.8px",
            }}
          >
            ✦ ENGLISH JOURNAL
          </div>

          <div style={{ fontSize: 18, fontWeight: 1000, lineHeight: 1.3, marginBottom: 8 }}>
            生成今日学习打卡海报
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.75, color: "rgba(255,255,255,0.68)", marginBottom: 20 }}>
            把连续打卡天数、词汇沉淀和学习轨迹合成一张有分享欲的朋友圈海报。{" "}
            <span style={{ color: "rgba(165,180,252,0.88)" }}>共 {POSTER_THEMES.length} 种风格</span>。
          </div>

          <button
            onClick={() => generate()}
            disabled={generating}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 999,
              border: "none",
              background: generating
                ? "rgba(255,255,255,0.18)"
                : "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(238,242,255,0.98) 100%)",
              color: generating ? "rgba(255,255,255,0.70)" : "#1e1b4b",
              fontSize: 15,
              fontWeight: 1000,
              cursor: generating ? "not-allowed" : "pointer",
              boxShadow: generating ? "none" : "0 12px 32px rgba(99,102,241,0.30)",
              transition: "all 220ms ease",
            }}
          >
            {generating ? "⏳ 正在生成..." : "📸 立即生成打卡海报 →"}
          </button>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 7, marginTop: 14 }}>
            {POSTER_THEMES.map((th, i) => (
              <div
                key={i}
                title={th.name}
                style={{
                  width: i === themeIdx ? 24 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: i === themeIdx ? "rgba(165,180,252,0.95)" : "rgba(255,255,255,0.22)",
                  transition: "all 300ms ease",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && posterUrl && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(8,12,30,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,252,255,0.97) 100%)",
              borderRadius: 30,
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 50px 140px rgba(8,12,30,0.40), 0 8px 30px rgba(15,23,42,0.10)",
              padding: "22px 20px",
              width: "100%",
              maxWidth: 520,
              maxHeight: "93vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 1000, color: "#0b1220" }}>今日打卡海报</div>
                <div style={{ fontSize: 12, color: "rgba(11,18,32,0.42)", marginTop: 3, fontWeight: 700 }}>
                  {POSTER_THEMES[themeIdx].name} · 共 {POSTER_THEMES.length} 种风格
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 36, height: 36,
                  borderRadius: 999,
                  border: "1px solid rgba(15,23,42,0.12)",
                  background: "rgba(15,23,42,0.05)",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#64748b",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 12px 40px rgba(15,23,42,0.12)" }}>
              <img
                src={posterUrl}
                alt="打卡海报"
                style={{ width: "100%", display: "block", maxHeight: "55vh", objectFit: "contain" }}
              />
            </div>

            <div style={{ fontSize: 12, color: "rgba(11,18,32,0.40)", textAlign: "center", fontWeight: 700 }}>
              📱 手机长按图片保存 · 电脑点击下方按钮下载
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={handleDownload}
                style={{
                  padding: "13px 0",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg, #0f172a 0%, #312e81 50%, #4f46e5 100%)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: "pointer",
                  boxShadow: "0 14px 32px rgba(79,70,229,0.30)",
                }}
              >
                ⬇️ 保存图片
              </button>
              <button
                onClick={handleSwitchTheme}
                disabled={generating}
                style={{
                  padding: "13px 0",
                  borderRadius: 999,
                  border: "1.5px solid rgba(15,23,42,0.12)",
                  background: "rgba(248,250,252,0.90)",
                  color: "#374151",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: generating ? "not-allowed" : "pointer",
                }}
              >
                {generating ? "⏳ 切换中..." : "🎨 换个风格"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {POSTER_THEMES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === themeIdx ? 24 : 8,
                    height: 8,
                    borderRadius: 999,
                    background: i === themeIdx ? "#4f46e5" : "rgba(15,23,42,0.14)",
                    transition: "all 300ms ease",
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
