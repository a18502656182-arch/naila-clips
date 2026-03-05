"use client";
import { useState, useEffect, useRef } from "react";
import { THEME } from "../components/home/theme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

function getToken() {
  try { return localStorage.getItem("sb_access_token") || null; } catch { return null; }
}
function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

function formatDate() {
  const now = new Date();
  const days = ["日","一","二","三","四","五","六"];
  return `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 · 周${days[now.getDay()]}`;
}

function playWord(term) {
  const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(term)}&type=2`);
  audio.onerror = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(term);
    u.lang = "en-US"; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };
  audio.play().catch(() => {});
}

function Card({ children, style = {}, tone = "default" }) {
  return (
    <div style={{
      position: "relative",
      borderRadius: 22,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.82) 100%)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      padding: 18,
      boxShadow: "0 18px 60px rgba(2,6,23,0.10), 0 2px 10px rgba(2,6,23,0.06)",
      overflow: "hidden",
      ...style,
    }}>
      <div aria-hidden style={{
        position: "absolute", top: -120, right: -140,
        width: 280, height: 280, borderRadius: 999,
        background: "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.22), rgba(236,72,153,0.12), rgba(14,165,233,0.10), transparent 70%)",
        filter: "blur(2px)", pointerEvents: "none",
      }} />
      {children}
    </div>
  );
}

function SectionTitle({ emoji, title, sub, right }) {
  return (
    <div style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 12,
            display: "grid", placeItems: "center",
            background: "linear-gradient(135deg, rgba(99,102,241,0.20), rgba(236,72,153,0.14), rgba(14,165,233,0.10))",
            border: "1px solid rgba(99,102,241,0.18)",
            boxShadow: "0 10px 25px rgba(99,102,241,0.10)",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 18 }}>{emoji}</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 950, color: THEME.colors.ink, letterSpacing: "-0.2px" }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 3 }}>{sub}</div>}
          </div>
        </div>
      </div>
      {right ? <div style={{ marginTop: 2 }}>{right}</div> : null}
    </div>
  );
}

// ── 今日任务 ──────────────────────────────────────────────
function TodayTasks({ tasks }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const allDone = tasks.every(t => t.done);
  const doneCount = tasks.filter(t => t.done).length;
  const pct = Math.round((doneCount / tasks.length) * 100);

  useEffect(() => { if (allDone) setShowConfetti(true); }, [allDone]);

  return (
    <Card>
      <SectionTitle emoji="🎯" title="今日手帐任务"
        sub={`自动打卡 · 已完成 ${doneCount} / ${tasks.length}（${pct}%）`}
        right={
          <div style={{ fontSize: 11, padding: "6px 10px", borderRadius: 999,
            border: "1px solid rgba(99,102,241,0.18)",
            background: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(236,72,153,0.08))",
            color: THEME.colors.muted, fontWeight: 800, whiteSpace: "nowrap" }}>
            ✅ 自动判定
          </div>
        }
      />
      <div style={{ marginBottom: 14 }}>
        <div style={{ height: 10, borderRadius: 999, background: "rgba(15,23,42,0.06)", overflow: "hidden", border: "1px solid rgba(15,23,42,0.06)" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999,
            background: "linear-gradient(90deg, rgba(34,197,94,0.95), rgba(99,102,241,0.95), rgba(236,72,153,0.90))",
            boxShadow: "0 10px 20px rgba(99,102,241,0.18)",
            transition: "width 600ms cubic-bezier(.2,.9,.2,1)" }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tasks.map((task, i) => (
          <div key={i} style={{
            position: "relative", display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", borderRadius: 18,
            background: task.done ? "rgba(34,197,94,0.07)" : "rgba(15,23,42,0.03)",
            border: `1px solid ${task.done ? "rgba(34,197,94,0.22)" : "rgba(15,23,42,0.08)"}`,
            boxShadow: task.done ? "0 10px 24px rgba(34,197,94,0.10)" : "none",
            transform: task.done ? "translateY(-1px)" : "none",
            transition: "all 220ms ease", overflow: "hidden",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 10,
              background: task.done ? "linear-gradient(135deg, rgba(34,197,94,1), rgba(22,163,74,1))" : "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))",
              border: `1px solid ${task.done ? "rgba(34,197,94,0.45)" : "rgba(15,23,42,0.10)"}`,
              display: "grid", placeItems: "center",
              boxShadow: task.done ? "0 14px 30px rgba(34,197,94,0.22)" : "0 10px 22px rgba(2,6,23,0.06)",
              flexShrink: 0,
            }}>
              {task.done
                ? <span style={{ color: "#fff", fontSize: 16, fontWeight: 900 }}>✓</span>
                : <span style={{ width: 12, height: 12, borderRadius: 4, border: "2px dashed rgba(15,23,42,0.18)" }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: task.done ? "#166534" : THEME.colors.ink }}>{task.label}</div>
              <div style={{ fontSize: 12, color: task.done ? "rgba(22,101,52,0.78)" : THEME.colors.faint, marginTop: 3 }}>
                {task.done ? task.doneText : task.pendingText}
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, padding: "6px 10px", borderRadius: 999,
              background: task.done ? "rgba(34,197,94,0.14)" : "rgba(99,102,241,0.10)",
              border: `1px solid ${task.done ? "rgba(34,197,94,0.20)" : "rgba(99,102,241,0.18)"}`,
              color: task.done ? "#166534" : THEME.colors.accent, whiteSpace: "nowrap" }}>
              {task.done ? "已打卡 ⭐" : "进行中"}
            </div>
          </div>
        ))}
      </div>
      {allDone && showConfetti && (
        <div style={{ marginTop: 14 }}>
          <div style={{ borderRadius: 18, border: "1px solid rgba(245,158,11,0.25)",
            background: "linear-gradient(135deg, rgba(254,249,195,0.90), rgba(220,252,231,0.85), rgba(219,234,254,0.85))",
            padding: "14px 14px 12px", textAlign: "center", overflow: "hidden", position: "relative" }}>
            <div className="confettiWrap" aria-hidden>
              {Array.from({ length: 26 }).map((_, idx) => <i key={idx} className="confettiPiece" />)}
            </div>
            <div style={{ fontSize: 26 }}>🎉</div>
            <div style={{ fontSize: 15, fontWeight: 950, color: "#854d0e", marginTop: 6 }}>今日目标全部完成！</div>
            <div style={{ fontSize: 12, color: "#b45309", marginTop: 4, fontWeight: 700 }}>你不是在学英语，你是在变强 💪</div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── 热力图 ────────────────────────────────────────────────
function Heatmap({ heatmapData, streakDays, totalVideos }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: heatmapData[key] || 0, d });
  }
  const pad = (days[0].d.getDay() + 6) % 7;
  const padded = [...Array(pad).fill(null), ...days];
  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const first = week.find(d => d);
    if (first && new Date(first.date).getDate() <= 7)
      monthLabels.push({ wi, label: `${new Date(first.date).getMonth()+1}月` });
  });
  function getColor(count) {
    if (count === 0) return "rgba(15,23,42,0.08)";
    if (count === 1) return "rgba(34,197,94,0.25)";
    if (count === 2) return "rgba(34,197,94,0.60)";
    return "rgba(22,163,74,0.95)";
  }
  const todayKey = today.toISOString().slice(0, 10);
  const activeDays = Object.keys(heatmapData).length;

  return (
    <Card>
      <SectionTitle emoji="🔥" title="学习足迹" sub="每一个格子都在告诉你：你在前进" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { num: streakDays, label: "连续天数", hint: "别断，断了会难受", chip: "🔥", bg: "linear-gradient(135deg, rgba(251,146,60,0.20), rgba(251,146,60,0.06))", border: "rgba(251,146,60,0.22)", color: "#c2410c" },
          { num: totalVideos, label: "累计视频", hint: "看得越多越不怕", chip: "🎬", bg: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(99,102,241,0.06))", border: "rgba(99,102,241,0.18)", color: "#3730a3" },
          { num: activeDays, label: "活跃天数", hint: "打开一次就赢一次", chip: "📅", bg: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))", border: "rgba(16,185,129,0.18)", color: "#065f46" },
        ].map((s, i) => (
          <div key={i} style={{ borderRadius: 18, padding: "12px 10px", border: `1px solid ${s.border}`, background: s.bg, boxShadow: "0 10px 26px rgba(2,6,23,0.06)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 26, fontWeight: 950, color: s.color, letterSpacing: "-0.6px", lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,0.70)", border: "1px solid rgba(15,23,42,0.08)", fontWeight: 900 }}>{s.chip}</div>
            </div>
            <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 900, marginTop: 6 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: THEME.colors.faint, marginTop: 2 }}>{s.hint}</div>
          </div>
        ))}
      </div>
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
          {weeks.map((week, wi) => {
            const ml = monthLabels.find(m => m.wi === wi);
            return <div key={wi} style={{ width: 14, fontSize: 9, color: THEME.colors.faint, textAlign: "center", flexShrink: 0 }}>{ml ? ml.label : ""}</div>;
          })}
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {week.map((day, di) => (
                <div key={di}
                  title={day ? `${day.date}：${day.count > 0 ? `${day.count} 个视频` : "未学习"}` : ""}
                  style={{ width: 14, height: 14, borderRadius: 5,
                    background: day ? getColor(day.count) : "transparent",
                    border: day ? "1px solid rgba(15,23,42,0.06)" : "none",
                    boxShadow: day && day.count > 0 ? "0 6px 14px rgba(34,197,94,0.12)" : "none",
                    outline: day?.date === todayKey ? `2px solid ${THEME.colors.accent}` : "none",
                    outlineOffset: 2, transition: "transform 120ms ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.10)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 800 }}>今日格子高亮 · 绿色越深表示学习越多</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: THEME.colors.faint }}>少</span>
          {["rgba(15,23,42,0.08)","rgba(34,197,94,0.25)","rgba(34,197,94,0.60)","rgba(22,163,74,0.95)"].map((c,i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: 4, background: c, border: "1px solid rgba(15,23,42,0.06)" }} />
          ))}
          <span style={{ fontSize: 10, color: THEME.colors.faint }}>多</span>
        </div>
      </div>
      {streakDays >= 3 && (
        <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 18,
          background: "linear-gradient(135deg, rgba(255,247,237,0.95), rgba(254,249,195,0.95))",
          border: "1px solid rgba(251,146,60,0.25)", fontSize: 13, color: "#9a3412", fontWeight: 800 }}>
          🔥 已连续学习 {streakDays} 天：你已经把"坚持"变成了习惯。
        </div>
      )}
    </Card>
  );
}

// ── 能力画像 ──────────────────────────────────────────────
function AbilityProfile({ masteryStats, topicStats }) {
  const total = masteryStats.new + masteryStats.learning + masteryStats.mastered;
  const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
  const pM = pct(masteryStats.mastered);
  const pL = pct(masteryStats.learning);
  const pN = Math.max(0, 100 - pM - pL);
  const levelMessages = [
    { min: 0, max: 0, msg: "还没开始，去收藏第一个词汇吧！", emoji: "🌱" },
    { min: 1, max: 10, msg: "刚刚起步，继续积累～", emoji: "🌿" },
    { min: 11, max: 30, msg: "小有积累，保持节奏！", emoji: "🌳" },
    { min: 31, max: 99, msg: "词汇量不少了，继续冲！", emoji: "🚀" },
    { min: 100, max: Infinity, msg: "词汇达人！你太厉害了！", emoji: "👑" },
  ];
  const lvl = levelMessages.find(l => total >= l.min && total <= l.max) || levelMessages[0];
  const donutBg = total === 0
    ? "conic-gradient(rgba(15,23,42,0.08) 0 360deg)"
    : `conic-gradient(rgba(34,197,94,0.95) 0 ${pM}%, rgba(59,130,246,0.95) ${pM}% ${pM+pL}%, rgba(168,85,247,0.95) ${pM+pL}% 100%)`;

  return (
    <Card>
      <SectionTitle emoji="🪐" title="我的能力画像" sub="看得见的积累，才会让人上瘾" />
      {total === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
          <div style={{ fontSize: 46 }}>🌌</div>
          <div style={{ fontSize: 14, color: THEME.colors.muted, marginTop: 8, fontWeight: 900 }}>你的宇宙还是空的</div>
          <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 6 }}>去视频页收藏一些词汇，这里会自动生成你的成长轨迹～</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 12, alignItems: "stretch", marginBottom: 12 }}>
            <div style={{ borderRadius: 20, padding: "14px 14px",
              border: "1px solid rgba(99,102,241,0.16)",
              background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.08), rgba(14,165,233,0.06))",
              boxShadow: "0 16px 40px rgba(99,102,241,0.10)",
              display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 34, lineHeight: 1 }}>{lvl.emoji}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 950, color: THEME.colors.ink }}>{lvl.msg}</div>
                <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 4, fontWeight: 800 }}>词汇库共 <span style={{ color: THEME.colors.ink }}>{total}</span> 个</div>
                <div style={{ fontSize: 11, color: THEME.colors.faint, marginTop: 3 }}>已掌握 {masteryStats.mastered} · 学习中 {masteryStats.learning} · 新收藏 {masteryStats.new}</div>
              </div>
            </div>
            <div style={{ borderRadius: 20, padding: 12,
              border: "1px solid rgba(15,23,42,0.10)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,0.55))",
              display: "grid", placeItems: "center" }}>
              <div style={{ position: "relative", width: 128, height: 128 }}>
                <div style={{ width: 128, height: 128, borderRadius: 999, background: donutBg, boxShadow: "0 18px 40px rgba(2,6,23,0.10)", border: "1px solid rgba(15,23,42,0.10)" }} />
                <div style={{ position: "absolute", inset: 14, borderRadius: 999,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))",
                  display: "grid", placeItems: "center", border: "1px solid rgba(15,23,42,0.06)" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 950, color: THEME.colors.ink }}>{pct(masteryStats.mastered)}%</div>
                    <div style={{ fontSize: 11, color: THEME.colors.faint, fontWeight: 800 }}>已掌握</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {[
                  { c: "rgba(34,197,94,0.95)", t: `已掌握 ${pM}%` },
                  { c: "rgba(59,130,246,0.95)", t: `学习中 ${pL}%` },
                  { c: "rgba(168,85,247,0.95)", t: `新收藏 ${pN}%` },
                ].map((x, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: THEME.colors.muted, fontWeight: 800 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: x.c }} />{x.t}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {masteryStats.new > 0 && (
            <div style={{ padding: "12px 14px", borderRadius: 18,
              background: "linear-gradient(135deg, rgba(255,251,235,0.95), rgba(254,242,242,0.65))",
              border: "1px solid rgba(245,158,11,0.22)", fontSize: 12, color: "#92400e", fontWeight: 800, marginBottom: 12 }}>
              💡 还有 <strong>{masteryStats.new}</strong> 个词在等你练：去收藏页完成一次词汇考试，会自动升级掌握度。
            </div>
          )}
          {topicStats.length > 0 && (
            <div style={{ marginTop: 2 }}>
              <div style={{ fontSize: 12, fontWeight: 950, color: THEME.colors.muted, marginBottom: 10 }}>🏷️ 你的话题偏好（自动统计）</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {topicStats.map((t, i) => (
                  <span key={i} style={{ fontSize: 12, padding: "7px 12px", borderRadius: 999,
                    background: i===0 ? "linear-gradient(135deg, rgba(99,102,241,0.20), rgba(99,102,241,0.08))" : i===1 ? "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.06))" : "rgba(15,23,42,0.04)",
                    color: i===0 ? THEME.colors.accent : i===1 ? "#166534" : THEME.colors.muted,
                    border: `1px solid ${i===0 ? "rgba(99,102,241,0.18)" : i===1 ? "rgba(34,197,94,0.18)" : "rgba(15,23,42,0.08)"}`,
                    fontWeight: i < 2 ? 950 : 800,
                    boxShadow: i < 2 ? "0 14px 30px rgba(2,6,23,0.06)" : "none" }}>
                    {i===0 ? "🥇 " : i===1 ? "🥈 " : ""}{t.label}
                    <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.75 }}>×{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}


// ── 打卡海报生成器（3种主题随机切换 + 弹窗展示）────────────
const POSTER_THEMES = [
  {
    name: "深夜极光",
    bg: ["#0f172a", "#1e1b4b", "#0f172a"],
    glow1: "rgba(99,102,241,0.38)", glow2: "rgba(236,72,153,0.28)",
    accent: "#818cf8", barA: "#34d399", barB: "#818cf8",
    cellActive: ["rgba(34,197,94,0.30)","rgba(34,197,94,0.65)","rgba(34,197,94,0.95)"],
    todayOutline: "#818cf8",
  },
  {
    name: "日出橙金",
    bg: ["#1a0a00", "#3b1400", "#1a0800"],
    glow1: "rgba(251,146,60,0.40)", glow2: "rgba(234,179,8,0.28)",
    accent: "#fb923c", barA: "#fbbf24", barB: "#f97316",
    cellActive: ["rgba(251,146,60,0.28)","rgba(251,146,60,0.62)","rgba(251,146,60,0.95)"],
    todayOutline: "#fbbf24",
  },
  {
    name: "深海青碧",
    bg: ["#001a1a", "#00282e", "#001518"],
    glow1: "rgba(6,182,212,0.38)", glow2: "rgba(16,185,129,0.28)",
    accent: "#22d3ee", barA: "#34d399", barB: "#06b6d4",
    cellActive: ["rgba(6,182,212,0.28)","rgba(6,182,212,0.62)","rgba(6,182,212,0.95)"],
    todayOutline: "#34d399",
  },
];

function PosterGenerator({ me, streakDays, totalVideos, vocabCount, masteredCount, heatmapData, tasks }) {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [themeIdx, setThemeIdx] = useState(0);

  const doneCount = tasks.filter(t => t.done).length;

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
    ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
    ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
    ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }

  async function generate(forceTheme) {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 60));

    // 随机换主题
    const nextTheme = forceTheme !== undefined ? forceTheme : (themeIdx + 1) % POSTER_THEMES.length;
    setThemeIdx(nextTheme);
    const T = POSTER_THEMES[nextTheme];

    const canvas = canvasRef.current;
    const W = 750, H = 1200;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // 背景
    const bg = ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0, T.bg[0]); bg.addColorStop(0.45, T.bg[1]); bg.addColorStop(1, T.bg[2]);
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
    const g1 = ctx.createRadialGradient(150,200,0,150,200,320);
    g1.addColorStop(0,T.glow1); g1.addColorStop(1,"transparent");
    ctx.fillStyle=g1; ctx.fillRect(0,0,W,H);
    const g2 = ctx.createRadialGradient(620,400,0,620,400,280);
    g2.addColorStop(0,T.glow2); g2.addColorStop(1,"transparent");
    ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);

    // 顶部
    ctx.font="bold 28px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.92)";
    ctx.fillText("📒 我的英语手帐",48,70);
    const now=new Date();
    const dateStr=`${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")}`;
    ctx.font="500 22px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.50)";
    ctx.textAlign="right"; ctx.fillText(dateStr,W-48,70); ctx.textAlign="left";
    ctx.strokeStyle="rgba(255,255,255,0.10)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(48,90); ctx.lineTo(W-48,90); ctx.stroke();

    // 主题标签
    ctx.font="500 18px sans-serif"; ctx.fillStyle=T.accent;
    ctx.textAlign="right"; ctx.fillText(`✦ ${T.name}`,W-48,108); ctx.textAlign="left";

    // 用户名
    const userName=me?.email?.split("@")[0]||"学习者";
    ctx.font="bold 42px sans-serif"; ctx.fillStyle="#fff";
    ctx.fillText(`👋 ${userName}`,48,170);
    ctx.font="500 24px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.60)";
    ctx.fillText("今日打卡成功！",48,208);

    // 三卡
    const statColors = [
      { color:"#fb923c", bg:"rgba(251,146,60,0.18)", border:"rgba(251,146,60,0.35)" },
      { color:T.accent,  bg:`rgba(99,102,241,0.18)`, border:`rgba(99,102,241,0.35)` },
      { color:"#34d399", bg:"rgba(52,211,153,0.18)", border:"rgba(52,211,153,0.35)" },
    ];
    const statData=[
      {num:streakDays,label:"连续天数"},
      {num:totalVideos,label:"累计视频"},
      {num:vocabCount,label:"收藏词汇"},
    ];
    const cW=196,cH=110,cG=21,cY=248;
    statData.forEach((s,i)=>{
      const cx=48+i*(cW+cG);
      roundRect(ctx,cx,cY,cW,cH,18);
      ctx.fillStyle=statColors[i].bg; ctx.fill();
      ctx.strokeStyle=statColors[i].border; ctx.lineWidth=1.5; ctx.stroke();
      ctx.font="bold 46px sans-serif"; ctx.fillStyle=statColors[i].color;
      ctx.fillText(String(s.num),cx+18,cY+62);
      ctx.font="500 20px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.60)";
      ctx.fillText(s.label,cx+18,cY+92);
    });

    // 任务
    const tY=408;
    ctx.font="bold 26px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.85)";
    ctx.fillText(`🎯 今日任务 ${doneCount}/3 完成`,48,tY);
    [{label:"沉浸 1 个场景视频",done:tasks[0]?.done},{label:"收藏 3 个地道表达",done:tasks[1]?.done},{label:"词汇通关 1 次",done:tasks[2]?.done}]
    .forEach((t,i)=>{
      const ty=tY+28+i*44;
      roundRect(ctx,48,ty,W-96,36,10);
      ctx.fillStyle=t.done?"rgba(34,197,94,0.12)":"rgba(255,255,255,0.05)"; ctx.fill();
      ctx.strokeStyle=t.done?"rgba(34,197,94,0.30)":"rgba(255,255,255,0.08)"; ctx.lineWidth=1; ctx.stroke();
      ctx.font="500 20px sans-serif";
      ctx.fillStyle=t.done?"#4ade80":"rgba(255,255,255,0.40)"; ctx.fillText(t.done?"✓":"○",70,ty+24);
      ctx.fillStyle=t.done?"rgba(255,255,255,0.90)":"rgba(255,255,255,0.40)"; ctx.fillText(t.label,104,ty+24);
    });

    // 热力图
    const hmY=598;
    ctx.font="bold 26px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.85)";
    ctx.fillText("🔥 学习足迹（近 16 周）",48,hmY);
    const today=new Date(); today.setHours(0,0,0,0);
    const hmDays=[];
    for(let i=111;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);const k=d.toISOString().slice(0,10);hmDays.push({key:k,count:heatmapData[k]||0});}
    const hmPad=(new Date(hmDays[0].key).getDay()+6)%7;
    const hmPadded=[...Array(hmPad).fill(null),...hmDays];
    const hmWeeks=[];
    for(let i=0;i<hmPadded.length;i+=7)hmWeeks.push(hmPadded.slice(i,i+7));
    const cs=28,cg=5,hx=48,hy=hmY+18,tk=today.toISOString().slice(0,10);
    hmWeeks.forEach((wk,wi)=>{
      wk.forEach((day,di)=>{
        if(!day)return;
        const x=hx+wi*(cs+cg),y=hy+di*(cs+cg);
        roundRect(ctx,x,y,cs,cs,6);
        ctx.fillStyle=day.count===0?"rgba(255,255,255,0.08)":T.cellActive[Math.min(day.count-1,2)];
        ctx.fill();
        if(day.key===tk){ctx.strokeStyle=T.todayOutline;ctx.lineWidth=2;ctx.stroke();}
      });
    });

    // 掌握进度
    const mY=868;
    ctx.font="bold 26px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.85)";
    ctx.fillText(`✅ 已掌握词汇 ${masteredCount} 个`,48,mY);
    const mPct=vocabCount>0?Math.round(masteredCount/vocabCount*100):0;
    roundRect(ctx,48,mY+14,W-96,18,9); ctx.fillStyle="rgba(255,255,255,0.10)"; ctx.fill();
    if(mPct>0){roundRect(ctx,48,mY+14,Math.max((W-96)*mPct/100,18),18,9);
    const bg2=ctx.createLinearGradient(48,0,W-48,0);
    bg2.addColorStop(0,T.barA);bg2.addColorStop(1,T.barB);ctx.fillStyle=bg2;ctx.fill();}
    ctx.font="500 20px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.55)";
    ctx.fillText(`词汇总量 ${vocabCount} 个 · 掌握率 ${mPct}%`,48,mY+54);

    // 底部
    ctx.strokeStyle="rgba(255,255,255,0.10)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(48,H-100); ctx.lineTo(W-48,H-100); ctx.stroke();
    ctx.font="bold 28px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.90)";
    ctx.textAlign="center"; ctx.fillText("🌐 nailaobao.top",W/2,H-60);
    ctx.font="500 20px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.40)";
    ctx.fillText("油管英语场景库 · 精选场景短片 · 双语字幕",W/2,H-30);
    ctx.textAlign="left";

    setPosterUrl(canvas.toDataURL("image/png"));
    setGenerating(false);
    setShowModal(true);
  }

  return (
    <div>
      <canvas ref={canvasRef} style={{ display:"none" }} />

      {/* 生成按钮 */}
      <button onClick={() => generate()} disabled={generating} style={{
        width:"100%", padding:"16px 0", borderRadius:22, border:"none",
        background: generating ? "rgba(99,102,241,0.40)" : "linear-gradient(135deg,#0f172a 0%,#4f46e5 50%,#ec4899 100%)",
        color:"#fff", fontSize:16, fontWeight:950,
        cursor: generating?"not-allowed":"pointer",
        boxShadow: generating?"none":"0 24px 60px rgba(79,70,229,0.35)",
        transition:"all 300ms ease", letterSpacing:"-0.2px",
      }}>
        {generating ? "⏳ 生成中..." : "📸 生成今日打卡海报"}
      </button>
      <div style={{ textAlign:"center", fontSize:11, color:THEME.colors.faint, marginTop:8, fontWeight:700 }}>
        每次生成随机切换配色主题 · 共 {POSTER_THEMES.length} 种风格
      </div>

      {/* 弹窗 */}
      {showModal && posterUrl && (
        <div onClick={() => setShowModal(false)} style={{
          position:"fixed", inset:0, zIndex:1000,
          background:"rgba(0,0,0,0.75)",
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:16, backdropFilter:"blur(6px)",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:THEME.colors.surface,
            borderRadius:24, padding:16,
            width:"100%", maxWidth:480,
            maxHeight:"90vh", overflowY:"auto",
            boxShadow:"0 40px 100px rgba(0,0,0,0.40)",
            display:"flex", flexDirection:"column", gap:12,
          }}>
            {/* 弹窗顶栏 */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:15, fontWeight:950, color:THEME.colors.ink }}>📸 今日打卡海报</div>
              <button onClick={() => setShowModal(false)} style={{
                width:32, height:32, borderRadius:999, border:"none",
                background:"rgba(15,23,42,0.08)", cursor:"pointer",
                fontSize:16, color:THEME.colors.muted, display:"grid", placeItems:"center",
              }}>✕</button>
            </div>

            {/* 海报图 */}
            <img src={posterUrl} alt="打卡海报" style={{
              width:"100%", borderRadius:16,
              border:"1px solid rgba(15,23,42,0.08)",
              boxShadow:"0 8px 30px rgba(0,0,0,0.12)",
            }} />

            <div style={{ fontSize:12, color:THEME.colors.faint, textAlign:"center", fontWeight:700 }}>
              📱 手机长按图片保存 · 分享到朋友圈 / 小红书
            </div>

            {/* 操作按钮 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <a href={posterUrl} download={`英语手帐_${new Date().toISOString().slice(0,10)}.png`}
                style={{ display:"block", textAlign:"center", padding:"13px 0",
                  borderRadius:16, textDecoration:"none",
                  background:"linear-gradient(135deg,#0f172a,#4f46e5)",
                  color:"#fff", fontSize:14, fontWeight:950,
                  boxShadow:"0 18px 40px rgba(79,70,229,0.25)" }}>
                ⬇️ 保存图片
              </a>
              <button onClick={() => { setShowModal(false); generate((themeIdx+1)%POSTER_THEMES.length); }}
                style={{ padding:"13px 0", borderRadius:16,
                  border:"1px solid rgba(15,23,42,0.12)", background:"rgba(15,23,42,0.04)",
                  fontSize:14, fontWeight:950, color:THEME.colors.muted, cursor:"pointer" }}>
                🎨 换个风格
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 记忆碎片（翻卡，高度自适应修复版）────────────────────
function MemoryCard({ item, onRefresh, totalVocab }) {
  const [flipped, setFlipped] = useState(false);
  const [playing, setPlaying] = useState(false);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const [cardHeight, setCardHeight] = useState("auto");

  useEffect(() => { setFlipped(false); }, [item?.id]);

  // 每次内容变化或翻转后，取正反两面高度的最大值撑开容器
  useEffect(() => {
    const measure = () => {
      const fh = frontRef.current?.scrollHeight || 0;
      const bh = backRef.current?.scrollHeight || 0;
      setCardHeight(Math.max(fh, bh, 180));
    };
    measure();
    const t = setTimeout(measure, 50); // 等动画稳定后再量一次
    return () => clearTimeout(t);
  }, [item, flipped]);

  function handlePlay() {
    if (!item) return;
    setPlaying(true);
    playWord(item.term);
    setTimeout(() => setPlaying(false), 1500);
  }

  const daysSince = item?.created_at
    ? Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000)
    : 0;
  const daysLabel = daysSince === 0 ? "今天收藏的" : daysSince === 1 ? "昨天收藏的" : `${daysSince} 天前收藏的`;

  if (!item) return (
    <Card>
      <SectionTitle emoji="🎁" title="每日盲盒" sub="随机抽一个你收藏过的知识点，温柔复习一下" />
      <div style={{ textAlign: "center", padding: "22px 0 10px" }}>
        <div style={{ fontSize: 40 }}>📭</div>
        <div style={{ fontSize: 13, color: THEME.colors.muted, marginTop: 8, fontWeight: 900 }}>还没有收藏词汇</div>
        <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 4 }}>去视频页收藏一些词汇，这里会每天给你一个"惊喜复习"～</div>
      </div>
    </Card>
  );

  const kindLabel = { words: "单词", phrases: "短语", idioms: "地道表达" }[item.kind] || "词汇";
  const masteryLabel = ["⭐ 新收藏", "🔄 学习中", "✅ 已掌握"][item.mastery_level ?? 0];

  const faceBase = {
    position: "absolute", inset: 0, borderRadius: 22,
    backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
    overflow: "hidden", padding: 16,
  };

  return (
    <Card>
      <SectionTitle emoji="🎁" title="记忆回眸"
        sub={`从你的 ${totalVocab} 个收藏中随机抽取 · 打开就复习`}
        right={
          <button onClick={onRefresh} style={{ padding: "8px 12px", borderRadius: 999,
            border: "1px solid rgba(15,23,42,0.10)",
            background: "linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.65))",
            cursor: "pointer", fontSize: 12, color: THEME.colors.muted, fontWeight: 950,
            boxShadow: "0 12px 30px rgba(2,6,23,0.06)", whiteSpace: "nowrap" }}>
            🎲 换一个
          </button>
        }
      />

      {/* 翻卡容器：高度由内容决定 */}
      <div style={{ perspective: "1200px" }}>
        <div style={{
          position: "relative",
          borderRadius: 22,
          height: cardHeight,
          transformStyle: "preserve-3d",
          transition: "transform 550ms cubic-bezier(.2,.9,.2,1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}>

          {/* 正面 */}
          <div ref={frontRef} style={{
            ...faceBase,
            background: "linear-gradient(145deg, rgba(254,249,195,0.96) 0%, rgba(253,230,138,0.92) 55%, rgba(251,191,36,0.20) 100%)",
            border: "1px solid rgba(245,158,11,0.28)",
            boxShadow: "0 22px 60px rgba(245,158,11,0.18), 0 2px 10px rgba(2,6,23,0.05)",
          }}>
            <div aria-hidden style={{ position: "absolute", top: 10, left: -40, width: 220, height: 28,
              transform: "rotate(-10deg)",
              background: "linear-gradient(90deg, rgba(99,102,241,0.30), rgba(236,72,153,0.22), rgba(14,165,233,0.18))",
              borderRadius: 999, opacity: 0.65 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, padding: "5px 10px", borderRadius: 999,
                background: "rgba(255,255,255,0.65)", border: "1px solid rgba(245,158,11,0.25)",
                color: "#92400e", fontWeight: 950 }}>{kindLabel}</span>
              <span style={{ fontSize: 11, color: "#b45309", fontWeight: 900 }}>{masteryLabel}</span>
            </div>

            <div style={{ textAlign: "center", marginTop: 16, paddingBottom: 4 }}>
              <div style={{ fontSize: 38, fontWeight: 1000, color: THEME.colors.ink, letterSpacing: "-0.8px",
                textShadow: "0 10px 30px rgba(2,6,23,0.10)" }}>{item.term}</div>
              {item.data?.ipa && (
                <div style={{ fontSize: 13, color: "#b45309", marginTop: 6, fontFamily: "monospace", fontWeight: 900 }}>
                  {item.data.ipa}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
              <button onClick={handlePlay} style={{ padding: "10px 16px", borderRadius: 999,
                border: "1.5px solid rgba(245,158,11,0.60)",
                background: playing ? "linear-gradient(135deg, rgba(245,158,11,1), rgba(251,191,36,1))" : "rgba(255,255,255,0.75)",
                cursor: "pointer", fontSize: 13, color: playing ? "#fff" : "#92400e", fontWeight: 950,
                boxShadow: playing ? "0 16px 36px rgba(245,158,11,0.22)" : "0 12px 28px rgba(2,6,23,0.06)",
                transition: "all 180ms ease" }}>
                {playing ? "🔊 播放中..." : "🔊 听发音"}
              </button>
              <button onClick={() => setFlipped(x => !x)} style={{ padding: "10px 16px", borderRadius: 999,
                border: "1.5px solid rgba(245,158,11,0.60)", background: "rgba(255,255,255,0.75)",
                cursor: "pointer", fontSize: 13, color: "#92400e", fontWeight: 950,
                boxShadow: "0 12px 28px rgba(2,6,23,0.06)" }}>
                查看释义 →
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 11, color: "#b45309", textAlign: "right", fontWeight: 900 }}>
              📌 {daysLabel}
            </div>
          </div>

          {/* 背面 */}
          <div ref={backRef} style={{
            ...faceBase,
            transform: "rotateY(180deg)",
            background: "linear-gradient(145deg, rgba(219,234,254,0.92) 0%, rgba(224,231,255,0.86) 45%, rgba(236,72,153,0.10) 100%)",
            border: "1px solid rgba(99,102,241,0.22)",
            boxShadow: "0 22px 60px rgba(99,102,241,0.16), 0 2px 10px rgba(2,6,23,0.05)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 1000, color: THEME.colors.ink }}>✨ {item.term}</div>
              <button onClick={() => setFlipped(false)} style={{ padding: "8px 12px", borderRadius: 999,
                border: "1px solid rgba(15,23,42,0.10)", background: "rgba(255,255,255,0.75)",
                cursor: "pointer", fontSize: 12, color: THEME.colors.muted, fontWeight: 950 }}>← 返回</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {item.data?.zh && (
                <div style={{ padding: "12px 12px", borderRadius: 16,
                  background: "rgba(255,255,255,0.72)", border: "1px solid rgba(99,102,241,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 1000, color: THEME.colors.accent, marginBottom: 6 }}>中文含义</div>
                  <div style={{ fontSize: 15, fontWeight: 950, color: THEME.colors.ink, lineHeight: 1.4 }}>{item.data.zh}</div>
                </div>
              )}
              {item.data?.example_en && (
                <div style={{ padding: "12px 12px", borderRadius: 16,
                  background: "rgba(255,255,255,0.72)", border: "1px solid rgba(99,102,241,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 1000, color: "#1d4ed8", marginBottom: 6 }}>例句</div>
                  <div style={{ fontSize: 13, color: THEME.colors.ink, fontStyle: "italic", lineHeight: 1.6 }}>"{item.data.example_en}"</div>
                  {item.data?.example_zh && (
                    <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 6, fontWeight: 800 }}>{item.data.example_zh}</div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
              <button onClick={handlePlay} style={{ padding: "10px 16px", borderRadius: 999,
                border: "1.5px solid rgba(59,130,246,0.35)",
                background: playing ? "linear-gradient(135deg, rgba(59,130,246,1), rgba(99,102,241,1))" : "rgba(255,255,255,0.75)",
                cursor: "pointer", fontSize: 13, color: playing ? "#fff" : "#1e3a8a", fontWeight: 950,
                transition: "all 180ms ease" }}>
                {playing ? "🔊 播放中..." : "🔊 再听一遍"}
              </button>
              <button onClick={onRefresh} style={{ padding: "10px 16px", borderRadius: 999,
                border: "1.5px solid rgba(59,130,246,0.35)", background: "rgba(255,255,255,0.75)",
                cursor: "pointer", fontSize: 13, color: "#1e3a8a", fontWeight: 950 }}>
                🎲 再抽一个
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 11, color: THEME.colors.faint, textAlign: "right", fontWeight: 900 }}>
              📌 {daysLabel}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── 主页面 ────────────────────────────────────────────────
export default function JournalClient({ accessToken }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [journalData, setJournalData] = useState(null);
  const [memoryItem, setMemoryItem] = useState(null);

  useEffect(() => {
    authFetch(remote("/api/me"), { cache: "no-store" })
      .then(r => r.json()).then(d => setMe(d)).catch(() => setMe({ logged_in: false }));
  }, []);

  useEffect(() => {
    if (!me) return;
    if (!me.logged_in) { setLoading(false); return; }
    loadJournalData();
  }, [me]);

  async function loadJournalData() {
    setLoading(true);
    try {
      const [journalRes, vocabRes] = await Promise.all([
        authFetch(remote("/api/journal_stats"), { cache: "no-store" }),
        authFetch(remote("/api/vocab_favorites"), { cache: "no-store" }),
      ]);
      const journal = await journalRes.json();
      const vocab = await vocabRes.json();
      const items = vocab?.items || [];
      if (items.length > 0) setMemoryItem(items[Math.floor(Math.random() * items.length)]);
      setJournalData({ ...journal, vocabItems: items });
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function refreshMemory() {
    const items = journalData?.vocabItems || [];
    if (items.length === 0) return;
    let next;
    do { next = items[Math.floor(Math.random() * items.length)]; }
    while (items.length > 1 && next?.id === memoryItem?.id);
    setMemoryItem(next);
  }

  if (!loading && (!me || !me.logged_in)) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Card style={{ maxWidth: 420, textAlign: "center", padding: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>📒</div>
          <div style={{ fontSize: 18, fontWeight: 1000, color: THEME.colors.ink, marginBottom: 8 }}>我的英语手帐</div>
          <div style={{ fontSize: 13, color: THEME.colors.muted, marginBottom: 18, lineHeight: 1.6 }}>登录后查看你的学习记录、任务打卡和每日盲盒复习</div>
          <a href="/login" style={{ display: "inline-block", padding: "12px 34px",
            background: "linear-gradient(135deg, rgba(15,23,42,1), rgba(99,102,241,0.95))",
            color: "#fff", borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 950,
            boxShadow: "0 18px 40px rgba(2,6,23,0.18)" }}>去登录</a>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg }}>
        <div style={{ height: 56, background: THEME.colors.surface, borderBottom: `1px solid ${THEME.colors.border}` }} />
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "22px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[180, 280, 240, 260].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: 22, border: `1px solid ${THEME.colors.border}`,
              background: "linear-gradient(90deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.90) 30%, rgba(255,255,255,0.65) 60%)",
              backgroundSize: "200% 100%", animation: "shine 1.3s ease-in-out infinite",
              boxShadow: "0 14px 46px rgba(2,6,23,0.08)" }} />
          ))}
        </div>
        <style>{`@keyframes shine { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      </div>
    );
  }

  const d = journalData || {};
  const vocabItems = d.vocabItems || [];
  const tasks = [
    { label: "沉浸 1 个场景视频", done: (d.today_views||0)>=1,
      doneText: `今天已看 ${d.today_views||0} 个视频 ✨`, pendingText: "打开任意视频即可完成" },
    { label: "收藏 3 个地道表达", done: (d.today_vocab||0)>=3,
      doneText: `今天收藏了 ${d.today_vocab||0} 个词汇 ✨`, pendingText: `进度 ${d.today_vocab||0} / 3 个` },
    { label: "词汇通关 1 次", done: (d.mastered_total||0)>=1,
      doneText: `已掌握 ${d.mastered_total||0} 个词汇 ✨`, pendingText: "去收藏页完成一次词汇练习" },
  ];
  const masteryStats = {
    new: vocabItems.filter(v => (v.mastery_level??0)===0).length,
    learning: vocabItems.filter(v => (v.mastery_level??0)===1).length,
    mastered: vocabItems.filter(v => (v.mastery_level??0)===2).length,
  };
  const topicMap = {};
  const topicLabelMap = {
    "daily-life":"日常生活","self-improvement":"个人成长","food":"美食探店",
    "travel":"旅行","business":"职场商务","culture":"文化","opinion":"观点表达","skills":"方法技能",
  };
  (d.bookmarked_topics||[]).forEach(slug => {
    const label = topicLabelMap[slug]||slug;
    topicMap[label] = (topicMap[label]||0)+1;
  });
  const topicStats = Object.entries(topicMap).map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count).slice(0,6);
  const doneCount = tasks.filter(t=>t.done).length;

  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg }}>
      <style>{`
        @keyframes floatIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{opacity:.65} 50%{opacity:1} }
        .confettiWrap{position:absolute;inset:-10px;pointer-events:none;overflow:hidden;}
        .confettiPiece{position:absolute;top:-20px;width:8px;height:14px;border-radius:4px;
          background:linear-gradient(180deg,rgba(99,102,241,0.95),rgba(236,72,153,0.85));
          animation:confettiFall 900ms linear infinite;opacity:0.9;}
        .confettiPiece:nth-child(3n){background:linear-gradient(180deg,rgba(34,197,94,0.95),rgba(16,185,129,0.85));}
        .confettiPiece:nth-child(4n){background:linear-gradient(180deg,rgba(245,158,11,0.95),rgba(251,191,36,0.85));}
        @keyframes confettiFall{
          0%{transform:translate3d(var(--x,0px),0,0) rotate(0deg);}
          100%{transform:translate3d(var(--x,0px),260px,0) rotate(260deg);opacity:0.1;}
        }
      `}</style>

      {/* 顶栏 */}
      <div style={{ position: "sticky", top: 0, zIndex: 20,
        background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.82))",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(15,23,42,0.08)",
        padding: "0 16px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/" style={{ padding: "8px 12px", borderRadius: 999,
            border: "1px solid rgba(15,23,42,0.10)", background: "rgba(15,23,42,0.04)",
            textDecoration: "none", fontSize: 13, color: THEME.colors.ink, fontWeight: 900 }}>← 返回</a>
          <span style={{ fontSize: 15, fontWeight: 1000, color: THEME.colors.ink, letterSpacing: "-0.2px" }}>我的英语手帐</span>
        </div>
        <span style={{ fontSize: 11, color: THEME.colors.faint, fontWeight: 800 }}>📅 {formatDate()}</span>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "18px 16px 60px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* 欢迎横幅 */}
        <div style={{ borderRadius: 26, padding: "18px 18px", color: "#fff",
          background: "radial-gradient(circle at 10% 10%, rgba(236,72,153,0.55), transparent 45%)," +
            "radial-gradient(circle at 90% 20%, rgba(99,102,241,0.65), transparent 40%)," +
            "radial-gradient(circle at 40% 120%, rgba(14,165,233,0.55), transparent 50%)," +
            "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(79,70,229,0.95) 40%, rgba(236,72,153,0.85) 100%)",
          boxShadow: "0 24px 70px rgba(2,6,23,0.22)", position: "relative", overflow: "hidden", animation: "floatIn 420ms ease" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 1000, marginBottom: 6 }}>👋 {me?.email?.split("@")[0]||"同学"}，今天也要加油哦！</div>
              <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.65 }}>
                累计观看 <b>{d.total_views||0}</b> 个视频 · 收藏 <b>{vocabItems.length}</b> 个词汇 · 今日已完成 <b>{doneCount}</b>/3 目标
              </div>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 18,
              background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)",
              textAlign: "right", minWidth: 112 }}>
              <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 900 }}>今日进度</div>
              <div style={{ fontSize: 22, fontWeight: 1000, marginTop: 4 }}>{Math.round(doneCount/3*100)}%</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 10, background: "rgba(255,255,255,0.18)", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.16)" }}>
              <div style={{ height: "100%", width: `${Math.round(doneCount/3*100)}%`, borderRadius: 999,
                background: "linear-gradient(90deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))",
                transition: "width 650ms cubic-bezier(.2,.9,.2,1)" }} />
            </div>
          </div>
        </div>

        <TodayTasks tasks={tasks} />
        <Heatmap heatmapData={d.heatmap||{}} streakDays={d.streak_days||0} totalVideos={d.total_views||0} />
        <AbilityProfile masteryStats={masteryStats} topicStats={topicStats} />
        <MemoryCard item={memoryItem} onRefresh={refreshMemory} totalVocab={vocabItems.length} />

        {/* 打卡海报 */}
        <Card>
          <SectionTitle emoji="📸" title="生成打卡海报" sub="一键生成，分享到朋友圈 / 小红书，带上你的成就" />
          <PosterGenerator
            me={me}
            streakDays={d.streak_days||0}
            totalVideos={d.total_views||0}
            vocabCount={vocabItems.length}
            masteredCount={masteryStats.mastered}
            heatmapData={d.heatmap||{}}
            tasks={tasks}
          />
        </Card>
      </div>
    </div>
  );
}
