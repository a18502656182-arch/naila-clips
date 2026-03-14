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
  const a = [...arr];
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

async function playWord(term) {
  const t = (term || "").trim();
  if (!t) return;

  try {
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
      t
    )}&type=2`;
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    await audio.play();
    return;
  } catch (_) {}

  try {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  } catch (_) {}
}

/* ------------------------------ Fix #1: NotEnoughView moved outside ------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Game A: 🫧 气泡拼写 */
/* ------------------------------------------------------------------ */

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

function BubbleSpellingGame({ vocabItems, onExit }) {
  const cards = useMemo(() => shuffle(vocabItems || []), [vocabItems]);
  const [idx, setIdx] = useState(0);
  const [slots, setSlots] = useState([]);
  const [bubbles, setBubbles] = useState([]);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  const card = cards[idx];
  const isLast = idx === cards.length - 1;

  useEffect(() => {
    if (!card) return;
    initQuestion(card);
    playWord(card.term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, card?.id]);

  function initQuestion(c) {
    const term = c.term || "";
    const slotArr = term.split("").map((ch) => (ch === " " ? " " : null));
    setSlots(slotArr);

    const letters = term.split("").filter((ch) => ch !== " ");
    const distractorPool = "abcdefghijklmnopqrstuvwxyz";
    const termLetters = new Set(letters.map((l) => l.toLowerCase()));
    const distractors = distractorPool
      .split("")
      .filter((l) => !termLetters.has(l));
    const shuffledDistractors = [...distractors].sort(
      () => Math.random() - 0.5
    );
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
        shake: false,
        used: false,
      }))
    );

    setChecked(false);
    setIsCorrect(false);
    setSuccessAnim(false);
  }

  function handleBubbleClick(bubbleId) {
    if (checked) return;
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

      if (allCorrect) {
        setSuccessAnim(true);
        setTimeout(() => {
          if (isLast) onExit();
          else setIdx((i) => i + 1);
        }, 900);
      }
    }
  }

  function handlePlayAudio() {
    setPlayingAudio(true);
    playWord(card?.term);
    setTimeout(() => setPlayingAudio(false), 1500);
  }

  function handleNext() {
    if (isLast) onExit();
    else setIdx((i) => i + 1);
  }

  function handleReset() {
    initQuestion(card);
  }

  if (!card) return null;

  const filledCount = slots.filter((s) => s !== null && s !== " ").length;
  const totalLetters = (card.term || "")
    .split("")
    .filter((c) => c !== " ").length;

  const bubbleColors = [
    {
      bg: "linear-gradient(135deg,#6366f1,#4f46e5)",
      shadow: "rgba(99,102,241,0.35)",
    },
    {
      bg: "linear-gradient(135deg,#ec4899,#db2777)",
      shadow: "rgba(236,72,153,0.35)",
    },
    {
      bg: "linear-gradient(135deg,#06b6d4,#0891b2)",
      shadow: "rgba(6,182,212,0.35)",
    },
    {
      bg: "linear-gradient(135deg,#10b981,#059669)",
      shadow: "rgba(16,185,129,0.35)",
    },
    {
      bg: "linear-gradient(135deg,#f59e0b,#d97706)",
      shadow: "rgba(245,158,11,0.35)",
    },
    {
      bg: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
      shadow: "rgba(139,92,246,0.35)",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.colors.bg,
        padding: 14,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "8px 6px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
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
                border: `1px solid ${
                  playingAudio ? THEME.colors.accent : "#c7d2fe"
                }`,
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

          <div
            style={{
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {card.data?.zh && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#fffbeb",
                  borderRadius: THEME.radii.md,
                  border: "1px solid #fde68a",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: "#b45309",
                  }}
                >
                  中文含义　
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: THEME.colors.ink,
                  }}
                >
                  {card.data.zh}
                </span>
              </div>
            )}
            {card.data?.ipa && (
              <div
                style={{
                  padding: "8px 14px",
                  background: "#f8fafc",
                  borderRadius: THEME.radii.md,
                  border: `1px solid ${THEME.colors.border}`,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: THEME.colors.muted,
                  }}
                >
                  音标　
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: "monospace",
                    color: THEME.colors.muted,
                  }}
                >
                  {card.data.ipa}
                </span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: THEME.colors.muted,
                marginBottom: 10,
                textAlign: "center",
              }}
            >
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
                border: `2px dashed ${
                  checked ? (isCorrect ? "#22c55e" : "#ef4444") : "#c7d2fe"
                }`,
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
                      border: `2px solid ${
                        filled
                          ? letterCorrect
                            ? "#22c55e"
                            : "#ef4444"
                          : "#c7d2fe"
                      }`,
                      background: filled
                        ? letterCorrect
                          ? "#f0fdf4"
                          : "#fff5f5"
                        : "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 1000,
                      color: filled
                        ? letterCorrect
                          ? "#16a34a"
                          : "#dc2626"
                        : "#4f46e5",
                      transition: "all 200ms",
                      animation: filled && !checked ? "slotPop 300ms ease" : "none",
                      boxShadow: filled
                        ? `0 2px 8px ${
                            letterCorrect
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(239,68,68,0.15)"
                          }`
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
            <div
              style={{
                marginBottom: 20,
                padding: "12px 16px",
                borderRadius: THEME.radii.md,
                background: "#fff5f5",
                border: "1px solid #fecaca",
              }}
            >
              <div style={{ fontWeight: 1000, color: "#dc2626", marginBottom: 6 }}>
                ✗ 拼写有误
              </div>
              <div style={{ fontSize: 13, color: THEME.colors.ink }}>
                正确拼写：
                <strong style={{ color: "#dc2626", fontSize: 16 }}>
                  {" "}
                  {card.term}
                </strong>
              </div>
              {card.data?.zh && (
                <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 4 }}>
                  {card.data.zh}
                </div>
              )}
            </div>
          )}

          {checked && isCorrect && (
            <div
              style={{
                marginBottom: 20,
                padding: "12px 16px",
                borderRadius: THEME.radii.md,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 1000, color: "#16a34a", fontSize: 15 }}>
                ✓ 拼写正确！
              </div>
            </div>
          )}

          {!checked && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: THEME.colors.muted,
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                点击字母气泡填入答案
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  justifyContent: "center",
                  minHeight: 56,
                }}
              >
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

/* ------------------------------------------------------------------ */
/* Game B: 🔗 极速连连看（原 MatchMadnessGame 逻辑保留） */
/* ------------------------------------------------------------------ */

const MATCH_TIME = 30;
const BATCH_SIZE = 5;

function MatchMadnessGame({ vocabItems, onExit }) {
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

  const deckRef = useRef([...cards].sort(() => Math.random() - 0.5));
  const offsetRef = useRef(0);
  const timerRef = useRef(null);

  const [rightOrder, setRightOrder] = useState([]);

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

  function endGame() {
    clearInterval(timerRef.current);
    setDone(true);
  }

  useEffect(() => {
    loadNextBatch();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setDone(true);
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
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  deckRef.current = [...cards].sort(() => Math.random() - 0.5);
                  offsetRef.current = 0;
                  setTimeLeft(MATCH_TIME);
                  setScore(0);
                  setCombo(0);
                  setBestCombo(0);
                  setDone(false);
                  loadNextBatch();
                  timerRef.current = setInterval(() => {
                    setTimeLeft((t) => {
                      if (t <= 1) {
                        clearInterval(timerRef.current);
                        setDone(true);
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
  const timeColor =
    timeLeft > 15 ? "#22c55e" : timeLeft > 8 ? "#f59e0b" : "#ef4444";

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
          @keyframes matchShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
          @keyframes matchPop { 0%{transform:scale(1)} 40%{transform:scale(1.08)} 100%{transform:scale(1)} }
        `}</style>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 20, fontWeight: 1000, color: THEME.colors.ink }}>
                🔗 {score}
              </span>
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

          <div
            style={{
              height: 10,
              background: "#e8eaf0",
              borderRadius: 999,
              overflow: "hidden",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
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

          <div style={{ textAlign: "right", fontSize: 12, color: timeColor, fontWeight: 900, marginTop: 4 }}>
            {timeLeft}s
          </div>
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

/* ----------------------------- Game 1: Swipe (unchanged from your last version except already applied) ----------------------------- */
/* 这里为了节省篇幅，你现有 SwipeGame / BalloonGame / SpeedGame 保持不变即可（你上一版已符合要求）。
   如果你希望我把“整文件完整版（包含 Swipe/Balloon/Speed）”再次完整贴一遍，我也可以直接给你整份。
*/

/* ---------------------------- Game 2: Rebuild (Fix #2: closure bug) ---------------------------- */

function RebuildGame({ vocabItems, onExit }) {
  const pool = useMemo(() => {
    const eligible = (vocabItems || [])
      .filter((x) => {
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

  const answer = useMemo(() => {
    const ex = current?.data?.example_en || "";
    return ex.trim();
  }, [current]);

  const normalizedAnswer = useMemo(() => normalizeSentence(answer), [answer]);

  // ✅ Fix #2：checkAuto 不读闭包，改为参数
  function checkAuto(currentSelected) {
    const now = normalizeSentence((currentSelected || []).map((x) => x.text).join(" "));
    if (!now) return;
    if (now === normalizedAnswer) {
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

  function selectedText(arr) {
    return (arr || selected).map((x) => x.text).join(" ");
  }

  function submit() {
    if (!current) return;
    const now = normalizeSentence(selectedText());

    if (now === normalizedAnswer) {
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

    // ✅ Fix #2：在 setSelected 内部拿到 next，再 setTimeout(() => checkAuto(next))
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

  // 下面 UI 你保持原样即可（与上版一致）
  // ——为了让你复制即用，我这里仍给出完整 UI（与你上一版一致）

  const shellStyle = {
    minHeight: "100vh",
    background: THEME.colors.bg,
    color: THEME.colors.ink,
    padding: 14,
    boxSizing: "border-box",
  };

  const topBarStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 6px 10px",
    maxWidth: 980,
    margin: "0 auto",
  };

  const contentWrap = { maxWidth: 920, margin: "0 auto" };

  const card = {
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.lg,
    boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
    padding: 14,
  };

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
    status === "correct"
      ? "rgba(34,197,94,0.7)"
      : status === "wrong"
      ? "rgba(239,68,68,0.75)"
      : THEME.colors.accent;

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

  const finished = i >= total;

  if (finished) {
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

        <div style={{ maxWidth: 720, margin: "18px auto 0" }}>
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 22, fontWeight: 1000 }}>本轮结算</div>
            <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 900 }}>
              得分：<b>{score}</b> / <b>{total}</b>　·　错误次数：<b>{wrongCount}</b>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setI(0);
                  setScore(0);
                  setWrongCount(0);
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
        <div
          style={{
            height: 8,
            background: THEME.colors.faint,
            borderRadius: 999,
            overflow: "hidden",
            border: `1px solid ${THEME.colors.border}`,
          }}
        >
          <div style={{ width: `${progress}%`, height: "100%", background: THEME.colors.accent }} />
        </div>
      </div>

      <div style={contentWrap}>
        <div style={{ ...card }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>当前词汇</div>
              <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 4, wordBreak: "break-word" }}>
                {current?.term || "-"}{" "}
                <span style={{ fontSize: 14, opacity: 0.7, fontWeight: 900 }}>
                  {current?.data?.ipa ? `/${current.data.ipa}/` : ""}
                </span>
              </div>
              <div style={{ marginTop: 6, opacity: 0.85, fontWeight: 900 }}>
                {current?.data?.zh || "（无释义）"}
              </div>
              {current?.data?.example_zh ? (
                <div style={{ marginTop: 10, opacity: 0.55, fontWeight: 900, lineHeight: 1.35 }}>
                  提示：{current.data.example_zh}
                </div>
              ) : null}
            </div>

            <button
              onClick={() => playWord(current?.term)}
              title="播放发音"
              style={{
                width: 44,
                height: 44,
                borderRadius: THEME.radii.pill,
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface,
                cursor: "pointer",
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              🔊
            </button>
          </div>

          <div style={{ height: 14 }} />

          <div
            style={{
              border: `1px dashed ${THEME.colors.border}`,
              borderRadius: THEME.radii.lg,
              padding: 12,
              minHeight: 86,
              background: "rgba(79,70,229,0.04)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>答题区</div>

            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              {selected.length === 0 ? (
                <div style={{ opacity: 0.55, fontWeight: 900 }}>点击下方方块，把句子拼回来…</div>
              ) : null}

              {selected.map((t) => (
                <div
                  key={t.id}
                  onClick={() => moveToAvailable(t)}
                  style={{
                    ...tokenBase,
                    borderColor: answerTokenBorder,
                    background:
                      status === "correct"
                        ? "rgba(34,197,94,0.10)"
                        : status === "wrong"
                        ? "rgba(239,68,68,0.10)"
                        : THEME.colors.surface,
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
                  style={{
                    ...tokenBase,
                    background: "rgba(79,70,229,0.04)",
                  }}
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

/* ----------------------------- Lobby & PracticeClient ----------------------------- */

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
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7, fontWeight: 900, lineHeight: 1.35 }}>
          {subtitle}
        </div>

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
        <div style={{ fontWeight: 1000, color: disabled ? THEME.colors.muted : color }}>
          开始 →
        </div>
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

export default function PracticeClient({ accessToken }) {
  const [activeGame, setActiveGame] = useState(null);
  // null | "bubble" | "match" | "swipe" | "rebuild" | "balloon" | "speed"

  const [me, setMe] = useState(null);
  const [vocabItems, setVocabItems] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const stats = useMemo(() => {
    const total = vocabItems?.length || 0;
    const learning = (vocabItems || []).filter((x) => Number(x?.mastery_level) === 1).length;
    const mastered = (vocabItems || []).filter((x) => Number(x?.mastery_level) === 2).length;
    return { total, learning, mastered };
  }, [vocabItems]);

  function notEnough() {
    return (vocabItems?.length || 0) < 4;
  }

  if (activeGame === "bubble") {
    if (notEnough()) return <NotEnoughView onBack={() => setActiveGame(null)} />;
    return <BubbleSpellingGame vocabItems={vocabItems} onExit={() => setActiveGame(null)} />;
  }

  if (activeGame === "match") {
    if (notEnough()) return <NotEnoughView onBack={() => setActiveGame(null)} />;
    return <MatchMadnessGame vocabItems={vocabItems} onExit={() => setActiveGame(null)} />;
  }

  // 下面这些游戏你原文件里已经有：SwipeGame / BalloonGame / SpeedGame
  // 如果你把它们保留在同一文件中，这里照旧渲染即可：
  // if (activeGame === "swipe") { ... }
  // if (activeGame === "rebuild") { ... }
  // if (activeGame === "balloon") { ... }
  // if (activeGame === "speed") { ... }

  if (activeGame === "rebuild") {
    if (notEnough()) return <NotEnoughView onBack={() => setActiveGame(null)} />;
    return <RebuildGame vocabItems={vocabItems} onExit={() => setActiveGame(null)} />;
  }

  // Lobby view
  const page = {
    minHeight: "100vh",
    background: THEME.colors.bg,
    color: THEME.colors.ink,
    padding: 14,
    boxSizing: "border-box",
  };

  const topBar = {
    maxWidth: 980,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 6px 14px",
  };

  const statGrid = {
    maxWidth: 980,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    padding: "0 6px",
  };

  const statCard = {
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.lg,
    padding: 14,
    boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
  };

  const gamesGrid = {
    maxWidth: 980,
    margin: "14px auto 0",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    padding: "0 6px 18px",
  };

  return (
    <div style={page}>
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

        <div style={{ opacity: 0.7, fontWeight: 900 }}>
          {me ? (me.username || (me.email || "").split("@")[0] || "未登录") : "未登录"}
        </div>
      </div>

      <div style={statGrid}>
        <div style={statCard}>
          <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>📚 词汇总数</div>
          <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 8 }}>
            {loading ? "…" : stats.total}
          </div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>🔄 学习中</div>
          <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 8 }}>
            {loading ? "…" : stats.learning}
          </div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>✅ 已掌握</div>
          <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 8 }}>
            {loading ? "…" : stats.mastered}
          </div>
        </div>
      </div>

      <div style={gamesGrid}>
        <GameCard
          emoji="🫧"
          title="气泡拼写"
          subtitle="拼出你看到的单词，点击字母气泡按顺序完成拼写"
          tag="拼写训练"
          color="#7c3aed"
          disabled={loading ? true : notEnough()}
          onClick={() => setActiveGame("bubble")}
        />

        {/* ✅ Fix #3：emoji 改成 🔗 */}
        <GameCard
          emoji="🔗"
          title="极速连连看"
          subtitle="30秒内快速配对英文与中文，连击越多分越高"
          tag="速记模式"
          color="#d97706"
          disabled={loading ? true : notEnough()}
          onClick={() => setActiveGame("match")}
        />

        {/* 其他卡片保持你现有文件里的配置即可 */}
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 6px", opacity: 0.65, fontWeight: 900 }}>
        {loading
          ? "正在加载你的词汇本…"
          : notEnough()
          ? "提示：去「我的收藏 → 词汇本」多收藏一些词汇，解锁全部游戏。"
          : "选一个游戏开始练习吧！"}
      </div>
    </div>
  );
}
