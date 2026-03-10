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

  async function handleSave() {
    if (!posterBlob && !posterUrl) return;
    setSaving(true);
    setSaveMsg("");
    const filename = `语境重塑记录_${new Date().toISOString().slice(0, 10)}.png`;

    // 1. Web Share API（iOS / Android 原生分享到相册）
    if (navigator.canShare && posterBlob) {
      const file = new File([posterBlob], filename, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "我的英语打卡海报" });
          setSaveMsg("已打开系统分享，选择存储到相册即可保存");
          setSaving(false);
          return;
        } catch (e) {
          // 用户取消，继续走下一步
        }
      }
    }

    // 2. Blob URL 下载（Android / 桌面端）
    if (posterBlob) {
      try {
        const blobUrl = URL.createObjectURL(posterBlob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        setSaveMsg("图片已下载，请在下载文件夹中查找");
        setSaving(false);
        return;
      } catch (e) {}
    }

    // 3. 兜底 dataURL
    if (posterUrl) {
      const a = document.createElement("a");
      a.href = posterUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSaveMsg("图片已下载，请在下载文件夹中查找");
    }
    setSaving(false);
  }

  // ─── UI：全宽两列，左大字标语，右主题+按钮 ──────────────────────────────────
  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        {/* 左：标语 + 数据亮点 */}
        <div
          style={{
            padding: "24px 26px",
            borderRadius: 20,
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 20,
            minHeight: 180,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(165,180,252,0.80)", letterSpacing: "1px" }}>
              ENGLISH JOURNAL · 打卡海报
            </div>
            <div style={{ fontSize: 26, fontWeight: 1000, color: "#fff", marginTop: 10, lineHeight: 1.3 }}>
              把学习数据变成<br />一张有分享欲的海报
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginTop: 10, lineHeight: 1.7 }}>
              连续天数 · 收藏词汇 · 打卡日历，合成 1080×1920 高清图，一键发朋友圈。
            </div>
          </div>

          {/* 三项核心数据预览 */}
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { val: streakDays || 0, label: "连续天" },
              { val: vocabCount || 0, label: "收藏词" },
              { val: activeDays || 0, label: "活跃天" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 1000, color: "#a5b4fc", lineHeight: 1 }}>
                  {s.val}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", marginTop: 6 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右：主题卡 + 生成按钮 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 主题指示卡 */}
          <div
            style={{
              flex: 1,
              padding: "18px 20px",
              borderRadius: 20,
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.14)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: THEME.colors.faint, letterSpacing: "0.8px" }}>
                当前风格
              </div>
              <div style={{ fontSize: 20, fontWeight: 1000, color: THEME.colors.ink, marginTop: 6 }}>
                {POSTER_THEMES[themeIdx].name}
              </div>
              <div style={{ fontSize: 13, color: THEME.colors.muted, marginTop: 4 }}>
                共 {POSTER_THEMES.length} 种风格可切换
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {POSTER_THEMES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === themeIdx ? 22 : 8,
                    height: 8,
                    borderRadius: 999,
                    background: i === themeIdx ? "#4f46e5" : "rgba(15,23,42,0.14)",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>
          </div>

          {/* 生成按钮 */}
          <button
            onClick={() => generate()}
            disabled={generating}
            style={{
              width: "100%",
              padding: "18px 0",
              borderRadius: 16,
              border: "none",
              background: generating
                ? "rgba(79,70,229,0.45)"
                : "linear-gradient(135deg, #0f172a 0%, #312e81 100%)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 1000,
              cursor: generating ? "not-allowed" : "pointer",
              boxShadow: generating ? "none" : "0 12px 28px rgba(15,23,42,0.22)",
              transition: "all 0.2s ease",
              letterSpacing: "0.3px",
            }}
          >
            {generating ? "⏳ 生成中..." : "生成高清海报 ✦"}
          </button>
        </div>
      </div>

      {/* ─── 预览弹窗 ─────────────────────────────────────────────────────── */}
      {showModal && posterUrl && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15,23,42,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 32,
              padding: "22px 20px",
              width: "100%",
              maxWidth: 400,
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 1000, color: "#0f172a" }}>海报已生成</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: 800 }}>
                  风格：<span style={{ color: "#4f46e5" }}>{POSTER_THEMES[themeIdx].name}</span>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 36, height: 36,
                  borderRadius: 12,
                  border: "none",
                  background: "rgba(241,245,249,1)",
                  cursor: "pointer",
                  fontSize: 17,
                  color: "#64748b",
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >✕</button>
            </div>

            <div style={{ borderRadius: 18, overflow: "hidden", background: "#f8fafc", border: "1px solid rgba(15,23,42,0.06)" }}>
              <img
                src={posterUrl}
                alt="打卡海报"
                style={{ width: "100%", maxHeight: "50vh", objectFit: "contain", display: "block" }}
              />
            </div>

            {saveMsg ? (
              <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.20)", fontSize: 13, color: "#065f46", fontWeight: 800 }}>
                {saveMsg}
              </div>
            ) : (
              <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.14)", fontSize: 12, color: "#3730a3", lineHeight: 1.7, fontWeight: 700 }}>
                手机端：点击保存按钮，弹出系统分享后选择存储到相册。<br />
                电脑端：点击保存按钮，图片自动下载到本地。
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "14px 0",
                  borderRadius: 18,
                  border: "none",
                  background: saving ? "rgba(79,70,229,0.5)" : "linear-gradient(135deg, #0f172a, #4f46e5)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: saving ? "none" : "0 10px 20px rgba(79,70,229,0.22)",
                }}
              >
                {saving ? "处理中..." : "保存图片"}
              </button>
              <button
                onClick={handleSwitchTheme}
                disabled={generating}
                style={{
                  padding: "14px 0",
                  borderRadius: 18,
                  border: "1.5px solid rgba(15,23,42,0.10)",
                  background: "rgba(248,250,252,0.9)",
                  color: "#334155",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: generating ? "not-allowed" : "pointer",
                }}
              >
                {generating ? "切换中..." : "切换风格"}
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
                    background: i === themeIdx ? "#4f46e5" : "rgba(15,23,42,0.10)",
                    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
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
