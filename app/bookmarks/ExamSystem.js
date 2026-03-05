"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { THEME } from "../components/home/theme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);
function getToken() { try { return localStorage.getItem("sb_access_token") || null; } catch { return null; } }

async function updateMastery(updates) {
  const token = getToken();
  if (!token || updates.length === 0) return;
  try {
    await fetch(remote("/api/vocab_update_mastery"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ updates }),
    });
  } catch {}
}

// ── 音频播放 ──────────────────────────────────────────────
function playWord(term) {
  const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(term)}&type=2`);
  const fallback = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(term);
    u.lang = "en-US"; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };
  audio.onerror = fallback;
  audio.play().catch(fallback);
}

// ── 掌握程度标签 ──────────────────────────────────────────
function MasteryBadge({ level }) {
  const map = {
    0: { label: "新收藏", bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
    1: { label: "学习中", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    2: { label: "已掌握", bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  };
  const m = map[level ?? 0];
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: m.bg, color: m.color, border: `1px solid ${m.border}`, fontWeight: 700 }}>
      {level === 0 ? "⭐" : level === 1 ? "🔄" : "✅"} {m.label}
    </span>
  );
}

// ── 进度条 ────────────────────────────────────────────────
function ProgressBar({ current, total, onExit }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: THEME.colors.muted }}>第 {current + 1} 题 / 共 {total} 题</span>
        <button type="button" onClick={onExit} style={{ fontSize: 13, color: THEME.colors.muted, background: "none", border: "none", cursor: "pointer" }}>退出</button>
      </div>
      <div style={{ height: 6, background: "#e8eaf0", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", background: THEME.colors.accent, borderRadius: 999, width: `${(current + 1) / total * 100}%`, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// ── 极速连连看 ────────────────────────────────────────────
const MATCH_TIME = 30; // 每轮秒数
const BATCH_SIZE = 5;  // 每次几对

function MatchMadnessExam({ cards, onComplete, onExit }) {
  const [batch, setBatch] = useState([]);         // 当前这批词 [{id,term,zh}]
  const [leftSel, setLeftSel] = useState(null);   // 选中的英文 id
  const [rightSel, setRightSel] = useState(null); // 选中的中文 id
  const [matched, setMatched] = useState(new Set()); // 已消除的 id
  const [flash, setFlash] = useState(null);       // {id, ok} 闪烁反馈
  const [shake, setShake] = useState(false);      // 错误时屏幕抖动
  const [timeLeft, setTimeLeft] = useState(MATCH_TIME);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState([]);
  const deckRef = useRef([...cards].sort(() => Math.random() - 0.5));
  const offsetRef = useRef(0);
  const timerRef = useRef(null);

  // 右侧中文打乱顺序独立维护
  const [rightOrder, setRightOrder] = useState([]);

  function loadNextBatch() {
    const deck = deckRef.current;
    const start = offsetRef.current;
    if (start >= deck.length) { endGame(); return; }
    const next = deck.slice(start, start + BATCH_SIZE);
    offsetRef.current = start + next.length;
    setBatch(next);
    setMatched(new Set());
    setLeftSel(null); setRightSel(null);
    setRightOrder([...next].sort(() => Math.random() - 0.5));
  }

  function endGame() {
    clearInterval(timerRef.current);
    setDone(true);
    // 把 results 传给 onComplete，格式和其他模式一致
    onComplete(results);
  }

  useEffect(() => {
    loadNextBatch();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setDone(true); onComplete(results); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // 当一批全部消除，自动加载下一批
  useEffect(() => {
    if (batch.length > 0 && matched.size === batch.length) {
      setTimeout(loadNextBatch, 400);
    }
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
    // lId = 英文词的 id，rId = 中文对应的 id（同一个词的 id）
    const correct = lId === rId;
    if (correct) {
      const newMatched = new Set([...matched, lId]);
      setMatched(newMatched);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setBestCombo(b => Math.max(b, newCombo));
      setScore(s => s + 10 + newCombo * 2);
      setResults(prev => [...prev, { id: lId, term: batch.find(c => c.id === lId)?.term, correct: true, prevMastery: batch.find(c => c.id === lId)?.mastery_level ?? 0 }]);
      setFlash({ id: lId, ok: true });
      setTimeout(() => setFlash(null), 400);
    } else {
      setCombo(0);
      setTimeLeft(t => Math.max(0, t - 3)); // 扣3秒
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setResults(prev => [...prev, { id: lId, term: batch.find(c => c.id === lId)?.term, correct: false, prevMastery: batch.find(c => c.id === lId)?.mastery_level ?? 0 }]);
    }
    setLeftSel(null); setRightSel(null);
  }

  if (done) return null; // onComplete 已触发，让父层切换到结果页

  const timePct = timeLeft / MATCH_TIME * 100;
  const timeColor = timeLeft > 15 ? "#22c55e" : timeLeft > 8 ? "#f59e0b" : "#ef4444";

  return (
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
        @keyframes matchFadeOut {
          0%{opacity:1;transform:scale(1)}
          100%{opacity:0;transform:scale(0.85)}
        }
      `}</style>

      {/* 顶部状态栏 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ fontSize: 20, fontWeight: 950, color: THEME.colors.ink }}>⚡ {score}</span>
            {combo >= 2 && (
              <span style={{ fontSize: 13, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
                background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                color: "#fff", animation: "matchPop 300ms ease" }}>
                🔥 {combo}连击
              </span>
            )}
          </div>
          <button type="button" onClick={onExit} style={{ fontSize: 13, color: THEME.colors.muted, background: "none", border: "none", cursor: "pointer" }}>退出</button>
        </div>
        {/* 计时条 */}
        <div style={{ height: 10, background: "#e8eaf0", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{
            height: "100%", borderRadius: 999,
            width: `${timePct}%`,
            background: `linear-gradient(90deg, ${timeColor}, ${timeColor}cc)`,
            transition: "width 1s linear, background 0.5s",
            boxShadow: `0 0 8px ${timeColor}88`,
          }} />
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: timeColor, fontWeight: 800, marginTop: 4 }}>{timeLeft}s</div>
      </div>

      {/* 配对区 */}
      <div style={{
        animation: shake ? "matchShake 500ms ease" : "none",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
      }}>
        {/* 左侧英文 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {batch.map(card => {
            const isMatched = matched.has(card.id);
            const isSelected = leftSel === card.id;
            const isFlashing = flash?.id === card.id;
            return (
              <button key={card.id} type="button"
                onClick={() => handleLeft(card.id)}
                style={{
                  padding: "12px 14px", borderRadius: 14, border: "2px solid",
                  borderColor: isMatched ? "#bbf7d0" : isSelected ? THEME.colors.accent : THEME.colors.border2,
                  background: isMatched ? "#f0fdf4" : isSelected ? "#eef2ff" : THEME.colors.surface,
                  color: isMatched ? "#16a34a" : isSelected ? THEME.colors.accent : THEME.colors.ink,
                  fontSize: 14, fontWeight: 700, cursor: isMatched ? "default" : "pointer",
                  textAlign: "center", transition: "all 150ms",
                  opacity: isMatched ? 0.45 : 1,
                  animation: isFlashing ? "matchPop 400ms ease" : "none",
                  boxShadow: isSelected ? "0 0 0 3px rgba(99,102,241,0.20)" : "none",
                  textDecoration: isMatched ? "line-through" : "none",
                }}>
                {card.term}
              </button>
            );
          })}
        </div>

        {/* 右侧中文 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rightOrder.map(card => {
            const isMatched = matched.has(card.id);
            const isSelected = rightSel === card.id;
            const isFlashing = flash?.id === card.id;
            return (
              <button key={card.id} type="button"
                onClick={() => handleRight(card.id)}
                style={{
                  padding: "12px 14px", borderRadius: 14, border: "2px solid",
                  borderColor: isMatched ? "#bbf7d0" : isSelected ? "#ec4899" : THEME.colors.border2,
                  background: isMatched ? "#f0fdf4" : isSelected ? "#fdf2f8" : THEME.colors.surface,
                  color: isMatched ? "#16a34a" : isSelected ? "#db2777" : THEME.colors.ink,
                  fontSize: 13, fontWeight: 600, cursor: isMatched ? "default" : "pointer",
                  textAlign: "center", transition: "all 150ms",
                  opacity: isMatched ? 0.45 : 1,
                  animation: isFlashing ? "matchPop 400ms ease" : "none",
                  boxShadow: isSelected ? "0 0 0 3px rgba(236,72,153,0.20)" : "none",
                  textDecoration: isMatched ? "line-through" : "none",
                }}>
                {card.data?.zh || card.term}
              </button>
            );
          })}
        </div>
      </div>

      {/* 已消除进度提示 */}
      <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: THEME.colors.faint, fontWeight: 700 }}>
        本轮 {matched.size}/{batch.length} · 最高连击 {bestCombo}
      </div>
    </div>
  );
}

