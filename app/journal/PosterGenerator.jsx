"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../components/home/theme";

// ─── 三套海报主题，改为与手账页一致的明亮清透风格 ─────────────────────────────
const POSTER_THEMES = [
  {
    name: "晴日手账",
    // 海报背景：米白 → 淡蓝渐变，与页面 bg:#f4f6fb 呼应
    bg: ["#f8faff", "#eef2ff", "#f4f6fb"],
    glow1: "rgba(99,102,241,0.13)",
    glow2: "rgba(236,72,153,0.09)",
    // 卡片/分隔线颜色
    cardBg: "rgba(255,255,255,0.92)",
    cardBorder: "rgba(15,23,42,0.08)",
    headerBg: "rgba(255,255,255,0.96)",
    // 文字
    inkPrimary: "#0b1220",
    inkMuted: "rgba(11,18,32,0.56)",
    inkFaint: "rgba(11,18,32,0.38)",
    // 强调色（连续/视频/词汇）
    accent1: "#c2410c",   // 橙红 — 连续天数
    accent2: "#3730a3",   // 靛蓝 — 累计视频
    accent3: "#be185d",   // 玫红 — 收藏词汇
    accentBg1: "rgba(251,146,60,0.14)",
    accentBg2: "rgba(99,102,241,0.12)",
    accentBg3: "rgba(236,72,153,0.12)",
    accentBorder1: "rgba(251,146,60,0.22)",
    accentBorder2: "rgba(99,102,241,0.20)",
    accentBorder3: "rgba(236,72,153,0.18)",
    // 打卡格颜色（空/浅/中/深）
    cellEmpty: "rgba(248,250,252,0.95)",
    cellL1: "rgba(220,252,231,0.95)",
    cellL2: "rgba(187,247,208,0.98)",
    cellL3: "rgba(34,197,94,0.92)",
    cellTextL3: "#ffffff",
    cellBorder: "rgba(15,23,42,0.07)",
    todayRing: "#4f46e5",
    // 底部品牌条
    footerBg: "linear-gradient(135deg,#0f172a 0%,#312e81 48%,#ec4899 100%)",
    footerText: "#ffffff",
    footerSub: "rgba(255,255,255,0.75)",
  },
  {
    name: "暖橙笔记",
    bg: ["#fffbf5", "#fff7ed", "#fef9f0"],
    glow1: "rgba(251,146,60,0.16)",
    glow2: "rgba(234,179,8,0.10)",
    cardBg: "rgba(255,255,255,0.94)",
    cardBorder: "rgba(180,83,9,0.10)",
    headerBg: "rgba(255,255,255,0.97)",
    inkPrimary: "#1c0a00",
    inkMuted: "rgba(28,10,0,0.55)",
    inkFaint: "rgba(28,10,0,0.38)",
    accent1: "#b45309",
    accent2: "#c2410c",
    accent3: "#7c3aed",
    accentBg1: "rgba(251,146,60,0.16)",
    accentBg2: "rgba(249,115,22,0.12)",
    accentBg3: "rgba(124,58,237,0.10)",
    accentBorder1: "rgba(251,146,60,0.26)",
    accentBorder2: "rgba(249,115,22,0.20)",
    accentBorder3: "rgba(124,58,237,0.16)",
    cellEmpty: "rgba(255,253,248,0.95)",
    cellL1: "rgba(254,243,199,0.95)",
    cellL2: "rgba(253,230,138,0.98)",
    cellL3: "rgba(245,158,11,0.92)",
    cellTextL3: "#ffffff",
    cellBorder: "rgba(180,83,9,0.08)",
    todayRing: "#f97316",
    footerBg: "linear-gradient(135deg,#1c0a00 0%,#92400e 48%,#f97316 100%)",
    footerText: "#ffffff",
    footerSub: "rgba(255,255,255,0.75)",
  },
  {
    name: "青碧雨后",
    bg: ["#f0fdfb", "#ecfdf5", "#f0fdfa"],
    glow1: "rgba(6,182,212,0.14)",
    glow2: "rgba(16,185,129,0.10)",
    cardBg: "rgba(255,255,255,0.93)",
    cardBorder: "rgba(6,182,212,0.12)",
    headerBg: "rgba(255,255,255,0.97)",
    inkPrimary: "#022c22",
    inkMuted: "rgba(2,44,34,0.56)",
    inkFaint: "rgba(2,44,34,0.38)",
    accent1: "#0e7490",
    accent2: "#047857",
    accent3: "#6d28d9",
    accentBg1: "rgba(6,182,212,0.13)",
    accentBg2: "rgba(16,185,129,0.13)",
    accentBg3: "rgba(109,40,217,0.10)",
    accentBorder1: "rgba(6,182,212,0.22)",
    accentBorder2: "rgba(16,185,129,0.22)",
    accentBorder3: "rgba(109,40,217,0.16)",
    cellEmpty: "rgba(240,253,250,0.95)",
    cellL1: "rgba(204,251,241,0.95)",
    cellL2: "rgba(153,246,228,0.98)",
    cellL3: "rgba(20,184,166,0.92)",
    cellTextL3: "#ffffff",
    cellBorder: "rgba(6,182,212,0.09)",
    todayRing: "#0891b2",
    footerBg: "linear-gradient(135deg,#022c22 0%,#0e7490 48%,#34d399 100%)",
    footerText: "#ffffff",
    footerSub: "rgba(255,255,255,0.75)",
  },
];

