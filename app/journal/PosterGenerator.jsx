"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../components/home/theme";

const POSTER_THEMES = [
  {
    name: "暗夜极光流",
    mode: "dark",
    bg: ["#0B101E", "#12152B", "#1A1230"],
    glowA: "rgba(99,102,241,0.42)",
    glowB: "rgba(236,72,153,0.28)",
    glowC: "rgba(34,211,238,0.22)",
    accent: "#8B5CF6",
    accent2: "#22D3EE",
    accent3: "#F472B6",
    heroGradient: ["#FFFFFF", "#C4B5FD", "#67E8F9"],
    glass: "rgba(255,255,255,0.08)",
    glassBorder: "rgba(255,255,255,0.18)",
    text: "#F8FAFC",
    subtext: "rgba(248,250,252,0.66)",
    micro: "rgba(248,250,252,0.45)",
    heatInactive: "rgba(255,255,255,0.10)",
    heatActive: ["#7C3AED", "#8B5CF6", "#22D3EE", "#A78BFA"],
    divider: "rgba(255,255,255,0.10)",
    badgeBg: "rgba(255,255,255,0.08)",
    panelShadow: "rgba(10,14,24,0.34)",
    buttonBg:
      "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(79,70,229,0.98) 54%, rgba(236,72,153,0.92) 100%)",
    buttonText: "#FFFFFF",
    buttonSubBg: "rgba(255,255,255,0.10)",
    buttonSubBorder: "rgba(255,255,255,0.14)",
  },
  {
    name: "晨雾玻璃拟态",
    mode: "light",
    bg: ["#F8FAFF", "#EEF2FF", "#FDF2F8"],
    glowA: "rgba(99,102,241,0.16)",
    glowB: "rgba(236,72,153,0.14)",
    glowC: "rgba(34,211,238,0.12)",
    accent: "#6D28D9",
    accent2: "#0891B2",
    accent3: "#DB2777",
    heroGradient: ["#111827", "#6D28D9", "#0891B2"],
    glass: "rgba(255,255,255,0.54)",
    glassBorder: "rgba(255,255,255,0.66)",
    text: "#111827",
    subtext: "rgba(17,24,39,0.66)",
    micro: "rgba(17,24,39,0.42)",
    heatInactive: "rgba(17,24,39,0.08)",
    heatActive: ["#C4B5FD", "#8B5CF6", "#22D3EE", "#6D28D9"],
    divider: "rgba(17,24,39,0.10)",
    badgeBg: "rgba(255,255,255,0.52)",
    panelShadow: "rgba(99,102,241,0.12)",
    buttonBg:
      "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(238,242,255,0.98) 52%, rgba(253,242,248,0.98) 100%)",
    buttonText: "#111827",
    buttonSubBg: "rgba(255,255,255,0.72)",
    buttonSubBorder: "rgba(17,24,39,0.08)",
  },
  {
    name: "薄暮霓虹雾",
    mode: "dark",
    bg: ["#0C1020", "#17192F", "#22132D"],
    glowA: "rgba(168,85,247,0.34)",
    glowB: "rgba(59,130,246,0.18)",
    glowC: "rgba(244,114,182,0.22)",
    accent: "#A855F7",
    accent2: "#60A5FA",
    accent3: "#F472B6",
    heroGradient: ["#FFFFFF", "#DDD6FE", "#F9A8D4"],
    glass: "rgba(255,255,255,0.07)",
    glassBorder: "rgba(255,255,255,0.16)",
    text: "#F8FAFC",
    subtext: "rgba(248,250,252,0.66)",
    micro: "rgba(248,250,252,0.45)",
    heatInactive: "rgba(255,255,255,0.10)",
    heatActive: ["#A855F7", "#C084FC", "#60A5FA", "#F472B6"],
    divider: "rgba(255,255,255,0.10)",
    badgeBg: "rgba(255,255,255,0.08)",
    panelShadow: "rgba(15,23,42,0.32)",
    buttonBg:
      "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(91,33,182,0.98) 56%, rgba(236,72,153,0.92) 100%)",
    buttonText: "#FFFFFF",
    buttonSubBg: "rgba(255,255,255,0.10)",
    buttonSubBorder: "rgba(255,255,255,0.14)",
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

  function drawGlassCard(ctx, x, y, w, h, radius, bgColor, borderColor) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 14;
    roundRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = bgColor;
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, radius);
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    const gloss = ctx.createLinearGradient(x, y, x, y + h);
    gloss.addColorStop(0, "rgba(255,255,255,0.20)");
    gloss.addColorStop(0.18, "rgba(255,255,255,0.08)");
    gloss.addColorStop(0.5, "rgba(255,255,255,0.02)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    roundRect(ctx, x + 1.5, y + 1.5, w - 3, h * 0.45, Math.max(8, radius - 2));
    ctx.fillStyle = gloss;
    ctx.fill();

    ctx.restore();
  }

  function fillGradientText(ctx, text, x, y, gradientColors, font, shadowColor) {
    ctx.save();
    ctx.font = font;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 34;
    const m = ctx.measureText(text);
    const grad = ctx.createLinearGradient(x, y - 120, x + m.width, y + 20);
    const stops = Math.max(gradientColors.length - 1, 1);
    gradientColors.forEach((c, i) => grad.addColorStop(i / stops, c));
    ctx.fillStyle = grad;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawSoftGlow(ctx, x, y, r, color, alpha = 1) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace(/[\d.]+\)$/g, `${alpha})`));
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  async function generate(forceTheme) {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 80));

    const nextTheme = forceTheme !== undefined ? forceTheme : (themeIdx + 1) % POSTER_THEMES.length;
    setThemeIdx(nextTheme);
    const T = POSTER_THEMES[nextTheme];

    const canvas = canvasRef.current;
    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const FONT_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif';

    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, T.bg[0]);
    bg.addColorStop(0.5, T.bg[1]);
    bg.addColorStop(1, T.bg[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const bg2 = ctx.createLinearGradient(W, 0, 0, H);
    bg2.addColorStop(0, "rgba(255,255,255,0.02)");
    bg2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bg2;
    ctx.fillRect(0, 0, W, H);

    drawSoftGlow(ctx, 190, 220, 420, T.glowA);
    drawSoftGlow(ctx, 910, 360, 360, T.glowB);
    drawSoftGlow(ctx, 760, 1460, 420, T.glowC);

    ctx.save();
    ctx.globalAlpha = T.mode === "light" ? 0.28 : 0.12;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.arc(80 + i * 82, 1600 + (i % 2) * 8, 1.6 + (i % 3) * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = T.mode === "light" ? "rgba(17,24,39,0.22)" : "rgba(255,255,255,0.35)";
      ctx.fill();
    }
    ctx.restore();

    const PAD = 86;
    const topY = 112;
    const brandX = PAD;
    const rightX = W - PAD;

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

    ctx.textAlign = "left";
    ctx.font = `700 32px ${FONT_STACK}`;
    ctx.fillStyle = T.subtext;
    ctx.fillText("ENGLISH JOURNAL", brandX, topY);

    ctx.font = `500 24px ${FONT_STACK}`;
    ctx.fillStyle = T.micro;
    ctx.fillText(dateStr, brandX, topY + 42);

    ctx.textAlign = "right";
    ctx.font = `700 28px ${FONT_STACK}`;
    ctx.fillStyle = T.subtext;
    ctx.fillText("语感重塑计划", rightX, topY + 6);

    ctx.font = `500 22px ${FONT_STACK}`;
    ctx.fillStyle = T.micro;
    ctx.fillText(T.name, rightX, topY + 42);

    ctx.textAlign = "left";
    ctx.font = `700 54px ${FONT_STACK}`;
    ctx.fillStyle = T.text;
    ctx.fillText("「每一句真实的表达，都在成为我的语境」", PAD, 278);

    const userName = me?.email?.split("@")[0] || "学习者";
    ctx.font = `600 28px ${FONT_STACK}`;
    ctx.fillStyle = T.subtext;
    ctx.fillText(`${userName} 的英语打卡海报`, PAD, 330);

    const heroValue = streakDays || 0;
    const heroTitle = "Day";
    let heroComment = "今天也在为语感积累真实输入";
    if (heroValue > 30) heroComment = "你的表达库已经初具规模";
    else if (heroValue > 14) heroComment = "持续输入，开始形成自己的英语节奏";
    else if (heroValue > 7) heroComment = "正在养成稳定的语感习惯";

    ctx.textAlign = "left";
    fillGradientText(
      ctx,
      String(heroValue),
      PAD,
      612,
      T.heroGradient,
      `900 232px ${FONT_STACK}`,
      T.mode === "light" ? "rgba(109,40,217,0.16)" : "rgba(139,92,246,0.22)"
    );

    ctx.font = `800 52px ${FONT_STACK}`;
    ctx.fillStyle = T.text;
    ctx.fillText(heroTitle, PAD + 24, 674);

    ctx.font = `700 34px ${FONT_STACK}`;
    ctx.fillStyle = T.subtext;
    ctx.fillText("连续沉浸", PAD + 170, 674);

    ctx.font = `600 32px ${FONT_STACK}`;
    ctx.fillStyle = T.micro;
    ctx.fillText(heroComment, PAD, 736);

    ctx.save();
    ctx.textAlign = "right";
    drawGlassCard(ctx, W - PAD - 244, 438, 244, 244, 42, T.glass, T.glassBorder);
    ctx.font = `700 22px ${FONT_STACK}`;
    ctx.fillStyle = T.micro;
    ctx.fillText("核心成就", W - PAD - 36, 486);
    ctx.font = `900 92px ${FONT_STACK}`;
    ctx.fillStyle = T.text;
    ctx.fillText(String(vocabCount || 0), W - PAD - 36, 588);
    ctx.font = `700 28px ${FONT_STACK}`;
    ctx.fillStyle = T.subtext;
    ctx.fillText("收藏词汇", W - PAD - 36, 634);
    ctx.restore();

    const statCardY = 804;
    drawGlassCard(ctx, PAD, statCardY, W - PAD * 2, 286, 48, T.glass, T.glassBorder);

    ctx.font = `700 24px ${FONT_STACK}`;
    ctx.fillStyle = T.micro;
    ctx.fillText("核心数据切片", PAD + 34, statCardY + 48);

    const statCols = [
      { label: "累计视频", value: totalVideos || 0, accent: T.accent2 },
      { label: "收藏词汇", value: vocabCount || 0, accent: T.accent },
      { label: "活跃天数", value: activeDays || 0, accent: T.accent3 },
    ];

    const innerX = PAD + 34;
    const innerY = statCardY + 86;
    const innerW = W - PAD * 2 - 68;
    const colW = innerW / 3;

    statCols.forEach((item, i) => {
      const x = innerX + i * colW;
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(x, innerY + 4);
        ctx.lineTo(x, innerY + 126);
        ctx.strokeStyle = T.divider;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fillStyle = item.accent;
      ctx.beginPath();
      ctx.arc(x + 28, innerY + 24, 8, 0, Math.PI * 2);
      ctx.shadowColor = item.accent;
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = `700 24px ${FONT_STACK}`;
      ctx.fillStyle = T.subtext;
      ctx.fillText(item.label, x + 48, innerY + 32);

      ctx.font = `900 86px ${FONT_STACK}`;
      ctx.fillStyle = T.text;
      ctx.fillText(String(item.value), x + 10, innerY + 126);
    });

    const heatCardY = 1142;
    drawGlassCard(ctx, PAD, heatCardY, W - PAD * 2, 458, 48, T.glass, T.glassBorder);

    ctx.font = `700 24px ${FONT_STACK}`;
    ctx.fillStyle = T.micro;
    ctx.fillText("近 30 天学习图谱", PAD + 34, heatCardY + 48);

    ctx.font = `600 24px ${FONT_STACK}`;
    ctx.fillStyle = T.subtext;
    ctx.fillText("亮点越多，说明最近的输入频率越稳定。", PAD + 34, heatCardY + 88);

    const today = new Date();
    const recentDays = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      recentDays.push({
        key,
        count: heatmapData?.[key] || 0,
      });
    }

    const cols = 6;
    const rows = 5;
    const dotGapX = 146;
    const dotGapY = 78;
    const dotR = 22;
    const baseX = PAD + 74;
    const baseY = heatCardY + 170;

    recentDays.forEach((item, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const snakeCol = row % 2 === 0 ? col : cols - 1 - col;
      const x = baseX + snakeCol * dotGapX;
      const y = baseY + row * dotGapY;

      const level = Math.max(0, Math.min(3, item.count > 0 ? Math.ceil(item.count) : 0));
      const color = level === 0 ? T.heatInactive : T.heatActive[level - 1];

      if (idx > 0) {
        const prev = recentDays[idx - 1];
        const prevRow = Math.floor((idx - 1) / cols);
        const prevColRaw = (idx - 1) % cols;
        const prevSnakeCol = prevRow % 2 === 0 ? prevColRaw : cols - 1 - prevColRaw;
        const px = baseX + prevSnakeCol * dotGapX;
        const py = baseY + prevRow * dotGapY;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.strokeStyle = level > 0 || (prev.count || 0) > 0 ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      ctx.save();
      if (level > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 26;
      }
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      if (level > 0) {
        ctx.beginPath();
        ctx.arc(x - 7, y - 8, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fill();
      }
    });

    drawGlassCard(
      ctx,
      W - PAD - 266,
      heatCardY + 292,
      232,
      114,
      28,
      T.badgeBg,
      T.glassBorder
    );
    ctx.textAlign = "center";
    ctx.font = `700 20px ${FONT_STACK}`;
    ctx.fillStyle = T.micro;
    ctx.fillText("最近偏好方向", W - PAD - 150, heatCardY + 332);
    ctx.font = `800 28px ${FONT_STACK}`;
    ctx.fillStyle = T.text;
    ctx.fillText(topTopic || "继续学习后会出现", W - PAD - 150, heatCardY + 382);
    ctx.textAlign = "left";

    ctx.beginPath();
    ctx.moveTo(PAD, 1710);
    ctx.lineTo(W - PAD, 1710);
    ctx.strokeStyle = T.divider;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = `900 34px ${FONT_STACK}`;
    ctx.fillStyle = T.text;
    ctx.fillText("nailaobao.top", W / 2, 1788);

    ctx.font = `600 22px ${FONT_STACK}`;
    ctx.fillStyle = T.subtext;
    ctx.fillText("看油管学英语 · 真实场景输入 · 沉淀专属表达库", W / 2, 1832);

    roundRect(ctx, W / 2 - 116, 1862, 232, 26, 13);
    ctx.fillStyle = T.mode === "light" ? "rgba(17,24,39,0.05)" : "rgba(255,255,255,0.05)";
    ctx.fill();

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
          borderRadius: 28,
          padding: 18,
          border: "1px solid rgba(99,102,241,0.12)",
          background:
            "radial-gradient(circle at 12% 18%, rgba(236,72,153,0.16), transparent 30%), radial-gradient(circle at 88% 18%, rgba(99,102,241,0.18), transparent 32%), radial-gradient(circle at 75% 100%, rgba(34,211,238,0.12), transparent 36%), linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.95) 100%)",
          boxShadow: "0 26px 70px rgba(15,23,42,0.08), 0 6px 24px rgba(15,23,42,0.04)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -72,
            top: -84,
            width: 220,
            height: 220,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 32% 32%, rgba(99,102,241,0.18), rgba(236,72,153,0.12), rgba(34,211,238,0.10), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  borderRadius: 999,
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.10)",
                  color: "#4f46e5",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                }}
              >
                SOCIAL POSTER MAKER
              </div>

              <div
                style={{
                  marginTop: 12,
                  fontSize: 24,
                  lineHeight: 1.35,
                  fontWeight: 1000,
                  color: THEME.colors.ink,
                }}
              >
                把英语手账变成一张
                <br />
                真正让人想发朋友圈的海报
              </div>

              <div
                style={{
                  marginTop: 10,
                  maxWidth: 560,
                  fontSize: 13,
                  lineHeight: 1.85,
                  color: THEME.colors.muted,
                }}
              >
                这次不是罗列表格，而是把“连续打卡”和“学习沉淀”变成真正有分享欲的主视觉海报。
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {POSTER_THEMES.map((item, i) => (
                <div
                  key={item.name}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: i === themeIdx ? "1px solid rgba(99,102,241,0.18)" : "1px solid rgba(15,23,42,0.08)",
                    background: i === themeIdx ? "rgba(99,102,241,0.10)" : "rgba(255,255,255,0.78)",
                    color: i === themeIdx ? "#4f46e5" : THEME.colors.muted,
                    fontSize: 11,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.name}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 24,
              padding: 14,
              background:
                "radial-gradient(circle at 18% 18%, rgba(236,72,153,0.18), transparent 30%), radial-gradient(circle at 82% 18%, rgba(99,102,241,0.22), transparent 30%), linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(79,70,229,0.98) 54%, rgba(236,72,153,0.92) 100%)",
              color: "#fff",
              boxShadow: "0 22px 56px rgba(79,70,229,0.22)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                opacity: 0.82,
                letterSpacing: "0.08em",
              }}
            >
              今日海报生成器
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 18,
                lineHeight: 1.45,
                fontWeight: 1000,
              }}
            >
              放大你的连续学习成果，
              <br />
              一键生成 9:16 打卡海报
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              {[
                { label: "连续", value: streakDays || 0 },
                { label: "视频", value: totalVideos || 0 },
                { label: "词汇", value: vocabCount || 0 },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 1000, lineHeight: 1.1 }}>{item.value}</div>
                  <div style={{ marginTop: 4, fontSize: 10, opacity: 0.76, fontWeight: 900 }}>{item.label}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => generate()}
              disabled={generating}
              style={{
                marginTop: 14,
                width: "100%",
                padding: "14px 16px",
                borderRadius: 18,
                border: "none",
                background: generating ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.96)",
                color: generating ? "rgba(255,255,255,0.82)" : "#111827",
                fontSize: 14,
                fontWeight: 1000,
                cursor: generating ? "not-allowed" : "pointer",
                boxShadow: generating ? "none" : "0 18px 38px rgba(2,6,23,0.18)",
              }}
            >
              {generating ? "⏳ 生成中..." : "✨ 生成社交感海报"}
            </button>

            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                lineHeight: 1.7,
                opacity: 0.82,
                fontWeight: 800,
              }}
            >
              1080 × 1920 高清比例 · 可切换 {POSTER_THEMES.length} 套主题
            </div>
          </div>
        </div>
      </div>

      {showModal &&
        posterUrl &&
        createPortal(
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
              padding: 10,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 1080,
                maxHeight: "96vh",
                overflow: "hidden",
                borderRadius: 28,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
                boxShadow: "0 40px 120px rgba(0,0,0,0.46)",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 280px",
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderRight: "1px solid rgba(15,23,42,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
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
                    borderRadius: 22,
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
                      boxShadow: "0 12px 34px rgba(15,23,42,0.12)",
                      maxHeight: "80vh",
                      objectFit: "contain",
                      background: "#ffffff",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  background: "rgba(255,255,255,0.82)",
                }}
              >
                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid rgba(15,23,42,0.08)",
                    background: "rgba(255,255,255,0.88)",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 1000, color: "#0f172a" }}>分享感说明</div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      lineHeight: 1.8,
                      color: "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    海报会自动放大你的连续沉浸成果，并用更适合社交分享的视觉结构展示近 30 天学习图谱。
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  style={{
                    padding: "14px 14px",
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
                    padding: "14px 14px",
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

                <div
                  style={{
                    padding: 12,
                    borderRadius: 18,
                    border: "1px solid rgba(99,102,241,0.08)",
                    background: "rgba(99,102,241,0.05)",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
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

                <div
                  style={{
                    marginTop: "auto",
                    fontSize: 12,
                    color: "#64748b",
                    textAlign: "center",
                    fontWeight: 800,
                    lineHeight: 1.7,
                  }}
                >
                  📱 手机长按保存 · 电脑点击按钮下载
                </div>
              </div>
            </div>

            <style>{`
              @media (max-width: 900px) {
                .__pg_dummy {}
              }
            `}</style>
          </div>,
          document.body
        )}

      <style>{`
        @media (max-width: 900px) {
          .poster-generator-mobile-fix {
            display:block;
          }
        }
        @media (max-width: 900px) {
          div[style*="grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr)"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: minmax(0, 1fr) 280px"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="border-right: 1px solid rgba(15,23,42,0.08)"] {
            border-right: none !important;
            border-bottom: 1px solid rgba(15,23,42,0.08) !important;
          }
        }
      `}</style>
    </div>
  );
}

export default PosterGenerator;
