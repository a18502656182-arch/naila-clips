--- START OF FILE naila-clips-rsc-rewrite/app/journal/PosterGenerator.jsx ---
"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../components/home/theme";

// 提取与手帐面板UI完全一致的新配色方案
const POSTER_THEMES =[
  {
    name: "流光经典",
    bg: ["#f8fafc", "#f1f5f9", "#e2e8f0"], // 明亮灰白渐变
    orb1: "rgba(99,102,241,0.22)", // Indigo光晕
    orb2: "rgba(236,72,153,0.15)", // Pink光晕
    orb3: "rgba(6,182,212,0.15)",  // Cyan光晕
    textMain: "#0f172a",
    textSub: "#475569",
    textFaint: "#64748b",
    cardBg: "rgba(255,255,255,0.86)",
    cardBorder: "rgba(15,23,42,0.08)",
    accent: "#4f46e5", // Indigo主色
    statColors:["#c2410c", "#3730a3", "#065f46"], // 对应手帐的三种高亮
    statPills:[
      { bg: "rgba(251,146,60,0.16)", border: "rgba(251,146,60,0.22)" },
      { bg: "rgba(99,102,241,0.16)", border: "rgba(99,102,241,0.22)" },
      { bg: "rgba(16,185,129,0.16)", border: "rgba(16,185,129,0.22)" }
    ],
    taskNeutralBg: "rgba(99,102,241,0.06)",
    taskNeutralBorder: "rgba(99,102,241,0.16)",
    taskNeutralIcon: "#4f46e5",
    taskDoneBg: "rgba(16,185,129,0.08)",
    taskDoneBorder: "rgba(16,185,129,0.24)",
    taskDoneIcon: "#10b981",
    taskEmptyBg: "rgba(15,23,42,0.03)",
    taskEmptyBorder: "rgba(15,23,42,0.08)",
    taskEmptyIcon: "#94a3b8",
    cellEmpty: "rgba(248,250,252,0.7)",
    cellEmptyBorder: "rgba(15,23,42,0.05)",
    cellEmptyText: "#94a3b8",
    cellActive:["rgba(220,252,231,0.95)", "rgba(187,247,208,0.98)", "rgba(34,197,94,0.95)"],
    cellActiveText:["#166534", "#166534", "#ffffff"],
    todayOutline: "#4f46e5",
  },
  {
    name: "薄荷轻氧",
    bg:["#f0fdf4", "#ecfdf5", "#d1fae5"], // 清新绿渐变
    orb1: "rgba(16,185,129,0.20)",
    orb2: "rgba(6,182,212,0.15)",
    orb3: "rgba(52,211,153,0.15)",
    textMain: "#064e3b",
    textSub: "#065f46",
    textFaint: "#047857",
    cardBg: "rgba(255,255,255,0.75)",
    cardBorder: "rgba(16,185,129,0.25)",
    accent: "#059669",
    statColors:["#b45309", "#065f46", "#0369a1"],
    statPills:[
      { bg: "rgba(245,158,11,0.2)", border: "rgba(245,158,11,0.3)" },
      { bg: "rgba(16,185,129,0.2)", border: "rgba(16,185,129,0.3)" },
      { bg: "rgba(14,165,233,0.2)", border: "rgba(14,165,233,0.3)" }
    ],
    taskNeutralBg: "rgba(14,165,233,0.08)",
    taskNeutralBorder: "rgba(14,165,233,0.2)",
    taskNeutralIcon: "#0284c7",
    taskDoneBg: "rgba(16,185,129,0.12)",
    taskDoneBorder: "rgba(16,185,129,0.3)",
    taskDoneIcon: "#059669",
    taskEmptyBg: "rgba(255,255,255,0.4)",
    taskEmptyBorder: "rgba(16,185,129,0.15)",
    taskEmptyIcon: "#6ee7b7",
    cellEmpty: "rgba(255,255,255,0.6)",
    cellEmptyBorder: "rgba(16,185,129,0.1)",
    cellEmptyText: "#059669",
    cellActive:["rgba(167,243,208,1)", "rgba(110,231,183,1)", "rgba(16,185,129,1)"],
    cellActiveText:["#064e3b", "#064e3b", "#ffffff"],
    todayOutline: "#0ea5e9",
  },
  {
    name: "深夜凝海",
    bg:["#0f172a", "#1e1b4b", "#0f172a"], // 暗色系，对应手帐的深色ActionCard
    orb1: "rgba(99,102,241,0.35)",
    orb2: "rgba(236,72,153,0.25)",
    orb3: "rgba(6,182,212,0.20)",
    textMain: "#ffffff",
    textSub: "#cbd5e1",
    textFaint: "#94a3b8",
    cardBg: "rgba(30,41,59,0.65)",
    cardBorder: "rgba(255,255,255,0.12)",
    accent: "#818cf8",
    statColors: ["#fdba74", "#a5b4fc", "#6ee7b7"],
    statPills:[
      { bg: "rgba(251,146,60,0.2)", border: "rgba(251,146,60,0.3)" },
      { bg: "rgba(99,102,241,0.2)", border: "rgba(99,102,241,0.3)" },
      { bg: "rgba(16,185,129,0.2)", border: "rgba(16,185,129,0.3)" }
    ],
    taskNeutralBg: "rgba(99,102,241,0.15)",
    taskNeutralBorder: "rgba(99,102,241,0.25)",
    taskNeutralIcon: "#818cf8",
    taskDoneBg: "rgba(16,185,129,0.15)",
    taskDoneBorder: "rgba(16,185,129,0.3)",
    taskDoneIcon: "#34d399",
    taskEmptyBg: "rgba(255,255,255,0.03)",
    taskEmptyBorder: "rgba(255,255,255,0.08)",
    taskEmptyIcon: "#64748b",
    cellEmpty: "rgba(255,255,255,0.03)",
    cellEmptyBorder: "rgba(255,255,255,0.06)",
    cellEmptyText: "#64748b",
    cellActive:["rgba(16,185,129,0.25)", "rgba(16,185,129,0.6)", "rgba(16,185,129,0.95)"],
    cellActiveText: ["#a7f3d0", "#d1fae5", "#ffffff"],
    todayOutline: "#818cf8",
  },
];