// ─── 辅助：圆角矩形路径 ────────────────────────────────────────────────────────
function PosterGenerator({ me, streakDays, totalVideos, vocabCount, masteredCount, heatmapData, tasks, activeDays, topTopic }) {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
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

  async function generate(forceTheme) {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 80));

    const nextTheme = forceTheme !== undefined ? forceTheme : (themeIdx + 1) % POSTER_THEMES.length;
    setThemeIdx(nextTheme);
    const T = POSTER_THEMES[nextTheme];

    const canvas = canvasRef.current;
    const W = 750;
    const H = 1200;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // ── 背景 ─────────────────────────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, T.bg[0]);
    bg.addColorStop(0.5, T.bg[1]);
    bg.addColorStop(1, T.bg[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 柔和光晕（与手账页 radial-gradient 风格一致）
    const g1 = ctx.createRadialGradient(100, 160, 0, 100, 160, 340);
    g1.addColorStop(0, T.glow1);
    g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(660, 460, 0, 660, 460, 260);
    g2.addColorStop(0, T.glow2);
    g2.addColorStop(1, "transparent");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // ── Header 区域（白色卡片风格） ───────────────────────────────────────────
    roundRect(ctx, 32, 28, W - 64, 90, 22);
    ctx.fillStyle = T.headerBg;
    ctx.fill();
    ctx.strokeStyle = T.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // LOGO 区块：左侧图标 + 文字
    roundRect(ctx, 50, 46, 38, 38, 12);
    ctx.fillStyle = "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(236,72,153,0.10))";
    // Canvas 不支持直接用 CSS 渐变填充，改用近似纯色
    ctx.fillStyle = "rgba(99,102,241,0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(99,102,241,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = T.inkPrimary;
    ctx.textAlign = "center";
    ctx.fillText("📒", 69, 71);

    ctx.textAlign = "left";
    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = T.inkPrimary;
    ctx.fillText("我的英语手帐", 98, 62);
    ctx.font = "500 14px sans-serif";
    ctx.fillStyle = T.inkMuted;
    ctx.fillText("nailaobao.top · 油管场景库", 98, 82);

    // 右上角：日期 + 主题名
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    ctx.textAlign = "right";
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = T.inkPrimary;
    ctx.fillText(dateStr, W - 50, 58);
    ctx.font = "500 13px sans-serif";
    ctx.fillStyle = T.inkFaint;
    ctx.fillText(`✦ ${T.name}`, W - 50, 78);
    ctx.textAlign = "left";

    // ── 用户名 + 副标题 ──────────────────────────────────────────────────────
    const userName = me?.email?.split("@")[0] || "学习者";
    ctx.font = "bold 40px sans-serif";
    ctx.fillStyle = T.inkPrimary;
    ctx.fillText(`👋 ${userName}`, 32, 172);
    ctx.font = "500 19px sans-serif";
    ctx.fillStyle = T.inkMuted;
    ctx.fillText("今日学习打卡 · 持续积累中", 32, 200);

    // ── 三块统计卡片（对应 MiniStat 风格） ───────────────────────────────────
    const stats = [
      { num: streakDays || 0, label: "连续学习天", hint: "习惯形成中", color: T.accent1, bg: T.accentBg1, border: T.accentBorder1 },
      { num: totalVideos || 0, label: "累计场景视频", hint: "场景输入总量", color: T.accent2, bg: T.accentBg2, border: T.accentBorder2 },
      { num: vocabCount || 0, label: "收藏词汇", hint: "你的表达库", color: T.accent3, bg: T.accentBg3, border: T.accentBorder3 },
    ];
    const cW = 208;
    const cH = 118;
    const cGap = 17;
    const cY = 220;

    stats.forEach((item, i) => {
      const x = 32 + i * (cW + cGap);
      // 卡片背景
      roundRect(ctx, x, cY, cW, cH, 20);
      ctx.fillStyle = item.bg;
      ctx.fill();
      ctx.strokeStyle = item.border;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 大数字
      ctx.font = "bold 48px sans-serif";
      ctx.fillStyle = item.color;
      ctx.fillText(String(item.num), x + 18, cY + 60);

      // 小标签 Chip
      const chipText = item.label;
      ctx.font = "bold 12px sans-serif";
      const chipW = ctx.measureText(chipText).width + 20;
      roundRect(ctx, x + 16, cY + 72, chipW, 24, 999);
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.fill();
      ctx.strokeStyle = item.border;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = item.color;
      ctx.textAlign = "left";
      ctx.fillText(chipText, x + 26, cY + 89);

      // hint 文字
      ctx.font = "500 13px sans-serif";
      ctx.fillStyle = T.inkMuted;
      ctx.fillText(item.hint, x + 18, cY + 108);
    });

    // ── 分隔线 ───────────────────────────────────────────────────────────────
    ctx.strokeStyle = T.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, 368);
    ctx.lineTo(W - 32, 368);
    ctx.stroke();

    // ── 今日计划区（对应 TodayPlan 风格） ────────────────────────────────────
    const trackedDoneCount = tasks.filter((t) => t.done).length;
    const pct = Math.round((trackedDoneCount / 2) * 100);

    // 区块标题行（带 Chip）
    roundRect(ctx, 32, 384, 38, 38, 13);
    ctx.fillStyle = "rgba(99,102,241,0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(99,102,241,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎯", 51, 409);
    ctx.textAlign = "left";

    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = T.inkPrimary;
    ctx.fillText("今天的学习计划", 82, 398);
    ctx.font = "500 13px sans-serif";
    ctx.fillStyle = T.inkFaint;
    ctx.fillText("前两项自动统计进度", 82, 416);

    // 已完成 chip
    const chipLabel = `已完成 ${trackedDoneCount}/2`;
    ctx.font = "bold 12px sans-serif";
    const chipLW = ctx.measureText(chipLabel).width + 22;
    roundRect(ctx, W - 32 - chipLW, 388, chipLW, 26, 999);
    ctx.fillStyle = "rgba(99,102,241,0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(99,102,241,0.20)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#3730a3";
    ctx.textAlign = "right";
    ctx.fillText(chipLabel, W - 32 - 11, 405);
    ctx.textAlign = "left";

    // 进度条
    const pbX = 32, pbY = 432, pbW = W - 64, pbH = 10;
    roundRect(ctx, pbX, pbY, pbW, pbH, 999);
    ctx.fillStyle = "rgba(15,23,42,0.07)";
    ctx.fill();
    if (pct > 0) {
      roundRect(ctx, pbX, pbY, (pbW * pct) / 100, pbH, 999);
      // 渐变进度条
      const progGrad = ctx.createLinearGradient(pbX, 0, pbX + pbW, 0);
      progGrad.addColorStop(0, "rgba(16,185,129,0.96)");
      progGrad.addColorStop(0.5, "rgba(79,70,229,0.96)");
      progGrad.addColorStop(1, "rgba(236,72,153,0.90)");
      ctx.fillStyle = progGrad;
      ctx.fill();
    }

    // 三条任务行（与 TaskRow 风格一致）
    const taskItems = [
      { label: "今天看 1 个场景视频", done: tasks[0]?.done, neutral: false },
      { label: "今天收藏 3 个词/表达", done: tasks[1]?.done, neutral: false },
      { label: "去游戏大厅做一轮练习", done: false, neutral: true },
    ];

    taskItems.forEach((item, idx) => {
      const ty = 458 + idx * 52;
      const rowH = 44;

      // 行背景
      roundRect(ctx, 32, ty, W - 64, rowH, 14);
      if (item.neutral) {
        ctx.fillStyle = "rgba(99,102,241,0.08)";
      } else if (item.done) {
        ctx.fillStyle = "rgba(16,185,129,0.08)";
      } else {
        ctx.fillStyle = "rgba(15,23,42,0.03)";
      }
      ctx.fill();
      ctx.strokeStyle = item.neutral
        ? "rgba(99,102,241,0.16)"
        : item.done
        ? "rgba(16,185,129,0.24)"
        : T.cardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 状态图标圆块
      const iconSize = 28;
      const iconX = 50;
      const iconY = ty + (rowH - iconSize) / 2;
      roundRect(ctx, iconX, iconY, iconSize, iconSize, 9);
      if (item.neutral) {
        ctx.fillStyle = "rgba(79,70,229,0.88)";
      } else if (item.done) {
        ctx.fillStyle = "rgba(16,185,129,1)";
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
      }
      ctx.fill();
      ctx.strokeStyle = item.neutral
        ? "rgba(79,70,229,0.26)"
        : item.done
        ? "rgba(16,185,129,0.26)"
        : "rgba(15,23,42,0.10)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = item.neutral || item.done ? "#fff" : T.inkFaint;
      ctx.textAlign = "center";
      ctx.fillText(item.neutral ? "→" : item.done ? "✓" : "•", iconX + iconSize / 2, iconY + iconSize / 2 + 5);
      ctx.textAlign = "left";

      // 任务文字
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = T.inkPrimary;
      ctx.fillText(item.label, iconX + iconSize + 12, ty + 27);

      // 右侧状态 chip（非 neutral）
      if (!item.neutral) {
        const stateLabel = item.done ? "已完成" : "进行中";
        ctx.font = "bold 11px sans-serif";
        const sw = ctx.measureText(stateLabel).width + 18;
        roundRect(ctx, W - 32 - sw - 8, ty + 11, sw, 22, 999);
        ctx.fillStyle = item.done ? "rgba(16,185,129,0.14)" : "rgba(99,102,241,0.10)";
        ctx.fill();
        ctx.strokeStyle = item.done ? "rgba(16,185,129,0.22)" : "rgba(99,102,241,0.18)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = item.done ? "#166534" : "#3730a3";
        ctx.textAlign = "right";
        ctx.fillText(stateLabel, W - 32 - 8 - 9, ty + 27);
        ctx.textAlign = "left";
      }
    });

    // ── 分隔线 ───────────────────────────────────────────────────────────────
    ctx.strokeStyle = T.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, 624);
    ctx.lineTo(W - 32, 624);
    ctx.stroke();

    // ── 月历区（对应 MonthCalendar 风格） ────────────────────────────────────
    // 区块标题
    roundRect(ctx, 32, 638, 38, 38, 13);
    ctx.fillStyle = "rgba(16,185,129,0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(16,185,129,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🗓️", 51, 663);
    ctx.textAlign = "left";

    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = T.inkPrimary;
    ctx.fillText("最近学习日历", 82, 652);
    ctx.font = "500 13px sans-serif";
    ctx.fillStyle = T.inkFaint;
    const calendarMonth = new Date();
    ctx.fillText(`${calendarMonth.getFullYear()}年 ${calendarMonth.getMonth() + 1}月`, 82, 670);

    // 日历表格
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const calendarCells = [];
    for (let i = 0; i < startWeekday; i++) calendarCells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      calendarCells.push({ day: d, key, count: heatmapData[key] || 0 });
    }
    while (calendarCells.length % 7 !== 0) calendarCells.push(null);

    // 星期表头（白色背景条）
    const calStartY = 686;
    const weekNames = ["日", "一", "二", "三", "四", "五", "六"];
    roundRect(ctx, 32, calStartY, W - 64, 30, 12);
    ctx.fillStyle = "rgba(248,250,252,0.96)";
    ctx.fill();
    ctx.strokeStyle = T.cardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    const colW = (W - 64) / 7;
    weekNames.forEach((w, i) => {
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = T.inkFaint;
      ctx.textAlign = "center";
      ctx.fillText(w, 32 + i * colW + colW / 2, calStartY + 20);
    });
    ctx.textAlign = "left";

    // 日历格
    const cellH = 48;
    const cellPad = 3;
    const todayKey = new Date().toISOString().slice(0, 10);

    calendarCells.forEach((cell, idx) => {
      const row = Math.floor(idx / 7);
      const col = idx % 7;
      const cx = 32 + col * colW + cellPad;
      const cy = calStartY + 32 + row * (cellH + cellPad);
      const cw = colW - cellPad * 2;
      const ch = cellH;

      roundRect(ctx, cx, cy, cw, ch, 10);

      if (!cell) {
        ctx.fillStyle = "rgba(248,250,252,0.5)";
        ctx.fill();
        return;
      }

      // 活跃程度颜色（与 getLevelStyle 一致）
      let cellFill, textColor;
      if (cell.count <= 0) {
        cellFill = T.cellEmpty;
        textColor = T.inkFaint;
      } else if (cell.count === 1) {
        cellFill = T.cellL1;
        textColor = "#166534";
      } else if (cell.count === 2) {
        cellFill = T.cellL2;
        textColor = "#166534";
      } else {
        cellFill = T.cellL3;
        textColor = T.cellTextL3;
      }

      ctx.fillStyle = cellFill;
      ctx.fill();
      ctx.strokeStyle = T.cellBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 今日高亮轮廓
      if (cell.key === todayKey) {
        roundRect(ctx, cx, cy, cw, ch, 10);
        ctx.strokeStyle = T.todayRing;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // 日期数字
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = textColor;
      ctx.textAlign = "left";
      ctx.fillText(String(cell.day), cx + 8, cy + 18);

      // 次数小 badge
      if (cell.count > 0) {
        const badgeW = 22, badgeH = 15;
        roundRect(ctx, cx + cw - badgeW - 4, cy + ch - badgeH - 4, badgeW, badgeH, 8);
        ctx.fillStyle = cell.count >= 3 ? "rgba(255,255,255,0.28)" : "rgba(22,101,52,0.12)";
        ctx.fill();
        ctx.font = "bold 10px sans-serif";
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.fillText(String(cell.count), cx + cw - badgeW / 2 - 4, cy + ch - 5);
        ctx.textAlign = "left";
      }
    });

    // ── 学习状态简析区 ────────────────────────────────────────────────────────
    const infoY = 1020;
    ctx.strokeStyle = T.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, infoY - 14);
    ctx.lineTo(W - 32, infoY - 14);
    ctx.stroke();

    // 四格小统计卡（对应分析区的 AnalysisCard）
    const miniCards = [
      { label: "活跃天数", value: `${activeDays || 0} 天`, bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.18)", color: "#047857" },
      { label: "收藏词汇", value: `${vocabCount || 0} 个`, bg: "rgba(236,72,153,0.10)", border: "rgba(236,72,153,0.16)", color: "#be185d" },
      { label: "偏好方向", value: topTopic ? (topTopic.length > 5 ? topTopic.slice(0, 5) + "…" : topTopic) : "继续学习", bg: "rgba(99,102,241,0.10)", border: "rgba(99,102,241,0.16)", color: "#3730a3" },
      { label: "连续天数", value: `${streakDays || 0} 天`, bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.20)", color: "#c2410c" },
    ];

    const miniW = (W - 64 - 30) / 4;
    miniCards.forEach((mc, i) => {
      const mx = 32 + i * (miniW + 10);
      const my = infoY;
      roundRect(ctx, mx, my, miniW, 72, 16);
      ctx.fillStyle = mc.bg;
      ctx.fill();
      ctx.strokeStyle = mc.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = mc.color;
      ctx.textAlign = "center";
      ctx.fillText(mc.value, mx + miniW / 2, my + 30);

      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = T.inkMuted;
      ctx.fillText(mc.label, mx + miniW / 2, my + 56);
      ctx.textAlign = "left";
    });

    // ── 底部品牌条（渐变暗色，与 ActionCard dark 风格一致） ──────────────────
    roundRect(ctx, 32, H - 78, W - 64, 56, 18);
    const footerGrad = ctx.createLinearGradient(32, 0, W - 32, 0);
    footerGrad.addColorStop(0, "#0f172a");
    footerGrad.addColorStop(0.48, "#312e81");
    footerGrad.addColorStop(1, "#ec4899");
    ctx.fillStyle = footerGrad;
    ctx.fill();

    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = T.footerText;
    ctx.textAlign = "center";
    ctx.fillText("🌐 nailaobao.top", W / 2, H - 52);
    ctx.font = "500 14px sans-serif";
    ctx.fillStyle = T.footerSub;
    ctx.fillText("油管英语场景库 · 场景输入 · 收藏沉淀 · 游戏练习", W / 2, H - 32);
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

  // ─── 入口卡片（与 ActionCard dark 风格一致） ─────────────────────────────────
  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* 触发卡片 —— 深色渐变，与页面中 dark ActionCard 保持一致 */}
      <div
        style={{
          padding: "20px 20px 18px",
          borderRadius: 22,
          background: "linear-gradient(135deg,#0f172a 0%,#312e81 48%,#ec4899 100%)",
          color: "#fff",
          boxShadow: "0 24px 60px rgba(79,70,229,0.24)",
        }}
      >
        <div style={{ fontSize: 26 }}>📸</div>
        <div style={{ fontSize: 15, fontWeight: 1000, marginTop: 10 }}>生成学习打卡海报</div>
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.7,
            marginTop: 6,
            color: "rgba(255,255,255,0.82)",
          }}
        >
          把连续天数、场景视频、收藏词汇和本月日历合成一张明亮手账风格的打卡图，随手分享。
        </div>
        <button
          onClick={() => generate()}
          disabled={generating}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "11px 0",
            borderRadius: 999,
            border: "none",
            background: generating ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.96)",
            color: generating ? "rgba(255,255,255,0.80)" : "#111827",
            fontSize: 14,
            fontWeight: 1000,
            cursor: generating ? "not-allowed" : "pointer",
            boxShadow: generating ? "none" : "0 14px 30px rgba(2,6,23,0.18)",
            transition: "all 200ms ease",
          }}
        >
          {generating ? "⏳ 生成中..." : "立即生成 →"}
        </button>
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: "rgba(255,255,255,0.60)",
            textAlign: "center",
          }}
        >
          共 {POSTER_THEMES.length} 种手账风格，每次可切换主题
        </div>
      </div>

      {/* 弹窗 Modal */}
      {showModal && posterUrl && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(11,18,32,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              // 手账页 Card 风格：白色圆角大卡
              background: "linear-gradient(180deg,rgba(255,255,255,0.98) 0%,rgba(255,255,255,0.94) 100%)",
              borderRadius: 28,
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 40px 120px rgba(15,23,42,0.18), 0 8px 30px rgba(15,23,42,0.08)",
              padding: "20px 18px",
              width: "100%",
              maxWidth: 500,
              maxHeight: "94vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxSizing: "border-box",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 1000, color: "#0b1220" }}>📸 今日打卡海报</div>
                <div style={{ fontSize: 12, color: "rgba(11,18,32,0.45)", marginTop: 4, fontWeight: 800 }}>
                  当前主题：{POSTER_THEMES[themeIdx].name}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: "1px solid rgba(15,23,42,0.12)",
                  background: "rgba(15,23,42,0.05)",
                  cursor: "pointer",
                  fontSize: 15,
                  color: "#64748b",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* 海报预览图 */}
            <img
              src={posterUrl}
              alt="打卡海报"
              style={{
                width: "100%",
                borderRadius: 18,
                display: "block",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 8px 30px rgba(15,23,42,0.10)",
                maxHeight: "58vh",
                objectFit: "contain",
              }}
            />

            {/* 提示文字 */}
            <div
              style={{
                fontSize: 12,
                color: "rgba(11,18,32,0.45)",
                textAlign: "center",
                fontWeight: 800,
                padding: "6px 0",
              }}
            >
              📱 手机长按保存 · 电脑点下方按钮下载
            </div>

            {/* 操作按钮 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={handleDownload}
                style={{
                  padding: "12px 0",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg,#0f172a,#4f46e5)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: "pointer",
                  boxShadow: "0 14px 30px rgba(79,70,229,0.22)",
                }}
              >
                ⬇️ 保存图片
              </button>
              <button
                onClick={handleSwitchTheme}
                style={{
                  padding: "12px 0",
                  borderRadius: 999,
                  border: "1.5px solid rgba(15,23,42,0.12)",
                  background: "rgba(255,255,255,0.90)",
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                🎨 换个风格
              </button>
            </div>

            {/* 主题指示点 */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              {POSTER_THEMES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === themeIdx ? 22 : 8,
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
