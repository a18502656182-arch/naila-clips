"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../components/home/theme";

// 全新极简呼吸感配色方案
const POSTER_THEMES =[
  {
    name: "流光清晨",
    bg:["#ffffff", "#f8fafc", "#f1f5f9"],
    orb1: "rgba(99,102,241,0.12)",
    orb2: "rgba(236,72,153,0.08)",
    orb3: "rgba(6,182,212,0.10)",
    textMain: "#0f172a",
    textSub: "#334155",
    textFaint: "#94a3b8",
    cardBg: "rgba(255,255,255,0.7)",
    cardBorder: "rgba(15,23,42,0.04)",
    accent: "#4f46e5",
    statColors:["#ea580c", "#4f46e5", "#059669"],
    statPills:[
      { bg: "rgba(234,88,12,0.1)", color: "#ea580c" },
      { bg: "rgba(79,70,229,0.1)", color: "#4f46e5" },
      { bg: "rgba(5,150,105,0.1)", color: "#059669" }
    ],
    taskNeutralBg: "rgba(255,255,255,0.8)",
    taskNeutralText: "#4f46e5",
    taskDoneBg: "rgba(255,255,255,0.8)",
    taskDoneText: "#059669",
    cellEmpty: "rgba(248,250,252,0.6)",
    cellEmptyText: "#cbd5e1",
    cellActive:["rgba(220,252,231,0.8)", "rgba(134,239,172,0.9)", "rgba(34,197,94,1)"],
    cellActiveText:["#166534", "#14532d", "#ffffff"],
    todayOutline: "#4f46e5",
    insightBg: "rgba(241,245,249,0.7)"
  },
  {
    name: "薄荷微风",
    bg:["#f0fdf4", "#ecfdf5", "#d1fae5"],
    orb1: "rgba(16,185,129,0.15)",
    orb2: "rgba(6,182,212,0.12)",
    orb3: "rgba(52,211,153,0.10)",
    textMain: "#064e3b",
    textSub: "#065f46",
    textFaint: "#10b981",
    cardBg: "rgba(255,255,255,0.6)",
    cardBorder: "rgba(16,185,129,0.15)",
    accent: "#059669",
    statColors:["#b45309", "#065f46", "#0369a1"],
    statPills:[
      { bg: "rgba(245,158,11,0.15)", color: "#b45309" },
      { bg: "rgba(16,185,129,0.15)", color: "#065f46" },
      { bg: "rgba(14,165,233,0.15)", color: "#0369a1" }
    ],
    taskNeutralBg: "rgba(255,255,255,0.7)",
    taskNeutralText: "#0284c7",
    taskDoneBg: "rgba(255,255,255,0.7)",
    taskDoneText: "#059669",
    cellEmpty: "rgba(255,255,255,0.5)",
    cellEmptyText: "#a7f3d0",
    cellActive:["rgba(167,243,208,0.9)", "rgba(110,231,183,1)", "rgba(16,185,129,1)"],
    cellActiveText: ["#064e3b", "#064e3b", "#ffffff"],
    todayOutline: "#0ea5e9",
    insightBg: "rgba(255,255,255,0.6)"
  },
  {
    name: "深邃星空",
    bg:["#09090b", "#18181b", "#0f172a"],
    orb1: "rgba(99,102,241,0.25)",
    orb2: "rgba(236,72,153,0.15)",
    orb3: "rgba(6,182,212,0.15)",
    textMain: "#ffffff",
    textSub: "#e2e8f0",
    textFaint: "#64748b",
    cardBg: "rgba(30,41,59,0.4)",
    cardBorder: "rgba(255,255,255,0.08)",
    accent: "#818cf8",
    statColors: ["#fb923c", "#a5b4fc", "#34d399"],
    statPills:[
      { bg: "rgba(251,146,60,0.15)", color: "#fb923c" },
      { bg: "rgba(99,102,241,0.15)", color: "#a5b4fc" },
      { bg: "rgba(16,185,129,0.15)", color: "#34d399" }
    ],
    taskNeutralBg: "rgba(30,41,59,0.6)",
    taskNeutralText: "#a5b4fc",
    taskDoneBg: "rgba(30,41,59,0.6)",
    taskDoneText: "#34d399",
    cellEmpty: "rgba(255,255,255,0.02)",
    cellEmptyText: "#334155",
    cellActive:["rgba(16,185,129,0.2)", "rgba(16,185,129,0.5)", "rgba(16,185,129,0.9)"],
    cellActiveText: ["#a7f3d0", "#d1fae5", "#ffffff"],
    todayOutline: "#818cf8",
    insightBg: "rgba(255,255,255,0.04)"
  },
];