function PosterGenerator({ me, streakDays, totalVideos, vocabCount, heatmapData, tasks, activeDays, topTopic }) {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const[themeIdx, setThemeIdx] = useState(0);

  // Canvas 圆角矩形辅助函数
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

  // Canvas 绘制胶囊文字器
  function drawPill(ctx, text, x, y, bg, color, border) {
    ctx.font = "800 13px sans-serif";
    const tw = ctx.measureText(text).width;
    const w = tw + 20;
    const h = 26;
    roundRect(ctx, x - w / 2, y, w, h, 13);
    ctx.fillStyle = bg;
    ctx.fill();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + h / 2 + 1);
    ctx.textBaseline = "alphabetic"; // 恢复
  }

  async function generate(forceTheme) {
    setGenerating(true);
    // 制造一点微小延迟，保证 UI 的 loading 状态展现
    await new Promise((r) => setTimeout(r, 50));

    const nextTheme = forceTheme !== undefined ? forceTheme : themeIdx;
    setThemeIdx(nextTheme);
    const T = POSTER_THEMES[nextTheme];

    const canvas = canvasRef.current;
    const W = 750;
    const H = 1200;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // 1. 绘制背景层渐变
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, T.bg[0]);
    bgGrad.addColorStop(0.5, T.bg[1]);
    bgGrad.addColorStop(1, T.bg[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. 绘制模糊光晕 (Glassmorphism 灵魂)
    const drawOrb = (x, y, r, color) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    };
    drawOrb(150, 200, 350, T.orb1);
    drawOrb(600, 450, 300, T.orb2);
    drawOrb(200, 900, 400, T.orb3);

    // 3. 绘制顶部 Header
    ctx.font = "900 28px sans-serif";
    ctx.fillStyle = T.textMain;
    ctx.fillText("📒 英语学习手帐", 46, 76);

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    ctx.font = "800 20px sans-serif";
    ctx.fillStyle = T.textFaint;
    ctx.textAlign = "right";
    ctx.fillText(dateStr, W - 46, 74);
    ctx.textAlign = "left";

    // 顶部分割线
    ctx.strokeStyle = T.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(46, 102);
    ctx.lineTo(W - 46, 102);
    ctx.stroke();

    // 4. 用户信息
    const userName = me?.email?.split("@")[0] || "学习者";
    ctx.font = "900 38px sans-serif";
    ctx.fillStyle = T.textMain;
    ctx.fillText(`👋 Hello, ${userName}`, 46, 166);

    // 5. 数据总览模块 (MiniStats)
    ctx.font = "900 22px sans-serif";
    ctx.fillStyle = T.textSub;
    ctx.fillText("📊 学习总览", 46, 226);

    const stats =[
      { num: streakDays || 0, label: "连续天数", color: T.statColors[0], pBg: T.statPills[0].bg, pBd: T.statPills[0].border },
      { num: totalVideos || 0, label: "累计视频", color: T.statColors[1], pBg: T.statPills[1].bg, pBd: T.statPills[1].border },
      { num: vocabCount || 0, label: "收藏词汇", color: T.statColors[2], pBg: T.statPills[2].bg, pBd: T.statPills[2].border },
    ];

    const cW = 210;
    const cH = 124;
    const cGap = (W - 92 - cW * 3) / 2; // 自动计算间距
    const cY = 250;

    stats.forEach((item, i) => {
      const x = 46 + i * (cW + cGap);
      
      // 卡片阴影
      ctx.shadowColor = "rgba(15,23,42,0.04)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      roundRect(ctx, x, cY, cW, cH, 22);
      ctx.fillStyle = T.cardBg;
      ctx.fill();
      ctx.shadowColor = "transparent"; // 重置阴影

      // 卡片边框
      ctx.strokeStyle = T.cardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 卡片数字
      ctx.font = "900 48px sans-serif";
      ctx.fillStyle = item.color;
      ctx.textAlign = "center";
      ctx.fillText(String(item.num), x + cW / 2, cY + 66);
      ctx.textAlign = "left";

      // 标签药丸
      drawPill(ctx, item.label, x + cW / 2, cY + 82, item.pBg, item.color, item.pBd);
    });

    // 6. 今日计划模块
    const taskY = 414;
    const trackedDoneCount = tasks.filter((t) => t.done).length;
    
    ctx.font = "900 22px sans-serif";
    ctx.fillStyle = T.textSub;
    ctx.fillText(`🎯 今日计划`, 46, taskY + 22);
    
    // 右侧小药丸
    drawPill(ctx, `已完成 ${trackedDoneCount}/2`, W - 46 - 45, taskY + 4, T.taskNeutralBg, T.accent, T.taskNeutralBorder);

    const taskList =[
      { label: "今天看 1 个场景视频", done: tasks[0]?.done },
      { label: "今天收藏 3 个词/表达", done: tasks[1]?.done },
      { label: "去游戏大厅做一轮练习", done: false, neutral: true },
    ];

    taskList.forEach((item, idx) => {
      const y = taskY + 46 + idx * 64;
      const isNeutral = item.neutral;
      const isDone = item.done;

      const bg = isNeutral ? T.taskNeutralBg : isDone ? T.taskDoneBg : T.taskEmptyBg;
      const bd = isNeutral ? T.taskNeutralBorder : isDone ? T.taskDoneBorder : T.taskEmptyBorder;
      const iconColor = isNeutral ? T.taskNeutralIcon : isDone ? T.taskDoneIcon : T.taskEmptyIcon;

      roundRect(ctx, 46, y, W - 92, 54, 16);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = bd;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Icon区域
      roundRect(ctx, 58, y + 12, 30, 30, 10);
      ctx.fillStyle = isNeutral || isDone ? iconColor : "rgba(255,255,255,0.6)";
      ctx.fill();
      if(!isNeutral && !isDone) {
        ctx.strokeStyle = T.cardBorder;
        ctx.stroke();
      }

      ctx.font = "900 16px sans-serif";
      ctx.fillStyle = isNeutral || isDone ? "#ffffff" : T.textFaint;
      ctx.textAlign = "center";
      ctx.fillText(isNeutral ? "→" : isDone ? "✓" : "•", 73, y + 33);
      ctx.textAlign = "left";

      // 文字
      ctx.font = "800 18px sans-serif";
      ctx.fillStyle = T.textMain;
      ctx.fillText(item.label, 104, y + 34);
    });

    // 7. 学习日历模块
    const hmY = 646;
    ctx.font = "900 22px sans-serif";
    ctx.fillStyle = T.textSub;
    ctx.fillText("🗓️ 最近学习日历", 46, hmY + 22);

    const calendarMonth = new Date();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const calendarCells =[];
    for (let i = 0; i < startWeekday; i++) calendarCells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      calendarCells.push({ day: d, key, count: heatmapData[key] || 0 });
    }
    while (calendarCells.length % 7 !== 0) calendarCells.push(null);

    // 绘制星期头
    const weekNames =["日", "一", "二", "三", "四", "五", "六"];
    const cellW = 86;
    const cellH = 54;
    const gridGap = 8;
    // (W - 7列*宽度 - 6个间距) / 2 = X起始点，保证居中
    const gridStartX = (W - (7 * cellW + 6 * gridGap)) / 2;
    const gridStartY = hmY + 84;

    weekNames.forEach((w, i) => {
      ctx.font = "900 15px sans-serif";
      ctx.fillStyle = T.textFaint;
      ctx.textAlign = "center";
      ctx.fillText(w, gridStartX + i * (cellW + gridGap) + cellW / 2, hmY + 64);
    });
    ctx.textAlign = "left";

    // 绘制网格
    const todayKey = new Date().toISOString().slice(0, 10);
    
    calendarCells.forEach((cell, idx) => {
      const row = Math.floor(idx / 7);
      const col = idx % 7;
      const x = gridStartX + col * (cellW + gridGap);
      const y = gridStartY + row * (cellH + gridGap);

      roundRect(ctx, x, y, cellW, cellH, 12);
      
      if (!cell) {
        ctx.fillStyle = T.cellEmpty;
        ctx.fill();
        ctx.strokeStyle = T.cellEmptyBorder;
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }

      // 背景色与文字色判断
      let bgFill, textColor, hasBadge = false, badgeText = "";
      if (cell.count <= 0) {
        bgFill = T.cellEmpty;
        textColor = T.cellEmptyText;
      } else if (cell.count === 1) {
        bgFill = T.cellActive[0];
        textColor = T.cellActiveText[0];
        hasBadge = true;
      } else if (cell.count === 2) {
        bgFill = T.cellActive[1];
        textColor = T.cellActiveText[1];
        hasBadge = true;
      } else {
        bgFill = T.cellActive[2];
        textColor = T.cellActiveText[2];
        hasBadge = true;
      }

      ctx.fillStyle = bgFill;
      ctx.fill();

      if (cell.key === todayKey) {
        ctx.strokeStyle = T.todayOutline;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        ctx.strokeStyle = T.cellEmptyBorder;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 天数文字
      ctx.font = "900 16px sans-serif";
      ctx.fillStyle = textColor;
      ctx.fillText(String(cell.day), x + 10, y + 22);

      // 次数角标
      if (hasBadge) {
        roundRect(ctx, x + cellW - 28, y + cellH - 22, 22, 16, 8);
        ctx.fillStyle = cell.count >= 3 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)";
        ctx.fill();
        ctx.font = "900 11px sans-serif";
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.fillText(String(cell.count), x + cellW - 17, y + cellH - 10);
        ctx.textAlign = "left";
      }
    });

    // 8. 底部状态与页脚
    // 计算底部区域起始Y点（依赖于日历究竟有5行还是6行）
    const calendarRows = Math.ceil(calendarCells.length / 7);
    const bottomStartY = gridStartY + calendarRows * (cellH + gridGap) + 20;

    ctx.font = "900 22px sans-serif";
    ctx.fillStyle = T.textSub;
    ctx.fillText("🧭 动态分析", 46, bottomStartY + 24);

    ctx.font = "800 18px sans-serif";
    ctx.fillStyle = T.textMain;
    ctx.fillText(`· 累计活跃学习 ${activeDays || 0} 天，状态保持中`, 46, bottomStartY + 64);
    ctx.fillText(`· 场景偏好：${topTopic || "继续学习后将出现个性化词云"}`, 46, bottomStartY + 96);
    ctx.fillText(`· 个人表达库：已沉淀 ${vocabCount || 0} 个专属语料`, 46, bottomStartY + 128);

    // 底部 Footer
    ctx.strokeStyle = T.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(46, H - 90);
    ctx.lineTo(W - 46, H - 90);
    ctx.stroke();

    ctx.font = "900 24px sans-serif";
    ctx.fillStyle = T.textMain;
    ctx.textAlign = "center";
    ctx.fillText("🌐 nailaobao.top", W / 2, H - 52);
    
    ctx.font = "800 16px sans-serif";
    ctx.fillStyle = T.textFaint;
    ctx.fillText("油管英语场景库 · 场景输入 · 收藏沉淀 · 游戏练习", W / 2, H - 26);
    ctx.textAlign = "left";

    // 导出图像
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

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      
      {/* 触发入口区域：设计风格与 JournalPanels 内的 Card 统一 */}
      <div
        style={{
          padding: "18px 18px 16px",
          borderRadius: 22,
          background: "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(248,250,252,0.85))",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 14px 30px rgba(15,23,42,0.05)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 1000, color: THEME.colors.ink }}>📸 学习打卡海报</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: THEME.colors.faint, marginTop: 6 }}>
          把连续学习、累计视频、收藏词汇和学习日历一键生成打卡海报。
        </div>
        <button
          onClick={() => generate()}
          disabled={generating}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "12px 0",
            borderRadius: 16,
            border: "none",
            background: generating ? "rgba(79,70,229,0.5)" : "linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 1000,
            cursor: generating ? "not-allowed" : "pointer",
            boxShadow: generating ? "none" : "0 12px 24px rgba(79,70,229,0.25)",
            transition: "all 0.2s",
          }}
        >
          {generating ? "⏳ 生成中..." : "生成今日海报"}
        </button>
        <div style={{ marginTop: 10, fontSize: 11, color: THEME.colors.muted, fontWeight: 800, textAlign: "center" }}>
          共 {POSTER_THEMES.length} 种风格，生成后可切换主题
        </div>
      </div>

      {/* 弹窗展现区域：响应式设计 */}
      {showModal && posterUrl && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15,23,42,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: "20px",
              width: "100%",
              maxWidth: 420, // 移动端优先的最大宽度
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* 头部信息 */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 1000, color: "#0f172a" }}>🎉 今日海报生成完毕</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 800 }}>
                  当前风格：<span style={{ color: "#4f46e5" }}>{POSTER_THEMES[themeIdx].name}</span>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "1px solid rgba(15,23,42,0.1)",
                  background: "rgba(248,250,252,1)",
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

            {/* 海报预览图：响应缩放 */}
            <div
              style={{
                borderRadius: 16,
                padding: 4,
                background: "rgba(15,23,42,0.03)",
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
                  maxHeight: "56vh",
                  objectFit: "contain",
                  borderRadius: 12,
                  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                  display: "block",
                }}
              />
            </div>

            <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", fontWeight: 800 }}>
              📱 手机长按图片可保存，电脑请点下方按钮
            </div>

            {/* 操作按钮组：弹性布局 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={handleDownload}
                style={{
                  padding: "12px 0",
                  borderRadius: 14,
                  border: "none",
                  background: "linear-gradient(135deg, #0f172a, #4f46e5)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(15,23,42,0.15)",
                }}
              >
                ⬇️ 保存相册
              </button>
              <button
                onClick={handleSwitchTheme}
                style={{
                  padding: "12px 0",
                  borderRadius: 14,
                  border: "1.5px solid rgba(15,23,42,0.12)",
                  background: "rgba(248,250,252,0.9)",
                  color: "#334155",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                🎨 换个风格
              </button>
            </div>
            
            {/* 主题指示器 */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
              {POSTER_THEMES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === themeIdx ? 20 : 8,
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
--- END OF FILE naila-clips-rsc-rewrite/app/journal/PosterGenerator.jsx ---
