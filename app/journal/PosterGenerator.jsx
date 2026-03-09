"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../components/home/theme";

// 高级感主题配置：专为朋友圈/小红书分享打造的流光质感
const POSTER_THEMES = [
  {
    name: "暗夜极光流",
    bg: ["#0B101E", "#111827", "#09090b"],
    orb1: "rgba(99, 102, 241, 0.35)",
    orb2: "rgba(236, 72, 153, 0.25)",
    orb3: "rgba(6, 182, 212, 0.20)",
    textHero: ["#818cf8", "#c084fc", "#f472b6"],
    textMain: "#ffffff",
    textSub: "rgba(255, 255, 255, 0.8)",
    textFaint: "rgba(255, 255, 255, 0.4)",
    glassBg: "rgba(30, 41, 59, 0.5)",
    glassBorder: "rgba(255, 255, 255, 0.12)",
    glassShadow: "rgba(0, 0, 0, 0.3)",
    pillBg: "rgba(255, 255, 255, 0.1)",
    calendarActive: ["rgba(52, 211, 153, 0.3)", "rgba(52, 211, 153, 0.6)", "rgba(52, 211, 153, 1)"],
    calendarGlow: "rgba(52, 211, 153, 0.8)",
    calendarEmpty: "rgba(255,255,255,0.25)",
  },
  {
    name: "晨雾玻璃光",
    bg: ["#ffffff", "#f8fafc", "#f1f5f9"],
    orb1: "rgba(99, 102, 241, 0.15)",
    orb2: "rgba(236, 72, 153, 0.12)",
    orb3: "rgba(6, 182, 212, 0.10)",
    textHero: ["#4f46e5", "#9333ea", "#db2777"],
    textMain: "#0f172a",
    textSub: "rgba(15, 23, 42, 0.7)",
    textFaint: "rgba(15, 23, 42, 0.35)",
    glassBg: "rgba(255, 255, 255, 0.65)",
    glassBorder: "rgba(255, 255, 255, 0.9)",
    glassShadow: "rgba(15, 23, 42, 0.06)",
    pillBg: "rgba(15, 23, 42, 0.05)",
    calendarActive: ["rgba(16, 185, 129, 0.4)", "rgba(16, 185, 129, 0.7)", "rgba(16, 185, 129, 1)"],
    calendarGlow: "rgba(16, 185, 129, 0.6)",
    calendarEmpty: "rgba(15,23,42,0.3)",
  },
];

