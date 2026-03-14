"use client";

// app/clips/[id]/ClipDetailClient.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Hls from "hls.js";
import { THEME } from "../../components/home/theme";

// ─── 工具函数 ────────────────────────────────────────────────
function getToken() { try { return localStorage.getItem("sb_access_token") || null; } catch { return null; } }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

async function fetchJson(url, opts = {}) {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const err = new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function fmtSec(s) {
  const n = Number(s || 0);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  return `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
}

// 解析 seg.start/end：支持纯数字秒数 和 "分:秒" 字符串两种格式
function parseTime(val) {
  if (val === null || val === undefined || val === "") return 0;
  const n = Number(val);
  if (!isNaN(n)) return n;
  const str = String(val).trim();
  const parts = str.split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10), s = parseFloat(parts[1]);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10), m2 = parseInt(parts[1], 10), s = parseFloat(parts[2]);
    if (!isNaN(h) && !isNaN(m2) && !isNaN(s)) return h * 3600 + m2 * 60 + s;
  }
  return 0;
}




// 词汇收藏 API
async function apiFavAdd(term, clipId, kind, data) {
  try {
    const token = getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    await fetch(remote("/api/vocab_fav_add"), {
      method: "POST", headers,
      body: JSON.stringify({ term, clip_id: clipId, kind, data }),
    });
  } catch {}
}
async function apiFavDelete(term, clipId) {
  try {
    const token = getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    await fetch(remote("/api/vocab_fav_delete"), {
      method: "POST", headers,
      body: JSON.stringify({ term, clip_id: clipId }),
    });
  } catch {}
}
async function apiFavList() {
  try {
    const token = getToken();
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const r = await fetch(remote("/api/vocab_favorites"), { cache: "no-store", headers });
    const d = await r.json();
    return new Set((d?.items || []).map(x => x.term));
  } catch { return new Set(); }
}

function speakEn(text) {
  try {
    const src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`;
    new Audio(src).play().catch(() => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US"; u.rate = 0.95;
      window.speechSynthesis.speak(u);
    });
  } catch {}
}

