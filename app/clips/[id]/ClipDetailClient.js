"use client";

// app/clips/[id]/ClipDetailClient.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
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

function buildHighlighter(terms) {
  const clean = Array.from(new Set((terms || []).map(t => String(t || "").trim()).filter(Boolean))).sort((a, b) => b.length - a.length);
  if (!clean.length) return (text) => text || "-";
  const re = new RegExp(`(${clean.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return (text) => {
    const s = String(text || "");
    if (!s) return "-";
    return s.split(re).map((p, i) =>
      clean.some(t => t.toLowerCase() === p.toLowerCase())
        ? <mark key={i} style={{ background: "#fff1b8", padding: "0 3px", borderRadius: 6 }}>{p}</mark>
        : <span key={i}>{p}</span>
    );
  };
}

function useIsMobile(bp = 1100) {
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

function SubtitleRow({ seg, idx, active, onClick, showZh, rowRef, loopIdx, onToggleLoop, renderEn }) {
  return (
    <div ref={rowRef} onClick={onClick} role="button" tabIndex={0} style={{
      border: `1px solid ${active ? "#bfe3ff" : THEME.colors.border}`,
      background: active ? "#f3fbff" : THEME.colors.surface,
      borderRadius: THEME.radii.md, padding: 12, cursor: "pointer",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 12, color: THEME.colors.faint, whiteSpace: "nowrap" }}>
          {fmtSec(seg.start)} – {fmtSec(seg.end)}
        </div>
        <button type="button" onClick={e => { e.stopPropagation(); onToggleLoop(idx); }} style={{
          border: `1px solid ${THEME.colors.border}`,
          background: loopIdx === idx ? THEME.colors.ink : THEME.colors.surface,
          color: loopIdx === idx ? "#fff" : THEME.colors.ink,
          borderRadius: THEME.radii.pill, padding: "3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>循环</button>
      </div>
      <div style={{ marginTop: 8, lineHeight: 1.55 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{renderEn ? renderEn(seg.en || "") : (seg.en || "-")}</div>
        {showZh && <div style={{ marginTop: 6, fontSize: 13, color: THEME.colors.muted }}>{seg.zh || "（暂无中文）"}</div>}
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
          {showZh && v.meaning_zh && (
            <div style={{ marginTop: 10, border: "1px solid #ffe3a3", background: "#fff8e8", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#b86b00" }}>中文含义</div>
              <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.55 }}>{v.meaning_zh}</div>
            </div>
          )}
          {(exampleEn || exampleZh) && (
            <div style={{ marginTop: 10, border: "1px solid #cfe6ff", background: "#f3fbff", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#0b5aa6" }}>{kind === "expressions" ? "字幕原句" : "例句"}</div>
              {exampleEn && <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.55 }}>{exampleEn}</div>}
              {showZh && exampleZh && <div style={{ marginTop: 4, fontSize: 13, color: THEME.colors.muted, lineHeight: 1.55 }}>{exampleZh}</div>}
            </div>
          )}
          {kind === "expressions" && showZh && v.use_case_zh && (
            <div style={{ marginTop: 10, border: "1px solid #e7e7ff", background: "#f6f6ff", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#3c3ccf" }}>详细解析</div>
              <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{v.use_case_zh}</div>
            </div>
          )}
        </>
      )}
    </Card>
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
export default function ClipDetailClient({ clipId, initialItem, initialMe, initialDetails }) {
  const isMobile = useIsMobile(1100);

  const [loading, setLoading] = useState(!initialItem);
  const [notFound, setNotFound] = useState(false);
  const [item, setItem] = useState(initialItem || null);
  const [me, setMe] = useState(initialMe || null);
  const [details, setDetails] = useState(initialDetails || null);
  // SSR 时 can_access 无法判断，需要等客户端验证完才能决定是否显示锁屏
  const [checkingAccess, setCheckingAccess] = useState(!!initialItem && !initialItem?.can_access);

  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [showBookmarkLoginModal, setShowBookmarkLoginModal] = useState(false);

  const [subLang, setSubLang] = useState("zh");
  const [vocabOpen, setVocabOpen] = useState(false);
  const [vocabTab, setVocabTab] = useState("words");
  const [showZhExplain, setShowZhExplain] = useState(true);

  const videoRef = useRef(null);
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
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  useEffect(() => {
    if (!me?.logged_in) return;
    apiFavList().then(set => setFavSet(set));
  }, [me?.logged_in]);

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
        if (d?.item) setItem(prev => ({ ...(prev || {}), ...d.item }));
        if (d?.me) setMe(d.me);
      } catch {} finally {
        if (mounted) setCheckingAccess(false);
      }
    }
    run();
    return () => { mounted = false; document.title = "油管英语场景库"; };
  }, [clipId]);

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
    if (v.canPlayType("application/vnd.apple.mpegurl") || v.canPlayType("application/x-mpegURL")) {
      // 原生 HLS（Safari / Chrome 142+）：设置 src 后手动触发 play
      v.src = url;
      requestAnimationFrame(() => v.play?.().catch(() => {}));
      return;
    }
    if (!Hls.isSupported()) { v.src = url; return; }
    const hls = new Hls();
    hlsRef.current = hls;
    hls.attachMedia(v);
    hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));
    // hls.js 路径：manifest 解析完成后触发 play
    hls.on(Hls.Events.MANIFEST_PARSED, () => { v.play?.().catch(() => {}); });
  }, []); // 空依赖，函数永不重建

  // video DOM 挂载时初始化一次
  const videoCallbackRef = useCallback((v) => {
    videoRef.current = v;
    if (v) initHls(v);
    else if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null; }
  }, [initHls]);

  // can_access 从 null 变为 true（认证完成）时，对已挂载的 video 重新触发 initHls
  useEffect(() => {
    if (item?.can_access && videoRef.current) {
      initHls(videoRef.current);
    }
  }, [item?.can_access, initHls]);





  useEffect(() => {
    if (!clipId || !me?.logged_in) return;
    const token = getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(remote("/api/bookmarks_has"), {
      method: "POST", headers,
      body: JSON.stringify({ clip_id: clipId }),
      cache: "no-store",
    })
      .then(r => r.json())
      .then(d => setBookmarked(!!d?.has))
      .catch(() => {});
  }, [clipId, me?.logged_in]);

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
  const tabTerms = useMemo(() =>
    Array.from(new Set((vocabList || []).map(x => String(x?.term || x?.word || "").trim()).filter(Boolean))).sort((a, b) => b.length - a.length),
    [vocabList]
  );
  const renderEn = useMemo(() => buildHighlighter(tabTerms), [tabTerms]);
  const canAccess = !!item?.can_access;

  function jumpTo(seg, idx) {
    setActiveSegIdx(idx);
    const v = videoRef.current;
    if (!v) return;
    try {
      const offset = Math.min(...segments.map(s => Number(s.start || 0)));
      v.currentTime = Math.max(0, Number(seg?.start || 0) - offset);
      if (!v.paused) v.play?.();
    } catch {}
  }

  function locateToSegIdx(idx) {
    if (idx < 0 || idx >= segments.length) return;
    jumpTo(segments[idx], idx);
    const wrap = isMobile ? mobileListRef.current : desktopListRef.current;
    const el = rowRefs.current[idx];
    if (wrap && el) wrap.scrollTo({ top: Math.max(0, el.offsetTop - 120), behavior: "smooth" });
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
    // 偏移量：segments 时间戳可能是原始视频的绝对时间，需减去最小 start 对齐到播放时间
    const offset = Math.min(...segments.map(s => Number(s.start || 0)));
    function findIdx(t) {
      const adjusted = t + offset;
      for (let i = 0; i < segments.length; i++) {
        const s = Number(segments[i]?.start || 0), e = Number(segments[i]?.end || 0);
        if (adjusted >= s && adjusted < e) return i;
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
        if (seg && (t + offset) >= Number(seg.end || 0) - 0.02) {
          try { v.currentTime = Math.max(0, Number(seg.start || 0) - offset); if (!v.paused) v.play?.(); } catch {}
        }
      }
    }
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [segments]); // 只依赖 segments，绑定一次即可

  useEffect(() => {
    if (!follow || activeSegIdx < 0) return;
    const el = rowRefs.current[activeSegIdx];
    const wrap = isMobile ? mobileListRef.current : desktopListRef.current;
    if (!el || !wrap) return;
    wrap.scrollTo({ top: Math.max(0, el.offsetTop - wrap.clientHeight * 0.35 + el.offsetHeight * 0.5), behavior: "smooth" });
  }, [activeSegIdx, follow, isMobile]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => { if (!dragging) setVCur(v.currentTime || 0); setVDur(v.duration || 0); };
    const onPlay = () => setVPlaying(true);
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
  }, [dragging]);

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
          border: `1px solid ${THEME.colors.border2}`, background: THEME.colors.surface,
          borderRadius: THEME.radii.md, padding: "8px 14px", textDecoration: "none",
          color: THEME.colors.ink, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap",
        }}>← 返回</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: THEME.colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.title || `Clip #${clipId}`}
          </div>
          <div style={{ fontSize: 11, color: THEME.colors.faint }}>
            登录 {me?.logged_in ? "✅" : "❌"} · 会员 {me?.is_member ? "✅" : "❌"}
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
  const videoOrGate = (maxH) => checkingAccess ? (
    <SkeletonBlock w="100%" h={maxH || 220} r={14} />
  ) : canAccess ? (
    <video
      ref={videoCallbackRef}
      controls
      playsInline
      autoPlay
      muted
      preload="metadata"
      poster={item.cover_url || undefined}
      style={{
        width: "100%",
        borderRadius: THEME.radii.md,
        background: "#000",
        ...(maxH ? { maxHeight: maxH } : {}),
      }}
    />
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

  // ─── 词汇卡面板 ───────────────────────────────────────────
  const vocabPanel = (maxH) => (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <Btn active={showZhExplain} onClick={() => setShowZhExplain(x => !x)}>
          {showZhExplain ? "中文 ON" : "中文 OFF"}
        </Btn>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {[["words", "单词", vocab.words], ["phrases", "短语", vocab.phrases], ["expressions", "地道表达", vocab.expressions]].map(([k, label, arr]) => (
          <Btn key={k} active={vocabTab === k} onClick={() => setVocabTab(k)}>{label} ({arr.length})</Btn>
        ))}
      </div>
      <div style={{ maxHeight: maxH, overflow: "auto", paddingRight: 4 }}>
        {vocabList.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {vocabList.map((v, i) => (
              <VocabCard key={i} v={v} kind={vocabTab} showZh={showZhExplain} segments={segments}
                onLocate={idx => { setVocabOpen(false); setTimeout(() => locateToSegIdx(idx), 80); }}
                favSet={favSet} onToggleFav={toggleFav} />
            ))}
          </div>
        ) : (
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.6 }}>当前分类暂无词汇卡内容。</div>
          </Card>
        )}
      </div>
    </>
  );

  // ─── MOBILE LAYOUT ────────────────────────────────────────
  if (isMobile) {
    const sliderMax = Math.max(0, Number(vDur || 0));
    const sliderVal = dragging ? Math.min(Number(dragValue || 0), sliderMax) : Math.min(Number(vCur || 0), sliderMax);
    return (
      <div style={{ height: "100vh", background: THEME.colors.bg, display: "flex", flexDirection: "column" }}>
        <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
        {navBar}
        {showBookmarkLoginModal && <BookmarkLoginModal onClose={() => setShowBookmarkLoginModal(false)} />}
        <div style={{ position: "sticky", top: 52, zIndex: 10, background: THEME.colors.bg, borderBottom: `1px solid ${THEME.colors.border}`, padding: 12 }}>
          <Card style={{ padding: 10 }}>
            {videoOrGate(220)}
            {canAccess && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Btn active={follow} onClick={() => setFollow(x => !x)}>自动跟随 {follow ? "ON" : "OFF"}</Btn>
                <div style={{ marginLeft: "auto", fontSize: 12, color: THEME.colors.faint }}>循环：{loopIdx === -1 ? "关闭" : `第${loopIdx + 1}句`}</div>
              </div>
            )}
          </Card>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: THEME.colors.ink }}>字幕</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn active={subLang === "en"} onClick={() => setSubLang("en")}>EN</Btn>
              <Btn active={subLang === "zh"} onClick={() => setSubLang("zh")}>中</Btn>
            </div>
            <button type="button" onClick={() => setVocabOpen(true)} style={{ marginLeft: "auto", border: "none", background: THEME.colors.ink, color: "#fff", borderRadius: THEME.radii.md, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>查看词汇卡</button>
          </div>
        </div>

        <div ref={mobileListRef} style={{ flex: 1, overflow: "auto", padding: 12, paddingBottom: canAccess ? 84 : 16 }}>
          {segments.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {segments.map((seg, idx) => (
                <SubtitleRow key={idx} seg={seg} idx={idx} active={idx === activeSegIdx}
                  showZh={subLang === "zh"} onClick={() => jumpTo(seg, idx)}
                  loopIdx={loopIdx} onToggleLoop={i => setLoopIdx(p => p === i ? -1 : i)}
                  renderEn={renderEn} rowRef={el => { if (el) rowRefs.current[idx] = el; }} />
              ))}
            </div>
          ) : (
            <Card style={{ padding: 14 }}>
              <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.6 }}>暂无字幕内容。</div>
            </Card>
          )}
        </div>

        {canAccess && (
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, background: THEME.colors.surface, borderTop: `1px solid ${THEME.colors.border}`, padding: 10 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" onClick={togglePlay} style={{ width: 44, height: 44, borderRadius: THEME.radii.md, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontWeight: 900, fontSize: 12, color: THEME.colors.ink }}>
                {vPlaying ? "暂停" : "播放"}
              </button>
              <div style={{ flex: 1 }}>
                <input type="range" min={0} max={sliderMax || 0.000001} step="0.01" value={sliderVal}
                  onPointerDown={() => { setDragging(true); setDragValue(sliderVal); }}
                  onPointerUp={() => { setDragging(false); seekTo(dragValue); }}
                  onChange={e => { const v = Number(e.target.value); setDragValue(v); seekTo(v); }}
                  style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.colors.faint, marginTop: 2 }}>
                  <span>{fmtSec(dragging ? dragValue : vCur)}</span><span>{fmtSec(vDur)}</span>
                </div>
              </div>
              <select value={rate} onChange={e => setRate(Number(e.target.value))} style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.sm, padding: "6px 8px", fontSize: 12, background: THEME.colors.surface }}>
                {[0.75, 1, 1.25, 1.5, 2].map(r => <option key={r} value={r}>{r}x</option>)}
              </select>
              <button type="button" onClick={() => setVocabOpen(true)} style={{ border: "none", background: THEME.colors.ink, color: "#fff", borderRadius: THEME.radii.md, padding: "10px 10px", cursor: "pointer", fontWeight: 900, fontSize: 11 }}>词卡</button>
            </div>
          </div>
        )}

        {vocabOpen && (
          <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.18)", display: "flex", alignItems: "flex-end" }} onClick={() => setVocabOpen(false)}>
            <div style={{ width: "100%", background: THEME.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, border: `1px solid ${THEME.colors.border}`, boxShadow: "0 -20px 50px rgba(0,0,0,0.12)", padding: 16, height: "55vh", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: THEME.colors.border2, margin: "0 auto 12px" }} />
              <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: THEME.colors.ink }}>词汇卡</div>
                <button type="button" onClick={() => setVocabOpen(false)} style={{ marginLeft: "auto", border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.md, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>关闭</button>
              </div>
              {vocabPanel("calc(55vh - 130px)")}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── DESKTOP LAYOUT ───────────────────────────────────────
  return (
    <div style={{ background: THEME.colors.bg, minHeight: "100vh" }}>
      <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
      {navBar}
      {showBookmarkLoginModal && <BookmarkLoginModal onClose={() => setShowBookmarkLoginModal(false)} />}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: vocabOpen ? "1fr 1fr 1fr" : "1.1fr 1fr", gap: 16, alignItems: "start" }}>

          <Card style={{ padding: 14, position: "sticky", top: 70 }}>
            {videoOrGate(null)}
            {canAccess && (
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Btn active={follow} onClick={() => setFollow(x => !x)}>自动跟随 {follow ? "ON" : "OFF"}</Btn>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: THEME.colors.faint }}>倍速</span>
                  <select value={rate} onChange={e => setRate(Number(e.target.value))} style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.sm, padding: "6px 8px", fontSize: 12, background: THEME.colors.surface }}>
                    {[0.75, 1, 1.25, 1.5, 2].map(r => <option key={r} value={r}>{r}x</option>)}
                  </select>
                </div>
              </div>
            )}
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: THEME.colors.ink }}>字幕</div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn active={subLang === "en"} onClick={() => setSubLang("en")}>EN</Btn>
                <Btn active={subLang === "zh"} onClick={() => setSubLang("zh")}>中</Btn>
              </div>
              {!vocabOpen
                ? <button type="button" onClick={() => setVocabOpen(true)} style={{ marginLeft: "auto", border: "none", background: THEME.colors.ink, color: "#fff", borderRadius: THEME.radii.md, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>词汇卡</button>
                : <div style={{ marginLeft: "auto", fontSize: 12, color: THEME.colors.faint }}>循环：{loopIdx === -1 ? "关闭" : `第${loopIdx + 1}句`}</div>
              }
            </div>
            {segments.length ? (
              <div ref={desktopListRef} style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 560, overflow: "auto", paddingRight: 4 }}>
                {segments.map((seg, idx) => (
                  <SubtitleRow key={idx} seg={seg} idx={idx} active={idx === activeSegIdx}
                    showZh={subLang === "zh"} onClick={() => jumpTo(seg, idx)}
                    loopIdx={loopIdx} onToggleLoop={i => setLoopIdx(p => p === i ? -1 : i)}
                    renderEn={renderEn} rowRef={el => { if (el) rowRefs.current[idx] = el; }} />
                ))}
              </div>
            ) : (
              <Card style={{ padding: 14 }}>
                <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.6 }}>
                  {details ? "暂无字幕段" : "暂无详情内容，上传字幕后即可显示。"}
                </div>
              </Card>
            )}
          </Card>

          {vocabOpen && (
            <Card style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: THEME.colors.ink }}>词汇卡</div>
                <button type="button" onClick={() => setVocabOpen(false)} style={{ marginLeft: "auto", border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.md, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>收起</button>
              </div>
              {vocabPanel(540)}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