const FONT_FAMILY = `system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;

function PosterGenerator({ me, streakDays, totalVideos, vocabCount, heatmapData, activeDays }) {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [themeIdx, setThemeIdx] = useState(0);

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

  function drawGlassCard(ctx, x, y, w, h, radius, bgColor, borderColor, shadowColor) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 2;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    ctx.restore();
  }

  function drawPill(ctx, text, cx, y, bg, color) {
    ctx.font = `800 24px ${FONT_FAMILY}`;
    const tw = ctx.measureText(text).width;
    const w = tw + 48;
    const h = 50;
    const x = cx - w / 2;
    roundRectPath(ctx, x, y, w, h, 25);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cx, y + h / 2 + 2);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    return { w, h };
  }

  async function generate(forceTheme) {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 80));

    const nextTheme = forceTheme !== undefined ? forceTheme : themeIdx;
    setThemeIdx(nextTheme);
    const T = POSTER_THEMES[nextTheme];

    const canvas = canvasRef.current;
    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const PAD = 80;

    // === 1. 背景与光晕 ===
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, T.bg[0]);
    bgGrad.addColorStop(0.6, T.bg[1]);
    bgGrad.addColorStop(1, T.bg[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

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

    let currentY = 140;

    // === 2. 顶部身份区 ===
    ctx.font = `800 24px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textFaint;
    ctx.fillText("ENGLISH IMMERSION", PAD, currentY);

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
    ctx.textAlign = "right";
    ctx.fillText(dateStr, W - PAD, currentY);
    ctx.textAlign = "left";

    currentY += 80;
    const userName = me?.email?.split("@")[0] || "Learner";
    ctx.font = `900 64px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textMain;
    ctx.fillText(`Hello, ${userName} 👋`, PAD, currentY);

    currentY += 60;
    ctx.font = `600 32px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textSub;
    ctx.fillText("「把零散的输入，变成长在脑子里的语境」", PAD, currentY);

    // === 3. 视觉锤：巨大成就 ===
    currentY += 90;

    let badgeText = "🚀 场景探索者";
    if (streakDays >= 21) badgeText = "👑 语境重塑大师";
    else if (streakDays >= 7) badgeText = "🌟 深度沉浸者";
    else if (vocabCount >= 30) badgeText = "📚 语料收集达人";

    // 居中绘制 pill
    drawPill(ctx, badgeText, W / 2, currentY, T.pillBg, T.textMain);

    currentY += 250;
    const isVocabHero = vocabCount > 0 && streakDays < 3;
    const heroNum = isVocabHero ? vocabCount : (streakDays || 0);
    const heroLabel = isVocabHero ? "专属表达入库 / Words" : "连续沉浸天数 / Days";

    ctx.font = `900 260px ${FONT_FAMILY}`;
    const numStr = String(heroNum);
    const numWidth = ctx.measureText(numStr).width;

    const textGrad = ctx.createLinearGradient(PAD, currentY - 260, PAD + numWidth, currentY);
    textGrad.addColorStop(0, T.textHero[0]);
    textGrad.addColorStop(0.5, T.textHero[1]);
    textGrad.addColorStop(1, T.textHero[2]);
    ctx.fillStyle = textGrad;
    ctx.fillText(numStr, PAD - 15, currentY);

    ctx.font = `800 34px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textSub;
    ctx.fillText(heroLabel, PAD, currentY + 60);

    // === 4. 毛玻璃数据卡片 ===
    currentY += 150;
    const cardH = 220;
    drawGlassCard(ctx, PAD, currentY, W - PAD * 2, cardH, 40, T.glassBg, T.glassBorder, T.glassShadow);

    const statCols = [
      { label: "真实场景输入", val: totalVideos || 0 },
      { label: "累计沉淀语料", val: vocabCount || 0 },
      { label: "总计活跃天数", val: activeDays || 0 },
    ];

    const colW = (W - PAD * 2) / 3;
    statCols.forEach((stat, i) => {
      const centerX = PAD + colW * i + colW / 2;
      ctx.textAlign = "center";
      ctx.font = `900 64px ${FONT_FAMILY}`;
      ctx.fillStyle = T.textMain;
      ctx.fillText(String(stat.val), centerX, currentY + 110);
      ctx.font = `600 22px ${FONT_FAMILY}`;
      ctx.fillStyle = T.textSub;
      ctx.fillText(stat.label, centerX, currentY + 160);
      if (i < 2) {
        ctx.beginPath();
        ctx.moveTo(PAD + colW * (i + 1), currentY + 50);
        ctx.lineTo(PAD + colW * (i + 1), currentY + cardH - 50);
        ctx.strokeStyle = T.glassBorder;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    ctx.textAlign = "left";

    // === 5. 打卡日历（修复：用 cells 数组正确铺位） ===
    currentY += cardH + 110;

    const year = now.getFullYear();
    const month = now.getMonth();
    const MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
      "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

    ctx.font = `900 40px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textMain;
    ctx.fillText(`${MONTH_NAMES[month]} ${year}`, PAD, currentY);

    ctx.font = `600 24px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textSub;
    ctx.textAlign = "right";
    ctx.fillText("本月打卡足迹", W - PAD, currentY);
    ctx.textAlign = "left";

    currentY += 70;

    // 星期表头
    const weekNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const calColW = (W - PAD * 2) / 7;
    const rowH = 90;

    ctx.font = `800 20px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textFaint;
    weekNames.forEach((w, i) => {
      ctx.textAlign = "center";
      ctx.fillText(w, PAD + calColW * i + calColW / 2, currentY);
    });
    currentY += 50;

    // ─── 关键修复：先构建 cells 数组，再按 idx 定位，保证每格对齐 ───
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();   // 0=周日
    const totalDaysNum = lastDay.getDate();
    const todayStr = now.toISOString().slice(0, 10);

    // 用 null 填充月初空位，再放每天
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDaysNum; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ d, key, count: heatmapData?.[key] || 0 });
    }

    cells.forEach((cell, idx) => {
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const cx = PAD + col * calColW + calColW / 2;
      const cy = currentY + row * rowH + rowH / 2;

      if (!cell) return; // 空白占位格不绘制

      const { d, key, count } = cell;
      const isToday = key === todayStr;

      if (count > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy - 8, 36, 0, Math.PI * 2);
        const colorIdx = Math.min(count - 1, 2);
        ctx.fillStyle = T.calendarActive[colorIdx];
        ctx.shadowColor = T.calendarGlow;
        ctx.shadowBlur = count >= 2 ? 30 : 15;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
      }

      if (isToday) {
        ctx.beginPath();
        ctx.arc(cx, cy - 8, 38, 0, Math.PI * 2);
        ctx.strokeStyle = T.glassBorder;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      ctx.font = `800 28px ${FONT_FAMILY}`;
      ctx.fillStyle = count > 0 ? "#ffffff" : T.calendarEmpty;
      ctx.textAlign = "center";
      ctx.fillText(String(d), cx, cy + 2);
    });
    ctx.textAlign = "left";

    // 已绘制的行数
    const calRows = Math.ceil(cells.length / 7);
    currentY += calRows * rowH + 60;

    // === 6. 底部品牌区 ===
    ctx.textAlign = "center";
    ctx.font = `900 32px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textMain;
    ctx.fillText("nailaobao.top", W / 2, H - 110);

    ctx.font = `600 22px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textFaint;
    ctx.fillText("语境输入 · 词汇沉淀 · 习惯养成", W / 2, H - 65);
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
    a.download = `语境重塑记录_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ─── 触发按钮：去掉原来自带的外层白卡包装 ─────────────────────────────────
  // page.js 里已有 <Card> + <SectionTitle> 作为外壳，所以这里只保留按钮本体
  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* 触发按钮区 —— 不再自带标题/描述，避免与 page.js 的 SectionTitle 重复 */}
      <button
        onClick={() => generate()}
        disabled={generating}
        style={{
          width: "100%",
          padding: "16px 0",
          borderRadius: 16,
          border: "none",
          background: generating
            ? "rgba(79,70,229,0.5)"
            : "linear-gradient(135deg, #0f172a 0%, #312e81 100%)",
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 1000,
          cursor: generating ? "not-allowed" : "pointer",
          boxShadow: generating ? "none" : "0 12px 24px rgba(15,23,42,0.2)",
          transition: "all 0.2s ease",
          letterSpacing: "0.5px",
        }}
      >
        {generating ? "⏳ 潜心绘制中..." : "生成高清成就海报 ✦"}
      </button>

      <div style={{ marginTop: 10, fontSize: 11, color: THEME.colors.faint, textAlign: "center" }}>
        共 {POSTER_THEMES.length} 种风格 · 每次点击可切换主题
      </div>

      {/* ─── 预览弹窗 ─────────────────────────────────────────────────────── */}
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
              maxWidth: 420,
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 1000, color: "#0f172a" }}>🎉 生成完毕</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, fontWeight: 800 }}>
                  当前质感：<span style={{ color: "#4f46e5" }}>{POSTER_THEMES[themeIdx].name}</span>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 38, height: 38,
                  borderRadius: 12,
                  border: "none",
                  background: "rgba(241,245,249,1)",
                  cursor: "pointer",
                  fontSize: 18,
                  color: "#64748b",
                  fontWeight: 900,
                }}
              >✕</button>
            </div>

            {/*
              ─── 手机保存方案 ───────────────────────────────────────────────
              原生 Web 无法直接调用系统相册 API。
              最佳实践：
              · 把图片以足够大的尺寸展示
              · iOS Safari：长按图片 → "添加到照片"
              · Android Chrome：长按图片 → "下载图片"（自动进图库）
              · 电脑端：点"下载图片"按钮，走 <a download> 流程
            */}

            {/* 图片区：撑满弹窗宽度，便于长按 */}
            <div
              style={{
                borderRadius: 20,
                overflow: "hidden",
                background: "rgba(248,250,252,1)",
                border: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              <img
                src={posterUrl}
                alt="打卡成就卡"
                style={{
                  width: "100%",
                  maxHeight: "52vh",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            {/* 分平台保存提示 */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                background: "rgba(99,102,241,0.07)",
                border: "1px solid rgba(99,102,241,0.14)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, color: "#3730a3", marginBottom: 4 }}>
                📱 如何保存到相册？
              </div>
              <div style={{ fontSize: 12, color: "#4338ca", lineHeight: 1.7 }}>
                · <b>手机（iOS / Android）</b>：长按上方图片，选择"存储图片"或"下载图片"，即可进相册。<br />
                · <b>电脑端</b>：点击下方"下载图片"按钮，图片会保存到下载文件夹。
              </div>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* 电脑端下载 / 手机端兜底（a 标签 download） */}
              <a
                href={posterUrl}
                download={`语境重塑记录_${new Date().toISOString().slice(0, 10)}.png`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "15px 0",
                  borderRadius: 18,
                  textDecoration: "none",
                  background: "linear-gradient(135deg, #0f172a, #4f46e5)",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 1000,
                  boxShadow: "0 10px 20px rgba(79,70,229,0.2)",
                  cursor: "pointer",
                }}
              >
                ⬇️ 下载图片
              </a>
              <button
                onClick={handleSwitchTheme}
                disabled={generating}
                style={{
                  padding: "15px 0",
                  borderRadius: 18,
                  border: "1.5px solid rgba(15,23,42,0.1)",
                  background: "rgba(248,250,252,0.8)",
                  color: "#334155",
                  fontSize: 15,
                  fontWeight: 1000,
                  cursor: generating ? "not-allowed" : "pointer",
                }}
              >
                {generating ? "⏳ 切换中..." : "🎨 切换质感"}
              </button>
            </div>

            {/* 主题指示点 */}
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