function normForMatch(s) {
  return String(s || "").toLowerCase().replace(/'/g, "'").replace(/[^\w\s']/g, " ").replace(/\s+/g, " ").trim();
}
function findSegIdxForTerm(segments, term) {
  const q = normForMatch(term);
  if (!q) return -1;
  for (let i = 0; i < segments.length; i++) {
    if (normForMatch(segments[i]?.en || "").includes(q)) return i;
  }
  return -1;
}
function findSegIdxBySegmentId(segments, segmentId) {
  if (!segmentId) return -1;
  const sid = String(segmentId).trim();
  for (let i = 0; i < segments.length; i++) {
    if (String(segments[i]?.id || "").trim() === sid) return i;
  }
  return -1;
}

// 三种高亮颜色
const HIGHLIGHT_COLORS = {
  words:       { bg: "#fff1b8" }, // 黄色-单词
  phrases:     { bg: "#dbeafe" }, // 蓝色-短语
  expressions: { bg: "#dcfce7" }, // 绿色-地道表达
};

// buildHighlighter 接收 { term -> kind } 映射，三种词汇同时高亮显示不同颜色
function buildHighlighter(termKindMap) {
  const terms = Object.keys(termKindMap || {});
  const clean = Array.from(new Set(terms.map(t => String(t || "").trim()).filter(Boolean))).sort((a, b) => b.length - a.length);
  if (!clean.length) return (text) => text || "-";
  const re = new RegExp(`(${clean.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return (text, opts) => {
    const s = String(text || "");
    if (!s) return "-";
    return s.split(re).map((p, i) => {
      const normTerm = p.toLowerCase();
      const isMatch = clean.some(t => t.toLowerCase() === normTerm);
      if (!isMatch) return <span key={i}>{p}</span>;
      const kind = termKindMap[normTerm] || "words";
      const bg = (HIGHLIGHT_COLORS[kind] || HIGHLIGHT_COLORS.words).bg;
      if (opts?.cloze) {
        const revealed = opts.clozeRevealed?.[normTerm];
        return (
          <mark key={i}
            onClick={e => { e.stopPropagation(); opts.onClickTerm?.(p, e); }}
            style={{ background: revealed ? bg : "#d1d5db", color: revealed ? "inherit" : "transparent", padding: "0 3px", borderRadius: 6, cursor: "pointer", userSelect: "none" }}
          >{p}</mark>
        );
      }
      return (
        <mark key={i}
          onClick={opts?.onClickTerm ? (e => { e.stopPropagation(); opts.onClickTerm(p, e); }) : undefined}
          style={{ background: bg, padding: "0 3px", borderRadius: 6, cursor: opts?.onClickTerm ? "pointer" : "default" }}
        >{p}</mark>
      );
    });
  };
}
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    const fn = () => setM(!!mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [bp]);
  return m;
}

// ─── 骨架屏 ──────────────────────────────────────────────────
function SkeletonBlock({ w = "100%", h = 20, r = 8, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "rgba(11,18,32,0.08)",
      animation: "skPulse 1.4s ease-in-out infinite",
      ...style,
    }} />
  );
}

// ─── UI 组件 ────────────────────────────────────────────────
function Btn({ active, onClick, children, style }) {
  return (
    <button type="button" onClick={onClick} style={{
      border: `1px solid ${active ? THEME.colors.accent : THEME.colors.border2}`,
      background: active ? THEME.colors.accent : THEME.colors.surface,
      color: active ? "#fff" : THEME.colors.ink,
      borderRadius: THEME.radii.pill, padding: "6px 12px",
      cursor: "pointer", fontSize: 12, fontWeight: 700, ...style,
    }}>{children}</button>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg,
      background: THEME.colors.surface, boxShadow: THEME.colors.shadow, ...style,
    }}>{children}</div>
  );
}

function IconBtn({ title, onClick, active, children }) {
  return (
    <button type="button" title={title} onClick={onClick} style={{
      width: 34, height: 34, borderRadius: THEME.radii.pill,
      border: `1px solid ${active ? "#bfe3ff" : THEME.colors.border}`,
      background: active ? "#f3fbff" : THEME.colors.surface,
      cursor: "pointer", display: "grid", placeItems: "center", fontSize: 16,
    }}>{children}</button>
  );
}

// 普通双语/单语字幕行
function SubtitleRow({ seg, idx, active, onClick, subMode, rowRef, loopIdx, onToggleLoop, renderEn, dictationMap, recording, onRecordToggle, onRecordPlay, onRecordSave, onRecordDelete, onPlaySegment, onClickTerm, clozeMode, clozeRevealed }) {
  const isDictation = subMode === "dictation";
  const savedText = dictationMap?.[idx]?.input_text;
  const savedAt = dictationMap?.[idx]?.updated_at;
  const [showReveal, setShowReveal] = useState(false); // 听写行眼睛开关

  return (
    <div ref={rowRef} onClick={onClick} role="button" tabIndex={0} style={{
      border: `1px solid ${active ? "#bfe3ff" : THEME.colors.border}`,
      background: active ? "#f3fbff" : THEME.colors.surface,
      borderRadius: THEME.radii.md, padding: 12, cursor: "pointer",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 12, color: THEME.colors.faint, whiteSpace: "nowrap" }}>
          {fmtSec(seg.start)} – {fmtSec(seg.end)}
        </div>
        {!isDictation && (
          <button type="button" onClick={e => { e.stopPropagation(); onToggleLoop(idx); }} style={{
            border: `1px solid ${THEME.colors.border}`,
            background: loopIdx === idx ? THEME.colors.ink : THEME.colors.surface,
            color: loopIdx === idx ? "#fff" : THEME.colors.ink,
            borderRadius: THEME.radii.pill, padding: "2px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>循环</button>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
          {/* 单句播放按钮（视频播放这一句后暂停） */}
          {!isDictation && (
            <button type="button" title="播放这一句" onClick={e => { e.stopPropagation(); onPlaySegment(); }} style={{
              border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface,
              color: THEME.colors.ink, borderRadius: THEME.radii.pill,
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 13, flexShrink: 0,
            }}>▷</button>
          )}
          {/* 有录音时：播放 + 删除 + (未保存时显示保存) */}
          {!isDictation && recording?.url && !recording?.recording && (
            <>
              <button type="button" title={recording.playing ? "停止播放" : "播放录音"} onClick={e => { e.stopPropagation(); onRecordPlay(idx); }} style={{
                border: `1px solid ${recording.playing ? "#2563eb" : THEME.colors.border}`,
                background: recording.playing ? "#eff6ff" : THEME.colors.surface,
                color: recording.playing ? "#2563eb" : THEME.colors.ink,
                borderRadius: THEME.radii.pill,
                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 13, flexShrink: 0,
              }}>{recording.playing ? "⏸" : "🔊"}</button>
              <button type="button" title="删除录音" onClick={e => { e.stopPropagation(); onRecordDelete(idx); }} style={{
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface, color: "#ef4444",
                borderRadius: THEME.radii.pill,
                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 13, flexShrink: 0,
              }}>🗑</button>
              {!recording.saved && (
                <button type="button" title={recording.saving ? "保存中…" : "保存录音"} onClick={e => { e.stopPropagation(); onRecordSave(idx); }} disabled={recording.saving} style={{
                  border: `1px solid ${recording.saving ? THEME.colors.border : "#16a34a"}`,
                  background: recording.saving ? THEME.colors.surface : "#f0fdf4",
                  color: recording.saving ? THEME.colors.faint : "#16a34a",
                  borderRadius: THEME.radii.pill,
                  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: recording.saving ? "default" : "pointer", fontSize: 13, flexShrink: 0,
                }}>{recording.saving ? "…" : "💾"}</button>
              )}
              {recording.saved && (
                <span title="已保存" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#16a34a" }}>✅</span>
              )}
            </>
          )}
          {/* 录音按钮（没有录音时，或正在录音时显示） */}
          {!isDictation && (!recording?.url || recording?.recording) && (
            <button type="button" title={recording?.recording ? "停止录音" : "开始录音"} onClick={e => { e.stopPropagation(); onRecordToggle(idx); }} style={{
              border: `2px solid ${recording?.recording ? "#ef4444" : THEME.colors.border}`,
              background: recording?.recording ? "#fef2f2" : THEME.colors.surface,
              color: recording?.recording ? "#ef4444" : THEME.colors.muted,
              borderRadius: THEME.radii.pill,
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 14, flexShrink: 0,
              boxShadow: recording?.recording ? "0 0 0 3px rgba(239,68,68,0.2)" : "none",
            }}>🎙</button>
          )}
          {/* 听写行眼睛按钮 */}
          {isDictation && (
            <button type="button" title={showReveal ? "隐藏原文" : "查看原文"} onClick={e => { e.stopPropagation(); setShowReveal(x => !x); }} style={{
              border: "none", background: "transparent", cursor: "pointer",
              fontSize: 16, color: showReveal ? THEME.colors.accent : THEME.colors.faint, padding: 2,
            }}>{showReveal ? "👁" : "👁"}</button>
          )}
        </div>
      </div>
      {/* 听写模式 */}
      {isDictation ? (
        <div style={{ marginTop: 6 }}>
          {savedText ? (
            <div style={{ fontSize: 13, color: THEME.colors.ink, fontWeight: 600, lineHeight: 1.5 }}>{savedText}</div>
          ) : (
            <div style={{ fontSize: 13, color: THEME.colors.faint }}>...</div>
          )}
          {savedAt && <div style={{ fontSize: 11, color: THEME.colors.faint, marginTop: 2 }}>上次听写：{new Date(savedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>}
          {showReveal && (
            <div style={{ marginTop: 6, padding: "6px 8px", background: "#fff5f5", borderRadius: 6, border: "1px solid #fecaca" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{seg.en}</div>
              <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 2 }}>{seg.zh}</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 8, lineHeight: 1.55 }}>
          {(subMode === "bilingual" || subMode === "en") && (
            <div style={{ fontSize: 14, fontWeight: 700 }}>{renderEn ? renderEn(seg.en || "", { onClickTerm, cloze: clozeMode, clozeRevealed }) : (seg.en || "-")}</div>
          )}
          {(subMode === "bilingual" || subMode === "zh") && (
            <div style={{ marginTop: subMode === "bilingual" ? 6 : 0, fontSize: 13, color: THEME.colors.muted }}>{seg.zh || "（暂无中文）"}</div>
          )}
        </div>
      )}
    </div>
  );
}

// 阅读/中译英行 — 显示主语言，点箭头展开另一语言
function ReadingRow({ seg, idx, mode, renderEn, rowRef, onClick }) {
  const [expanded, setExpanded] = useState(false);
  // mode="reading": 主显英文，展开中文；mode="zh2en": 主显中文，展开英文
  const primary = mode === "reading"
    ? <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.55 }}>{renderEn ? renderEn(seg.en || "") : (seg.en || "-")}</div>
    : <div style={{ fontSize: 14, color: THEME.colors.muted, lineHeight: 1.55 }}>{seg.zh || "（暂无中文）"}</div>;
  const secondary = mode === "reading"
    ? <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.55, marginTop: 6 }}>{seg.zh || "（暂无中文）"}</div>
    : <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.55, marginTop: 6 }}>{renderEn ? renderEn(seg.en || "") : (seg.en || "-")}</div>;

  return (
    <div ref={rowRef} style={{
      borderBottom: `1px solid ${THEME.colors.border}`, padding: "10px 4px", cursor: "pointer",
    }} onClick={onClick}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 12, color: THEME.colors.faint, minWidth: 28, paddingTop: 2 }}>{idx + 1}</div>
        <div style={{ flex: 1 }}>
          {primary}
          {expanded && secondary}
        </div>
        <button type="button" onClick={e => { e.stopPropagation(); setExpanded(x => !x); }} style={{
          border: "none", background: "transparent", cursor: "pointer",
          fontSize: 14, color: THEME.colors.faint, paddingTop: 2, flexShrink: 0,
        }}>{expanded ? "▲" : "▼"}</button>
      </div>
    </div>
  );
}

function VocabCard({ v, kind, showZh, segments, onLocate, favSet, onToggleFav }) {
  const term = String(v.term || v.word || "").trim();
  const isFav = favSet?.has(term);
  const [collapsed, setCollapsed] = useState(false);

  let exampleEn = v.example_en || "";
  let exampleZh = v.example_zh || "";
  if (kind === "expressions") {
    const byId = findSegIdxBySegmentId(segments, v.segment_id);
    const idx = byId !== -1 ? byId : findSegIdxForTerm(segments, term);
    if (idx !== -1) { exampleEn = segments[idx]?.en || exampleEn; exampleZh = segments[idx]?.zh || exampleZh; }
  }

  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 900 }}>{term || "-"}</div>
          {v.ipa && <div style={{ marginTop: 4, fontSize: 12, color: THEME.colors.faint }}>/ {v.ipa} /</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <IconBtn title="听发音" onClick={() => v.audio_url ? new Audio(v.audio_url).play() : speakEn(term)}>🔊</IconBtn>
          <IconBtn title="收藏" active={isFav} onClick={() => onToggleFav(term, kind, v)}>{isFav ? "❤️" : "🤍"}</IconBtn>
          <IconBtn title="定位到字幕" onClick={() => {
            const byId = findSegIdxBySegmentId(segments, v.segment_id);
            const idx = byId !== -1 ? byId : findSegIdxForTerm(segments, term);
            if (idx !== -1) onLocate(idx);
          }}>📍</IconBtn>
          <IconBtn title={collapsed ? "展开" : "收起"} onClick={() => setCollapsed(x => !x)}>
            {collapsed ? "▾" : "▴"}
          </IconBtn>
        </div>
      </div>
      {!collapsed && (
        <>
          {kind !== "expressions" && v.meaning_en && (
            <div style={{ marginTop: 8, fontSize: 12, color: THEME.colors.muted, lineHeight: 1.5 }}>{v.meaning_en}</div>
          )}
          {showZh && v.meaning_zh && (
            <div style={{ marginTop: 8, border: "1px solid #ffe3a3", background: "#fff8e8", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#b86b00" }}>中文含义</div>
              <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.55 }}>{v.meaning_zh}</div>
            </div>
          )}
          {kind !== "expressions" && (exampleEn || exampleZh) && (
            <div style={{ marginTop: 10, border: "1px solid #cfe6ff", background: "#f3fbff", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#0b5aa6" }}>例句</div>
              {exampleEn && <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.55 }}>{exampleEn}</div>}
              {showZh && exampleZh && <div style={{ marginTop: 4, fontSize: 13, color: THEME.colors.muted, lineHeight: 1.55 }}>{exampleZh}</div>}
            </div>
          )}
          {kind === "expressions" && (exampleEn || exampleZh) && (
            <div style={{ marginTop: 10, border: "1px solid #cfe6ff", background: "#f3fbff", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#0b5aa6" }}>字幕原句</div>
              {exampleEn && <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.55 }}>{exampleEn}</div>}
              {showZh && exampleZh && <div style={{ marginTop: 4, fontSize: 13, color: THEME.colors.muted, lineHeight: 1.55 }}>{exampleZh}</div>}
            </div>
          )}
          {kind === "expressions" && showZh && v.use_case_zh && (() => {
            // 去掉 use_case_zh 开头的【字幕原句】和【中文翻译】两行，避免与上方卡片重复
            const cleaned = v.use_case_zh
              .replace(/^【字幕原句】[^\n]*\n?/, "")
              .replace(/^【中文翻译】[^\n]*\n?/, "")
              .replace(/^\n+/, "")
              .trim();
            return cleaned ? (
              <div style={{ marginTop: 10, border: "1px solid #e7e7ff", background: "#f6f6ff", borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#3c3ccf" }}>详细解析</div>
                <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{cleaned}</div>
              </div>
            ) : null;
          })()}
        </>
      )}
    </Card>
  );
}

// 点击高亮词弹出的迷你词汇卡
function TermPopup({ popup, onClose }) {
  if (!popup) return null;
  const { term, v, kind, x, y } = popup;
  return (
    <>
      {/* 遮罩：点外部关闭 */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
      <div style={{
        position: "fixed",
        left: Math.min(x, typeof window !== "undefined" ? window.innerWidth - 240 : x),
        top: Math.min(y, typeof window !== "undefined" ? window.innerHeight - 200 : y),
        zIndex: 9999,
        background: "#fff",
        border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: 16,
        boxShadow: "0 12px 40px rgba(11,18,32,0.18)",
        padding: "14px 16px",
        width: 220,
        maxWidth: "calc(100vw - 32px)",
        animation: "bIn 200ms cubic-bezier(.2,.9,.2,1)",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(11,18,32,0.07)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>✕</button>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 2 }}>{term}</div>
        {v?.ipa && <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>/ {v.ipa} /</div>}
        {v?.meaning_zh && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8, lineHeight: 1.5 }}>{v.meaning_zh}</div>
        )}
        {(v?.example_en || v?.example_zh) && (
          <div style={{ fontSize: 12, background: "#f3fbff", borderRadius: 10, padding: "7px 10px", border: "1px solid #cfe6ff", lineHeight: 1.55 }}>
            {v.example_en && <div style={{ color: "#0b5aa6", fontWeight: 600 }}>{v.example_en}</div>}
            {v.example_zh && <div style={{ color: "#64748b", marginTop: 3 }}>{v.example_zh}</div>}
          </div>
        )}
        <button onClick={() => { if (v?.audio_url) { new Audio(v.audio_url).play(); } else { speakEn(term); } }} style={{ marginTop: 8, border: "1px solid #e2e8f0", background: "transparent", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#64748b" }}>🔊 发音</button>
      </div>
    </>
  );
}

// 未登录收藏弹窗
function BookmarkLoginModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(11,18,32,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: THEME.colors.surface, borderRadius: THEME.radii.lg,
        border: `1px solid ${THEME.colors.border}`, boxShadow: "0 24px 60px rgba(11,18,32,0.18)",
        padding: 24, width: "100%", maxWidth: 380,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 22 }}>🤍</div>
          <div style={{ fontWeight: 900, fontSize: 16, color: THEME.colors.ink }}>收藏视频</div>
          <button type="button" onClick={onClose} style={{
            marginLeft: "auto", border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface, borderRadius: THEME.radii.md,
            padding: "6px 12px", cursor: "pointer", fontSize: 12,
          }}>关闭</button>
        </div>
        <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.7, marginBottom: 18 }}>
          请先登录，再收藏喜欢的视频。
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/login" style={{
            flex: 1, textAlign: "center", padding: "10px 0",
            borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border2}`,
            color: THEME.colors.ink, textDecoration: "none", fontSize: 13, fontWeight: 600,
          }}>去登录</a>
          <a href="/register" style={{
            flex: 1, textAlign: "center", padding: "10px 0",
            borderRadius: THEME.radii.pill, background: THEME.colors.ink,
            color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700,
          }}>去注册</a>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────
export default function ClipDetailClient({ clipId, initialItem, initialMe, initialDetails, initialBookmarked }) {
  const isMobile = useIsMobile();
  const router = useRouter();

  const [loading, setLoading] = useState(!initialItem);
  const [notFound, setNotFound] = useState(false);
  const [item, setItem] = useState(initialItem || null);
  const [me, setMe] = useState(initialMe || null);
  const [details, setDetails] = useState(initialDetails || null);
  // SSR 时 can_access 无法判断，需要等客户端验证完才能决定是否显示锁屏
  const [checkingAccess, setCheckingAccess] = useState(!!initialItem && !initialItem?.can_access);

  const [bookmarked, setBookmarked] = useState(initialBookmarked ?? false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [showBookmarkLoginModal, setShowBookmarkLoginModal] = useState(false);

  const [subMode, setSubMode] = useState("bilingual"); // bilingual | en | zh | dictation | reading | zh2en
  const [vocabOpen, setVocabOpen] = useState(false);
  const [vocabTab, setVocabTab] = useState("words");
  const [showZhExplain, setShowZhExplain] = useState(true);
  const [clozeMode, setClozeMode] = useState(false);          // 挖空模式（仅电脑端）
  const [clozeRevealed, setClozeRevealed] = useState({});     // { term: true } 已点击显示的词
  const [termPopup, setTermPopup] = useState(null);           // { term, v, kind, x, y } 点击高亮块弹窗

  // ── 听写 ──
  const [dictationMap, setDictationMap] = useState({}); // { [seg_index]: { input_text, updated_at } }
  const [dictInput, setDictInput] = useState("");
  const [dictShowAnswer, setDictShowAnswer] = useState(false);
  const dictSaveTimer = useRef(null);

  // ── 录音（支持云端保存）──
  // { [idx]: { url, blob, recording, playing, saved, remoteId, saving } }
  const [recordings, setRecordings] = useState({});
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(0); // video元素挂载时递增，触发timeupdate重绑
  const [activeSegIdx, setActiveSegIdx] = useState(-1);
  const [follow, setFollow] = useState(true);
  const [rate, setRate] = useState(1);
  const [loopIdx, setLoopIdx] = useState(-1);

  const mobileListRef = useRef(null);
  const desktopListRef = useRef(null);
  const rowRefs = useRef({});

  const [favSet, setFavSet] = useState(() => new Set());
  const [vCur, setVCur] = useState(0);
  const [vDur, setVDur] = useState(0);
  const [vPlaying, setVPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false); // 是否曾经开始播放，用于手机封面图
  const [coverImgReady, setCoverImgReady] = useState(false); // 封面图是否已加载完成
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  useEffect(() => {
    if (!me?.logged_in) return;
    apiFavList().then(set => setFavSet(set));
  }, [me?.logged_in]);

  // ── 加载听写历史 ──
  useEffect(() => {
    if (!clipId || !me?.logged_in) return;
    const token = getToken();
    if (!token) return;
    fetch(remote(`/api/dictation_list?clip_id=${clipId}`), {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      if (d?.map) setDictationMap(d.map);
    }).catch(() => {});
  }, [clipId, me?.logged_in]);

  // ── 听写输入同步到当前句 ──
  useEffect(() => {
    if (subMode !== "dictation") return;
    const idx = activeSegIdx >= 0 ? activeSegIdx : 0;
    const saved = dictationMap[idx]?.input_text || "";
    setDictInput(saved);
    setDictShowAnswer(false);
  }, [activeSegIdx, subMode]);

  // ── 自动保存听写（防抖500ms）──
  function saveDictation(segIdx, text) {
    // 立即更新本地 dictationMap，让字幕列表实时显示输入内容
    setDictationMap(prev => ({
      ...prev,
      [segIdx]: {
        ...prev[segIdx],
        input_text: text,
        updated_at: prev[segIdx]?.updated_at || new Date().toISOString(),
      },
    }));

    // 未登录时只更新本地，不保存后端
    if (!me?.logged_in || !clipId) return;
    clearTimeout(dictSaveTimer.current);
    dictSaveTimer.current = setTimeout(async () => {
      const token = getToken();
      if (!token) return;
      try {
        const r = await fetch(remote("/api/dictation_upsert"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clip_id: clipId, seg_index: segIdx, input_text: text }),
        });
        const d = await r.json();
        if (d?.ok) {
          // 用服务器返回的 updated_at 更新时间戳
          setDictationMap(prev => ({
            ...prev,
            [segIdx]: { input_text: text, updated_at: d.data?.updated_at || new Date().toISOString() },
          }));
        }
      } catch {}
    }, 500);
  }

  // ── 录音函数 ──
  async function toggleRecording(idx) {
    const cur = recordings[idx];
    if (cur?.recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null; // 清空旧的 recorder，防止删除后重录时事件残留
    audioChunksRef.current = [];
    if (audioPlayerRef.current) { audioPlayerRef.current.pause(); audioPlayerRef.current = null; }
    setRecordings(prev => {
      const next = {};
      Object.keys(prev).forEach(k => { next[k] = { ...prev[k], recording: false, playing: false }; });
      return { ...next, [idx]: { recording: true } }; // 不继承旧state，干净开始
    });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      // 最长3分钟自动停止
      const maxTimer = setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 3 * 60 * 1000);
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        clearTimeout(maxTimer);
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        // saved: false = 未保存，显示「听/删/存」三个按钮
        setRecordings(prev => ({ ...prev, [idx]: { blob, url, recording: false, playing: false, saved: false, remoteId: null } }));
      };
      mr.start();
    } catch {
      setRecordings(prev => ({ ...prev, [idx]: { ...prev[idx], recording: false } }));
    }
  }

  async function saveRecording(idx) {
    const rec = recordings[idx];
    if (!rec?.blob || rec.saved || rec.saving) return;
    const token = getToken();
    if (!token) return;
    setRecordings(prev => ({ ...prev, [idx]: { ...prev[idx], saving: true } }));
    try {
      const mimeType = rec.blob.type || "audio/webm";
      const seg = Array.isArray(details?.segments) ? details.segments[idx] : null;
      const duration_sec = seg ? (Number(seg.end || 0) - Number(seg.start || 0)) : null;
      // 转成 base64 通过 JSON 发送，避免 express.json 中间件和 Vercel rewrite 截断二进制流
      const arrayBuf = await rec.blob.arrayBuffer();
      // 分块转 base64，避免大文件时 spread operator 导致 stack overflow
      const uint8 = new Uint8Array(arrayBuf);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);
      const res = await fetch(remote("/api/recording_save"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: clipId, segment_idx: idx, duration_sec: duration_sec || 0, mime: mimeType, data: base64 }),
      });
      const d = await res.json();
      if (d?.ok) {
        setRecordings(prev => ({ ...prev, [idx]: { ...prev[idx], saving: false, saved: true, remoteId: d.id } }));
      } else {
        setRecordings(prev => ({ ...prev, [idx]: { ...prev[idx], saving: false } }));
      }
    } catch {
      setRecordings(prev => ({ ...prev, [idx]: { ...prev[idx], saving: false } }));
    }
  }

  async function deleteRecording(idx) {
    const rec = recordings[idx];
    if (!rec) return;
    // 停止播放
    if (audioPlayerRef.current) { audioPlayerRef.current.pause(); audioPlayerRef.current = null; }
    // 如果已保存到云端，调接口删除
    if (rec.saved && rec.remoteId) {
      const token = getToken();
      if (token) {
        try {
          await fetch(remote("/api/recording_delete"), {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ clip_id: clipId, segment_idx: idx }),
          });
        } catch {}
      }
    }
    // 本地释放 blob URL
    if (rec.url && rec.url.startsWith("blob:")) URL.revokeObjectURL(rec.url);
    setRecordings(prev => { const next = { ...prev }; delete next[idx]; return next; });
  }

  function togglePlayback(idx) {
    const rec = recordings[idx];
    if (!rec?.url) return;
    if (rec.playing) {
      audioPlayerRef.current?.pause();
      setRecordings(prev => ({ ...prev, [idx]: { ...prev[idx], playing: false } }));
      return;
    }
    if (audioPlayerRef.current) { audioPlayerRef.current.pause(); }
    const audio = new Audio(rec.url);
    audioPlayerRef.current = audio;
    setRecordings(prev => ({ ...prev, [idx]: { ...prev[idx], playing: true } }));
    audio.onended = () => setRecordings(prev => ({ ...prev, [idx]: { ...prev[idx], playing: false } }));
    audio.play();
  }

  // SSR 已提供所有数据，客户端只需补充登录状态和精确的 can_access
  useEffect(() => {
    if (!clipId) return;
    let mounted = true;
    async function run() {
      // 如果没有 SSR 数据（比如直接客户端导航），回退到完整 API
      if (!initialItem) {
        setLoading(true); setNotFound(false); setItem(null); setMe(null); setDetails(null);
        try {
          const d = await fetchJson(remote(`/api/clip_full?id=${clipId}`));
          if (!mounted) return;
          const gotItem = d?.item || null;
          setItem(gotItem); setMe(d?.me || null);
          if (!gotItem) { setNotFound(true); return; }
          if (gotItem?.title) document.title = `${gotItem.title} - 油管英语场景库`;
          let dj = d?.details_json ?? null;
          if (typeof dj === "string") { try { dj = JSON.parse(dj); } catch { dj = null; } }
          if (mounted) setDetails(dj ?? null);
        } catch (e) {
          if (e?.status === 404) setNotFound(true);
          if (mounted) setDetails(null);
        } finally {
          if (mounted) setLoading(false);
        }
        return;
      }

      // SSR 已提供基础数据，但 can_access 需要客户端用 token 重新验证
      // （SSR 渲染时没有用户 token，can_access 一律为 false）
      try {
        const d = await fetchJson(remote(`/api/clip_full?id=${clipId}`));
        if (!mounted) return;
        if (d?.item) setItem(prev => {
          const next = { ...(prev || {}), ...d.item };
          // cover_url 不变时不触发重渲染（避免手机封面图闪烁）
          if (prev && prev.cover_url === next.cover_url && prev.can_access === next.can_access) {
            return prev;
          }
          return next;
        });
        if (d?.me) setMe(d.me);
      } catch {} finally {
        if (mounted) setCheckingAccess(false);
      }
    }
    run();
    return () => { mounted = false; document.title = "油管英语场景库"; };
  }, [clipId]);

  // 加载云端已保存的录音
  useEffect(() => {
    if (!clipId) return;
    const token = getToken();
    if (!token) return;
    let mounted = true;
    async function loadRecordings() {
      try {
        const d = await fetchJson(remote(`/api/recording_list?clip_id=${clipId}`));
        if (!mounted || !d?.recordings?.length) return;
        const next = {};
        d.recordings.forEach(r => {
          next[r.segment_idx] = { url: r.url, blob: null, recording: false, playing: false, saved: true, remoteId: r.id };
        });
        setRecordings(prev => ({ ...next, ...prev })); // 本地未保存的优先
      } catch {}
    }
    loadRecordings();
    return () => { mounted = false; };
  }, [clipId]);

  // 客户端验证完成后：vip视频无权限 → 直接跳兑换页
  useEffect(() => {
    if (checkingAccess) return;
    if (item?.access_tier === "vip" && !item?.can_access) {
      router.replace("/redeem");
    }
  }, [checkingAccess, item?.access_tier, item?.can_access]);

  // hls.js 处理 HLS 播放（手机 Chrome / 安卓等不支持原生 m3u8 的浏览器）
  const hlsRef = useRef(null);
  const videoUrlRef = useRef(item?.video_url || null);
  const canAccessRef = useRef(item?.can_access || false);

  // 渲染阶段同步更新 ref（早于 useEffect，确保 videoCallbackRef 执行时能读到最新值）
  videoUrlRef.current = item?.video_url || null;
  canAccessRef.current = !!item?.can_access;

  // initHls 使用 ref，依赖数组为空，永远不会重新创建
  const initHls = useCallback((v) => {
    const url = videoUrlRef.current;
    if (!v || !url || !canAccessRef.current) return;
    // 已经加载过同一个 url，不重复初始化
    if (v.src && v.src === url) return;
    if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null; }
    // 只有 iOS Safari 才走原生 HLS（UA 里有 Safari 但没有 Chrome/Android）
    // 华为/安卓浏览器 canPlayType 也返回 maybe，但实际不支持原生 HLS，必须用 HLS.js
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    if (isIOS) {
      v.src = url;
      v.load();
      return;
    }
    if (!Hls.isSupported()) { v.src = url; return; }
    const hls = new Hls({ enableWorker: false });
    hlsRef.current = hls;
    hls.attachMedia(v);
    hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));
  }, []); // 空依赖，函数永不重建

  // video DOM 挂载时初始化一次
  const videoCallbackRef = useCallback((v) => {
    videoRef.current = v;
    if (v) { initHls(v); setVideoReady(x => x + 1); }
    else if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null; }
  }, [initHls]);

  // can_access 从 null 变为 true（认证完成）时，对已挂载的 video 重新触发 initHls
  useEffect(() => {
    if (item?.can_access && videoRef.current) {
      initHls(videoRef.current);
    }
  }, [item?.can_access, initHls]);





  useEffect(() => {
    // 有 token 就直接发，不等 me?.logged_in 确认（token 无效时 API 返回 401 忽略即可）
    // 如果 clip_full 已经返回了收藏状态，跳过此请求
    if (!clipId) return;
    if (initialBookmarked !== undefined && initialBookmarked !== null) return;
    const token = getToken();
    if (!token) return;
    const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
    fetch(remote("/api/bookmarks_has"), {
      method: "POST", headers,
      body: JSON.stringify({ clip_id: clipId }),
      cache: "no-store",
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setBookmarked(!!d?.has); })
      .catch(() => {});
  }, [clipId]);

  // 记录观看日志（用于手帐页热力图和今日任务）
  useEffect(() => {
    if (!clipId) return;
    const token = getToken();
    if (!token) return;
    fetch(remote("/api/view_log"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ clip_id: clipId }),
    }).catch(() => {});
  }, [clipId]);

  async function toggleBookmark() {
    if (!me?.logged_in) { setShowBookmarkLoginModal(true); return; }
    if (bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      const url = bookmarked ? remote("/api/bookmarks_delete") : remote("/api/bookmarks_add");
      const token = getToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(url, { method: "POST", headers, body: JSON.stringify({ clip_id: clipId }) });
      setBookmarked(v => !v);
    } catch {}
    setBookmarkLoading(false);
  }

  // 点击高亮词：挖空模式下揭示，否则弹出词汇卡片
  function handleClickTerm(term, e) {
    const normTerm = term.toLowerCase();
    if (clozeMode && !isMobile) {
      setClozeRevealed(prev => ({ ...prev, [normTerm]: true }));
      return;
    }
    const found = allVocabByTerm[normTerm];
    if (!found) return;
    const rect = e.target.getBoundingClientRect();
    setTermPopup({ term, v: found.v, kind: found.kind, x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY + 8 });
  }

  const segments = useMemo(() => Array.isArray(details?.segments) ? details.segments : [], [details]);
  const vocab = useMemo(() => {
    const v = details?.vocab || {};
    return {
      words: Array.isArray(v.words) ? v.words : [],
      phrases: Array.isArray(v.phrases) ? v.phrases : [],
      expressions: Array.isArray(v.expressions) ? v.expressions : Array.isArray(v.idioms) ? v.idioms : [],
    };
  }, [details]);
  const vocabList = useMemo(() =>
    vocabTab === "phrases" ? vocab.phrases : vocabTab === "expressions" ? vocab.expressions : vocab.words,
    [vocabTab, vocab]
  );

  // 全词汇 term → { v, kind } 映射，用于弹窗查找（不限当前 tab）
  const allVocabByTerm = useMemo(() => {
    const map = {};
    [["words", vocab.words], ["phrases", vocab.phrases], ["expressions", vocab.expressions]].forEach(([kind, arr]) => {
      (arr || []).forEach(v => {
        const t = String(v?.term || v?.word || "").trim().toLowerCase();
        if (t && !map[t]) map[t] = { v, kind };
      });
    });
    return map;
  }, [vocab]);

  // term -> kind 映射，三种词汇全部高亮（颜色不同）
  const termKindMap = useMemo(() => {
    const map = {};
    [["words", vocab.words], ["phrases", vocab.phrases], ["expressions", vocab.expressions]].forEach(([kind, arr]) => {
      (arr || []).forEach(v => {
        const t = String(v?.term || v?.word || "").trim().toLowerCase();
        if (t && !map[t]) map[t] = kind;
      });
    });
    return map;
  }, [vocab]);

  const renderEn = useMemo(() => buildHighlighter(termKindMap), [termKindMap]);

  // 构造带点击回调的 renderEn（供字幕行使用）
  const makeRenderEnWithClick = useCallback((onClickTerm, cloze, clozeRevealedMap) => {
    return (text) => buildHighlighter(termKindMap)(text, { onClickTerm, cloze, clozeRevealed: clozeRevealedMap });
  }, [termKindMap]);
  const canAccess = !!item?.can_access;

  function jumpTo(seg, idx) {
    setActiveSegIdx(idx);
    const v = videoRef.current;
    if (!v) return;
    try {
      // 直接用字幕的 start 时间，视频时间轴与字幕时间轴一致
      v.currentTime = Math.max(0, parseTime(seg?.start));
      if (!v.paused) v.play?.();
    } catch {}
  }

  function locateToSegIdx(idx) {
    if (idx < 0 || idx >= segments.length) return;
    jumpTo(segments[idx], idx);
    const wrap = isMobile ? mobileListRef.current : desktopListRef.current;
    const el = rowRefs.current[idx];
    if (wrap && el) {
      const elTop = el.getBoundingClientRect().top - wrap.getBoundingClientRect().top + wrap.scrollTop;
      wrap.scrollTo({ top: Math.max(0, elTop - 120), behavior: "smooth" });
    }
  }

  function toggleFav(term, kind, data) {
    const t = String(term || "").trim();
    if (!t) return;
    setFavSet(prev => {
      const next = new Set(prev);
      if (next.has(t)) { next.delete(t); apiFavDelete(t, clipId); }
      else { next.add(t); apiFavAdd(t, clipId, kind || "words", data || null); }
      return next;
    });
  }

  useEffect(() => { try { if (videoRef.current) videoRef.current.playbackRate = rate; } catch {} }, [rate]);

  // ref 存最新值，避免 timeupdate 监听器因依赖变化而频繁重建
  const activeSegIdxRef = useRef(-1);
  const loopIdxRef = useRef(-1);
  useEffect(() => { activeSegIdxRef.current = activeSegIdx; }, [activeSegIdx]);
  useEffect(() => { loopIdxRef.current = loopIdx; }, [loopIdx]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !segments.length) return;

    // 视频 currentTime 与字幕时间轴一致，直接比较，无需 offset
    function findIdx(t) {
      for (let i = 0; i < segments.length; i++) {
        const s = parseTime(segments[i]?.start), e = parseTime(segments[i]?.end);
        if (t >= s && t < e) return i;
      }
      return -1;
    }
    function onTime() {
      const t = v.currentTime || 0;
      const idx = findIdx(t);
      if (idx !== -1 && idx !== activeSegIdxRef.current) setActiveSegIdx(idx);
      const li = loopIdxRef.current;
      if (li !== -1) {
        const seg = segments[li];
        if (seg && t >= parseTime(seg.end) - 0.02) {
          try { v.currentTime = Math.max(0, parseTime(seg.start)); if (!v.paused) v.play?.(); } catch {}
        }
      }
    }
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  // checkingAccess 变 false 时 video 元素才出现，需要重新执行绑定
  }, [segments, checkingAccess, videoReady]);

  useEffect(() => {
    if (!follow || activeSegIdx < 0) return;
    const el = rowRefs.current[activeSegIdx];
    const wrap = isMobile ? mobileListRef.current : desktopListRef.current;
    if (!el || !wrap) return;
    const elRect = el.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const relativeTop = elRect.top - wrapRect.top + wrap.scrollTop;
    const scrollTop = isMobile
      ? Math.max(0, relativeTop - 8)
      : Math.max(0, relativeTop - wrap.clientHeight * 0.35 + el.offsetHeight * 0.5);
    wrap.scrollTo({ top: scrollTop, behavior: "smooth" });
  }, [activeSegIdx, follow, isMobile]);

  // ── 上一句 / 下一句 ──
  function jumpToPrevSeg() {
    const idx = Math.max(0, activeSegIdx <= 0 ? 0 : activeSegIdx - 1);
    if (segments[idx]) jumpTo(segments[idx], idx);
  }
  function jumpToNextSeg() {
    const idx = Math.min(segments.length - 1, activeSegIdx + 1);
    if (segments[idx]) jumpTo(segments[idx], idx);
  }

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => { if (!dragging) setVCur(v.currentTime || 0); setVDur(v.duration || 0); };
    const onPlay = () => { setVPlaying(true); setHasPlayed(true); };
    const onPause = () => setVPlaying(false);
    v.addEventListener("timeupdate", sync);
    v.addEventListener("durationchange", sync);
    v.addEventListener("loadedmetadata", sync);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", sync);
      v.removeEventListener("durationchange", sync);
      v.removeEventListener("loadedmetadata", sync);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [dragging, checkingAccess, videoReady]);

  function togglePlay() { const v = videoRef.current; if (!v) return; try { v.paused ? v.play?.() : v.pause?.(); } catch {} }
  function seekTo(t) { const v = videoRef.current; if (!v) return; try { v.currentTime = Math.max(0, Math.min(Number(t || 0), v.duration || 0)); } catch {} }

  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overflow = vocabOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, vocabOpen]);

  // ─── 骨架屏（替代进入时白屏）────────────────────────────
  if (loading) {
    return (
      <div style={{ background: THEME.colors.bg, minHeight: "100vh" }}>
        <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
        <div style={{ height: 52, borderBottom: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
          <SkeletonBlock w={60} h={32} r={10} />
          <SkeletonBlock w={220} h={18} r={6} />
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SkeletonBlock w="100%" h={220} r={14} />
              <SkeletonBlock w="100%" h={40} r={10} />
              {[1,2,3,4].map(i => <SkeletonBlock key={i} w="100%" h={80} r={10} />)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
              <SkeletonBlock w="100%" h={340} r={14} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <SkeletonBlock w="100%" h={44} r={10} />
                {[1,2,3,4,5].map(i => <SkeletonBlock key={i} w="100%" h={80} r={10} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (notFound || !item) return (
    <div style={{ background: THEME.colors.bg, minHeight: "100vh", padding: 16 }}>
      <Link href="/">← 返回</Link>
      <Card style={{ padding: 20, marginTop: 14 }}>未找到该视频</Card>
    </div>
  );

  // ─── 顶部导航栏 ───────────────────────────────────────────
  const navBar = (
    <div style={{
      position: "sticky", top: 0, zIndex: 20,
      background: "rgba(246,247,251,0.92)", backdropFilter: "blur(10px)",
      borderBottom: `1px solid ${THEME.colors.border}`,
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/" style={{
          display: "flex", alignItems: "center",
          border: "none", background: "transparent",
          textDecoration: "none", color: THEME.colors.ink,
          fontWeight: 300, fontSize: 28, lineHeight: 1, padding: "4px 6px",
        }}>‹</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: THEME.colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.title || `Clip #${clipId}`}
          </div>
        </div>
        <button type="button" onClick={toggleBookmark} disabled={bookmarkLoading} title={bookmarked ? "取消收藏" : "收藏"}
          style={{
            border: `1px solid ${bookmarked ? "rgba(239,68,68,0.3)" : THEME.colors.border2}`,
            background: bookmarked ? "rgba(239,68,68,0.10)" : THEME.colors.surface,
            borderRadius: THEME.radii.pill, padding: "8px 14px",
            cursor: "pointer", fontSize: 13, fontWeight: 700,
            color: bookmarked ? "#b00000" : THEME.colors.ink,
            display: "flex", alignItems: "center", gap: 6,
            opacity: bookmarkLoading ? 0.6 : 1, transition: "all 150ms ease", whiteSpace: "nowrap",
          }}
        >{bookmarked ? "❤️ 已收藏" : "🤍 收藏"}</button>
      </div>
    </div>
  );

  // ─── 视频区（复刻参考站：video src=m3u8，Stream SDK 自动接管 HLS）
  const videoOrGate = (maxH, noRadius = false) => {
    const radius = noRadius ? 0 : THEME.radii.md;
    return checkingAccess ? (
    <div style={{ position: "relative", width: "100%", borderRadius: radius, overflow: "hidden", ...(maxH ? { maxHeight: maxH } : {}), background: "#1a1a2e" }}>
      {/* checkingAccess期间用封面图垫底，消除骨架屏→视频的黑屏闪烁 */}
      {item?.cover_url && (
        <img src={item.cover_url} alt="" style={{ width: "100%", display: "block", borderRadius: radius, objectFit: "cover", ...(maxH ? { maxHeight: maxH } : {}) }} />
      )}
      {!item?.cover_url && <SkeletonBlock w="100%" h={typeof maxH === "number" ? maxH : 220} r={noRadius ? 0 : 14} />}
    </div>
  ) : canAccess ? (
    <div style={{ position: "relative", width: "100%", borderRadius: radius, overflow: "hidden", background: "#1a1a2e", ...(maxH ? { maxHeight: maxH } : {}) }}>
      <video
        ref={videoCallbackRef}
        controls
        playsInline
        muted
        preload="metadata"
        poster={item.cover_url || undefined}
        style={{
          width: "100%",
          display: "block",
          borderRadius: radius,
          background: "transparent",
          position: "relative",
          zIndex: 1,
          ...(maxH ? { maxHeight: maxH } : {}),
        }}
      />
      {/* 封面图覆盖层：解决手机端 muted HLS video poster 不生效的问题，点击封面图直接开始播放 */}
      {item.cover_url && !hasPlayed && (
        <div
          onClick={togglePlay}
          style={{ position: "absolute", inset: 0, zIndex: 2, cursor: "pointer" }}
        >
          <img
            src={item.cover_url}
            alt=""
            onLoad={() => setCoverImgReady(true)}
            style={{
              width: "100%", height: "100%",
              objectFit: "cover",
              opacity: coverImgReady ? 1 : 0,
              transition: "opacity 150ms ease",
            }}
          />
          {/* 播放按钮 */}
          {coverImgReady && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.15)",
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(0,0,0,0.55)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
              }}>
                <div style={{
                  width: 0, height: 0,
                  borderTop: "14px solid transparent",
                  borderBottom: "14px solid transparent",
                  borderLeft: "24px solid #fff",
                  marginLeft: 6,
                }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  ) : (
    <div style={{ border: `1px solid rgba(124,58,237,0.22)`, background: "rgba(124,58,237,0.06)", borderRadius: THEME.radii.md, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: THEME.colors.vip, marginBottom: 8 }}>会员专享视频</div>
      <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.6, marginBottom: 16 }}>
        {me?.logged_in ? "需要激活会员后观看" : "请先登录，再激活会员"}
      </div>
      {!me?.logged_in
        ? <Link href="/login" style={{ display: "inline-block", padding: "10px 20px", borderRadius: THEME.radii.pill, background: THEME.colors.accent, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>去登录</Link>
        : <Link href="/register" style={{ display: "inline-block", padding: "10px 20px", borderRadius: THEME.radii.pill, background: THEME.colors.vip, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>激活会员</Link>
      }
    </div>
  );
  };

  // ─── 词汇卡面板 ───────────────────────────────────────────
  const vocabPanel = (h) => (
    <div style={{ display: "flex", flexDirection: "column", height: h, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", flexShrink: 0 }}>
        <Btn active={showZhExplain} onClick={() => setShowZhExplain(x => !x)}>
          {showZhExplain ? "中文 ON" : "中文 OFF"}
        </Btn>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, flexShrink: 0 }}>
        {[["words", "单词", vocab.words], ["phrases", "短语", vocab.phrases], ["expressions", "地道表达", vocab.expressions]].map(([k, label, arr]) => (
          <Btn key={k} active={vocabTab === k} onClick={() => setVocabTab(k)}>{label} ({arr.length})</Btn>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", paddingRight: 4 }}>
        {vocabList.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {vocabList.map((v, i) => (
              <VocabCard key={i} v={v} kind={vocabTab} showZh={showZhExplain} segments={segments}
                onLocate={idx => { locateToSegIdx(idx); }}
                favSet={favSet} onToggleFav={toggleFav} />
            ))}
          </div>
        ) : (
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.6 }}>当前分类暂无词汇卡内容。</div>
          </Card>
        )}
      </div>
    </div>
  );

  // ─── 单句播放 ─────────────────────────────────────────────
  function playSegmentOnly(seg) {
    const v = videoRef.current;
    if (!v) return;
    try {
      const start = parseTime(seg?.start);
      const end = parseTime(seg?.end);
      v.currentTime = Math.max(0, start);
      v.play?.();
      // 在结束时间暂停
      const checkEnd = () => {
        if (v.currentTime >= end) { v.pause(); v.removeEventListener('timeupdate', checkEnd); }
      };
      v.addEventListener('timeupdate', checkEnd);
    } catch {}
  }

  // ─── helpers ──────────────────────────────────────────────
  const subtitleList = (listRef, maxH) => {
    const isReading = subMode === "reading" || subMode === "zh2en";
    const fillStyle = maxH === "100%"
      ? { height: "100%", overflow: "auto", paddingRight: 4 }
      : { maxHeight: maxH, overflow: "auto", paddingRight: 4 };
    if (!segments.length) return (
      <Card style={{ padding: 14 }}>
        <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.6 }}>
          {details ? "暂无字幕段" : "暂无详情内容，上传字幕后即可显示。"}
        </div>
      </Card>
    );
    // 阅读/中译英：静止不自动滚动，不传 ref
    if (isReading) return (
      <div style={{ display: "flex", flexDirection: "column", ...fillStyle }}>
        {segments.map((seg, idx) => (
          <ReadingRow key={idx} seg={seg} idx={idx} mode={subMode}
            renderEn={renderEn} rowRef={null}
            onClick={() => jumpTo(seg, idx)} />
        ))}
      </div>
    );
    return (
      <div ref={listRef} style={{ display: "flex", flexDirection: "column", gap: 10, ...fillStyle }}>
        {segments.map((seg, idx) => (
          <SubtitleRow key={idx} seg={seg} idx={idx} active={idx === activeSegIdx}
            subMode={subMode} onClick={() => jumpTo(seg, idx)}
            loopIdx={loopIdx} onToggleLoop={i => setLoopIdx(p => p === i ? -1 : i)}
            renderEn={renderEn} rowRef={el => { if (el) rowRefs.current[idx] = el; }}
            dictationMap={dictationMap}
            recording={recordings[idx]}
            onRecordToggle={toggleRecording}
            onRecordPlay={togglePlayback}
            onRecordSave={saveRecording}
            onRecordDelete={deleteRecording}
            onPlaySegment={() => playSegmentOnly(seg)}
            onClickTerm={handleClickTerm}
            clozeMode={clozeMode}
            clozeRevealed={clozeRevealed} />
        ))}
      </div>
    );
  };

  const modeTabItems = [["bilingual","双语"],["en","英文"],["zh","中文"],["dictation","听写"],["reading","阅读"],["zh2en","中译英"]];
  const mobileHiddenModes = ["reading", "zh2en"];
  const modeTabs = (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {modeTabItems.filter(([m]) => !isMobile || !mobileHiddenModes.includes(m)).map(([m, label]) => (
        <Btn key={m} active={subMode === m} onClick={() => setSubMode(m)}>{label}</Btn>
      ))}
    </div>
  );
  // 电脑版：词汇卡打开时按钮缩小以适应一行，关闭时恢复原始大小
  const desktopBtnStyle = vocabOpen ? { padding: "5px 9px", fontSize: 11 } : {};

  // 跟读模式：视频下方显示当前句中英文
  const readSegIdx = activeSegIdx >= 0 ? activeSegIdx : 0;
  const readingPanel = canAccess && subMode !== "dictation" && segments.length > 0 ? (
    <div style={{ marginTop: 10, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.md, padding: "14px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.6, marginBottom: 6 }}>
        {renderEn ? renderEn(segments[readSegIdx]?.en || "") : (segments[readSegIdx]?.en || "")}
      </div>
      <div style={{ fontSize: 14, color: THEME.colors.muted, lineHeight: 1.6 }}>
        {segments[readSegIdx]?.zh || ""}
      </div>
    </div>
  ) : null;

  const dictSegIdx = activeSegIdx >= 0 ? activeSegIdx : 0;
  const dictPanel = (
    canAccess && subMode === "dictation" && segments.length > 0 ? (
      <div style={{ marginTop: 10, background: THEME.colors.surface, border: `2px solid ${THEME.colors.accent}`, borderRadius: THEME.radii.md, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12, color: THEME.colors.faint }}>
          <span>{dictSegIdx + 1} / {segments.length}</span>
          <button type="button" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: THEME.colors.faint }}
            onClick={() => setSubMode("bilingual")}>
            切换到跟读
          </button>
          {dictationMap[dictSegIdx]?.updated_at && (
            <span style={{ marginLeft: "auto" }}>上次听写：{new Date(dictationMap[dictSegIdx].updated_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          )}
        </div>
        <textarea value={dictInput} onChange={e => { setDictInput(e.target.value); saveDictation(dictSegIdx, e.target.value); }}
          placeholder="开始听写吧..." rows={3}
          style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.sm, padding: "8px 10px", fontSize: 14, fontFamily: "monospace", resize: "vertical", background: THEME.colors.bg }} />
        {dictShowAnswer && (
          <div style={{ marginTop: 8, padding: "8px 10px", background: "#fff5f5", borderRadius: THEME.radii.sm, border: "1px solid #fecaca" }}>
            <div style={{ fontSize: 11, color: THEME.colors.faint, marginBottom: 4 }}>字幕原文：</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", fontFamily: "monospace" }}>{segments[dictSegIdx]?.en}</div>
          </div>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setDictShowAnswer(x => !x)} style={{ border: "none", background: THEME.colors.ink, color: "#fff", borderRadius: THEME.radii.sm, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            {dictShowAnswer ? "关闭" : "查看原文"}
          </button>
          {dictInput.trim() && <button type="button" onClick={() => { setDictInput(""); saveDictation(dictSegIdx, ""); }} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.sm, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>清空</button>}
        </div>
      </div>
    ) : null
  );

  const belowVideoPanel = subMode === "dictation" ? dictPanel : readingPanel;

  // ─── MOBILE LAYOUT ─────────────────────────────────────────
      // ─── MOBILE LAYOUT ─────────────────────────────────────────
  if (isMobile) {
    const sliderMax = Math.max(0, Number(vDur || 0));
    const sliderVal = dragging ? Math.min(Number(dragValue || 0), sliderMax) : Math.min(Number(vCur || 0), sliderMax);
    return (
      <div style={{ height: "100vh", background: THEME.colors.bg, display: "flex", flexDirection: "column" }}>
        <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:0.45} } @keyframes bIn { 0%{opacity:0;transform:translateY(6px) scale(0.96)} 100%{opacity:1;transform:translateY(0) scale(1)} }`}</style>
        {navBar}
        {showBookmarkLoginModal && <BookmarkLoginModal onClose={() => setShowBookmarkLoginModal(false)} />}
        <TermPopup popup={termPopup} onClose={() => setTermPopup(null)} />
        {/* 视频区：去掉Card和padding，完全填满宽度 */}
        <div style={{ position: "sticky", top: 52, zIndex: 10, background: "#1a1a2e" }}>
          {videoOrGate("38vh", true)}
          {subMode === "dictation" ? <div style={{ padding: "8px 12px", background: THEME.colors.bg }}>{dictPanel}</div> : null}
          {/* 模式tab行 + 自动跟随按钮 */}
          <div style={{ background: THEME.colors.bg, borderBottom: `1px solid ${THEME.colors.border}`, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", flex: 1, minWidth: 0, overflow: "hidden" }}>
              {modeTabItems.filter(([m]) => !mobileHiddenModes.includes(m)).map(([m, label]) => (
                <Btn key={m} active={subMode === m} onClick={() => setSubMode(m)}>{label}</Btn>
              ))}
            </div>
            {canAccess && (
              <Btn active={follow} onClick={() => setFollow(x => !x)} style={{ flexShrink: 0, padding: "5px 8px", fontSize: 11 }}>
                跟随 {follow ? "ON" : "OFF"}
              </Btn>
            )}
          </div>
        </div>

        <div ref={mobileListRef} style={{ flex: 1, overflow: "auto", padding: 12, paddingBottom: canAccess ? 84 : 16 }}>
          {subtitleList(null, undefined)}
        </div>

        {canAccess && (
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, background: THEME.colors.surface, borderTop: `1px solid ${THEME.colors.border}`, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* 左侧：播放 + 上一句 + 下一句 */}
              <button type="button" onClick={togglePlay} style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${THEME.colors.border}`, background: THEME.colors.ink, cursor: "pointer", fontWeight: 900, fontSize: 18, color: "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {vPlaying ? "⏸" : "▶"}
              </button>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <button type="button" onClick={jumpToPrevSeg} title="上一句" style={{ width: 36, height: 30, borderRadius: THEME.radii.md, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontSize: 14, color: THEME.colors.ink, flexShrink: 0 }}>⏮</button>
                <span style={{ fontSize: 10, color: THEME.colors.faint, lineHeight: 1 }}>上一句</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <button type="button" onClick={jumpToNextSeg} title="下一句" style={{ width: 36, height: 30, borderRadius: THEME.radii.md, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontSize: 14, color: THEME.colors.ink, flexShrink: 0 }}>⏭</button>
                <span style={{ fontSize: 10, color: THEME.colors.faint, lineHeight: 1 }}>下一句</span>
              </div>
              {/* 右侧：倍速 + 词卡 */}
              <div style={{ flex: 1 }} />
              <select value={rate} onChange={e => setRate(Number(e.target.value))} style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.sm, padding: "4px 2px", fontSize: 12, background: THEME.colors.surface, width: 52 }}>
                {[0.75, 1, 1.25, 1.5, 2].map(r => <option key={r} value={r}>{r}x</option>)}
              </select>
              <button type="button" onClick={() => setVocabOpen(true)} style={{ border: "none", background: THEME.colors.ink, color: "#fff", borderRadius: THEME.radii.md, padding: "10px 10px", cursor: "pointer", fontWeight: 900, fontSize: 11 }}>词卡</button>
            </div>
          </div>
        )}

        {vocabOpen && (
          <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.18)", display: "flex", alignItems: "flex-end" }} onClick={() => setVocabOpen(false)}>
            <div style={{ width: "100%", background: THEME.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, border: `1px solid ${THEME.colors.border}`, boxShadow: "0 -20px 50px rgba(0,0,0,0.12)", padding: 16, height: "90vh", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: THEME.colors.border2, margin: "0 auto 12px" }} />
              <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: THEME.colors.ink }}>词汇卡</div>
                <button type="button" onClick={() => setVocabOpen(false)} style={{ marginLeft: "auto", border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.md, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>关闭</button>
              </div>
              {vocabPanel("calc(90vh - 130px)")}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── DESKTOP LAYOUT ────────────────────────────────────────
  return (
    <div style={{ background: THEME.colors.bg, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:0.45} } @keyframes bIn { 0%{opacity:0;transform:translateY(6px) scale(0.96)} 100%{opacity:1;transform:translateY(0) scale(1)} }`}</style>
      {showBookmarkLoginModal && <BookmarkLoginModal onClose={() => setShowBookmarkLoginModal(false)} />}
      <TermPopup popup={termPopup} onClose={() => setTermPopup(null)} />
      <div style={{ flex: 1, overflow: "hidden", padding: "16px 24px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: vocabOpen ? "1fr 1fr" : "1.1fr 1fr", gap: 16, height: "100%", alignItems: "start" }}>

          {/* 左列：标题行 + 视频 + 控制 + 当前句面板 */}
          <Card style={{ padding: 14, position: "sticky", top: 0, alignSelf: "start", display: "flex", flexDirection: "column" }}>
            {/* 标题行 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, height: 44, flexShrink: 0, marginBottom: 10 }}>
              <Link href="/" style={{
                display: "flex", alignItems: "center",
                border: "none", background: "transparent",
                textDecoration: "none", color: THEME.colors.ink,
                fontWeight: 300, fontSize: 28, lineHeight: 1, flexShrink: 0, padding: "4px 6px",
              }}>‹</Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: THEME.colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title || `Clip #${clipId}`}
                </div>
              </div>
              <button type="button" onClick={toggleBookmark} disabled={bookmarkLoading} title={bookmarked ? "取消收藏" : "收藏"}
                style={{
                  border: `1px solid ${bookmarked ? "rgba(239,68,68,0.3)" : THEME.colors.border2}`,
                  background: bookmarked ? "rgba(239,68,68,0.10)" : THEME.colors.surface,
                  borderRadius: THEME.radii.pill, padding: "6px 14px",
                  cursor: "pointer", fontSize: 12, fontWeight: 700,
                  color: bookmarked ? "#b00000" : THEME.colors.ink,
                  display: "flex", alignItems: "center", gap: 6,
                  opacity: bookmarkLoading ? 0.6 : 1, transition: "all 150ms ease", whiteSpace: "nowrap", flexShrink: 0,
                }}
              >{bookmarked ? "❤️ 已收藏" : "🤍 收藏"}</button>
            </div>
            {/* 分隔线 */}
            <div style={{ height: 1, background: THEME.colors.border, marginBottom: 10 }} />
            {videoOrGate(null)}
            {canAccess && (
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Btn active={follow} onClick={() => setFollow(x => !x)}>自动跟随 {follow ? "ON" : "OFF"}</Btn>
                <button type="button" onClick={jumpToPrevSeg} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: THEME.colors.ink }}>⏮ 上一句</button>
                <button type="button" onClick={jumpToNextSeg} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: THEME.colors.ink }}>下一句 ⏭</button>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: THEME.colors.faint }}>倍速</span>
                  <select value={rate} onChange={e => setRate(Number(e.target.value))} style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.sm, padding: "6px 8px", fontSize: 12, background: THEME.colors.surface }}>
                    {[0.75, 1, 1.25, 1.5, 2].map(r => <option key={r} value={r}>{r}x</option>)}
                  </select>
                </div>
              </div>
            )}
            {belowVideoPanel}
          </Card>

          {/* 右列：字幕卡片（含模式tab）撑满高度 [+ 词汇卡] */}
          <div style={{ display: vocabOpen ? "grid" : "flex", flexDirection: vocabOpen ? undefined : "column", gridTemplateColumns: vocabOpen ? "1fr 1fr" : undefined, gap: 16, height: "calc(100vh - 32px)" }}>
            <Card style={{ padding: 14, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
              {/* 模式切换行 */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, height: 44, flexShrink: 0, marginBottom: 10, flexWrap: "nowrap" }}>
                <div style={{ display: "flex", gap: vocabOpen ? 4 : 6, flexShrink: 0, flexWrap: "nowrap" }}>
                  {modeTabItems.slice(0, 4).map(([m, label]) => (
                    <Btn key={m} active={subMode === m} onClick={() => { setSubMode(m); if (clozeMode) { setClozeMode(false); setClozeRevealed({}); } }} style={desktopBtnStyle}>{label}</Btn>
                  ))}
                  {/* 挖空按钮（仅电脑端，夹在听写和阅读之间） */}
                  <Btn active={clozeMode} onClick={() => {
                    const next = !clozeMode;
                    setClozeMode(next);
                    setClozeRevealed({});
                    if (next && subMode !== "bilingual" && subMode !== "en") setSubMode("bilingual");
                  }} style={{ ...desktopBtnStyle, ...(clozeMode ? {} : {}) }}>挖空</Btn>
                  {modeTabItems.slice(4).map(([m, label]) => (
                    <Btn key={m} active={subMode === m} onClick={() => { setSubMode(m); if (clozeMode) { setClozeMode(false); setClozeRevealed({}); } }} style={desktopBtnStyle}>{label}</Btn>
                  ))}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: vocabOpen ? 11 : 12, color: THEME.colors.faint, whiteSpace: "nowrap" }}>循环：{loopIdx === -1 ? "关闭" : `第${loopIdx + 1}句`}</span>
                  {!vocabOpen && (
                    <button type="button" onClick={() => setVocabOpen(true)} style={{ border: "none", background: THEME.colors.ink, color: "#fff", borderRadius: THEME.radii.md, padding: "5px 10px", cursor: "pointer", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>词汇卡</button>
                  )}
                </div>
              </div>
              {/* 分隔线 */}
              <div style={{ height: 1, background: THEME.colors.border, marginBottom: 10 }} />
              {/* 字幕列表填充剩余高度 */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                {subtitleList(desktopListRef, "100%")}
              </div>
            </Card>

            {vocabOpen && (
              <Card style={{ padding: 14, display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 15, color: THEME.colors.ink }}>词汇卡</div>
                  <button type="button" onClick={() => setVocabOpen(false)} style={{ marginLeft: "auto", border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.md, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>收起</button>
                </div>
                {vocabPanel("100%")}
              </Card>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
