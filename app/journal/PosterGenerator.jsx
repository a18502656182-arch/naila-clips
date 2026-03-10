"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../components/home/theme";

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

function PosterGenerator({ me, streakDays, totalVideos, vocabCount, heatmapData, activeDays, isMobile }) {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
  const [posterBlob, setPosterBlob] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [themeIdx, setThemeIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

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

    // 背景
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

    // 顶部
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
    ctx.fillText(`Hello, ${userName}`, PAD, currentY);

    currentY += 60;
    ctx.font = `600 32px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textSub;
    ctx.fillText("把零散的输入，变成长在脑子里的语境", PAD, currentY);

    // 视觉锤
    currentY += 90;
    let badgeText = "场景探索者";
    if (streakDays >= 21) badgeText = "语境重塑大师";
    else if (streakDays >= 7) badgeText = "深度沉浸者";
    else if (vocabCount >= 30) badgeText = "语料收集达人";

    ctx.font = `800 24px ${FONT_FAMILY}`;
    const bw = ctx.measureText(badgeText).width + 48;
    const bh = 50;
    roundRectPath(ctx, W / 2 - bw / 2, currentY, bw, bh, 25);
    ctx.fillStyle = T.pillBg;
    ctx.fill();
    ctx.fillStyle = T.textMain;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, W / 2, currentY + bh / 2 + 2);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

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

    // 数据卡片
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
      const cx = PAD + colW * i + colW / 2;
      ctx.textAlign = "center";
      ctx.font = `900 64px ${FONT_FAMILY}`;
      ctx.fillStyle = T.textMain;
      ctx.fillText(String(stat.val), cx, currentY + 110);
      ctx.font = `600 22px ${FONT_FAMILY}`;
      ctx.fillStyle = T.textSub;
      ctx.fillText(stat.label, cx, currentY + 160);
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

    // 日历
    currentY += cardH + 110;
    const year = now.getFullYear();
    const month = now.getMonth();
    const MONTH_NAMES = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];

    ctx.font = `900 40px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textMain;
    ctx.fillText(`${MONTH_NAMES[month]} ${year}`, PAD, currentY);
    ctx.font = `600 24px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textSub;
    ctx.textAlign = "right";
    ctx.fillText("本月打卡足迹", W - PAD, currentY);
    ctx.textAlign = "left";
    currentY += 70;

    const weekNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
    const calColW = (W - PAD * 2) / 7;
    const rowH = 90;
    ctx.font = `800 20px ${FONT_FAMILY}`;
    ctx.fillStyle = T.textFaint;
    weekNames.forEach((w, i) => {
      ctx.textAlign = "center";
      ctx.fillText(w, PAD + calColW * i + calColW / 2, currentY);
    });
    currentY += 50;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDaysNum = lastDay.getDate();
    const todayStr = now.toISOString().slice(0, 10);

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
      if (!cell) return;
      const { d, key, count } = cell;
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
      if (key === todayStr) {
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

    // 底部
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
    canvas.toBlob((blob) => setPosterBlob(blob), "image/png");
    setGenerating(false);
    setSaveMsg("");
    setTimeout(() => setShowModal(true), 0);
  }

  async function handleSwitchTheme() {
    await generate((themeIdx + 1) % POSTER_THEMES.length);
  }

  // 实时从 canvas 获取 blob，不依赖提前存好的状态
  function getCanvasBlob() {
    return new Promise((resolve) => {
      canvasRef.current.toBlob((blob) => resolve(blob), "image/png", 1.0);
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    const filename = `语境重塑记录_${new Date().toISOString().slice(0, 10)}.png`;

    // 实时生成 blob（避免异步时序问题）
    const blob = await getCanvasBlob();

    // 1. iOS Safari 14+ / Android Chrome：Web Share API 弹出系统分享菜单
    //    用户选"存储图像"/"存储到照片"即进相册
    if (blob && navigator.canShare) {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "我的英语打卡海报" });
          setSaveMsg("✓ 已打开系统分享菜单，请选择存储到照片");
          setSaving(false);
          return;
        } catch (e) {
          if (e.name === "AbortError") {
            // 用户主动取消分享，不算失败
            setSaving(false);
            return;
          }
          // 其他错误，继续走下载方案
        }
      }
    }

    // 2. 下载方案（Android / 桌面）
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 3000);
      setSaveMsg("✓ 已发起下载，请在下载文件夹中查找");
      setSaving(false);
      return;
    }

    // 3. 最终兜底：dataURL
    if (posterUrl) {
      const a = document.createElement("a");
      a.href = posterUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSaveMsg("✓ 已发起下载，请在下载文件夹中查找");
    }
    setSaving(false);
  }

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* 风格指示行 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: THEME.colors.muted, fontWeight: 800 }}>
          当前风格：{POSTER_THEMES[themeIdx].name}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {POSTER_THEMES.map((_, i) => (
            <div key={i} style={{ width: i === themeIdx ? 20 : 8, height: 8, borderRadius: 999, background: i === themeIdx ? "#4f46e5" : "rgba(15,23,42,0.14)", transition: "all 0.3s ease" }} />
          ))}
        </div>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={() => generate()}
        disabled={generating}
        style={{
          width: "100%",
          padding: "16px 0",
          borderRadius: 16,
          border: "none",
          background: generating ? "rgba(79,70,229,0.45)" : "linear-gradient(135deg, #0f172a 0%, #312e81 100%)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 1000,
          cursor: generating ? "not-allowed" : "pointer",
          boxShadow: generating ? "none" : "0 12px 28px rgba(15,23,42,0.20)",
          transition: "all 0.2s ease",
        }}
      >
        {generating ? "⏳ 生成中..." : "生成高清海报 ✦"}
      </button>

      {/* ─── 预览弹窗：全屏图片，长按保存（兼容所有国内浏览器）──────────── */}
      {showModal && posterUrl && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#000",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
          }}
        >
          {/* 顶部操作栏 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ← 返回
            </button>
            <span style={{ fontSize: 14, fontWeight: 1000, color: "#fff" }}>
              {POSTER_THEMES[themeIdx].name}
            </span>
            <button
              onClick={handleSwitchTheme}
              disabled={generating}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                cursor: generating ? "not-allowed" : "pointer",
                opacity: generating ? 0.5 : 1,
              }}
            >
              {generating ? "切换中..." : "换风格"}
            </button>
          </div>

          {/* 长按提示横幅 */}
          <div
            style={{
              textAlign: "center",
              padding: "10px 16px",
              background: "rgba(99,102,241,0.85)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "0.3px",
              flexShrink: 0,
            }}
          >
            👆 长按图片 → 选择"保存图片"即可存入相册
          </div>

          {/* 图片主体：可滚动，图片足够大便于长按 */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "12px",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <img
              src={posterUrl}
              alt="打卡海报"
              style={{
                width: "100%",
                maxWidth: 480,
                borderRadius: 12,
                display: "block",
                userSelect: "none",
                WebkitUserSelect: "none",
                // 不设 maxHeight，让图片完整展示，便于长按任意位置
              }}
              // 阻止默认拖拽，但不阻止长按上下文菜单
              onDragStart={(e) => e.preventDefault()}
            />
          </div>

          {/* 底部主题指示点 */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              padding: "14px 0 28px",
              background: "rgba(0,0,0,0.85)",
              flexShrink: 0,
            }}
          >
            {POSTER_THEMES.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === themeIdx ? 24 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: i === themeIdx ? "#fff" : "rgba(255,255,255,0.25)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PosterGenerator;
