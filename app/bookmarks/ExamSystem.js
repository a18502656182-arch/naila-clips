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

// ── 听写模式 ──────────────────────────────────────────────
function DictationExam({ cards, onComplete, onExit }) {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const nextBtnRef = useRef(null);
  const card = cards[idx];
  const isLast = idx === cards.length - 1;

  useEffect(() => {
    if (card) { setInput(""); setChecked(false); setTimeout(() => inputRef.current?.focus(), 50); playWord(card.term); }
  }, [idx]);

  useEffect(() => {
    if (checked && nextBtnRef.current) setTimeout(() => nextBtnRef.current?.focus(), 100);
  }, [checked]);

  if (!card) return null;
  const normalize = s => s.trim().toLowerCase().replace(/[^\w\s]/g, "");
  const isCorrect = results[idx]?.correct;

  const check = () => {
    if (checked) return;
    const correct = normalize(input) === normalize(card.term);
    const result = { id: card.id, term: card.term, correct, userAnswer: input.trim(), prevMastery: card.mastery_level ?? 0 };
    const newResults = [...results, result];
    setResults(newResults);
    setChecked(true);
    if (correct && !isLast) setTimeout(() => { setIdx(i => i + 1); }, 600);
    if (correct && isLast) setTimeout(() => onComplete(newResults), 600);
  };

  const next = () => { if (isLast) onComplete(results); else setIdx(i => i + 1); };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "8px 16px 40px" }}>
      <ProgressBar current={idx} total={cards.length} onExit={onExit} />
      <div style={{ background: THEME.colors.surface, borderRadius: THEME.radii.lg, border: `1px solid ${THEME.colors.border}`, padding: 28, boxShadow: "0 4px 16px rgba(11,18,32,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <MasteryBadge level={card.mastery_level ?? 0} />
        </div>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <button type="button" onClick={() => playWord(card.term)} style={{ width: 64, height: 64, borderRadius: "50%", background: THEME.colors.accent, border: "none", cursor: "pointer", fontSize: 28, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(79,70,229,0.3)" }}>▶</button>
          <div style={{ marginTop: 8, fontSize: 12, color: THEME.colors.faint }}>点击播放发音</div>
          {card.data?.ipa && <div style={{ marginTop: 4, fontSize: 13, color: THEME.colors.muted, fontFamily: "monospace" }}>{card.data.ipa}</div>}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: THEME.colors.muted, display: "block", marginBottom: 8 }}>
            {card.kind === "words" ? "请输入单词：" : card.kind === "phrases" ? "请输入短语：" : "请输入表达："}
          </label>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { checked ? next() : check(); } }}
            disabled={checked} placeholder="输入答案..."
            style={{ width: "100%", padding: "12px 16px", fontSize: 17, borderRadius: THEME.radii.md, border: `2px solid ${checked ? (isCorrect ? "#22c55e" : "#ef4444") : THEME.colors.border2}`, background: checked ? (isCorrect ? "#f0fdf4" : "#fff5f5") : THEME.colors.surface, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} />
        </div>
        {checked && (
          <div style={{ marginBottom: 16, padding: 14, borderRadius: THEME.radii.md, background: isCorrect ? "#f0fdf4" : "#fff5f5", border: `1px solid ${isCorrect ? "#bbf7d0" : "#fecaca"}` }}>
            <div style={{ fontWeight: 700, color: isCorrect ? "#16a34a" : "#dc2626", marginBottom: isCorrect ? 0 : 8 }}>
              {isCorrect ? "✓ 正确！" + (card.mastery_level < 2 ? " 掌握程度已提升 🎉" : "") : "✗ 错误"}
            </div>
            {!isCorrect && <>
              <div style={{ fontSize: 13, color: THEME.colors.ink }}>正确答案：<strong>{card.term}</strong></div>
              {card.data?.zh && <div style={{ marginTop: 8, fontSize: 13, padding: 10, background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}><span style={{ fontSize: 11, fontWeight: 700, color: "#b45309" }}>中文含义　</span>{card.data.zh}</div>}
              {card.data?.example_en && <div style={{ marginTop: 8, fontSize: 13, padding: 10, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}><span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>例句　</span>{card.data.example_en}</div>}
            </>}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          {!checked
            ? <button type="button" onClick={check} disabled={!input.trim()} style={{ padding: "10px 28px", borderRadius: THEME.radii.pill, background: THEME.colors.ink, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: input.trim() ? "pointer" : "not-allowed", opacity: input.trim() ? 1 : 0.5 }}>检查答案</button>
            : !isCorrect && <button ref={nextBtnRef} type="button" onClick={next} style={{ padding: "10px 28px", borderRadius: THEME.radii.pill, background: THEME.colors.ink, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{isLast ? "完成" : "下一题"}</button>
          }
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
            <div style={{ fontSize: 13, color: THEME.colors.ink, fontStyle: "italic" }}>"{card.data.example_en.replace(new RegExp(card.term, 'gi'), '___')}"</div>
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
    // 自动更新 mastery_level：答对升级，已掌握答错降回0
    const updates = [];
    for (const r of results) {
      const card = getCard(r.id);
      if (!card) continue;
      const prev = card.mastery_level ?? 0;
      if (r.correct && prev < 2) updates.push({ id: r.id, mastery_level: prev + 1 });
      if (!r.correct && prev === 2) updates.push({ id: r.id, mastery_level: 0 });
    }
    if (updates.length > 0) updateMastery(updates).then(() => setSaved(true));
    else setSaved(true);
  }, []);

  const upgrades = results.filter(r => { const c = getCard(r.id); return r.correct && (c?.mastery_level ?? 0) < 2; }).length;
  const downgrades = results.filter(r => { const c = getCard(r.id); return !r.correct && (c?.mastery_level ?? 0) === 2; }).length;

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
  const [filter, setFilter] = useState("all"); // all | unmastered
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
              {[["dictation", "🎧 听写", "播放发音，输入答案"], ["multiple_choice", "📝 选择题", "看提示，选正确单词"], ["mixed", "🔀 混合", "随机穿插两种题型"]].map(([val, label, desc]) => (
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
export default function ExamSystem({ vocabItems, isSetupOpen, onSetupClose, onMasteryUpdated }) {
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
    onMasteryUpdated?.(); // 通知父组件刷新词汇列表
  };

  if (phase === "dictation" || phase === "multiple_choice" || phase === "results") {
    return (
      <>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
          {phase === "dictation" && <DictationExam cards={examCards} onComplete={handleComplete} onExit={handleExit} />}
          {phase === "multiple_choice" && <MultipleChoiceExam cards={examCards} allVocab={vocabItems} onComplete={handleComplete} onExit={handleExit} />}
          {phase === "results" && <ExamResults results={results} cards={examCards} onReview={handleReview} onFinish={handleFinish} />}
        </div>
        {exitConfirm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: THEME.colors.surface, borderRadius: THEME.radii.lg, padding: 24, maxWidth: 360, width: "100%", textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>退出考试？</div>
              <div style={{ fontSize: 13, color: THEME.colors.muted, marginBottom: 20 }}>当前进度将不会保存。</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button type="button" onClick={() => setExitConfirm(false)} style={{ padding: "9px 20px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border2}`, background: THEME.colors.surface, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>继续考试</button>
                <button type="button" onClick={() => { setExitConfirm(false); pendingExitRef.current?.(); }} style={{ padding: "9px 20px", borderRadius: THEME.radii.pill, background: "#ef4444", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>退出</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return <ExamSetup cards={vocabItems} isOpen={isSetupOpen} onClose={onSetupClose} onStart={handleStart} />;
}