// ── 气泡消消乐拼写模式 ────────────────────────────────────
function BubbleSpellingExam({ cards, onComplete, onExit }) {
  const [idx, setIdx] = useState(0);
  const [slots, setSlots] = useState([]);       // 答案槽，每格是字母或null
  const [bubbles, setBubbles] = useState([]);   // 剩余可点击气泡 {letter, id, shake}
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState([]);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  const card = cards[idx];
  const isLast = idx === cards.length - 1;

  // 每题初始化
  useEffect(() => {
    if (!card) return;
    initQuestion(card);
    playWord(card.term);
  }, [idx, card?.id]);

  function initQuestion(c) {
    const term = c.term;
    // 答案槽：每个字母一格，空格保留为固定分隔，填入后存 {letter, correct}
    const slotArr = term.split("").map(ch => (ch === " " ? " " : null));
    setSlots(slotArr);
    // 打乱字母生成气泡（过滤空格，保留大小写原样展示但比较时忽略大小写）
    const letters = term.split("").filter(ch => ch !== " ");
    // 加入2~4个干扰字母
    const distractorPool = "abcdefghijklmnopqrstuvwxyz";
    const termLetters = new Set(letters.map(l => l.toLowerCase()));
    const distractors = distractorPool.split("").filter(l => !termLetters.has(l));
    const shuffledDistractors = [...distractors].sort(() => Math.random() - 0.5);
    const extraCount = Math.min(4, Math.max(2, Math.floor(letters.length * 0.4)));
    const extras = shuffledDistractors.slice(0, extraCount);
    const allLetters = [...letters, ...extras].sort(() => Math.random() - 0.5);
    setBubbles(allLetters.map((letter, i) => ({ letter, id: i, shake: false, used: false })));
    setChecked(false);
    setIsCorrect(false);
    setSuccessAnim(false);
  }

  function handleBubbleClick(bubbleId) {
    if (checked) return;
    const bubble = bubbles.find(b => b.id === bubbleId && !b.used);
    if (!bubble) return;

    // 找第一个空槽（跳过固定空格）
    const emptyIdx = slots.findIndex((s, i) => s === null);
    if (emptyIdx === -1) return;

    const expectedLetter = card.term[emptyIdx];
    const correct = bubble.letter.toLowerCase() === expectedLetter.toLowerCase();

    // 无论对错，字母都填入槽，气泡消失
    const newSlots = [...slots];
    newSlots[emptyIdx] = { letter: bubble.letter, correct };
    setSlots(newSlots);
    setBubbles(prev => prev.map(b => b.id === bubbleId ? { ...b, used: true } : b));

    // 判断是否全部填完
    const allFilled = newSlots.every(s => s !== null);
    if (allFilled) {
      const allCorrect = newSlots.every(s => s === " " || s.correct);
      const userAnswer = newSlots.map(s => (s === " " ? " " : s.letter)).join("");
      const result = { id: card.id, term: card.term, correct: allCorrect, userAnswer, prevMastery: card.mastery_level ?? 0 };
      const newResults = [...results, result];
      setResults(newResults);
      setChecked(true);
      setIsCorrect(allCorrect);
      if (allCorrect) {
        setSuccessAnim(true);
        setTimeout(() => {
          if (isLast) onComplete(newResults);
          else setIdx(i => i + 1);
        }, 900);
      }
    }
  }

  function handlePlayAudio() {
    setPlayingAudio(true);
    playWord(card.term);
    setTimeout(() => setPlayingAudio(false), 1500);
  }

  function handleNext() {
    if (isLast) onComplete(results);
    else setIdx(i => i + 1);
  }

  function handleReset() {
    // 重置当前题，重新打乱
    initQuestion(card);
  }

  if (!card) return null;

  const filledCount = slots.filter(s => s !== null && s !== " ").length;
  const totalLetters = card.term.split("").filter(c => c !== " ").length;

  // 气泡颜色池
  const bubbleColors = [
    { bg: "linear-gradient(135deg,#6366f1,#4f46e5)", shadow: "rgba(99,102,241,0.35)" },
    { bg: "linear-gradient(135deg,#ec4899,#db2777)", shadow: "rgba(236,72,153,0.35)" },
    { bg: "linear-gradient(135deg,#06b6d4,#0891b2)", shadow: "rgba(6,182,212,0.35)" },
    { bg: "linear-gradient(135deg,#10b981,#059669)", shadow: "rgba(16,185,129,0.35)" },
    { bg: "linear-gradient(135deg,#f59e0b,#d97706)", shadow: "rgba(245,158,11,0.35)" },
    { bg: "linear-gradient(135deg,#8b5cf6,#7c3aed)", shadow: "rgba(139,92,246,0.35)" },
  ];

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "8px 16px 40px" }}>
      <style>{`
        @keyframes bubbleShake {
          0%,100%{transform:translateX(0) scale(1)}
          20%{transform:translateX(-6px) scale(1.05)}
          40%{transform:translateX(6px) scale(1.05)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(4px)}
        }
        @keyframes slotPop {
          0%{transform:scale(0.5);opacity:0}
          60%{transform:scale(1.2)}
          100%{transform:scale(1);opacity:1}
        }
        @keyframes successPulse {
          0%,100%{transform:scale(1)}
          50%{transform:scale(1.04)}
        }
        @keyframes bubbleAppear {
          0%{transform:scale(0);opacity:0}
          70%{transform:scale(1.15)}
          100%{transform:scale(1);opacity:1}
        }
      `}</style>

      <ProgressBar current={idx} total={cards.length} onExit={onExit} />

      <div style={{
        background: THEME.colors.surface, borderRadius: THEME.radii.lg,
        border: `1px solid ${THEME.colors.border}`,
        padding: "24px 20px 28px",
        boxShadow: "0 4px 16px rgba(11,18,32,0.08)",
        animation: successAnim ? "successPulse 400ms ease" : "none",
      }}>
        {/* 顶部：掌握度 + 发音按钮 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <MasteryBadge level={card.mastery_level ?? 0} />
          <button type="button" onClick={handlePlayAudio} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: THEME.radii.pill,
            background: playingAudio ? THEME.colors.accent : "#eef2ff",
            border: `1px solid ${playingAudio ? THEME.colors.accent : "#c7d2fe"}`,
            color: playingAudio ? "#fff" : THEME.colors.accent,
            fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 200ms",
          }}>
            {playingAudio ? "🔊 播放中..." : "🔊 听发音"}
          </button>
        </div>

        {/* 提示：中文释义 + 例句 */}
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {card.data?.zh && (
            <div style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: THEME.radii.md, border: "1px solid #fde68a" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309" }}>中文含义　</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: THEME.colors.ink }}>{card.data.zh}</span>
            </div>
          )}
          {card.data?.ipa && (
            <div style={{ padding: "8px 14px", background: "#f8fafc", borderRadius: THEME.radii.md, border: `1px solid ${THEME.colors.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.colors.muted }}>音标　</span>
              <span style={{ fontSize: 13, fontFamily: "monospace", color: THEME.colors.muted }}>{card.data.ipa}</span>
            </div>
          )}
          {card.data?.example_en && (
            <div style={{ padding: "10px 14px", background: "#eff6ff", borderRadius: THEME.radii.md, border: "1px solid #bfdbfe" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>例句　</span>
              <span style={{ fontSize: 13, color: THEME.colors.ink, fontStyle: "italic" }}>
                "{card.data.example_en.replace(new RegExp(card.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '＿＿＿')}"
              </span>
            </div>
          )}
        </div>

        {/* 答案槽 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.colors.muted, marginBottom: 10, textAlign: "center" }}>
            点击字母拼出答案 · {filledCount}/{totalLetters} 个字母
          </div>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center",
            minHeight: 52, padding: "8px 12px",
            background: "#f8fafc", borderRadius: THEME.radii.md,
            border: `2px dashed ${checked ? (isCorrect ? "#22c55e" : "#ef4444") : "#c7d2fe"}`,
            transition: "border-color 300ms",
          }}>
            {slots.map((s, i) => {
              if (s === " ") {
                return <div key={i} style={{ width: 14 }} />;
              }
              const filled = s && s !== " ";
              const letterCorrect = filled ? s.correct : null;
              return (
                <div key={i} style={{
                  width: 38, height: 42,
                  borderRadius: 10,
                  border: `2px solid ${filled ? (letterCorrect ? "#22c55e" : "#ef4444") : "#c7d2fe"}`,
                  background: filled ? (letterCorrect ? "#f0fdf4" : "#fff5f5") : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 800,
                  color: filled ? (letterCorrect ? "#16a34a" : "#dc2626") : "#4f46e5",
                  transition: "all 200ms",
                  animation: filled && !checked ? "slotPop 300ms ease" : "none",
                  boxShadow: filled ? `0 2px 8px ${letterCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}` : "none",
                }}>
                  {filled ? s.letter : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* 结果反馈（答错时显示） */}
        {checked && !isCorrect && (
          <div style={{
            marginBottom: 20, padding: "12px 16px", borderRadius: THEME.radii.md,
            background: "#fff5f5", border: "1px solid #fecaca",
          }}>
            <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>✗ 拼写有误</div>
            <div style={{ fontSize: 13, color: THEME.colors.ink }}>正确拼写：<strong style={{ color: "#dc2626", fontSize: 16 }}>{card.term}</strong></div>
            {card.data?.zh && <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 4 }}>{card.data.zh}</div>}
          </div>
        )}

        {/* 成功反馈 */}
        {checked && isCorrect && (
          <div style={{
            marginBottom: 20, padding: "12px 16px", borderRadius: THEME.radii.md,
            background: "#f0fdf4", border: "1px solid #bbf7d0", textAlign: "center",
          }}>
            <div style={{ fontWeight: 700, color: "#16a34a", fontSize: 15 }}>
              ✓ 拼写正确！{card.mastery_level < 2 ? " 掌握程度已提升 🎉" : " 继续保持 💪"}
            </div>
          </div>
        )}

        {/* 气泡区 */}
        {!checked && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.colors.muted, marginBottom: 10, textAlign: "center" }}>
              点击字母气泡填入答案
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", minHeight: 56 }}>
              {bubbles.filter(b => !b.used).map((b, i) => {
                const colorScheme = bubbleColors[b.id % bubbleColors.length];
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleBubbleClick(b.id)}
                    style={{
                      width: 48, height: 48,
                      borderRadius: "50%",
                      background: colorScheme.bg,
                      border: "none",
                      color: "#fff",
                      fontSize: 18, fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: `0 4px 14px ${colorScheme.shadow}`,
                      animation: b.shake
                        ? "bubbleShake 500ms ease"
                        : `bubbleAppear ${200 + i * 40}ms ease both`,
                      transition: "transform 100ms, box-shadow 100ms",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.style.boxShadow = `0 6px 20px ${colorScheme.shadow}`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 4px 14px ${colorScheme.shadow}`; }}
                  >
                    {b.letter}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 底部操作按钮 */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
          {!checked && (
            <button type="button" onClick={handleReset} style={{
              padding: "9px 20px", borderRadius: THEME.radii.pill,
              border: `1px solid ${THEME.colors.border2}`,
              background: THEME.colors.surface,
              fontSize: 13, fontWeight: 600, color: THEME.colors.muted, cursor: "pointer",
            }}>
              🔄 重新排列
            </button>
          )}
          {checked && !isCorrect && (
            <button type="button" onClick={handleNext} style={{
              padding: "10px 28px", borderRadius: THEME.radii.pill,
              background: THEME.colors.ink, color: "#fff",
              border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>
              {isLast ? "完成" : "下一题"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 选择题模式 ────────────────────────────────────────────
function MultipleChoiceExam({ cards, allVocab, onComplete, onExit }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState([]);
  const card = cards[idx];
  const isLast = idx === cards.length - 1;

  const options = useMemo(() => {
    if (!card) return [];
    const pool = (allVocab.length > 4 ? allVocab : cards).filter(c => c.id !== card.id && c.term !== card.term && c.term?.trim());
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const distractors = [];
    const seen = new Set();
    for (const c of shuffled) {
      if (!seen.has(c.term) && distractors.length < 3) { seen.add(c.term); distractors.push(c.term); }
    }
    while (distractors.length < 3 && distractors.length > 0) distractors.push(distractors[Math.floor(Math.random() * distractors.length)]);
    return [card.term, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5);
  }, [idx, card]);

  useEffect(() => { setSelected(null); setChecked(false); }, [idx]);
  if (!card) return null;

  const isCorrect = results[idx]?.correct;

  const check = () => {
    if (!selected || checked) return;
    const correct = selected === card.term;
    setResults(prev => [...prev, { id: card.id, term: card.term, correct, userAnswer: selected, prevMastery: card.mastery_level ?? 0 }]);
    setChecked(true);
  };

  const next = () => {
    if (isLast) onComplete(results); else setIdx(i => i + 1);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "8px 16px 40px" }}>
      <ProgressBar current={idx} total={cards.length} onExit={onExit} />
      <div style={{ background: THEME.colors.surface, borderRadius: THEME.radii.lg, border: `1px solid ${THEME.colors.border}`, padding: 28, boxShadow: "0 4px 16px rgba(11,18,32,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <MasteryBadge level={card.mastery_level ?? 0} />
        </div>
        <div style={{ marginBottom: 24 }}>
          {card.data?.zh && <div style={{ padding: 14, background: "#fffbeb", borderRadius: THEME.radii.md, border: "1px solid #fde68a", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", marginBottom: 4 }}>中文含义</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: THEME.colors.ink }}>{card.data.zh}</div>
          </div>}
          {card.data?.example_en && <div style={{ padding: 14, background: "#eff6ff", borderRadius: THEME.radii.md, border: "1px solid #bfdbfe" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 4 }}>例句（划线处填空）</div>
            <div style={{ fontSize: 13, color: THEME.colors.ink, fontStyle: "italic" }}>"{card.data.example_en.replace(new RegExp(card.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '___')}"</div>
          </div>}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: THEME.colors.muted, marginBottom: 10 }}>请选择正确答案：</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {options.map((opt, i) => {
              const isSelected = selected === opt;
              const isCorrectOpt = opt === card.term;
              let bg = THEME.colors.surface, border = THEME.colors.border2, color = THEME.colors.ink;
              if (checked) {
                if (isCorrectOpt) { bg = "#f0fdf4"; border = "#22c55e"; color = "#15803d"; }
                else if (isSelected) { bg = "#fff5f5"; border = "#ef4444"; color = "#dc2626"; }
                else { bg = "#f9fafb"; color = THEME.colors.faint; }
              } else if (isSelected) { bg = "#eef2ff"; border = THEME.colors.accent; }
              return (
                <button key={i} type="button" onClick={() => !checked && setSelected(opt)} disabled={checked}
                  style={{ padding: "12px 16px", borderRadius: THEME.radii.md, border: `2px solid ${border}`, background: bg, color, fontSize: 14, fontWeight: isSelected || (checked && isCorrectOpt) ? 700 : 500, cursor: checked ? "default" : "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}>
                  <span>{opt}</span>
                  {checked && isCorrectOpt && <span style={{ color: "#16a34a" }}>✓</span>}
                  {checked && isSelected && !isCorrectOpt && <span style={{ color: "#dc2626" }}>✗</span>}
                </button>
              );
            })}
          </div>
        </div>
        {checked && <div style={{ marginBottom: 16, padding: 12, borderRadius: THEME.radii.md, background: isCorrect ? "#f0fdf4" : "#fff5f5", border: `1px solid ${isCorrect ? "#bbf7d0" : "#fecaca"}` }}>
          <div style={{ fontWeight: 700, color: isCorrect ? "#16a34a" : "#dc2626" }}>
            {isCorrect ? "✓ 正确！" + (card.mastery_level < 2 ? " 掌握程度已提升 🎉" : "") : `✗ 错误，正确答案是：${card.term}`}
          </div>
        </div>}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {!checked
            ? <button type="button" onClick={check} disabled={!selected} style={{ padding: "10px 28px", borderRadius: THEME.radii.pill, background: THEME.colors.ink, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: selected ? "pointer" : "not-allowed", opacity: selected ? 1 : 0.5 }}>检查答案</button>
            : <button type="button" onClick={next} style={{ padding: "10px 28px", borderRadius: THEME.radii.pill, background: THEME.colors.ink, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{isLast ? "完成" : "下一题"}</button>
          }
        </div>
      </div>
    </div>
  );
}

// ── 结果页 ────────────────────────────────────────────────
function ExamResults({ results, cards, onReview, onFinish }) {
  const [saved, setSaved] = useState(false);
  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const pct = total > 0 ? Math.round(correct / total * 100) : 0;
  const wrong = results.filter(r => !r.correct);
  const getCard = id => cards.find(c => c.id === id);

  useEffect(() => {
    if (results.length === 0) return;
    const updates = [];
    for (const r of results) {
      const prev = r.prevMastery ?? 0;
      if (r.correct && prev < 2) updates.push({ id: r.id, mastery_level: prev + 1 });
      if (!r.correct && prev === 2) updates.push({ id: r.id, mastery_level: 0 });
    }
    if (updates.length > 0) updateMastery(updates).then(() => setSaved(true));
    else setSaved(true);
  }, [results]);

  const upgrades = results.filter(r => r.correct && (r.prevMastery ?? 0) < 2).length;
  const downgrades = results.filter(r => !r.correct && (r.prevMastery ?? 0) === 2).length;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 16px 60px" }}>
      <div style={{ background: THEME.colors.surface, borderRadius: THEME.radii.lg, border: `1px solid ${THEME.colors.border}`, padding: 28, textAlign: "center", marginBottom: 20, boxShadow: "0 4px 16px rgba(11,18,32,0.08)" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪"}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: THEME.colors.ink, marginBottom: 4 }}>考试完成！</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: THEME.colors.accent, marginBottom: 4 }}>{correct} / {total}</div>
        <div style={{ fontSize: 15, color: THEME.colors.muted, marginBottom: 20 }}>正确率：{pct}%</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ padding: 12, background: "#f0fdf4", borderRadius: THEME.radii.md }}><div style={{ fontSize: 22, fontWeight: 900, color: "#16a34a" }}>{correct}</div><div style={{ fontSize: 11, color: "#15803d" }}>正确</div></div>
          <div style={{ padding: 12, background: "#fff5f5", borderRadius: THEME.radii.md }}><div style={{ fontSize: 22, fontWeight: 900, color: "#dc2626" }}>{total - correct}</div><div style={{ fontSize: 11, color: "#b91c1c" }}>错误</div></div>
          <div style={{ padding: 12, background: "#eff6ff", borderRadius: THEME.radii.md }}><div style={{ fontSize: 22, fontWeight: 900, color: "#2563eb" }}>{pct}%</div><div style={{ fontSize: 11, color: "#1d4ed8" }}>正确率</div></div>
        </div>
        {saved && upgrades > 0 && <div style={{ marginBottom: 8, padding: "8px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: THEME.radii.md, fontSize: 13, color: "#16a34a" }}>✓ {upgrades} 个词的掌握程度已自动提升</div>}
        {saved && downgrades > 0 && <div style={{ marginBottom: 8, padding: "8px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: THEME.radii.md, fontSize: 13, color: "#b45309" }}>⚠ {downgrades} 个已掌握的词答错，已重置为新收藏</div>}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8 }}>
          {wrong.length > 0 && <button type="button" onClick={onReview} style={{ padding: "10px 20px", borderRadius: THEME.radii.pill, background: THEME.colors.ink, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>复习错题 ({wrong.length})</button>}
          <button type="button" onClick={onFinish} style={{ padding: "10px 20px", borderRadius: THEME.radii.pill, background: wrong.length > 0 ? THEME.colors.surface : THEME.colors.ink, color: wrong.length > 0 ? THEME.colors.ink : "#fff", border: `1px solid ${THEME.colors.border2}`, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>完成</button>
        </div>
      </div>
      <div style={{ fontWeight: 800, fontSize: 15, color: THEME.colors.ink, marginBottom: 12 }}>答题详情</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map((r, i) => {
          const card = getCard(r.id);
          if (!card) return null;
          return (
            <div key={i} style={{ padding: 14, borderRadius: THEME.radii.md, border: `2px solid ${r.correct ? "#bbf7d0" : "#fecaca"}`, background: r.correct ? "#f0fdf4" : "#fff5f5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: THEME.colors.ink }}>{card.term}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <MasteryBadge level={card.mastery_level ?? 0} />
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: r.correct ? "#dcfce7" : "#fee2e2", color: r.correct ? "#16a34a" : "#dc2626" }}>{r.correct ? "✓ 正确" : "✗ 错误"}</span>
                </div>
              </div>
              {!r.correct && r.userAnswer && <div style={{ marginTop: 6, fontSize: 12, color: THEME.colors.muted }}>你的答案：<span style={{ color: "#dc2626", fontWeight: 600 }}>{r.userAnswer}</span></div>}
              {card.data?.zh && <div style={{ marginTop: 4, fontSize: 12, color: THEME.colors.muted }}>{card.data.zh}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 选卡弹窗 ──────────────────────────────────────────────
function ExamSetup({ cards, isOpen, onClose, onStart }) {
  const [selected, setSelected] = useState(new Set());
  const [mode, setMode] = useState("dictation");
  const [filter, setFilter] = useState("all");
  useEffect(() => { if (isOpen) setSelected(new Set(cards.map(c => c.id))); }, [isOpen, cards]);
  if (!isOpen) return null;

  const displayCards = filter === "unmastered" ? cards.filter(c => (c.mastery_level ?? 0) < 2) : cards;
  const toggle = id => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: THEME.colors.surface, borderRadius: THEME.radii.lg, width: "100%", maxWidth: 540, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.colors.border}`, fontWeight: 800, fontSize: 17 }}>开始练习</div>
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {/* 模式 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.colors.muted, marginBottom: 10 }}>考试类型</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["dictation", "🎮 气泡拼写", "点击字母气泡，拼出单词"],
                ["multiple_choice", "📝 选择题", "看提示，选正确单词"],
                ["match", "⚡ 极速连连看", "限时配对，越快越爽"],
                ["mixed", "🔀 混合", "随机穿插两种题型"],
              ].map(([val, label, desc]) => (
                <button key={val} type="button" onClick={() => setMode(val)} style={{ flex: 1, minWidth: 120, padding: "10px 12px", borderRadius: THEME.radii.md, border: `2px solid ${mode === val ? THEME.colors.accent : THEME.colors.border2}`, background: mode === val ? "#eef2ff" : THEME.colors.surface, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: mode === val ? THEME.colors.accent : THEME.colors.ink }}>{label}</div>
                  <div style={{ fontSize: 11, color: THEME.colors.faint, marginTop: 2 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>
          {/* 筛选 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[["all", "全部"], ["unmastered", "未掌握"]].map(([val, label]) => (
              <button key={val} type="button" onClick={() => { setFilter(val); setSelected(new Set((val === "unmastered" ? cards.filter(c => (c.mastery_level ?? 0) < 2) : cards).map(c => c.id))); }}
                style={{ padding: "6px 14px", borderRadius: THEME.radii.pill, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${filter === val ? THEME.colors.ink : THEME.colors.border2}`, background: filter === val ? THEME.colors.ink : THEME.colors.surface, color: filter === val ? "#fff" : THEME.colors.ink }}>
                {label}
              </button>
            ))}
          </div>
          {/* 选卡 */}
          <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.colors.muted }}>选择卡片（{selected.size}/{displayCards.length}）</span>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setSelected(new Set(displayCards.map(c => c.id)))} style={{ fontSize: 12, color: THEME.colors.accent, background: "none", border: "none", cursor: "pointer" }}>全选</button>
              <button type="button" onClick={() => setSelected(new Set())} style={{ fontSize: 12, color: THEME.colors.muted, background: "none", border: "none", cursor: "pointer" }}>清空</button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
            {displayCards.map(c => (
              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: THEME.radii.md, border: `1px solid ${selected.has(c.id) ? THEME.colors.accent : THEME.colors.border}`, cursor: "pointer", background: selected.has(c.id) ? "#eef2ff" : THEME.colors.surface }}>
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: THEME.colors.ink }}>{c.term}</div>
                  <div style={{ fontSize: 11, color: THEME.colors.faint }}>{c.kind === "words" ? "单词" : c.kind === "phrases" ? "短语" : "地道表达"}{c.data?.zh ? ` · ${c.data.zh}` : ""}</div>
                </div>
                <MasteryBadge level={c.mastery_level ?? 0} />
              </label>
            ))}
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${THEME.colors.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 20px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border2}`, background: THEME.colors.surface, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>取消</button>
          <button type="button" onClick={() => { if (selected.size === 0) { alert("请至少选择一张卡片"); return; } onStart(Array.from(selected), mode); }} style={{ padding: "9px 20px", borderRadius: THEME.radii.pill, background: THEME.colors.ink, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>开始考试</button>
        </div>
      </div>
    </div>
  );
}

// ── 主入口 ────────────────────────────────────────────────
export default function ExamSystem({ vocabItems, isSetupOpen, onSetupClose, onMasteryUpdated, onExamActiveChange }) {
  const [phase, setPhase] = useState(null);
  const [examCards, setExamCards] = useState([]);
  const [mode, setMode] = useState("dictation");
  const [results, setResults] = useState([]);
  const [exitConfirm, setExitConfirm] = useState(false);
  const pendingExitRef = useRef(null);

  const handleStart = (selectedIds, selectedMode) => {
    const cards = vocabItems.filter(c => selectedIds.includes(c.id));
    setExamCards([...cards].sort(() => Math.random() - 0.5));
    setMode(selectedMode);
    setResults([]);
    onSetupClose();
    onExamActiveChange?.(true);
    setPhase(selectedMode === "mixed" ? (Math.random() > 0.5 ? "dictation" : "multiple_choice") : selectedMode);
  };

  const handleComplete = (res) => { setResults(res); setPhase("results"); };

  const handleExit = () => {
    pendingExitRef.current = () => { setPhase(null); setExamCards([]); setResults([]); };
    setExitConfirm(true);
  };

  const handleReview = () => {
    const wrongIds = results.filter(r => !r.correct).map(r => r.id);
    setExamCards(prev => [...prev.filter(c => wrongIds.includes(c.id))].sort(() => Math.random() - 0.5));
    setResults([]);
    setPhase(mode === "mixed" ? (Math.random() > 0.5 ? "dictation" : "multiple_choice") : mode);
  };

  const handleFinish = () => {
    setPhase(null); setExamCards([]); setResults([]);
    onExamActiveChange?.(false);
    onMasteryUpdated?.();
  };

  if (phase === "dictation" || phase === "multiple_choice" || phase === "match" || phase === "results") {
    return (
      <>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
          {phase === "dictation" && <BubbleSpellingExam cards={examCards} onComplete={handleComplete} onExit={handleExit} />}
          {phase === "multiple_choice" && <MultipleChoiceExam cards={examCards} allVocab={vocabItems} onComplete={handleComplete} onExit={handleExit} />}
          {phase === "match" && <MatchMadnessExam cards={examCards} onComplete={handleComplete} onExit={handleExit} />}
          {phase === "results" && <ExamResults results={results} cards={examCards} onReview={handleReview} onFinish={handleFinish} />}
        </div>
        {exitConfirm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: THEME.colors.surface, borderRadius: THEME.radii.lg, padding: 24, maxWidth: 360, width: "100%", textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>退出考试？</div>
              <div style={{ fontSize: 13, color: THEME.colors.muted, marginBottom: 20 }}>当前进度将不会保存。</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button type="button" onClick={() => setExitConfirm(false)} style={{ padding: "9px 20px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border2}`, background: THEME.colors.surface, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>继续考试</button>
                <button type="button" onClick={() => { setExitConfirm(false); pendingExitRef.current?.(); onExamActiveChange?.(false); }} style={{ padding: "9px 20px", borderRadius: THEME.radii.pill, background: "#ef4444", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>退出</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return <ExamSetup cards={vocabItems} isOpen={isSetupOpen} onClose={onSetupClose} onStart={handleStart} />;
}
