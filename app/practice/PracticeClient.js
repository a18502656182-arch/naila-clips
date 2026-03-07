"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { THEME } from "../components/home/theme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

function makeAuthFetch(token) {
  return function authFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    const t =
      token ||
      (() => {
        try {
          return localStorage.getItem("sb_access_token");
        } catch {
          return null;
        }
      })();
    if (t) headers["Authorization"] = `Bearer ${t}`;
    return fetch(url, { ...options, headers, credentials: "include" });
  };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function shuffle(arr) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickOne(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[(Math.random() * arr.length) | 0];
}

function normalizeSentence(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/[^a-z0-9'\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Bubble / Balloon / Speed / Rebuild(🔊按钮) 复用
// 解锁浏览器自动播放限制（必须在用户手势内调用一次）
let audioUnlocked = false;
async function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    audioUnlocked = true;
  } catch {}
}

async function playWord(term) {
  const t = (term || "").trim();
  if (!t) return;

  // 优先用有道发音
  const tryYoudao = () => new Promise((resolve) => {
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(t)}&type=2`;
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    const cleanup = () => { audio.onended = null; audio.onerror = null; };
    audio.onended = () => { cleanup(); resolve(true); };
    audio.onerror = () => { cleanup(); resolve(false); };
    audio.src = url;
    audio.play().catch(() => { cleanup(); resolve(false); });
  });

  // 备用：Web Speech API
  const trySpeech = () => new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve(false);
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "en-US";
      u.rate = 0.9;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      window.speechSynthesis.speak(u);
    } catch { resolve(false); }
  });

  const ok = await tryYoudao();
  if (!ok) await trySpeech();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
【一】积分存储工具（playWord 之后）
━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const SCORE_KEY = "naila_game_scores";

const GAME_META = [
  { id: "bubble", emoji: "🫧", name: "气泡拼写", color: "#7c3aed" },
  { id: "match", emoji: "🔗", name: "极速连连看", color: "#d97706" },
  { id: "swipe", emoji: "🃏", name: "单词探探", color: "#ec4899" },
  { id: "rebuild", emoji: "🧩", name: "台词磁力贴", color: "#059669" },
  { id: "balloon", emoji: "🎧", name: "盲听气球", color: "#0891b2" },
  { id: "speed", emoji: "⚡", name: "极速二选一", color: "#d97706" },
];

function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY) || "{}");
  } catch {
    return {};
  }
}

// 保存得分，返回 { best, last, playCount, isNewBest, oldBest }
function saveScore(gameId, score) {
  try {
    const all = loadScores();
    const prev = all[gameId] || { best: 0, last: 0, playCount: 0 };
    const isNewBest = score > 0 && score >= prev.best;
    all[gameId] = {
      best: Math.max(prev.best, score),
      last: score,
      playCount: (prev.playCount || 0) + 1,
    };
    localStorage.setItem(SCORE_KEY, JSON.stringify(all));
    return { ...all[gameId], isNewBest, oldBest: prev.best };
  } catch {
    return null;
  }
}

/* ----------------------------- NotEnoughView ----------------------------- */

function NotEnoughView({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14 }}>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: THEME.colors.surface,
          border: `1px solid ${THEME.colors.border}`,
          borderRadius: THEME.radii.lg,
          padding: 18,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 1000 }}>词汇不足</div>
        <div style={{ opacity: 0.75, marginTop: 8, fontWeight: 900 }}>
          至少需要收藏 4 个词汇，才能开始游戏。
        </div>
        <button
          onClick={onBack}
          style={{
            marginTop: 14,
            height: 44,
            padding: "0 16px",
            borderRadius: THEME.radii.pill,
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          返回大厅
        </button>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
ScoreResult：结算页统一提示（只渲染一次）
━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ScoreResult({ score, gameId }) {
  const calledRef = useRef(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    // 如果 PracticeClient 已经保存过（onGameEnd 里），优先读取 meta，避免重复计次
    try {
      const metaMap = window.__nailaScoreSavedMeta || {};
      const meta = metaMap?.[gameId];
      if (meta && meta.last === score) {
        setResult(meta);
        return;
      }
    } catch {}

    const r = saveScore(gameId, score);
    setResult(r);
  }, [gameId, score]);

  if (!result) return null;

  const { best = 0, oldBest = 0, isNewBest = false } = result;

  let text = "";
  let color = THEME.colors.muted;

  if (oldBest === 0) {
    text = "🌟 首次完成！继续加油";
    color = "#b45309";
  } else if (isNewBest && oldBest > 0) {
    text = `🎉 新纪录！超越了上次的 ${oldBest} 分`;
    color = "#b45309";
  } else {
    text = `历史最高：${best} 分`;
    color = THEME.colors.muted;
  }

  return (
    <div style={{ marginTop: 10, fontWeight: 1000, color, fontSize: 13 }}>
      {text}
    </div>
  );
}

/* ----------------------------- Shared UI (Bubble) ----------------------------- */

function MasteryBadge({ level }) {
  const map = {
    0: { label: "新收藏", bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
    1: { label: "学习中", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    2: { label: "已掌握", bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  };
  const m = map[level ?? 0] || map[0];
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 999,
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.border}`,
        fontWeight: 700,
      }}
    >
      {level === 0 ? "⭐" : level === 1 ? "🔄" : "✅"} {m.label}
    </span>
  );
}

