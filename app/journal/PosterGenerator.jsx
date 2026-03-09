"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../components/home/theme";

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

    const g1 = ctx.createRadialGradient(140, 200, 0, 140, 200, 320);
    g1.addColorStop(0, T.glow1);
    g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(620, 420, 0, 620, 420, 280);
    g2.addColorStop(0, T.glow2);
    g2.addColorStop(1, "transparent");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText("📒 我的英语手帐", 48, 70);

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    ctx.font = "500 22px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.50)";
    ctx.textAlign = "right";
    ctx.fillText(dateStr, W - 48, 70);
    ctx.textAlign = "left";

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, 92);
    ctx.lineTo(W - 48, 92);
    ctx.stroke();

    ctx.font = "500 18px sans-serif";
    ctx.fillStyle = T.accent;
    ctx.textAlign = "right";
    ctx.fillText(`✦ ${T.name}`, W - 48, 118);
    ctx.textAlign = "left";

    const userName = me?.email?.split("@")[0] || "学习者";
    ctx.font = "bold 42px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(`👋 ${userName}`, 48, 176);
    ctx.font = "500 24px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.64)";
    ctx.fillText("今日学习成果卡", 48, 214);

    const stats = [
      { num: streakDays || 0, label: "连续天数", color: "#fb923c" },
      { num: totalVideos || 0, label: "累计视频", color: T.accent },
      { num: vocabCount || 0, label: "收藏词汇", color: "#34d399" },
    ];
    const cW = 196;
    const cH = 110;
    const cGap = 21;
    const cY = 252;
    stats.forEach((item, i) => {
      const x = 48 + i * (cW + cGap);
      roundRect(ctx, x, cY, cW, cH, 18);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "bold 46px sans-serif";
      ctx.fillStyle = item.color;
      ctx.fillText(String(item.num), x + 18, cY + 62);

      ctx.font = "500 20px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.62)";
      ctx.fillText(item.label, x + 18, cY + 92);
    });

    const trackedDoneCount = tasks.filter((t) => t.done).length;

    const taskY = 408;
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(`🎯 今日自动统计 ${trackedDoneCount}/2`, 48, taskY);

    [
      { label: "今天看 1 个场景视频", done: tasks[0]?.done },
      { label: "今天收藏 3 个词/表达", done: tasks[1]?.done },
      { label: "去游戏大厅做一轮练习", done: false, neutral: true },
    ].forEach((item, idx) => {
      const y = taskY + 28 + idx * 44;
      roundRect(ctx, 48, y, W - 96, 36, 10);
      ctx.fillStyle = item.neutral
        ? "rgba(99,102,241,0.10)"
        : item.done
        ? "rgba(34,197,94,0.12)"
        : "rgba(255,255,255,0.05)";
      ctx.fill();
      ctx.strokeStyle = item.neutral
        ? "rgba(99,102,241,0.18)"
        : item.done
        ? "rgba(34,197,94,0.28)"
        : "rgba(255,255,255,0.08)";
      ctx.stroke();

      ctx.font = "500 20px sans-serif";
      ctx.fillStyle = item.neutral ? "#a5b4fc" : item.done ? "#4ade80" : "rgba(255,255,255,0.42)";
      ctx.fillText(item.neutral ? "→" : item.done ? "✓" : "○", 70, y + 24);

      ctx.fillStyle = item.neutral || item.done ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.42)";
      ctx.fillText(item.label, 104, y + 24);
    });

    const hmY = 598;
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText("🗓️ 最近学习日历", 48, hmY);

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
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(w, 48 + i * 92 + 34, hmY + 28);
    });

    const cellW = 86;
    const cellH = 58;
    const startX = 48;
    const startY = hmY + 42;
    const todayKey = new Date().toISOString().slice(0, 10);

    calendarCells.forEach((cell, idx) => {
      const row = Math.floor(idx / 7);
      const col = idx % 7;
      const x = startX + col * 92;
      const y = startY + row * 66;

      roundRect(ctx, x, y, cellW, cellH, 12);
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

      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = cell.count >= 3 ? "#ffffff" : "rgba(255,255,255,0.92)";
      ctx.fillText(String(cell.day), x + 10, y + 20);

      if (cell.count > 0) {
        roundRect(ctx, x + cellW - 34, y + cellH - 24, 24, 16, 8);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fill();
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(String(cell.count), x + cellW - 22, y + cellH - 12);
        ctx.textAlign = "left";
      }
    });

    const infoY = 1010;
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText("🧭 最近学习状态", 48, infoY);

    ctx.font = "500 22px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.76)";
    ctx.fillText(`累计活跃天数：${activeDays || 0} 天`, 48, infoY + 42);
    ctx.fillText(`最近偏好方向：${topTopic || "继续学习后会出现"}`, 48, infoY + 76);
    ctx.fillText(`收藏词汇总量：${vocabCount || 0} 个`, 48, infoY + 110);

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, H - 100);
    ctx.lineTo(W - 48, H - 100);
    ctx.stroke();

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textAlign = "center";
    ctx.fillText("🌐 nailaobao.top", W / 2, H - 60);
    ctx.font = "500 20px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.42)";
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
          padding: "18px 18px 16px",
          borderRadius: 22,
          background:
            "radial-gradient(circle at 10% 15%, rgba(236,72,153,0.18), transparent 32%), radial-gradient(circle at 90% 20%, rgba(99,102,241,0.22), transparent 34%), linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(79,70,229,0.96) 46%, rgba(236,72,153,0.88) 100%)",
          color: "#fff",
          boxShadow: "0 24px 60px rgba(79,70,229,0.22)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 1000 }}>打开海报生成器</div>
        <div style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.88, marginTop: 8 }}>
          把连续学习、累计视频、收藏词汇和学习日历缩略一起生成一张打卡海报。
        </div>
        <button
          onClick={() => generate()}
          disabled={generating}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "11px 0",
            borderRadius: 18,
            border: "none",
            background: generating ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.96)",
            color: generating ? "rgba(255,255,255,0.85)" : "#111827",
            fontSize: 14,
            fontWeight: 1000,
            cursor: generating ? "not-allowed" : "pointer",
            boxShadow: generating ? "none" : "0 16px 34px rgba(2,6,23,0.18)",
          }}
        >
          {generating ? "⏳ 生成中..." : "📸 打开海报生成器"}
        </button>
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.82 }}>共 {POSTER_THEMES.length} 种风格，每次可切换主题</div>
      </div>

      {showModal && posterUrl && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(2,6,23,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 28,
              padding: 20,
              width: "100%",
              maxWidth: 520,
              maxHeight: "96vh",
              overflowY: "auto",
              boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 1000, color: "#0f172a" }}>📸 今日打卡海报</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, fontWeight: 800 }}>
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
                  background: "rgba(15,23,42,0.06)",
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

            <img
              src={posterUrl}
              alt="打卡海报"
              style={{
                width: "100%",
                borderRadius: 18,
                display: "block",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                maxHeight: "60vh",
                objectFit: "contain",
              }}
            />

            <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", fontWeight: 800 }}>
              📱 手机长按保存 · 电脑点下方按钮下载
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={handleDownload}
                style={{
                  padding: "11px 0",
                  borderRadius: 16,
                  border: "none",
                  background: "linear-gradient(135deg,#0f172a,#4f46e5)",
                  color: "#fff",
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
                  padding: "11px 0",
                  borderRadius: 16,
                  border: "1.5px solid rgba(15,23,42,0.12)",
                  background: "rgba(15,23,42,0.04)",
                  color: "#475569",
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
                    width: i === themeIdx ? 22 : 8,
                    height: 8,
                    borderRadius: 999,
                    background: i === themeIdx ? "#4f46e5" : "rgba(15,23,42,0.15)",
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
