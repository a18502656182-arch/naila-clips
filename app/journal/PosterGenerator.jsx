"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../components/home/theme";

const POSTER_THEMES = [
  {
    name: "深夜极光",
    bg: ["#0f172a", "#1e1b4b", "#0f172a"],
    glow1: "rgba(99,102,241,0.38)",
    glow2: "rgba(236,72,153,0.28)",
    accent: "#818cf8",
    line: "#34d399",
    line2: "#818cf8",
    cellActive: ["rgba(34,197,94,0.30)", "rgba(34,197,94,0.65)", "rgba(34,197,94,0.95)"],
    todayOutline: "#818cf8",
  },
  {
    name: "日出橙金",
    bg: ["#1a0a00", "#3b1400", "#1a0800"],
    glow1: "rgba(251,146,60,0.40)",
    glow2: "rgba(234,179,8,0.28)",
    accent: "#fb923c",
    line: "#fbbf24",
    line2: "#f97316",
    cellActive: ["rgba(251,146,60,0.28)", "rgba(251,146,60,0.62)", "rgba(251,146,60,0.95)"],
    todayOutline: "#fbbf24",
  },
  {
    name: "深海青碧",
    bg: ["#001a1a", "#00282e", "#001518"],
    glow1: "rgba(6,182,212,0.38)",
    glow2: "rgba(16,185,129,0.28)",
    accent: "#22d3ee",
    line: "#34d399",
    line2: "#06b6d4",
    cellActive: ["rgba(6,182,212,0.28)", "rgba(6,182,212,0.62)", "rgba(6,182,212,0.95)"],
    todayOutline: "#34d399",
  },
];

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

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, T.bg[0]);
    bg.addColorStop(0.45, T.bg[1]);
    bg.addColorStop(1, T.bg[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const g1 = ctx.createRadialGradient(130, 150, 0, 130, 150, 330);
    g1.addColorStop(0, T.glow1);
    g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(620, 280, 0, 620, 280, 300);
    g2.addColorStop(0, T.glow2);
    g2.addColorStop(1, "transparent");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    const g3 = ctx.createRadialGradient(420, 1080, 0, 420, 1080, 360);
    g3.addColorStop(0, "rgba(255,255,255,0.05)");
    g3.addColorStop(1, "transparent");
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, W, H);

    roundRect(ctx, 22, 22, W - 44, H - 44, 34);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    roundRect(ctx, 34, 34, W - 68, 176, 28);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;

    ctx.font = "900 26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.fillText("英语手帐学习海报", 62, 82);

    ctx.font = "600 18px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.64)";
    ctx.fillText("Nailaobao Journal Poster", 62, 110);

    roundRect(ctx, W - 186, 56, 96, 34, 17);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fill();
    ctx.font = "800 15px sans-serif";
    ctx.fillStyle = T.accent;
    ctx.textAlign = "center";
    ctx.fillText(T.name, W - 138, 78);
    ctx.textAlign = "left";

    ctx.font = "500 18px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.58)";
    ctx.textAlign = "right";
    ctx.fillText(dateStr, W - 62, 120);
    ctx.textAlign = "left";

    const userName = me?.email?.split("@")[0] || "学习者";
    ctx.font = "900 44px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(userName, 62, 164);

    ctx.font = "500 21px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.74)";
    ctx.fillText("把今天的坚持，整理成一张会发光的学习记录。", 62, 194);

    const stats = [
      { num: streakDays || 0, label: "连续天数", color: "#fb923c" },
      { num: totalVideos || 0, label: "累计视频", color: T.accent },
      { num: vocabCount || 0, label: "收藏词汇", color: "#34d399" },
    ];

    const statsY = 238;
    const cardW = 204;
    const cardH = 118;
    const cardGap = 19;

    stats.forEach((item, i) => {
      const x = 54 + i * (cardW + cardGap);
      roundRect(ctx, x, statsY, cardW, cardH, 24);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      roundRect(ctx, x + 16, statsY + 14, 74, 28, 14);
      ctx.fill();

      ctx.font = "800 14px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.70)";
      ctx.fillText(item.label, x + 28, statsY + 33);

      ctx.font = "900 50px sans-serif";
      ctx.fillStyle = item.color;
      ctx.fillText(String(item.num), x + 18, statsY + 91);
    });

    const trackedDoneCount = tasks.filter((t) => t.done).length;

    const section1Y = 392;
    roundRect(ctx, 40, section1Y, W - 80, 182, 28);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "800 24px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText("今日任务进度", 60, section1Y + 40);

    roundRect(ctx, W - 184, section1Y + 18, 124, 36, 18);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fill();
    ctx.font = "800 17px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(`${trackedDoneCount}/2 已完成`, W - 122, section1Y + 42);
    ctx.textAlign = "left";

    [
      { label: "今天看 1 个场景视频", done: tasks[0]?.done },
      { label: "今天收藏 3 个词/表达", done: tasks[1]?.done },
      { label: "去游戏大厅做一轮练习", done: false, neutral: true },
    ].forEach((item, idx) => {
      const y = section1Y + 66 + idx * 36;
      roundRect(ctx, 58, y, W - 116, 26, 13);
      ctx.fillStyle = item.neutral
        ? "rgba(99,102,241,0.10)"
        : item.done
        ? "rgba(34,197,94,0.14)"
        : "rgba(255,255,255,0.05)";
      ctx.fill();
      ctx.strokeStyle = item.neutral
        ? "rgba(99,102,241,0.20)"
        : item.done
        ? "rgba(34,197,94,0.32)"
        : "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = "700 16px sans-serif";
      ctx.fillStyle = item.neutral ? "#a5b4fc" : item.done ? "#4ade80" : "rgba(255,255,255,0.50)";
      ctx.fillText(item.neutral ? "→" : item.done ? "✓" : "○", 74, y + 18);

      ctx.fillStyle = item.neutral || item.done ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.52)";
      ctx.fillText(item.label, 106, y + 18);
    });

    const hmY = 600;
    roundRect(ctx, 40, hmY, W - 80, 368, 28);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "800 24px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText("最近学习日历", 60, hmY + 40);

    ctx.font = "600 16px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.56)";
    ctx.fillText("亮度越高，表示当天学习越活跃。", 60, hmY + 66);

    const calendarMonth = new Date();
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

    const weekNames = ["日", "一", "二", "三", "四", "五", "六"];
    weekNames.forEach((w, i) => {
      ctx.font = "800 15px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.50)";
      ctx.textAlign = "center";
      ctx.fillText(w, 82 + i * 90, hmY + 104);
    });
    ctx.textAlign = "left";

    const cellW = 80;
    const cellH = 48;
    const startX = 50;
    const startY = hmY + 120;
    const todayKey = new Date().toISOString().slice(0, 10);

    calendarCells.forEach((cell, idx) => {
      const row = Math.floor(idx / 7);
      const col = idx % 7;
      const x = startX + col * 92;
      const y = startY + row * 56;

      roundRect(ctx, x, y, cellW, cellH, 14);
      if (!cell) {
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fill();
        return;
      }

      if (cell.count <= 0) {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
      } else if (cell.count === 1) {
        ctx.fillStyle = T.cellActive[0];
      } else if (cell.count === 2) {
        ctx.fillStyle = T.cellActive[1];
      } else {
        ctx.fillStyle = T.cellActive[2];
      }
      ctx.fill();

      if (cell.key === todayKey) {
        ctx.strokeStyle = T.todayOutline;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.font = "800 15px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(String(cell.day), x + 10, y + 18);

      if (cell.count > 0) {
        roundRect(ctx, x + cellW - 28, y + cellH - 20, 18, 12, 6);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fill();
        ctx.font = "800 10px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(String(cell.count), x + cellW - 19, y + cellH - 11);
        ctx.textAlign = "left";
      }
    });

    const infoY = 992;
    roundRect(ctx, 40, infoY, W - 80, 128, 28);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "800 24px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText("最近学习状态", 60, infoY + 40);

    ctx.font = "600 19px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillText(`累计活跃天数：${activeDays || 0} 天`, 60, infoY + 76);
    ctx.fillText(`最近偏好方向：${topTopic || "继续学习后会出现"}`, 60, infoY + 104);

    ctx.textAlign = "right";
    ctx.fillText(`收藏词汇总量：${vocabCount || 0} 个`, W - 60, infoY + 76);
    ctx.fillText(`已掌握词汇：${masteredCount || 0} 个`, W - 60, infoY + 104);
    ctx.textAlign = "left";

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, H - 94);
    ctx.lineTo(W - 60, H - 94);
    ctx.stroke();

    ctx.font = "900 26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.textAlign = "center";
    ctx.fillText("nailaobao.top", W / 2, H - 58);

    ctx.font = "600 18px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.48)";
    ctx.fillText("油管英语场景库 · 场景输入 · 收藏沉淀 · 游戏练习", W / 2, H - 30);
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

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "18px",
          borderRadius: 26,
          border: "1px solid rgba(99,102,241,0.14)",
          background:
            "radial-gradient(circle at 12% 18%, rgba(236,72,153,0.18), transparent 32%), radial-gradient(circle at 88% 18%, rgba(99,102,241,0.22), transparent 34%), radial-gradient(circle at 50% 120%, rgba(6,182,212,0.16), transparent 46%), linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.94) 100%)",
          boxShadow: "0 18px 60px rgba(15,23,42,0.08), 0 2px 10px rgba(15,23,42,0.04)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -88,
            right: -92,
            width: 220,
            height: 220,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.18), rgba(236,72,153,0.10), rgba(6,182,212,0.08), transparent 72%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(99,102,241,0.10)",
                  border: "1px solid rgba(99,102,241,0.12)",
                  color: "#4f46e5",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.02em",
                }}
              >
                📸 海报生成器
              </div>

              <div
                style={{
                  marginTop: 12,
                  fontSize: 18,
                  fontWeight: 1000,
                  color: THEME.colors.ink,
                  lineHeight: 1.35,
                }}
              >
                把你的英语手帐，整理成一张更适合分享的打卡海报
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  lineHeight: 1.8,
                  color: THEME.colors.muted,
                  maxWidth: 520,
                }}
              >
                自动整合连续学习、累计视频、收藏词汇、任务进度和学习日历，生成和手账页视觉一致的分享海报。
              </div>
            </div>

            <div
              style={{
                flexShrink: 0,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(70px, 1fr))",
                gap: 8,
                width: "100%",
                maxWidth: 270,
              }}
            >
              {[
                { label: "连续天数", value: streakDays || 0 },
                { label: "累计视频", value: totalVideos || 0 },
                { label: "词汇收藏", value: vocabCount || 0 },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 16,
                    border: "1px solid rgba(15,23,42,0.08)",
                    background: "rgba(255,255,255,0.76)",
                    textAlign: "center",
                    boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 1000, color: THEME.colors.ink, lineHeight: 1.1 }}>
                    {item.value}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10, fontWeight: 900, color: THEME.colors.faint }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 10,
            }}
          >
            <button
              onClick={() => generate()}
              disabled={generating}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 18,
                border: "none",
                background: generating
                  ? "linear-gradient(135deg, rgba(99,102,241,0.55), rgba(236,72,153,0.45))"
                  : "linear-gradient(135deg, rgba(15,23,42,1), rgba(79,70,229,0.96) 58%, rgba(236,72,153,0.88) 100%)",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 1000,
                cursor: generating ? "not-allowed" : "pointer",
                boxShadow: generating ? "none" : "0 18px 40px rgba(79,70,229,0.22)",
              }}
            >
              {generating ? "⏳ 生成中..." : "✨ 生成今日海报"}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: THEME.colors.faint,
                }}
              >
                共 {POSTER_THEMES.length} 种风格，可在预览弹窗中继续切换
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {POSTER_THEMES.map((item, i) => (
                  <div
                    key={item.name}
                    style={{
                      padding: "5px 8px",
                      borderRadius: 999,
                      border: i === themeIdx ? "1px solid rgba(99,102,241,0.22)" : "1px solid rgba(15,23,42,0.08)",
                      background: i === themeIdx ? "rgba(99,102,241,0.10)" : "rgba(255,255,255,0.76)",
                      color: i === themeIdx ? "#4f46e5" : THEME.colors.muted,
                      fontSize: 10,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && posterUrl && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(2,6,23,0.76)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 960,
              maxHeight: "96vh",
              overflow: "hidden",
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.14)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.42)",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid rgba(15,23,42,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 1000, color: "#0f172a" }}>📸 今日打卡海报</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: 800 }}>
                  当前主题：{POSTER_THEMES[themeIdx].name}
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  border: "1px solid rgba(15,23,42,0.10)",
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

            <div
              style={{
                padding: 16,
                overflowY: "auto",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                gap: 14,
              }}
            >
              <div
                style={{
                  borderRadius: 24,
                  padding: 12,
                  background:
                    "radial-gradient(circle at 12% 18%, rgba(236,72,153,0.10), transparent 32%), radial-gradient(circle at 88% 18%, rgba(99,102,241,0.12), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.92) 100%)",
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "0 18px 60px rgba(15,23,42,0.06)",
                }}
              >
                <img
                  src={posterUrl}
                  alt="打卡海报"
                  style={{
                    width: "100%",
                    display: "block",
                    borderRadius: 18,
                    border: "1px solid rgba(15,23,42,0.08)",
                    boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
                    maxHeight: "68vh",
                    objectFit: "contain",
                    background: "#ffffff",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 10,
                }}
              >
                <button
                  onClick={handleDownload}
                  style={{
                    padding: "13px 14px",
                    borderRadius: 16,
                    border: "none",
                    background: "linear-gradient(135deg, #0f172a, #4f46e5 70%, #ec4899)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 1000,
                    cursor: "pointer",
                    boxShadow: "0 16px 34px rgba(79,70,229,0.18)",
                  }}
                >
                  ⬇️ 保存图片
                </button>

                <button
                  onClick={handleSwitchTheme}
                  style={{
                    padding: "13px 14px",
                    borderRadius: 16,
                    border: "1px solid rgba(15,23,42,0.10)",
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

              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  textAlign: "center",
                  fontWeight: 800,
                  lineHeight: 1.7,
                }}
              >
                📱 手机长按保存 · 电脑点击按钮下载
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {POSTER_THEMES.map((item, i) => (
                  <div
                    key={item.name}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: i === themeIdx ? "1px solid rgba(99,102,241,0.20)" : "1px solid rgba(15,23,42,0.08)",
                      background: i === themeIdx ? "rgba(99,102,241,0.10)" : "rgba(255,255,255,0.88)",
                      color: i === themeIdx ? "#4f46e5" : "#64748b",
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PosterGenerator;