function ProgressBar({ current, total, onExit }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, color: THEME.colors.muted }}>
          第 {current + 1} 题 / 共 {total} 题
        </span>
        <button
          type="button"
          onClick={onExit}
          style={{
            fontSize: 13,
            color: THEME.colors.muted,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          退出
        </button>
      </div>
      <div
        style={{
          height: 6,
          background: "#e8eaf0",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: THEME.colors.accent,
            borderRadius: 999,
            width: `${((current + 1) / total) * 100}%`,
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
【二-1】BubbleSpellingGame：新增结算页 + 积分上报
━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function BubbleSpellingGame({ vocabItems, onExit, onGameEnd }) {
  const cards = useMemo(() => {
    const filtered = (vocabItems || []).filter((x) => {
      const k = x?.kind;
      if (k && k !== "words" && k !== "phrases") return false;
      return true;
    });
    return shuffle(filtered);
  }, [vocabItems]);

  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [slots, setSlots] = useState([]);
  const [bubbles, setBubbles] = useState([]);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [records, setRecords] = useState([]); // { term, wasCorrect }
  const [done, setDone] = useState(false);

  const endCalledRef = useRef(false);

  const card = cards[idx];
  const isLast = idx === cards.length - 1;
  const total = cards.length;

  useEffect(() => {
    if (!card || done) return;
    initQuestion(card);
    if (started) playWord(card.term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, card?.id, done, started]);

  useEffect(() => {
    if (!done) return;
    const score = correctCount * 10;
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    try {
      onGameEnd?.(score);
    } catch {}
  }, [done, correctCount, onGameEnd]);

  function initQuestion(c) {
    const term = c?.term || "";
    const slotArr = term.split("").map((ch) => (ch === " " ? " " : null));
    setSlots(slotArr);

    const letters = term.split("").filter((ch) => ch !== " ");
    const distractorPool = "abcdefghijklmnopqrstuvwxyz";
    const termLetters = new Set(letters.map((l) => l.toLowerCase()));
    const distractors = distractorPool
      .split("")
      .filter((l) => !termLetters.has(l));
    const shuffledDistractors = [...distractors].sort(() => Math.random() - 0.5);

    const extraCount = Math.min(
      4,
      Math.max(2, Math.floor(letters.length * 0.4))
    );
    const extras = shuffledDistractors.slice(0, extraCount);

    const allLetters = [...letters, ...extras].sort(() => Math.random() - 0.5);
    setBubbles(
      allLetters.map((letter, i) => ({
        letter,
        id: i,
        used: false,
      }))
    );

    setChecked(false);
    setIsCorrect(false);
    setSuccessAnim(false);
  }

  function finishGame() {
    setDone(true);
  }

  function handleBubbleClick(bubbleId) {
    if (checked || done) return;
    const bubble = bubbles.find((b) => b.id === bubbleId && !b.used);
    if (!bubble) return;

    const emptyIdx = slots.findIndex((s) => s === null);
    if (emptyIdx === -1) return;

    const expectedLetter = (card?.term || "")[emptyIdx] || "";
    const correct = bubble.letter.toLowerCase() === expectedLetter.toLowerCase();

    const newSlots = [...slots];
    newSlots[emptyIdx] = { letter: bubble.letter, correct };

    setSlots(newSlots);
    setBubbles((prev) =>
      prev.map((b) => (b.id === bubbleId ? { ...b, used: true } : b))
    );

    const allFilled = newSlots.every((s) => s !== null);
    if (allFilled) {
      const allCorrect = newSlots.every((s) => s === " " || s.correct);
      setChecked(true);
      setIsCorrect(allCorrect);

      setRecords((prev) => [
        ...prev,
        { term: card?.term || "", wasCorrect: allCorrect },
      ]);
      if (allCorrect) setCorrectCount((c) => c + 1);

      if (allCorrect) {
        setSuccessAnim(true);
        setTimeout(() => {
          if (isLast) {
            finishGame();
          } else {
            setIdx((i) => i + 1);
          }
        }, 900);
      }
    }
  }

  function handlePlayAudio() {
    unlockAudio();
    setPlayingAudio(true);
    playWord(card?.term);
    setTimeout(() => setPlayingAudio(false), 1500);
  }

  function handleNext() {
    if (done) return;
    if (isLast) {
      finishGame();
    } else {
      setIdx((i) => i + 1);
    }
  }

  function handleReset() {
    if (done) return;
    initQuestion(card);
  }

  function resetAll() {
    endCalledRef.current = false;
    setIdx(0);
    setSlots([]);
    setBubbles([]);
    setChecked(false);
    setIsCorrect(false);
    setPlayingAudio(false);
    setSuccessAnim(false);
    setCorrectCount(0);
    setRecords([]);
    setDone(false);
  }

  const bubbleColors = [
    { bg: "linear-gradient(135deg,#6366f1,#4f46e5)", shadow: "rgba(99,102,241,0.35)" },
    { bg: "linear-gradient(135deg,#ec4899,#db2777)", shadow: "rgba(236,72,153,0.35)" },
    { bg: "linear-gradient(135deg,#06b6d4,#0891b2)", shadow: "rgba(6,182,212,0.35)" },
    { bg: "linear-gradient(135deg,#10b981,#059669)", shadow: "rgba(16,185,129,0.35)" },
    { bg: "linear-gradient(135deg,#f59e0b,#d97706)", shadow: "rgba(245,158,11,0.35)" },
    { bg: "linear-gradient(135deg,#8b5cf6,#7c3aed)", shadow: "rgba(139,92,246,0.35)" },
  ];

  const shellStyle = {
    minHeight: "100vh",
    background: THEME.colors.bg,
    padding: 14,
    boxSizing: "border-box",
    color: THEME.colors.ink,
  };
  const topBar = {
    maxWidth: 980,
    margin: "0 auto",
    padding: "8px 6px 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  if (done) {
    const score = correctCount * 10;
    return (
      <div style={shellStyle}>
        <div style={topBar}>
          <button
            onClick={onExit}
            style={{
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.pill,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ← 返回大厅
          </button>
          <div style={{ fontWeight: 1000 }}>🫧 气泡拼写</div>
          <div style={{ opacity: 0.7, fontWeight: 900 }}>结算</div>
        </div>

        <div style={{ maxWidth: 760, margin: "18px auto 0", padding: "0 14px" }}>
          <div
            style={{
              background: THEME.colors.surface,
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: THEME.radii.lg,
              padding: 18,
              boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 1000 }}>本轮结算</div>
            <div style={{ marginTop: 10, opacity: 0.9, fontWeight: 1000 }}>
              总积分：<b>{score}</b> 分　·　答对 <b>{correctCount}</b> / <b>{total}</b> 题
            </div>

            <ScoreResult score={score} gameId="bubble" />

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {records.map((r, i) => {
                const ok = !!r.wasCorrect;
                return (
                  <div
                    key={`${r.term}-${i}`}
                    style={{
                      padding: 12,
                      borderRadius: THEME.radii.md,
                      background: ok ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                      border: `1px solid ${ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                      fontWeight: 900,
                      lineHeight: 1.35,
                    }}
                  >
                    {ok ? `✅ ${r.term} — 拼写正确` : `❌ ${r.term} — 拼写错误`}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={resetAll}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                  color: THEME.colors.accent,
                }}
              >
                再来一轮
              </button>
              <button
                onClick={onExit}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                返回大厅
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div style={{ ...shellStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
        <div style={{ fontSize: 48 }}>🫧</div>
        <div style={{ fontSize: 20, fontWeight: 1000 }}>气泡拼写</div>
        <div style={{ fontSize: 14, color: THEME.colors.faint, fontWeight: 900, textAlign: "center", maxWidth: 280 }}>
          听到单词发音，点击字母气泡按顺序拼出来
        </div>
        <button
          onClick={async () => {
            await unlockAudio();
            setStarted(true);
          }}
          style={{ marginTop: 8, padding: "14px 40px", borderRadius: THEME.radii.pill, background: THEME.colors.accent, color: "#fff", border: "none", fontSize: 16, fontWeight: 1000, cursor: "pointer" }}
        >
          开始游戏 →
        </button>
        <button onClick={onExit} style={{ padding: "8px 20px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: "transparent", cursor: "pointer", fontWeight: 900 }}>返回大厅</button>
      </div>
    );
  }

  if (!card) return null;

  const filledCount = slots.filter((s) => s !== null && s !== " ").length;
  const totalLetters = (card.term || "")
    .split("")
    .filter((c) => c !== " ").length;

  return (
    <div style={shellStyle}>
      <div style={topBar}>
        <button
          onClick={onExit}
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          ← 返回大厅
        </button>
        <div style={{ fontWeight: 1000 }}>🫧 气泡拼写</div>
        <div style={{ opacity: 0.7, fontWeight: 900 }}>
          {idx + 1} / {cards.length}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "8px 16px 40px" }}>
        <style>{`
          @keyframes slotPop { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
          @keyframes successPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
          @keyframes bubbleAppear { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        `}</style>

        <ProgressBar current={idx} total={cards.length} onExit={onExit} />

        <div
          style={{
            background: THEME.colors.surface,
            borderRadius: THEME.radii.lg,
            border: `1px solid ${THEME.colors.border}`,
            padding: "24px 20px 28px",
            boxShadow: "0 4px 16px rgba(11,18,32,0.08)",
            animation: successAnim ? "successPulse 400ms ease" : "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <MasteryBadge level={card.mastery_level ?? 0} />
            <button
              type="button"
              onClick={handlePlayAudio}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: THEME.radii.pill,
                background: playingAudio ? THEME.colors.accent : "#eef2ff",
                border: `1px solid ${playingAudio ? THEME.colors.accent : "#c7d2fe"}`,
                color: playingAudio ? "#fff" : THEME.colors.accent,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 200ms",
              }}
            >
              {playingAudio ? "🔊 播放中..." : "🔊 听发音"}
            </button>
          </div>

          <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {card.data?.zh && (
              <div style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: THEME.radii.md, border: "1px solid #fde68a" }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: "#b45309" }}>中文含义　</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: THEME.colors.ink }}>{card.data.zh}</span>
              </div>
            )}
            {card.data?.ipa && (
              <div style={{ padding: "8px 14px", background: "#f8fafc", borderRadius: THEME.radii.md, border: `1px solid ${THEME.colors.border}` }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: THEME.colors.muted }}>音标　</span>
                <span style={{ fontSize: 13, fontFamily: "monospace", color: THEME.colors.muted }}>{card.data.ipa}</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: THEME.colors.muted, marginBottom: 10, textAlign: "center" }}>
              点击字母拼出答案 · {filledCount}/{totalLetters} 个字母
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                justifyContent: "center",
                minHeight: 52,
                padding: "8px 12px",
                background: "#f8fafc",
                borderRadius: THEME.radii.md,
                border: `2px dashed ${checked ? (isCorrect ? "#22c55e" : "#ef4444") : "#c7d2fe"}`,
                transition: "border-color 300ms",
              }}
            >
              {slots.map((s, i) => {
                if (s === " ") return <div key={i} style={{ width: 14 }} />;
                const filled = s && s !== " ";
                const letterCorrect = filled ? s.correct : null;
                return (
                  <div
                    key={i}
                    style={{
                      width: 38,
                      height: 42,
                      borderRadius: 10,
                      border: `2px solid ${filled ? (letterCorrect ? "#22c55e" : "#ef4444") : "#c7d2fe"}`,
                      background: filled ? (letterCorrect ? "#f0fdf4" : "#fff5f5") : "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 1000,
                      color: filled ? (letterCorrect ? "#16a34a" : "#dc2626") : "#4f46e5",
                      transition: "all 200ms",
                      animation: filled && !checked ? "slotPop 300ms ease" : "none",
                      boxShadow: filled
                        ? `0 2px 8px ${letterCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`
                        : "none",
                    }}
                  >
                    {filled ? s.letter : ""}
                  </div>
                );
              })}
            </div>
          </div>

          {checked && !isCorrect && (
            <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: THEME.radii.md, background: "#fff5f5", border: "1px solid #fecaca" }}>
              <div style={{ fontWeight: 1000, color: "#dc2626", marginBottom: 6 }}>✗ 拼写有误</div>
              <div style={{ fontSize: 13, color: THEME.colors.ink }}>
                正确拼写：<strong style={{ color: "#dc2626", fontSize: 16 }}>{card.term}</strong>
              </div>
              {card.data?.zh && <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 4 }}>{card.data.zh}</div>}
            </div>
          )}

          {checked && isCorrect && (
            <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: THEME.radii.md, background: "#f0fdf4", border: "1px solid #bbf7d0", textAlign: "center" }}>
              <div style={{ fontWeight: 1000, color: "#16a34a", fontSize: 15 }}>✓ 拼写正确！</div>
            </div>
          )}

          {!checked && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: THEME.colors.muted, marginBottom: 10, textAlign: "center" }}>点击字母气泡填入答案</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", minHeight: 56 }}>
                {bubbles
                  .filter((b) => !b.used)
                  .map((b, i) => {
                    const colorScheme = bubbleColors[b.id % bubbleColors.length];
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleBubbleClick(b.id)}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: colorScheme.bg,
                          border: "none",
                          color: "#fff",
                          fontSize: 18,
                          fontWeight: 1000,
                          cursor: "pointer",
                          boxShadow: `0 4px 14px ${colorScheme.shadow}`,
                          animation: `bubbleAppear ${200 + i * 40}ms ease both`,
                          transition: "transform 100ms, box-shadow 100ms",
                          userSelect: "none",
                        }}
                      >
                        {b.letter}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
            {!checked && (
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: "9px 20px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  fontSize: 13,
                  fontWeight: 900,
                  color: THEME.colors.muted,
                  cursor: "pointer",
                }}
              >
                🔄 重新排列
              </button>
            )}

            {checked && !isCorrect && (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  padding: "10px 28px",
                  borderRadius: THEME.radii.pill,
                  background: THEME.colors.ink,
                  color: "#fff",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                {isLast ? "完成" : "下一题"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
【二-2】MatchMadnessGame：积分上报 + 破纪录提示
━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const MATCH_TIME = 30;
const BATCH_SIZE = 5;

function MatchMadnessGame({ vocabItems, onExit, onGameEnd }) {
  const cards = useMemo(() => shuffle(vocabItems || []), [vocabItems]);
  const border2 = THEME.colors.border2 || THEME.colors.border;

  const [batch, setBatch] = useState([]);
  const [leftSel, setLeftSel] = useState(null);
  const [rightSel, setRightSel] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [flash, setFlash] = useState(null);
  const [shake, setShake] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MATCH_TIME);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [done, setDone] = useState(false);

  const endCalledRef = useRef(false);

  const deckRef = useRef([...cards].sort(() => Math.random() - 0.5));
  const offsetRef = useRef(0);
  const timerRef = useRef(null);
  const [rightOrder, setRightOrder] = useState([]);

  function endGame() {
    clearInterval(timerRef.current);
    setDone(true);

    if (!endCalledRef.current) {
      endCalledRef.current = true;
      try {
        onGameEnd?.(score);
      } catch {}
    }
  }

  function loadNextBatch() {
    const deck = deckRef.current;
    const start = offsetRef.current;

    if (start >= deck.length) {
      endGame();
      return;
    }

    const next = deck.slice(start, start + BATCH_SIZE);
    offsetRef.current = start + next.length;

    setBatch(next);
    setMatched(new Set());
    setLeftSel(null);
    setRightSel(null);
    setRightOrder([...next].sort(() => Math.random() - 0.5));
  }

  useEffect(() => {
    loadNextBatch();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setDone(true);
          if (!endCalledRef.current) {
            endCalledRef.current = true;
            try {
              onGameEnd?.(score);
            } catch {}
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (batch.length > 0 && matched.size === batch.length) {
      setTimeout(loadNextBatch, 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched]);

  function tryMatch(lId, rId) {
    const correct = lId === rId;

    if (correct) {
      const newMatched = new Set([...matched, lId]);
      setMatched(newMatched);

      const newCombo = combo + 1;
      setCombo(newCombo);
      setBestCombo((b) => Math.max(b, newCombo));
      setScore((s) => s + 10 + newCombo * 2);

      setFlash({ id: lId, ok: true });
      setTimeout(() => setFlash(null), 400);
    } else {
      setCombo(0);
      setTimeLeft((t) => Math.max(0, t - 3));
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }

    setLeftSel(null);
    setRightSel(null);
  }

  function handleLeft(id) {
    if (matched.has(id) || done) return;
    setLeftSel(id);
    if (rightSel !== null) tryMatch(id, rightSel);
  }

  function handleRight(id) {
    if (matched.has(id) || done) return;
    setRightSel(id);
    if (leftSel !== null) tryMatch(leftSel, id);
  }

  if (done) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "8px 6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onExit}
            style={{
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.pill,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ← 返回大厅
          </button>
          <div style={{ fontWeight: 1000 }}>🔗 极速连连看</div>
          <div />
        </div>

        <div style={{ maxWidth: 720, margin: "18px auto 0" }}>
          <div
            style={{
              background: THEME.colors.surface,
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: THEME.radii.lg,
              padding: 18,
              boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 1000 }}>本局结束</div>
            <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 900 }}>
              得分：<b>{score}</b>　·　最高连击：<b>{bestCombo}</b>
            </div>

            <ScoreResult score={score} gameId="match" />

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  endCalledRef.current = false;
                  deckRef.current = [...cards].sort(() => Math.random() - 0.5);
                  offsetRef.current = 0;

                  setTimeLeft(MATCH_TIME);
                  setScore(0);
                  setCombo(0);
                  setBestCombo(0);
                  setDone(false);

                  loadNextBatch();

                  clearInterval(timerRef.current);
                  timerRef.current = setInterval(() => {
                    setTimeLeft((t) => {
                      if (t <= 1) {
                        clearInterval(timerRef.current);
                        setDone(true);
                        if (!endCalledRef.current) {
                          endCalledRef.current = true;
                          try {
                            onGameEnd?.(score);
                          } catch {}
                        }
                        return 0;
                      }
                      return t - 1;
                    });
                  }, 1000);
                }}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                再来一局
              </button>

              <button
                onClick={onExit}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                返回大厅
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const timePct = (timeLeft / MATCH_TIME) * 100;
  const timeColor = timeLeft > 15 ? "#22c55e" : timeLeft > 8 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "8px 6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={onExit}
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          ← 返回大厅
        </button>
        <div style={{ fontWeight: 1000 }}>🔗 极速连连看</div>
        <div style={{ opacity: 0.7, fontWeight: 900 }}>剩余 {timeLeft}s</div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "8px 16px 40px" }}>
        <style>{`
          @keyframes matchShake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-8px)}
            40%{transform:translateX(8px)}
            60%{transform:translateX(-5px)}
            80%{transform:translateX(5px)}
          }
          @keyframes matchPop {
            0%{transform:scale(1)}
            40%{transform:scale(1.08)}
            100%{transform:scale(1)}
          }
        `}</style>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 20, fontWeight: 1000, color: THEME.colors.ink }}>🔗 {score}</span>
              {combo >= 2 && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                    color: "#fff",
                    animation: "matchPop 300ms ease",
                  }}
                >
                  🔥 {combo}连击
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onExit}
              style={{
                fontSize: 13,
                color: THEME.colors.muted,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              退出
            </button>
          </div>

          <div style={{ height: 10, background: "#e8eaf0", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div
              style={{
                height: "100%",
                borderRadius: 999,
                width: `${timePct}%`,
                background: `linear-gradient(90deg, ${timeColor}, ${timeColor}cc)`,
                transition: "width 1s linear, background 0.5s",
                boxShadow: `0 0 8px ${timeColor}88`,
              }}
            />
          </div>

          <div style={{ textAlign: "right", fontSize: 12, color: timeColor, fontWeight: 900, marginTop: 4 }}>{timeLeft}s</div>
        </div>

        <div style={{ animation: shake ? "matchShake 500ms ease" : "none", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {batch.map((card) => {
              const isMatched = matched.has(card.id);
              const isSelected = leftSel === card.id;
              const isFlashing = flash?.id === card.id;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleLeft(card.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "2px solid",
                    borderColor: isMatched ? "#bbf7d0" : isSelected ? THEME.colors.accent : border2,
                    background: isMatched ? "#f0fdf4" : isSelected ? "#eef2ff" : THEME.colors.surface,
                    color: isMatched ? "#16a34a" : isSelected ? THEME.colors.accent : THEME.colors.ink,
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: isMatched ? "default" : "pointer",
                    textAlign: "center",
                    transition: "all 150ms",
                    opacity: isMatched ? 0.45 : 1,
                    animation: isFlashing ? "matchPop 400ms ease" : "none",
                    boxShadow: isSelected ? "0 0 0 3px rgba(99,102,241,0.20)" : "none",
                    textDecoration: isMatched ? "line-through" : "none",
                  }}
                >
                  {card.term}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rightOrder.map((card) => {
              const isMatched = matched.has(card.id);
              const isSelected = rightSel === card.id;
              const isFlashing = flash?.id === card.id;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleRight(card.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "2px solid",
                    borderColor: isMatched ? "#bbf7d0" : isSelected ? "#ec4899" : border2,
                    background: isMatched ? "#f0fdf4" : isSelected ? "#fdf2f8" : THEME.colors.surface,
                    color: isMatched ? "#16a34a" : isSelected ? "#db2777" : THEME.colors.ink,
                    fontSize: 13,
                    fontWeight: 900,
                    cursor: isMatched ? "default" : "pointer",
                    textAlign: "center",
                    transition: "all 150ms",
                    opacity: isMatched ? 0.45 : 1,
                    animation: isFlashing ? "matchPop 400ms ease" : "none",
                    boxShadow: isSelected ? "0 0 0 3px rgba(236,72,153,0.20)" : "none",
                    textDecoration: isMatched ? "line-through" : "none",
                  }}
                >
                  {card.data?.zh || "（无释义）"}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: THEME.colors.faint, fontWeight: 900 }}>
          本轮 {matched.size}/{batch.length} · 最高连击 {bestCombo}
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
【二-3】SwipeGame：积分上报 + 破纪录提示
━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SwipeGame({ vocabItems, onExit, onGameEnd }) {
  const items = useMemo(() => shuffle(vocabItems || []), [vocabItems]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const [records, setRecords] = useState([]);
  const endCalledRef = useRef(false);

  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const pointerIdRef = useRef(null);

  const total = items.length;
  const current = items[idx] || null;

  const [cardMeaning, setCardMeaning] = useState("");
  const [isMeaningCorrect, setIsMeaningCorrect] = useState(true);

  useEffect(() => {
    if (done) return;
    if (!current) return;

    const correctMeaning = current?.data?.zh || "";
    const shouldBeCorrect = Math.random() < 0.5;

    if (shouldBeCorrect || items.length < 2) {
      setCardMeaning(correctMeaning);
      setIsMeaningCorrect(true);
      return;
    }

    const others = items.filter((x) => x?.id !== current?.id);
    const other = pickOne(others) || pickOne(items);
    const wrongMeaning = other?.data?.zh || "";

    if (!wrongMeaning || wrongMeaning === correctMeaning) {
      setCardMeaning(correctMeaning);
      setIsMeaningCorrect(true);
      return;
    }

    setCardMeaning(wrongMeaning);
    setIsMeaningCorrect(false);
  }, [idx, current, items, done]);

  useEffect(() => {
    if (!done) return;
    const score = correct * 10;
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    try {
      onGameEnd?.(score);
    } catch {}
  }, [done, correct, onGameEnd]);

  const threshold = useMemo(() => {
    if (typeof window === "undefined") return 120;
    return Math.max(120, window.innerWidth / 4);
  }, []);

  function judge(dir) {
    if (!current || animating || done) return;

    const choseMatch = dir === "right";
    const shouldMatch = isMeaningCorrect;
    const ok = choseMatch === shouldMatch;

    const correctMeaning = current?.data?.zh || "";
    setRecords((prev) => [
      ...prev,
      {
        term: current?.term || "",
        displayedMeaning: cardMeaning || "",
        correctMeaning: correctMeaning || "",
        wasCorrect: ok,
        isMatchQuestion: isMeaningCorrect,
        userChoseMatch: choseMatch,
      },
    ]);

    if (ok) setCorrect((c) => c + 1);

    setAnimating(true);
    const flyX = choseMatch
      ? typeof window !== "undefined"
        ? window.innerWidth
        : 1200
      : typeof window !== "undefined"
      ? -window.innerWidth
      : -1200;

    setDx(flyX);
    setDy(dy * 0.2);

    setTimeout(() => {
      setAnimating(false);
      setDragging(false);
      setDx(0);
      setDy(0);

      if (idx + 1 >= total) setDone(true);
      else setIdx((i) => i + 1);
    }, 320);
  }

  function onPointerDown(e) {
    if (done || animating) return;
    pointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }

  function onPointerMove(e) {
    if (!dragging || animating) return;
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
    const nx = e.clientX - startRef.current.x;
    const ny = e.clientY - startRef.current.y;
    setDx(nx);
    setDy(ny);
  }

  function onPointerUp(e) {
    if (!dragging || animating) return;
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;

    if (Math.abs(dx) >= threshold) {
      judge(dx > 0 ? "right" : "left");
      return;
    }

    setAnimating(true);
    setDx(0);
    setDy(0);
    setTimeout(() => setAnimating(false), 220);
    setDragging(false);
  }

  useEffect(() => {
    function onKey(e) {
      if (done) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        judge("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        judge("right");
      }
    }
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [done, animating, idx, isMeaningCorrect, cardMeaning]);

  const rotate = clamp(dx / 20, -15, 15);
  const showLeft = dx < -30;
  const showRight = dx > 30;

  const shellStyle = { minHeight: "100vh", background: THEME.colors.bg, color: THEME.colors.ink, padding: 14, boxSizing: "border-box" };
  const topBarStyle = { display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", padding: "8px 6px 14px", maxWidth: 980, margin: "0 auto" };
  const cardWrap = { position: "relative", maxWidth: 560, margin: "0 auto", paddingTop: 6 };

  const cardStyle = {
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.lg,
    boxShadow: "0 10px 30px rgba(15,23,42,0.10)",
    padding: "22px 18px",
    userSelect: "none",
    touchAction: "none",
    transform: `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`,
    transition: animating ? "transform 0.3s ease" : dragging ? "none" : "transform 0.2s ease",
  };

  const btnRow = { maxWidth: 560, margin: "14px auto 0", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" };

  const bigBtnBase = { height: 52, borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, fontSize: 16, fontWeight: 900, cursor: "pointer" };

  if (done) {
    const score = correct * 10;

    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <button
            onClick={onExit}
            style={{
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.pill,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ← 返回大厅
          </button>
          <div style={{ fontWeight: 1000 }}>🃏 单词探探</div>
          <div style={{ opacity: 0.7, fontWeight: 900 }}>完成</div>
        </div>

        <div
          style={{
            maxWidth: 760,
            margin: "22px auto 0",
            background: THEME.colors.surface,
            border: `1px solid ${THEME.colors.border}`,
            borderRadius: THEME.radii.lg,
            padding: 18,
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 1000, marginBottom: 8 }}>本轮结果</div>

          <div style={{ fontSize: 16, opacity: 0.9, fontWeight: 900, marginBottom: 6 }}>
            本轮积分：{score} 分
          </div>

          <ScoreResult score={score} gameId="swipe" />

          <div style={{ fontSize: 15, opacity: 0.85, fontWeight: 900, marginTop: 8 }}>
            正确：<b>{correct}</b> / <b>{total}</b>
          </div>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {records.map((r, i) => {
              const ok = !!r.wasCorrect;
              const bg = ok ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)";
              const border = ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
              const text = ok
                ? `✅ ${r.term} — 你选了${r.userChoseMatch ? "匹配" : "不匹配"}，正确`
                : `❌ ${r.term} — 展示的释义是「${r.displayedMeaning || "（空）"}」，正确释义是「${r.correctMeaning || "（空）"}」，你选错了`;

              return (
                <div
                  key={`${r.term}-${i}`}
                  style={{
                    padding: 12,
                    borderRadius: THEME.radii.md,
                    background: bg,
                    border: `1px solid ${border}`,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {text}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                endCalledRef.current = false;
                setIdx(0);
                setCorrect(0);
                setDone(false);
                setRecords([]);
                setDx(0);
                setDy(0);
              }}
              style={{
                ...bigBtnBase,
                padding: "0 16px",
                borderColor: THEME.colors.accent,
                color: THEME.colors.accent,
              }}
            >
              再来一轮
            </button>
            <button onClick={onExit} style={{ ...bigBtnBase, padding: "0 16px" }}>
              返回大厅
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={topBarStyle}>
        <button
          onClick={onExit}
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          ← 返回大厅
        </button>
        <div style={{ fontWeight: 1000 }}>🃏 单词探探</div>
        <div style={{ opacity: 0.75, fontWeight: 900 }}>
          {Math.min(idx + 1, total)} / {total}
        </div>
      </div>

      <div style={cardWrap}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 140, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 6,
              width: 140,
              height: 90,
              borderRadius: 999,
              background: "rgba(239,68,68,0.15)",
              filter: "blur(18px)",
              opacity: showLeft ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 4,
              right: 6,
              width: 140,
              height: 90,
              borderRadius: 999,
              background: "rgba(34,197,94,0.15)",
              filter: "blur(18px)",
              opacity: showRight ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          />
          <div style={{ position: "absolute", top: 14, left: 14, fontSize: 34, opacity: showLeft ? 1 : 0, transition: "opacity 0.15s ease" }}>❌</div>
          <div style={{ position: "absolute", top: 14, right: 14, fontSize: 34, opacity: showRight ? 1 : 0, transition: "opacity 0.15s ease" }}>✅</div>
        </div>

        <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={cardStyle}>
          <div style={{ fontSize: 14, opacity: 0.6, fontWeight: 900 }}>英文</div>
          <div style={{ fontSize: 34, fontWeight: 1000, marginTop: 6, wordBreak: "break-word" }}>{current?.term || "-"}</div>

          <div style={{ height: 14 }} />

          <div style={{ fontSize: 14, opacity: 0.6, fontWeight: 900 }}>中文释义</div>
          <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8, lineHeight: 1.35 }}>{cardMeaning || "（无释义）"}</div>

          <div style={{ marginTop: 16, fontSize: 12, opacity: 0.6, fontWeight: 900 }}>
            左滑❌：不匹配 / 右滑✅：匹配（也可用键盘 ← →）
          </div>
        </div>

        <div style={btnRow}>
          <button
            onClick={() => judge("left")}
            style={{
              ...bigBtnBase,
              background: "rgba(239,68,68,0.08)",
              borderColor: "rgba(239,68,68,0.25)",
            }}
          >
            ❌ 不匹配
          </button>

          <div style={{ textAlign: "center", opacity: 0.75, fontWeight: 1000 }}>剩余 {Math.max(0, total - idx)}</div>

          <button
            onClick={() => judge("right")}
            style={{
              ...bigBtnBase,
              background: "rgba(34,197,94,0.08)",
              borderColor: "rgba(34,197,94,0.25)",
            }}
          >
            ✅ 匹配
          </button>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
【二-4】RebuildGame：kind 字段单复数修复（白名单）+ 其余保持
━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function RebuildGame({ vocabItems, onExit, onGameEnd }) {
  const pool = useMemo(() => {
    const eligible = (vocabItems || [])
      .filter((x) => {
        const k = x?.kind;
        // 白名单：只允许 words 和 phrases；kind 不存在时默认保留（兼容旧数据）
        if (k && k !== "words" && k !== "phrases") return false;
        const ex = (x?.data?.example_en || "").trim();
        if (!ex) return false;
        const words = ex.split(/\s+/).filter(Boolean);
        return words.length >= 4;
      })
      .map((x) => ({
        ...x,
        __exampleWords: (x?.data?.example_en || "").trim().split(/\s+/).filter(Boolean),
      }));
    return shuffle(eligible);
  }, [vocabItems]);

  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [selected, setSelected] = useState([]);
  const [available, setAvailable] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | correct | wrong
  const [showAnswer, setShowAnswer] = useState(false);

  const [records, setRecords] = useState([]); // { term, answer, userAnswer, wasCorrect }
  const endCalledRef = useRef(false);

  const current = pool[i] || null;
  const total = pool.length;

  useEffect(() => {
    if (!current) return;
    const words = current.__exampleWords || [];
    setSelected([]);
    setAvailable(shuffle(words.map((w, idx) => ({ id: `${current.id}-${idx}-${w}`, text: w }))));
    setStatus("idle");
    setShowAnswer(false);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = useMemo(() => (current?.data?.example_en || "").trim(), [current]);
  const normalizedAnswer = useMemo(() => normalizeSentence(answer), [answer]);

  function selectedText(arr) {
    const s = arr || selected;
    return s.map((x) => x.text).join(" ");
  }

  const finished = i >= total;
  useEffect(() => {
    if (!finished) return;
    const pts = score * 10;
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    try {
      onGameEnd?.(pts);
    } catch {}
  }, [finished, score, onGameEnd]);

  function pushRecord(term, answerText, userAnswerText, wasCorrect) {
    setRecords((prev) => [
      ...prev,
      {
        term: term || "",
        answer: answerText || "",
        userAnswer: userAnswerText || "",
        wasCorrect: !!wasCorrect,
      },
    ]);
  }

  function checkAuto(currentSelected) {
    const userAns = (currentSelected || []).map((x) => x.text).join(" ");
    const now = normalizeSentence(userAns);
    if (!now) return;

    if (now === normalizedAnswer) {
      pushRecord(current?.term || "", answer, userAns, true);

      setStatus("correct");
      setScore((s) => s + 1);

      setTimeout(() => {
        if (i + 1 >= total) {
          setI(total);
          return;
        }
        setI((v) => v + 1);
      }, 950);
    }
  }

  function submit() {
    if (!current) return;

    const userAns = selectedText();
    const now = normalizeSentence(userAns);

    if (now === normalizedAnswer) {
      pushRecord(current?.term || "", answer, userAns, true);

      setStatus("correct");
      setScore((s) => s + 1);
      setTimeout(() => {
        if (i + 1 >= total) {
          setI(total);
          return;
        }
        setI((v) => v + 1);
      }, 950);
    } else {
      pushRecord(current?.term || "", answer, userAns, false);

      setStatus("wrong");
      setWrongCount((w) => w + 1);
      setShowAnswer(true);

      setTimeout(() => {
        setStatus("idle");
        setShowAnswer(false);
        setSelected([]);
        if (i + 1 >= total) {
          setI(total);
        } else {
          setI((v) => v + 1);
        }
      }, 2000);
    }
  }

  function moveToSelected(token) {
    if (status !== "idle") return;
    setAvailable((a) => a.filter((x) => x.id !== token.id));
    setSelected((s) => {
      const next = [...s, token];
      setTimeout(() => checkAuto(next), 0);
      return next;
    });
  }

  function moveToAvailable(token) {
    if (status !== "idle") return;
    setSelected((s) => s.filter((x) => x.id !== token.id));
    setAvailable((a) => shuffle([...a, token]));
  }

  const shellStyle = { minHeight: "100vh", background: THEME.colors.bg, color: THEME.colors.ink, padding: 14, boxSizing: "border-box" };

  const topBarStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 6px 10px", maxWidth: 980, margin: "0 auto" };

  const contentWrap = { maxWidth: 920, margin: "0 auto" };

  const card = { background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, boxShadow: "0 10px 28px rgba(15,23,42,0.08)", padding: 14 };

  const tokenBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 14,
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    boxShadow: "0 6px 14px rgba(15,23,42,0.06)",
    cursor: "pointer",
    fontWeight: 900,
    transition: "transform 0.12s ease, background 0.12s ease",
    userSelect: "none",
  };

  const answerTokenBorder =
    status === "correct" ? "rgba(34,197,94,0.7)" : status === "wrong" ? "rgba(239,68,68,0.75)" : THEME.colors.accent;

  if (!pool || pool.length === 0) {
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <button
            onClick={onExit}
            style={{
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.pill,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ← 返回大厅
          </button>
          <div style={{ fontWeight: 1000 }}>🧩 台词磁力贴</div>
          <div />
        </div>

        <div style={{ maxWidth: 720, margin: "16px auto 0" }}>
          <div style={{ ...card, textAlign: "center", padding: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 1000 }}>没有可用例句</div>
            <div style={{ opacity: 0.7, marginTop: 8, fontWeight: 900 }}>
              需要收藏带英文例句的词汇（example_en 不为空，且至少 4 个单词）。
            </div>
            <button
              onClick={onExit}
              style={{
                marginTop: 14,
                height: 44,
                padding: "0 16px",
                borderRadius: THEME.radii.pill,
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              返回大厅
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (i >= total) {
    const pts = score * 10;
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <button
            onClick={onExit}
            style={{
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.pill,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ← 返回大厅
          </button>
          <div style={{ fontWeight: 1000 }}>🧩 台词磁力贴</div>
          <div style={{ opacity: 0.7, fontWeight: 900 }}>完成</div>
        </div>

        <div style={{ maxWidth: 820, margin: "18px auto 0" }}>
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 22, fontWeight: 1000 }}>本轮结算</div>

            <div style={{ marginTop: 10, opacity: 0.9, fontWeight: 1000 }}>
              答对 <b>{score}</b> 题，获得 <b>{pts}</b> 分　·　错误次数：<b>{wrongCount}</b>
            </div>

            <ScoreResult score={pts} gameId="rebuild" />

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {records.map((r, idx) => {
                const ok = !!r.wasCorrect;
                return (
                  <div
                    key={`${r.term}-${idx}`}
                    style={{
                      padding: 12,
                      borderRadius: THEME.radii.md,
                      background: ok ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                      border: `1px solid ${ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                      fontWeight: 900,
                      lineHeight: 1.35,
                    }}
                  >
                    <div>{ok ? `✅ ${r.term} — 回答正确` : `❌ ${r.term} — 你的答案：${r.userAnswer || "（空）"}`}</div>
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, opacity: 0.75 }}>
                      {ok ? `正确句子：${r.answer}` : `正确答案：${r.answer}`}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  endCalledRef.current = false;
                  setI(0);
                  setScore(0);
                  setWrongCount(0);
                  setRecords([]);
                }}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                  color: THEME.colors.accent,
                }}
              >
                再来一轮
              </button>

              <button
                onClick={onExit}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                返回大厅
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = total ? (i / total) * 100 : 0;

  return (
    <div style={shellStyle}>
      <div style={topBarStyle}>
        <button
          onClick={onExit}
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          ← 返回大厅
        </button>
        <div style={{ fontWeight: 1000 }}>🧩 台词磁力贴</div>
        <div style={{ opacity: 0.75, fontWeight: 1000 }}>
          {Math.min(i + 1, total)} / {total}
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto 10px" }}>
        <div style={{ height: 8, background: THEME.colors.faint, borderRadius: 999, overflow: "hidden", border: `1px solid ${THEME.colors.border}` }}>
          <div style={{ width: `${progress}%`, height: "100%", background: THEME.colors.accent }} />
        </div>
      </div>

      <div style={contentWrap}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>当前词汇</div>
              <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 4, wordBreak: "break-word" }}>
                {current?.term || "-"}{" "}
                <span style={{ fontSize: 14, opacity: 0.7, fontWeight: 900 }}>{current?.data?.ipa ? `/${current.data.ipa}/` : ""}</span>
              </div>
              <div style={{ marginTop: 6, opacity: 0.85, fontWeight: 900 }}>{current?.data?.zh || "（无释义）"}</div>
              {current?.data?.example_zh ? (
                <div style={{ marginTop: 10, opacity: 0.55, fontWeight: 900, lineHeight: 1.35 }}>提示：{current.data.example_zh}</div>
              ) : null}
            </div>

            </div>

          <div style={{ height: 14 }} />

          <div style={{ border: `1px dashed ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: 12, minHeight: 86, background: "rgba(79,70,229,0.04)" }}>
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>答题区</div>

            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              {selected.length === 0 ? <div style={{ opacity: 0.55, fontWeight: 900 }}>点击下方方块，把句子拼回来…</div> : null}

              {selected.map((t) => (
                <div
                  key={t.id}
                  onClick={() => moveToAvailable(t)}
                  style={{
                    ...tokenBase,
                    borderColor: answerTokenBorder,
                    background: status === "correct" ? "rgba(34,197,94,0.10)" : status === "wrong" ? "rgba(239,68,68,0.10)" : THEME.colors.surface,
                    animation: status === "wrong" ? "shakeX 0.28s ease-in-out 0s 2" : "none",
                  }}
                >
                  {t.text}
                </div>
              ))}
            </div>

            {showAnswer ? (
              <div style={{ marginTop: 10, opacity: 0.85 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.65 }}>正确答案</div>
                <div style={{ fontWeight: 1000, marginTop: 4 }}>{answer}</div>
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button
                onClick={submit}
                disabled={status !== "idle"}
                style={{
                  height: 40,
                  padding: "0 14px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: status === "idle" ? "pointer" : "not-allowed",
                  fontWeight: 1000,
                  opacity: status === "idle" ? 1 : 0.6,
                }}
              >
                提交
              </button>
            </div>
          </div>

          <div style={{ height: 14 }} />

          <div style={{ padding: 2 }}>
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900, marginBottom: 8 }}>待选区</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {available.map((t) => (
                <div
                  key={t.id}
                  onClick={() => moveToSelected(t)}
                  style={{ ...tokenBase, background: "rgba(79,70,229,0.04)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(79,70,229,0.08)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(79,70,229,0.04)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {t.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shakeX {
          0% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
【二-5】BalloonGame：积分上报 + 破纪录提示
━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function BalloonGame({ vocabItems, onExit, onGameEnd }) {
  const items = useMemo(() => shuffle(vocabItems || []), [vocabItems]);
  const [started, setStarted] = useState(false);
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const endCalledRef = useRef(false);

  const [roundWord, setRoundWord] = useState(null);
  const [balloons, setBalloons] = useState([]);
  const [exploding, setExploding] = useState(null);
  const roundRef = useRef(0);

  const colors = ["#fb7185", "#60a5fa", "#34d399", "#fb923c", "#a78bfa", "#facc15"];

  function makeRound() {
    if (!items || items.length < 2) return;
    const rid = (roundRef.current += 1);

    const word = pickOne(items);
    const correctMeaning = word?.data?.zh || "";

    const otherMeanings = items
      .filter((x) => x?.id !== word?.id)
      .map((x) => x?.data?.zh || "")
      .filter(Boolean);

    const wrongs = shuffle(otherMeanings).slice(0, 5);
    const texts = shuffle([correctMeaning, ...wrongs]).slice(0, 6);

    const newBalloons = texts.map((txt, idx) => {
      const size = 80 + ((Math.random() * 31) | 0);
      const duration = 5.4 + Math.random() * 2.4;
      const left = Math.random() * 80 + 5;
      const c = colors[(Math.random() * colors.length) | 0];
      return {
        id: `${rid}-${idx}-${Math.random().toString(16).slice(2)}`,
        text: txt,
        correct: txt === correctMeaning,
        size,
        duration,
        left,
        color: c,
      };
    });

    setRoundWord(word);
    setExploding(null);
    setBalloons(newBalloons);

    setTimeout(() => playWord(word?.term), 50);
  }

  useEffect(() => {
    if (!started) return;
    makeRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  function loseHeart() {
    setHearts((h) => {
      const next = h - 1;
      if (next <= 0) {
        setGameOver(true);
        if (!endCalledRef.current) {
          endCalledRef.current = true;
          try {
            onGameEnd?.(score);
          } catch {}
        }
        return 0;
      }
      return next;
    });
  }

  function clickBalloon(b) {
    unlockAudio();
    if (gameOver) return;

    if (b.correct) {
      setExploding(b.id);
      setScore((s) => s + 10);
      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });

      try {
        if (navigator.vibrate) navigator.vibrate(20);
      } catch {}

      setTimeout(() => makeRound(), 420);
    } else {
      setExploding(b.id);
      setCombo(0);
      loseHeart();
      setTimeout(() => makeRound(), 520);
    }
  }

  function onMissBalloon() {
    if (gameOver) return;
    setCombo(0);
    loseHeart();
  }

  const shellStyle = { minHeight: "100vh", background: THEME.colors.bg, color: THEME.colors.ink, padding: 14, boxSizing: "border-box", overflow: "hidden" };
  const topBarStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 6px 10px", maxWidth: 980, margin: "0 auto" };

  const hud = { maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "center", padding: "0 6px" };

  const hudPill = {
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.pill,
    padding: "8px 12px",
    fontWeight: 1000,
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };

  if (gameOver) {
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <button
            onClick={onExit}
            style={{
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.pill,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ← 返回大厅
          </button>
          <div style={{ fontWeight: 1000 }}>🎧 盲听气球</div>
          <div />
        </div>

        <div style={{ maxWidth: 720, margin: "18px auto 0" }}>
          <div style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: 18, boxShadow: "0 12px 30px rgba(15,23,42,0.08)" }}>
            <div style={{ fontSize: 22, fontWeight: 1000 }}>游戏结束</div>
            <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 1000 }}>
              最终得分：<b>{score}</b>　·　最高连击：<b>{maxCombo}</b>
            </div>

            <ScoreResult score={score} gameId="balloon" />

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  endCalledRef.current = false;
                  setHearts(3);
                  setScore(0);
                  setCombo(0);
                  setMaxCombo(0);
                  setGameOver(false);
                  makeRound();
                }}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                再来一局
              </button>

              <button
                onClick={onExit}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                返回大厅
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const heartsText = Array.from({ length: 3 })
    .map((_, idx) => (idx < hearts ? "❤️" : "🤍"))
    .join("");

  if (!started) {
    return (
      <div style={{ ...shellStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
        <div style={{ fontSize: 48 }}>🎧</div>
        <div style={{ fontSize: 20, fontWeight: 1000 }}>盲听气球</div>
        <div style={{ fontSize: 14, color: THEME.colors.faint, fontWeight: 900, textAlign: "center", maxWidth: 280 }}>
          听到单词发音，点击含有正确中文释义的气球
        </div>
        <button
          onClick={async () => {
            await unlockAudio();
            setStarted(true);
          }}
          style={{ marginTop: 8, padding: "14px 40px", borderRadius: THEME.radii.pill, background: "#f59e0b", color: "#fff", border: "none", fontSize: 16, fontWeight: 1000, cursor: "pointer" }}
        >
          开始游戏 →
        </button>
        <button onClick={onExit} style={{ padding: "8px 20px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: "transparent", cursor: "pointer", fontWeight: 900 }}>返回大厅</button>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={topBarStyle}>
        <button
          onClick={onExit}
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          ← 返回大厅
        </button>
        <div style={{ fontWeight: 1000 }}>🎧 盲听气球</div>
        <button
          onClick={() => playWord(roundWord?.term)}
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 1000,
          }}
        >
          再听一遍 🔁
        </button>
      </div>

      <div style={hud}>
        <div style={{ ...hudPill, justifySelf: "start" }}>{heartsText}</div>
        <div style={{ ...hudPill, justifySelf: "center" }}>分数：{score}</div>
        <div style={{ ...hudPill, justifySelf: "end" }}>
          {combo >= 3 ? (
            <>
              🔥 combo x <span style={{ fontSize: 18 }}>{combo}</span>
            </>
          ) : (
            <>连击：{combo}</>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "14px auto 0", padding: "0 6px", opacity: 0.65, fontWeight: 900 }}>
        听发音，点击正确释义的气球
      </div>

      <div style={{ position: "relative", width: "100%", height: "78vh", marginTop: 6 }}>
        {balloons.map((b) => {
          const fontSize = clamp((b.size / 110) * 14, 12, 16);
          const isExploding = exploding === b.id;

          return (
            <div
              key={b.id}
              onClick={() => clickBalloon(b)}
              onAnimationEnd={() => {
                if (!isExploding) onMissBalloon();
              }}
              style={{
                position: "absolute",
                left: `${b.left}%`,
                bottom: "-140px",
                width: b.size,
                height: b.size,
                borderRadius: 999,
                background: b.color,
                boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 10,
                textAlign: "center",
                fontWeight: 1000,
                color: "#0b1220",
                cursor: "pointer",
                userSelect: "none",
                transform: "translateZ(0)",
                animation: `floatUp ${b.duration}s linear forwards`,
                opacity: isExploding ? 0 : 1,
                pointerEvents: isExploding ? "none" : "auto",
              }}
              title="点击"
            >
              <div style={{ fontSize, lineHeight: 1.15, filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.35))" }}>
                {b.text || "（无释义）"}
              </div>

              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "100%",
                  width: 2,
                  height: 62,
                  background: "rgba(15,23,42,0.25)",
                  transform: "translateX(-50%)",
                  borderRadius: 2,
                }}
              />

              {isExploding ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 42,
                    animation: "pop 0.35s ease-out forwards",
                  }}
                >
                  💥
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes floatUp {
          from { transform: translateY(0); }
          to { transform: translateY(-110vh); }
        }
        @keyframes pop {
          from { transform: scale(0.6); opacity: 0.3; }
          to { transform: scale(1.25); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━
【二-6】SpeedGame：积分上报 + 破纪录提示
━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SpeedGame({ vocabItems, onExit, onGameEnd }) {
  const items = useMemo(() => shuffle(vocabItems || []), [vocabItems]);

  const [round, setRound] = useState(0);
  const [word, setWord] = useState(null);
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [correctSide, setCorrectSide] = useState("left");

  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);

  const [gameOver, setGameOver] = useState(false);
  const [cracked, setCracked] = useState(false);

  const endCalledRef = useRef(false);

  const limitMs = useMemo(() => clamp(3000 - combo * 120, 1500, 3000), [combo]);
  const startTsRef = useRef(0);
  const rafRef = useRef(null);
  const [tRatio, setTRatio] = useState(1);

  function pickQuestion() {
    if (!items || items.length < 2) return;

    const w = pickOne(items);
    const correctMeaning = w?.data?.zh || "";
    const others = items.filter((x) => x?.id !== w?.id);
    const wrong = pickOne(others);
    const wrongMeaning = wrong?.data?.zh || "";

    const correctIsLeft = Math.random() < 0.5;

    setWord(w);
    setCorrectSide(correctIsLeft ? "left" : "right");
    setLeftText(correctIsLeft ? correctMeaning : wrongMeaning);
    setRightText(correctIsLeft ? wrongMeaning : correctMeaning);
    setCracked(false);
  }

  function stopTimer() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  function startTimer() {
    stopTimer();
    startTsRef.current = performance.now();
    setTRatio(1);

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTsRef.current;
      const ratio = clamp(1 - elapsed / limitMs, 0, 1);
      setTRatio(ratio);

      if (ratio <= 0) {
        endGame();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function endGame() {
    stopTimer();
    setCracked(true);
    setGameOver(true);

    if (!endCalledRef.current) {
      endCalledRef.current = true;
      try {
        onGameEnd?.(score);
      } catch {}
    }

    setCombo((c) => {
      setMaxCombo((m) => Math.max(m, c));
      return c;
    });
  }

  function answer(side) {
    if (gameOver) return;

    const ok = side === correctSide;
    stopTimer();

    if (ok) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      setScore((s) => s + 10 * nextCombo);
      setAnswered((n) => n + 1);

      try {
        if (navigator.vibrate) navigator.vibrate(30);
      } catch {}

      setRound((r) => r + 1);
    } else {
      setAnswered((n) => n + 1);
      setCombo(0);
      endGame();
    }
  }

  useEffect(() => {
    if (!items || items.length < 2) return;
    if (gameOver) return;
    pickQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, items]);

  useEffect(() => {
    if (!word || gameOver) return;
    startTimer();
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id, limitMs, gameOver]);

  useEffect(() => () => stopTimer(), []);

  const shellStyle = { minHeight: "100vh", background: THEME.colors.bg, color: THEME.colors.ink, boxSizing: "border-box" };

  const topHud = {
    position: "sticky",
    top: 0,
    zIndex: 5,
    padding: 12,
    background: "rgba(246,247,251,0.88)",
    backdropFilter: "blur(10px)",
    borderBottom: `1px solid ${THEME.colors.border}`,
  };

  const hudRow = { maxWidth: 980, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 };

  const pill = {
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.pill,
    padding: "8px 12px",
    fontWeight: 1000,
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  const wordArea = { maxWidth: 980, margin: "14px auto 0", padding: "0 14px" };

  const wordStyle = {
    fontSize: "clamp(28px, 6vw, 52px)",
    fontWeight: 1000,
    textAlign: "center",
    padding: "18px 12px",
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.lg,
    boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
    position: "relative",
    overflow: "hidden",
    textShadow: "0 1px 0 rgba(255,255,255,0.35)",
  };

  const flash = combo >= 5;
  const halo = combo >= 10;

  const barColor =
    tRatio > 0.66 ? "rgba(34,197,94,0.95)" : tRatio > 0.33 ? "rgba(234,179,8,0.95)" : "rgba(239,68,68,0.95)";

  const halves = {
    maxWidth: 980,
    margin: "14px auto 0",
    padding: "0 14px 18px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    minHeight: "45vh",
  };

  const halfBase = (bg) => ({
    borderRadius: THEME.radii.lg,
    border: `1px solid ${THEME.colors.border}`,
    boxShadow: "0 16px 34px rgba(15,23,42,0.10)",
    background: bg,
    color: "#0b1220",
    cursor: "pointer",
    userSelect: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 18,
    fontSize: 20,
    fontWeight: 1000,
  });

  if (gameOver) {
    return (
      <div style={shellStyle}>
        <div style={topHud}>
          <div style={hudRow}>
            <button onClick={onExit} style={{ ...pill, cursor: "pointer" }}>
              ← 返回大厅
            </button>
            <div style={{ fontWeight: 1000 }}>⚡ 极速二选一</div>
            <div style={{ opacity: 0.7, fontWeight: 900 }}>结算</div>
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: "18px auto 0", padding: "0 14px" }}>
          <div style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: 18, boxShadow: "0 12px 30px rgba(15,23,42,0.08)" }}>
            <div style={{ fontSize: 22, fontWeight: 1000 }}>本局结束</div>
            <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 1000 }}>最终得分：<b>{score}</b></div>
            <div style={{ marginTop: 6, opacity: 0.8, fontWeight: 1000 }}>
              最高连击：<b>{maxCombo}</b>　·　答题数：<b>{answered}</b>
            </div>

            <ScoreResult score={score} gameId="speed" />

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  endCalledRef.current = false;
                  setRound(0);
                  setCombo(0);
                  setMaxCombo(0);
                  setScore(0);
                  setAnswered(0);
                  setGameOver(false);
                  setCracked(false);
                }}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                再来一局
              </button>

              <button
                onClick={onExit}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                返回大厅
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...shellStyle, background: flash ? "linear-gradient(180deg, rgba(246,247,251,1), rgba(246,247,251,0.92))" : THEME.colors.bg }}>
      <div style={topHud}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 2px" }}>
          <div style={{ height: 6, borderRadius: 999, overflow: "hidden", border: `1px solid ${THEME.colors.border}`, background: THEME.colors.faint, marginBottom: 10 }}>
            <div style={{ width: `${tRatio * 100}%`, height: "100%", background: barColor, transition: "width 0.05s linear" }} />
          </div>

          <div style={hudRow}>
            <button onClick={onExit} style={{ ...pill, cursor: "pointer" }}>
              ← 返回大厅
            </button>

            <div style={{ ...pill, justifyContent: "center" }}>
              {combo >= 3 ? (
                <>
                  🔥 x <span style={{ fontSize: 18 }}>{combo}</span>
                </>
              ) : (
                <>连击：{combo}</>
              )}
            </div>

            <div style={{ ...pill, justifyContent: "center" }}>分数：{score}</div>
          </div>
        </div>
      </div>

      <div style={wordArea}>
        <div style={{ ...wordStyle, animation: flash ? "pulseBg 0.9s ease-in-out infinite" : "none" }}>
          {halo ? (
            <div
              style={{
                position: "absolute",
                inset: -20,
                borderRadius: 999,
                background: "radial-gradient(circle, rgba(250,204,21,0.25), transparent 60%)",
                animation: "halo 1.2s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          ) : null}

          <div style={{ position: "relative", zIndex: 2 }}>{word?.term || "-"}</div>

          {cracked ? (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
              {Array.from({ length: 14 }).map((_, k) => (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: `${(Math.random() * 100) | 0}%`,
                    top: `${(Math.random() * 100) | 0}%`,
                    width: `${80 + ((Math.random() * 220) | 0)}px`,
                    height: 1,
                    background: "rgba(15,23,42,0.35)",
                    transform: `rotate(${(Math.random() * 180) | 0}deg)`,
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 8, textAlign: "center", opacity: 0.65, fontWeight: 900 }}>3 秒内选对（连击越高越快）</div>
      </div>

      <div style={halves}>
        <div onClick={() => answer("left")} style={halfBase("rgba(239,68,68,0.24)")}>
          {leftText || "（无释义）"}
        </div>
        <div onClick={() => answer("right")} style={halfBase("rgba(59,130,246,0.22)")}>
          {rightText || "（无释义）"}
        </div>
      </div>

      <style>{`
        @keyframes pulseBg {
          0% { filter: brightness(1); }
          50% { filter: brightness(1.03); }
          100% { filter: brightness(1); }
        }
        @keyframes halo {
          0% { transform: scale(0.98); opacity: 0.65; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(0.98); opacity: 0.65; }
        }
      `}</style>
    </div>
  );
}

/* ----------------------------- Lobby Card ----------------------------- */

function GameCard({ title, subtitle, tag, color, emoji, disabled, onClick, spanFull }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      style={{
        position: "relative",
        background: THEME.colors.surface,
        border: `1px solid ${THEME.colors.border}`,
        borderLeft: `4px solid ${disabled ? THEME.colors.border : color}`,
        borderRadius: THEME.radii.lg,
        padding: 14,
        boxShadow: "0 10px 26px rgba(15,23,42,0.08)",
        cursor: disabled ? "not-allowed" : "pointer",
        minHeight: 118,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
        gridColumn: spanFull ? "1 / -1" : undefined,
        opacity: disabled ? 0.78 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 14px 32px rgba(15,23,42,0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 10px 26px rgba(15,23,42,0.08)";
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 26 }}>{emoji}</div>
          <div style={{ fontSize: 18, fontWeight: 1000, color: THEME.colors.ink }}>{title}</div>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7, fontWeight: 900, lineHeight: 1.35 }}>{subtitle}</div>

        <div style={{ marginTop: 10, display: "inline-flex" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 1000,
              padding: "6px 10px",
              borderRadius: THEME.radii.pill,
              background: disabled ? THEME.colors.faint : `${color}1A`,
              color: disabled ? THEME.colors.muted : color,
              border: `1px solid ${disabled ? THEME.colors.border : `${color}33`}`,
            }}
          >
            {tag}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <div style={{ fontWeight: 1000, color: disabled ? THEME.colors.muted : color }}>开始 →</div>
      </div>

      {disabled ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: THEME.radii.lg,
            background: "rgba(11,18,32,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
            textAlign: "center",
            fontWeight: 1000,
            color: THEME.colors.ink,
          }}
        >
          收藏更多词汇后解锁
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------- PracticeClient (export default) ----------------------------- */

export default function PracticeClient({ accessToken }) {
  const [activeGame, setActiveGame] = useState(null);
  // null | "bubble" | "match" | "swipe" | "rebuild" | "balloon" | "speed"

  const [me, setMe] = useState(null);
  const [vocabItems, setVocabItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ SSR hydration：初始值空对象，不在 SSR 阶段读 localStorage
  const [scores, setScores] = useState({});
  useEffect(() => {
    try {
      setScores(loadScores());
    } catch {
      setScores({});
    }
  }, []);

  const authFetch = useMemo(() => makeAuthFetch(accessToken), [accessToken]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const [meRes, vocabRes] = await Promise.all([
          authFetch(remote("/api/me")),
          authFetch(remote("/api/vocab_favorites")),
        ]);

        const meJson = meRes.ok ? await meRes.json() : null;
        const vocabJson = vocabRes.ok ? await vocabRes.json() : { items: [] };

        if (cancelled) return;
        setMe(meJson);
        setVocabItems(Array.isArray(vocabJson?.items) ? vocabJson.items : []);
      } catch {
        if (!cancelled) {
          setMe(null);
          setVocabItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const [showLeaderboard, setShowLeaderboard] = useState(false);

  function notEnough() {
    return (vocabItems?.length || 0) < 4;
  }

  function handleGameEnd(gameId, s) {
    const score = Number(s) || 0;
    const r = saveScore(gameId, score);

    try {
      window.__nailaScoreSavedMeta = window.__nailaScoreSavedMeta || {};
      if (r) window.__nailaScoreSavedMeta[gameId] = r;
    } catch {}

    try {
      setScores(loadScores());
    } catch {
      setScores((prev) => prev || {});
    }
  }

  // ------------------ 排行榜（假数据 + 真实用户混合）------------------

  const leaderboard = useMemo(() => {
    function seededRand(seed, index) {
      let h = 0;
      const str = seed + "lb" + String(index * 7919);
      for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
      }
      return Math.abs(h) / 2147483647;
    }

    const seed = me?.email || "guest";

    // 扁平名字库：100个，混合拼音+邮箱前缀风格，无规律
    const namePool = [
      "xiao_yu","breezy92","tangjun","forest_k","qinghe",
      "nova_li","zhuwei","pixel88","sunnyday","cfeng21",
      "mintleaf","haochen","sky_blue","rui2024","dandelion",
      "wuming","luckyx3","peach_bb","jiaming","comet77",
      "xlei","morning_z","tigger","baixue","echo_ran",
      "jingtao","spark_y","coconut","feifei9","breeze_w",
      "longfei","purple_m","xingchen","cloudy_q","ray2025",
      "hazel_x","zhiyuan","orbit_k","meimei","dusk_fan",
      "binbin","starfall","yuchen3","misty_l","foxrun",
      "caiyun","neon_j","huxiao","leafy_w","zephyr9",
      "xiaoxue","blaze_r","pengfei","cotton_y","storm88",
      "ruoxi","glitch_z","tianhao","maple_q","drift_c",
      "linlin","wave_xu","chengyu","panda_f","jade_w",
      "bowen","pixel_s","ruolin","echo99","sunny_t",
      "yanyan","ghost_li","mingze","velvet_r","crane_w",
      "junjun","amber_x","zhenyu","flash_q","brook_f",
      "xixi","cobalt_z","haoran","mint_y","blaze_j",
      "feiyu","dusk_w","jiahao","river_x","pearl_q",
      "momo_z","spark_f","yuxuan","stone_r","bloom_c",
      "leilei","prism_w","zhengyu","dew_x","lunar_j",
    ];

    // 用种子打乱名字库顺序，保证每个用户看到的顺序不同
    const shuffled = [...namePool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRand(seed, i) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 取前10个，保证不重复；分数强制梯度分散，每档间距至少15分
    const scoreSlots = [255, 238, 220, 198, 175, 155, 132, 110, 88, 65];
    const fakeUsers = shuffled.slice(0, 10).map((name, i) => {
      // 在每档基础分上加小幅随机抖动（±6），避免整齐感但不破坏梯度
      const jitter = Math.floor(seededRand(seed, i + 200) * 12) - 6;
      return { name, totalScore: scoreSlots[i] + jitter, isMe: false };
    });

    const myTotal = GAME_META.reduce((sum, m) => sum + Number(scores?.[m.id]?.best || 0), 0);
    const myName = me?.email ? me.email.split("@")[0].slice(0, 10) : null;

    const allEntries = [...fakeUsers];
    if (myName) allEntries.push({ name: myName, totalScore: myTotal, isMe: true });

    allEntries.sort((a, b) => b.totalScore - a.totalScore);
    return allEntries.slice(0, 10);
  }, [me, scores]);

  // ------------------ Game entry routing (按要求顺序) ------------------

  if (activeGame === "bubble") {
    if (notEnough()) return <NotEnoughView onBack={() => setActiveGame(null)} />;
    return (
      <BubbleSpellingGame
        vocabItems={vocabItems}
        onExit={() => setActiveGame(null)}
        onGameEnd={(s) => handleGameEnd("bubble", s)}
      />
    );
  }

  if (activeGame === "match") {
    if (notEnough()) return <NotEnoughView onBack={() => setActiveGame(null)} />;
    return (
      <MatchMadnessGame
        vocabItems={vocabItems}
        onExit={() => setActiveGame(null)}
        onGameEnd={(s) => handleGameEnd("match", s)}
      />
    );
  }

  if (activeGame === "swipe") {
    if (notEnough()) return <NotEnoughView onBack={() => setActiveGame(null)} />;
    return (
      <SwipeGame
        vocabItems={vocabItems}
        onExit={() => setActiveGame(null)}
        onGameEnd={(s) => handleGameEnd("swipe", s)}
      />
    );
  }

  if (activeGame === "rebuild") {
    if (notEnough()) return <NotEnoughView onBack={() => setActiveGame(null)} />;
    return (
      <RebuildGame
        vocabItems={vocabItems}
        onExit={() => setActiveGame(null)}
        onGameEnd={(s) => handleGameEnd("rebuild", s)}
      />
    );
  }

  if (activeGame === "balloon") {
    if (notEnough()) return <NotEnoughView onBack={() => setActiveGame(null)} />;
    return (
      <BalloonGame
        vocabItems={vocabItems}
        onExit={() => setActiveGame(null)}
        onGameEnd={(s) => handleGameEnd("balloon", s)}
      />
    );
  }

  if (activeGame === "speed") {
    if (notEnough()) return <NotEnoughView onBack={() => setActiveGame(null)} />;
    return (
      <SpeedGame
        vocabItems={vocabItems}
        onExit={() => setActiveGame(null)}
        onGameEnd={(s) => handleGameEnd("speed", s)}
      />
    );
  }

  // ------------------ Skeleton (fix hydration) ------------------
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14, boxSizing: "border-box", color: THEME.colors.ink }}>
        <style>{`@keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>

        {/* 顶栏 */}
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 6px 14px" }}>
          <Link href="/" style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", textDecoration: "none", color: THEME.colors.ink, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8 }}>
            ← 返回首页
          </Link>
          <div style={{ fontSize: 18, fontWeight: 1000 }}>🎮 游戏大厅</div>
          <div style={{ opacity: 0.5, fontWeight: 900, fontSize: 13 }}>加载中…</div>
        </div>

        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 6px" }}>
          {/* 统计卡片骨架 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 14 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ height: 72, borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, animation: "shimmer 1.4s ease-in-out infinite" }} />
            ))}
          </div>

          {/* 积分榜骨架 */}
          <div style={{ height: 192, borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, marginBottom: 14, animation: "shimmer 1.4s ease-in-out infinite" }} />

          {/* 游戏卡片骨架 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <div style={{ height: 118, borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, animation: "shimmer 1.4s ease-in-out infinite" }} />
            <div style={{ height: 118, borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, animation: "shimmer 1.4s ease-in-out infinite" }} />
            <div style={{ height: 118, borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, animation: "shimmer 1.4s ease-in-out infinite" }} />
            <div style={{ height: 118, borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, animation: "shimmer 1.4s ease-in-out infinite" }} />
            <div style={{ height: 118, borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, animation: "shimmer 1.4s ease-in-out infinite", gridColumn: "1 / -1" }} />
          </div>
        </div>
      </div>
    );
  }

  // ------------------ Lobby view ------------------

  const page = { minHeight: "100vh", background: THEME.colors.bg, color: THEME.colors.ink, padding: 14, boxSizing: "border-box" };

  const topBar = { maxWidth: 980, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 6px 14px" };

  const statGrid = { maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, padding: "0 6px" };

  const statCard = { background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: 14, boxShadow: "0 10px 26px rgba(15,23,42,0.06)" };

  const gamesGrid = { maxWidth: 980, margin: "14px auto 0", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, padding: "0 6px 18px" };

  const scoreSection = { maxWidth: 980, margin: "14px auto 0", padding: "0 6px" };

  const scoreContainer = {
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.lg,
    padding: "10px 14px",
    boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
  };

  const scoreTitleRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: `1px solid ${THEME.colors.border}`,
  };

  const scoreGrid = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4px 16px",
  };

  function ScoreLine({ meta, isLastRow }) {
    const info = scores?.[meta.id] || { best: 0, last: 0, playCount: 0 };
    const best = Number(info.best || 0);
    const playCount = Number(info.playCount || 0);
    const hasPlayed = playCount > 0;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 0",
          borderBottom: isLastRow ? "none" : `1px solid ${THEME.colors.border}`,
          fontSize: 13,
        }}
      >
        <span style={{ fontSize: 16 }}>{meta.emoji}</span>
        <span style={{ fontWeight: 1000, flex: 1, fontSize: 13 }}>{meta.name}</span>

        {hasPlayed ? (
          <span style={{ fontWeight: 1000, color: meta.color }}>
            最高 {best}分
            <span style={{ opacity: 0.5, fontSize: 11, marginLeft: 4, fontWeight: 900 }}>
              / {playCount}次
            </span>
          </span>
        ) : (
          <span style={{ opacity: 0.4, fontWeight: 900 }}>—</span>
        )}
      </div>
    );
  }

  return (
    <div style={page}>
      <style>{`
        .practice-games-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; max-width: 980px; margin: 14px auto 0; padding: 0 6px 18px; }
        .practice-score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
        .practice-score-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 980px; margin: 0 auto; padding: 0 6px; }
        .practice-lb-desktop { display: flex !important; }
        .practice-lb-mobile { display: none !important; }
        .practice-topbar-email { opacity: 0.7; font-weight: 900; }
        @media (max-width: 600px) {
          .practice-games-grid { grid-template-columns: 1fr; gap: 10px; padding: 0 4px 18px; }
          .practice-score-grid { grid-template-columns: 1fr; gap: 4px; }
          .practice-score-row { grid-template-columns: 1fr; padding: 0 4px; }
          .practice-lb-desktop { display: none !important; }
          .practice-lb-mobile { display: flex !important; }
          .practice-topbar-email { display: none; }
        }
      `}</style>
      <div style={topBar}>
        <Link
          href="/"
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            textDecoration: "none",
            color: THEME.colors.ink,
            fontWeight: 900,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ← 返回首页
        </Link>

        <div style={{ fontSize: 18, fontWeight: 1000 }}>🎮 游戏大厅</div>

        <div className="practice-topbar-email">{me?.email ? me.email : "未登录"}</div>
      </div>

      {/* 排行榜弹窗 */}
      {showLeaderboard && (
        <div onClick={() => setShowLeaderboard(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(11,18,32,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: THEME.colors.surface, borderRadius: THEME.radii.lg, border: `1px solid ${THEME.colors.border}`, boxShadow: "0 24px 60px rgba(11,18,32,0.18)", padding: "14px 16px", width: "100%", maxWidth: 360 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${THEME.colors.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 1000 }}>🥇 总分排行榜</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 900 }}>全站 Top 10</div>
                <button onClick={() => setShowLeaderboard(false)} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>关闭</button>
              </div>
            </div>
            {leaderboard.map((entry, idx) => {
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
              const isMe = entry.isMe;
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 8, marginBottom: 3, background: isMe ? "rgba(99,102,241,0.08)" : "transparent", border: isMe ? `1px solid rgba(99,102,241,0.18)` : "1px solid transparent" }}>
                  <div style={{ width: 22, textAlign: "center", fontSize: medal ? 15 : 12, fontWeight: 1000, color: THEME.colors.faint, flexShrink: 0 }}>{medal || `${idx + 1}`}</div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: isMe ? 1000 : 900, color: isMe ? THEME.colors.accent : THEME.colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}{isMe ? " (我)" : ""}</div>
                  <div style={{ fontSize: 13, fontWeight: 1000, color: isMe ? THEME.colors.accent : THEME.colors.ink, flexShrink: 0 }}>{entry.totalScore} 分</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 最高分 + 排行榜入口 */}
      <div className="practice-score-row">
        {/* 我的最高分 */}
        <div style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: "10px 14px", boxShadow: "0 4px 12px rgba(15,23,42,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${THEME.colors.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 1000 }}>🏆 我的最高分</div>
            <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 900 }}>游玩即自动记录</div>
          </div>
          <div className="practice-score-grid">
            {GAME_META.map((m, idx) => {
              const isLastRow = idx >= GAME_META.length - 2;
              return <ScoreLine key={m.id} meta={m} isLastRow={isLastRow} />;
            })}
          </div>
        </div>

        {/* 排行榜入口按钮（桌面+手机统一用弹窗）*/}
        <button
          onClick={() => setShowLeaderboard(true)}
          style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: "10px 14px", boxShadow: "0 4px 12px rgba(15,23,42,0.06)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${THEME.colors.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 1000, color: THEME.colors.ink }}>🥇 总分排行榜</div>
            <div style={{ fontSize: 18, opacity: 0.35, color: THEME.colors.ink }}>›</div>
          </div>
          {/* 预览前3名 */}
          {leaderboard.slice(0, 3).map((entry, idx) => {
            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
            const isMe = entry.isMe;
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "5px 0", borderBottom: idx < 2 ? `1px solid ${THEME.colors.border}` : "none" }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{medal}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: isMe ? 1000 : 900, color: isMe ? THEME.colors.accent : THEME.colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}{isMe ? " (我)" : ""}</span>
                <span style={{ fontSize: 13, fontWeight: 1000, color: isMe ? THEME.colors.accent : THEME.colors.faint, flexShrink: 0 }}>{entry.totalScore}分</span>
              </div>
            );
          })}
          <div style={{ marginTop: 10, fontSize: 12, color: THEME.colors.faint, fontWeight: 900, alignSelf: "center" }}>
            {leaderboard.findIndex(e => e.isMe) >= 0 ? `你当前排第 ${leaderboard.findIndex(e => e.isMe) + 1} 名 · 点击查看完整榜单` : "点击查看完整榜单"}
          </div>
        </button>
      </div>

      <div className="practice-games-grid">
        <GameCard
          emoji="🫧"
          title="气泡拼写"
          subtitle="拼出你看到的单词，点击字母气泡按顺序完成拼写"
          tag="拼写训练"
          color="#7c3aed"
          disabled={notEnough()}
          onClick={() => setActiveGame("bubble")}
        />

        <GameCard
          emoji="🔗"
          title="极速连连看"
          subtitle="30秒内快速配对英文与中文，连击越多分越高"
          tag="速记模式"
          color="#d97706"
          disabled={notEnough()}
          onClick={() => setActiveGame("match")}
        />

        <GameCard
          emoji="🃏"
          title="单词探探"
          subtitle="左滑❌ 右滑✅ 判断释义是否正确"
          tag="休闲模式"
          color="#ec4899"
          disabled={notEnough()}
          onClick={() => setActiveGame("swipe")}
        />

        <GameCard
          emoji="🧩"
          title="台词磁力贴"
          subtitle="点击方块，把打散的例句拼回去"
          tag="语感训练"
          color="#059669"
          disabled={notEnough()}
          onClick={() => setActiveGame("rebuild")}
        />

        <GameCard
          emoji="🎧"
          title="盲听气球"
          subtitle="听发音，点击正确释义的气球"
          tag="听力专精"
          color="#0891b2"
          disabled={notEnough()}
          onClick={() => setActiveGame("balloon")}
        />

        <GameCard
          emoji="⚡"
          title="极速二选一"
          subtitle="3秒内点击正确释义，连击拿高分"
          tag="挑战模式"
          color="#d97706"
          disabled={notEnough()}
          onClick={() => setActiveGame("speed")}
        />
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 6px", opacity: 0.65, fontWeight: 900 }}>
        {notEnough()
          ? "提示：去「我的收藏 → 词汇本」多收藏一些词汇，解锁全部游戏。"
          : "选一个游戏开始练习吧！"}
      </div>
    </div>
  );
}