function PosterGenerator({ me, streakDays, totalVideos, vocabCount, heatmapData, tasks, activeDays, topTopic }) {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const[posterUrl, setPosterUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [themeIdx, setThemeIdx] = useState(0);

  function roundRect(ctx, x, y, w, h, r) {
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

  function drawPill(ctx, text, x, y, bg, color) {
    ctx.font = "800 16px sans-serif";
    const tw = ctx.measureText(text).width;
    const w = tw + 28;
    const h = 34;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 17);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 2);
    ctx.textBaseline = "alphabetic";
  }

  async function generate(forceTheme) {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 60));

    const nextTheme = forceTheme !== undefined ? forceTheme : themeIdx;
    setThemeIdx(nextTheme);
    const T = POSTER_THEMES[nextTheme];

    const canvas = canvasRef.current;
    const W = 800;
    const H = 1680; // 大幅拉高画布，让内容自由呼吸
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // 1. 背景渐变与光晕
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, T.bg[0]);
    bgGrad.addColorStop(0.5, T.bg[1]);
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
    drawOrb(150, 200, 500, T.orb1);
    drawOrb(650, 600, 450, T.orb2);
    drawOrb(300, 1200, 550, T.orb3);

    const PAD = 56; // 左右大边距

    // 2. 顶部 Header
    ctx.font = "800 20px sans-serif";
    ctx.fillStyle = T.textFaint;
    ctx.fillText("ENGLISH JOURNAL", PAD, 100);

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
    ctx.textAlign = "right";
    ctx.fillText(dateStr, W - PAD, 100);
    ctx.textAlign = "left";

    const userName = me?.email?.split("@")[0] || "Learner";
    ctx.font = "900 52px sans-serif";
    ctx.fillStyle = T.textMain;
    ctx.fillText(`Hello, ${userName} 👋`, PAD, 170);

    // 3. 数据层 (大数字极简卡片)
    let currentY = 240;
    const stats =[
      { num: streakDays || 0, label: "连续学习(天)", color: T.statColors[0], pill: T.statPills[0] },
      { num: totalVideos || 0, label: "场景输入(次)", color: T.statColors[1], pill: T.statPills[1] },
      { num: vocabCount || 0, label: "沉淀表达(个)", color: T.statColors[2], pill: T.statPills[2] },
    ];

    const cW = (W - PAD * 2 - 40) / 3;
    stats.forEach((item, i) => {
      const x = PAD + i * (cW + 20);
      
      // 轻量背景框
      roundRect(ctx, x, currentY, cW, 160, 28);
      ctx.fillStyle = T.cardBg;
      ctx.fill();
      ctx.strokeStyle = T.cardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 数字
      ctx.font = "900 64px sans-serif";
      ctx.fillStyle = item.color;
      ctx.textAlign = "center";
      ctx.fillText(String(item.num), x + cW / 2, currentY + 90);

      // 底部标签小药丸
      drawPill(ctx, item.label, x + cW / 2, currentY + 130, item.pill.bg, item.pill.color);
    });
    ctx.textAlign = "left";
    currentY += 240;

    // 4. 今日计划 (更轻盈的列表)
    ctx.font = "900 28px sans-serif";
    ctx.fillStyle = T.textMain;
    ctx.fillText("🎯 今日专注", PAD, currentY);

    const trackedDoneCount = tasks.filter((t) => t.done).length;
    drawPill(ctx, `已完成 ${trackedDoneCount}/2`, W - PAD - 60, currentY - 10, T.statPills[1].bg, T.statPills[1].color);

    currentY += 40;
    const taskList = [
      { label: "今天看 1 个场景视频", done: tasks[0]?.done },
      { label: "今天收藏 3 个词/表达", done: tasks[1]?.done },
      { label: "去游戏大厅做一轮练习", done: false, neutral: true },
    ];

    taskList.forEach((item, idx) => {
      const y = currentY + idx * 76;
      const isNeutral = item.neutral;
      const isDone = item.done;

      roundRect(ctx, PAD, y, W - PAD * 2, 64, 20);
      ctx.fillStyle = isNeutral ? T.taskNeutralBg : isDone ? T.taskDoneBg : T.insightBg;
      ctx.fill();
      ctx.strokeStyle = T.cardBorder;
      ctx.stroke();

      // 状态圆圈
      ctx.beginPath();
      ctx.arc(PAD + 36, y + 32, 12, 0, Math.PI * 2);
      ctx.fillStyle = isNeutral ? T.taskNeutralText : isDone ? T.taskDoneText : T.textFaint;
      if (!isNeutral && !isDone) {
        ctx.fillStyle = "transparent";
        ctx.strokeStyle = T.textFaint;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fill();
      }

      ctx.font = "800 20px sans-serif";
      ctx.fillStyle = T.textMain;
      ctx.fillText(item.label, PAD + 64, y + 39);
      
      // 尾部文字
      ctx.font = "800 16px sans-serif";
      ctx.fillStyle = isNeutral ? T.taskNeutralText : isDone ? T.taskDoneText : T.textFaint;
      ctx.textAlign = "right";
      ctx.fillText(isNeutral ? "待探索 →" : isDone ? "已达成 ✓" : "进行中", W - PAD - 24, y + 38);
      ctx.textAlign = "left";
    });
    currentY += 76 * 3 + 80;

    // 5. 学习足迹 (拉大格子间距)
    ctx.font = "900 28px sans-serif";
    ctx.fillStyle = T.textMain;
    ctx.fillText("🗓️ 学习足迹", PAD, currentY);

    currentY += 50;
    const calendarMonth = new Date();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startWeekday = new Date(year, month, 1).getDay();
    
    const calendarCells = Array(startWeekday).fill(null);
    for (let d = 1; d <= totalDays; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      calendarCells.push({ day: d, key, count: heatmapData[key] || 0 });
    }
    while (calendarCells.length % 7 !== 0) calendarCells.push(null);

    const weekNames =["日", "一", "二", "三", "四", "五", "六"];
    const gridGap = 12;
    const cellW = (W - PAD * 2 - gridGap * 6) / 7;
    const cellH = 74;

    weekNames.forEach((w, i) => {
      ctx.font = "800 16px sans-serif";
      ctx.fillStyle = T.textFaint;
      ctx.textAlign = "center";
      ctx.fillText(w, PAD + i * (cellW + gridGap) + cellW / 2, currentY);
    });
    ctx.textAlign = "left";
    
    currentY += 24;
    const todayKey = new Date().toISOString().slice(0, 10);
    
    calendarCells.forEach((cell, idx) => {
      const row = Math.floor(idx / 7);
      const col = idx % 7;
      const x = PAD + col * (cellW + gridGap);
      const y = currentY + row * (cellH + gridGap);

      roundRect(ctx, x, y, cellW, cellH, 16);
      
      if (!cell) {
        ctx.fillStyle = T.cellEmpty;
        ctx.fill();
        return;
      }

      let bgFill = T.cellEmpty, textColor = T.cellEmptyText;
      if (cell.count === 1) { bgFill = T.cellActive[0]; textColor = T.cellActiveText[0]; }
      else if (cell.count === 2) { bgFill = T.cellActive[1]; textColor = T.cellActiveText[1]; }
      else if (cell.count >= 3) { bgFill = T.cellActive[2]; textColor = T.cellActiveText[2]; }

      ctx.fillStyle = bgFill;
      ctx.fill();

      if (cell.key === todayKey) {
        ctx.strokeStyle = T.todayOutline;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.font = "900 20px sans-serif";
      ctx.fillStyle = textColor;
      ctx.fillText(String(cell.day), x + 12, y + 28);

      if (cell.count > 0) {
        ctx.font = "800 14px sans-serif";
        ctx.textAlign = "right";
        ctx.fillStyle = cell.count >= 3 ? "rgba(255,255,255,0.8)" : T.textFaint;
        ctx.fillText(`+${cell.count}`, x + cellW - 10, y + cellH - 12);
        ctx.textAlign = "left";
      }
    });
    
    const rows = Math.ceil(calendarCells.length / 7);
    currentY += rows * (cellH + gridGap) + 60;

    // 6. 学习洞察 (整合的漂亮玻璃卡片)
    roundRect(ctx, PAD, currentY, W - PAD * 2, 130, 24);
    ctx.fillStyle = T.insightBg;
    ctx.fill();
    ctx.strokeStyle = T.cardBorder;
    ctx.stroke();

    ctx.font = "32px sans-serif";
    ctx.fillText("💡", PAD + 24, currentY + 54);
    
    ctx.font = "900 20px sans-serif";
    ctx.fillStyle = T.textMain;
    ctx.fillText(`累计活跃 ${activeDays || 0} 天，你的专属表达库已沉淀 ${vocabCount || 0} 个语料。`, PAD + 74, currentY + 46);
    ctx.fillStyle = T.textSub;
    ctx.fillText(`最近更偏好探索「${topTopic || "多元化"}」相关场景。`, PAD + 74, currentY + 84);

    // 7. Footer 底部
    currentY += 210;
    ctx.font = "900 26px sans-serif";
    ctx.fillStyle = T.textMain;
    ctx.textAlign = "center";
    ctx.fillText("nailaobao.top", W / 2, currentY);
    
    ctx.font = "800 16px sans-serif";
    ctx.fillStyle = T.textFaint;
    ctx.fillText("油管英语场景库 · 场景输入 · 收藏沉淀 · 游戏练习", W / 2, currentY + 30);
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
    a.download = `手帐_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      
      {/* 触发卡片保持原先手帐面板的极简调性 */}
      <div
        style={{
          padding: "20px",
          borderRadius: 24,
          background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.85))",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 14px 30px rgba(15,23,42,0.04)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 1000, color: THEME.colors.ink }}>📸 生成学习海报</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: THEME.colors.faint, marginTop: 8 }}>
          基于重新设计的 Infographic 比例，一键将你的今日数据生成清晰、呼吸感十足的长图。
        </div>
        <button
          onClick={() => generate()}
          disabled={generating}
          style={{
            marginTop: 18,
            width: "100%",
            padding: "14px 0",
            borderRadius: 16,
            border: "none",
            background: generating ? "rgba(79,70,229,0.5)" : "linear-gradient(135deg, #0f172a 0%, #312e81 100%)",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 1000,
            cursor: generating ? "not-allowed" : "pointer",
            boxShadow: generating ? "none" : "0 12px 24px rgba(15,23,42,0.2)",
            transition: "all 0.2s",
          }}
        >
          {generating ? "⏳ 绘制中..." : "立刻生成长图"}
        </button>
      </div>

      {showModal && posterUrl && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15,23,42,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 28,
              padding: "24px",
              width: "100%",
              maxWidth: 440,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 40px 100px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 1000, color: "#0f172a" }}>🎉 生成成功</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, fontWeight: 800 }}>
                  当前主题：<span style={{ color: "#4f46e5" }}>{POSTER_THEMES[themeIdx].name}</span>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: "none",
                  background: "rgba(241,245,249,1)",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#64748b",
                  fontWeight: 900,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                borderRadius: 20,
                padding: 6,
                background: "rgba(248,250,252,1)",
                border: "1px solid rgba(15,23,42,0.06)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <img
                src={posterUrl}
                alt="打卡海报"
                style={{
                  width: "100%",
                  maxHeight: "52vh",
                  objectFit: "contain",
                  borderRadius: 14,
                  boxShadow: "0 10px 30px rgba(15,23,42,0.1)",
                  display: "block",
                }}
              />
            </div>

            <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", fontWeight: 800 }}>
              📱 手机长按图片可保存，电脑请点下方按钮
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={handleDownload}
                style={{
                  padding: "14px 0",
                  borderRadius: 16,
                  border: "none",
                  background: "linear-gradient(135deg, #0f172a, #4f46e5)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                ⬇️ 保存图片
              </button>
              <button
                onClick={handleSwitchTheme}
                style={{
                  padding: "14px 0",
                  borderRadius: 16,
                  border: "1.5px solid rgba(15,23,42,0.1)",
                  background: "rgba(248,250,252,0.8)",
                  color: "#334155",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                🎨 换个风格
              </button>
            </div>
            
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              {POSTER_THEMES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === themeIdx ? 24 : 8,
                    height: 8,
                    borderRadius: 999,
                    background: i === themeIdx ? "#4f46e5" : "rgba(15,23,42,0.1)",
                    transition: "all 0.3s ease",
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
