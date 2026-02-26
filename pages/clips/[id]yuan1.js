// pages/clips/[id].js
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();

  // ✅ 强制在控制台打印：请求 URL + 状态码 + 原始返回前 200 字
  try {
    console.log("[fetchJson]", res.status, url, text.slice(0, 200));
  } catch {}

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message || data.detail)) ||
      text ||
      `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function fmtSec(s) {
  const n = Number(s || 0);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  const mm = Math.floor(n / 60);
  const ss = Math.floor(n % 60);
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function Pill({ active, children, onClick, style, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        border: "1px solid #eee",
        background: active ? "#111" : "white",
        color: active ? "white" : "#111",
        borderRadius: 999,
        padding: "6px 12px",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 900,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 16,
        background: "white",
        boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ========== 本地收藏（词汇） ==========
function loadFavVocab() {
  try {
    const raw = localStorage.getItem("vocab_favs_v1");
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => String(x)));
  } catch {
    return new Set();
  }
}
function saveFavVocab(set) {
  try {
    localStorage.setItem("vocab_favs_v1", JSON.stringify(Array.from(set)));
  } catch {}
}

// ========== 发音：优先 audio_url，否则用 TTS ==========
function speakEn(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {}
}
function playAudioUrl(url) {
  try {
    const a = new Audio(url);
    a.play?.();
  } catch {}
}

function normTerm(s) {
  return String(s || "").trim();
}
function normForMatch(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findSegIdxForTerm(segments, term) {
  const q = normForMatch(term);
  if (!q) return -1;
  for (let i = 0; i < (segments || []).length; i++) {
    const en = normForMatch(segments[i]?.en || "");
    if (en.includes(q)) return i;
  }
  return -1;
}

function findSegIdxBySegmentId(segments, segmentId) {
  if (!segmentId) return -1;
  const sid = String(segmentId).trim();
  if (!sid) return -1;
  for (let i = 0; i < (segments || []).length; i++) {
    if (String(segments[i]?.id || "").trim() === sid) return i;
  }
  return -1;
}

function TinyIconBtn({ title, onClick, children, active }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        border: active ? "1px solid #bfe3ff" : "1px solid #eee",
        background: active ? "#f3fbff" : "white",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        fontSize: 16,
      }}
    >
      {children}
    </button>
  );
}

// ========== 字幕高亮 ==========
function escapeRegExp(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildHighlighter(terms) {
  const clean = Array.from(
    new Set(
      (terms || [])
        .map((t) => String(t || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => b.length - a.length);

  if (!clean.length) return (text) => (text ? text : "-");

  const pattern = clean.map(escapeRegExp).join("|");
  const re = new RegExp(`(${pattern})`, "ig");

  return (text) => {
    const s = String(text || "");
    if (!s) return "-";
    const parts = s.split(re);

    return parts.map((p, i) => {
      const hit = clean.some(
        (t) => t.toLowerCase() === String(p).toLowerCase()
      );
      if (!hit) return <span key={i}>{p}</span>;

      return (
        <mark
          key={i}
          style={{
            background: "#fff1b8",
            padding: "0 3px",
            borderRadius: 6,
          }}
        >
          {p}
        </mark>
      );
    });
  };
}

function VocabCard({
  v,
  kind,
  showZh,
  segments,
  onLocate,
  favSet,
  onToggleFav,
}) {
  const term = normTerm(v.term || v.word || "");
  const audioUrl = v.audio_url || v.audio || "";
  const isFav = favSet?.has(term);

  const meaningZh = v.meaning_zh || v.zh || "";
  const rawExampleEn = v.example_en || "";
  const rawExampleZh = v.example_zh || "";
  const useCaseZh = v.use_case_zh || "";

  let exampleEn = rawExampleEn;
  let exampleZh = rawExampleZh;
  if (kind === "expressions") {
    const byId = findSegIdxBySegmentId(segments, v.segment_id);
    const idx = byId !== -1 ? byId : findSegIdxForTerm(segments, term);
    if (idx !== -1) {
      exampleEn = segments[idx]?.en || rawExampleEn;
      exampleZh = segments[idx]?.zh || rawExampleZh;
    }
  }

  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>
            {term || "-"}
          </div>
          {v.ipa ? (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              / {v.ipa} /
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <TinyIconBtn
            title="听发音"
            onClick={() => {
              if (audioUrl) playAudioUrl(audioUrl);
              else speakEn(term);
            }}
          >
            🔊
          </TinyIconBtn>

          <TinyIconBtn
            title="收藏"
            active={!!isFav}
            onClick={() => onToggleFav(term)}
          >
            {isFav ? "❤️" : "🤍"}
          </TinyIconBtn>

          <TinyIconBtn
            title="定位到视频字幕"
            onClick={() => {
              const byId = findSegIdxBySegmentId(segments, v.segment_id);
              const idx = byId !== -1 ? byId : findSegIdxForTerm(segments, term);
              if (idx !== -1) onLocate(idx);
            }}
          >
            📍
          </TinyIconBtn>

          <button
            type="button"
            onClick={() => setCollapsed((x) => !x)}
            title={collapsed ? "展开" : "收起"}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "1px solid #eee",
              background: "white",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 900,
              display: "grid",
              placeItems: "center",
              lineHeight: 1,
            }}
          >
            {collapsed ? "▾" : "▴"}
          </button>
        </div>
      </div>

      {!collapsed ? (
        <>
          {showZh ? (
            <div
              style={{
                marginTop: 10,
                border: "1px solid #ffe3a3",
                background: "#fff8e8",
                borderRadius: 14,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, color: "#b86b00" }}>
                中文含义
              </div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55 }}>
                {meaningZh || "（暂无）"}
              </div>
            </div>
          ) : null}

          {exampleEn || exampleZh ? (
            <div
              style={{
                marginTop: 10,
                border: "1px solid #cfe6ff",
                background: "#f3fbff",
                borderRadius: 14,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, color: "#0b5aa6" }}>
                {kind === "expressions" ? "字幕原句" : "例句"}
              </div>
              {exampleEn ? (
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55 }}>
                  {exampleEn}
                </div>
              ) : null}
              {showZh && exampleZh ? (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    opacity: 0.9,
                    lineHeight: 1.55,
                  }}
                >
                  {exampleZh}
                </div>
              ) : null}
            </div>
          ) : null}

          {kind === "expressions" && showZh && useCaseZh ? (
            <div
              style={{
                marginTop: 10,
                border: "1px solid #e7e7ff",
                background: "#f6f6ff",
                borderRadius: 14,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, color: "#3c3ccf" }}>
                详细解析
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                }}
              >
                {useCaseZh}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

function SubtitleRow({
  seg,
  idx,
  active,
  onClick,
  showZh,
  rowRef,
  loopIdx,
  onToggleLoopForIdx,
  renderEn,
}) {
  const loopingThis = loopIdx === idx;
  return (
    <div
      ref={rowRef}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        border: active ? "1px solid #bfe3ff" : "1px solid #eee",
        background: active ? "#f3fbff" : "white",
        borderRadius: 14,
        padding: 12,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.7, whiteSpace: "nowrap" }}>
          {fmtSec(seg.start)} – {fmtSec(seg.end)}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLoopForIdx(idx);
          }}
          style={{
            border: "1px solid #eee",
            background: loopingThis ? "#111" : "white",
            color: loopingThis ? "white" : "#111",
            borderRadius: 999,
            padding: "3px 8px",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
          }}
          title="循环这句"
        >
          循环
        </button>
      </div>

      <div style={{ marginTop: 8, lineHeight: 1.55 }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>
          {renderEn ? renderEn(seg.en || "") : seg.en || "-"}
        </div>
        {showZh ? (
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
            {seg.zh || "（暂无中文）"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function useIsMobile(breakpoint = 1100) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(!!mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [breakpoint]);
  return isMobile;
}

export default function ClipDetailPage() {
  const router = useRouter();
  const isMobile = useIsMobile(1100);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [item, setItem] = useState(null);
  const [me, setMe] = useState(null);
  const [details, setDetails] = useState(null);

  const [subLang, setSubLang] = useState("zh");
  const showZhSub = subLang === "zh";

  const [vocabOpen, setVocabOpen] = useState(false);
  const [vocabTab, setVocabTab] = useState("words");
  const [showZhExplain, setShowZhExplain] = useState(true);

  const videoRef = useRef(null);
  const [activeSegIdx, setActiveSegIdx] = useState(-1);
  const [follow, setFollow] = useState(true);
  const [rate, setRate] = useState(1);

  const [loopIdx, setLoopIdx] = useState(-1);

  const listWrapRef = useRef(null);
  const rowRefs = useRef({});

  const [favSet, setFavSet] = useState(() => new Set());

  // mobile底部播放条
  const [vCur, setVCur] = useState(0);
  const [vDur, setVDur] = useState(0);
  const [vPlaying, setVPlaying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  useEffect(() => {
    setFavSet(loadFavVocab());
  }, []);

  const clipId = useMemo(() => {
    const raw = router.query?.id;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [router.query?.id]);

   // ✅✅✅ 关键：从后台拉 JSON（只保留一个 useEffect，不能嵌套）
  useEffect(() => {
    if (!router.isReady) return;
    if (!clipId) return;

    let mounted = true;

    async function run() {
      setLoading(true);
      setNotFound(false);
      setItem(null);
      setMe(null);
      setDetails(null);

      try {
        const d1 = await fetchJson(`/api/clip?id=${clipId}`);
        if (!mounted) return;

        const gotItem = d1?.item || null;
        setItem(gotItem);
        setMe(d1?.me || null);

        if (!gotItem) {
          setNotFound(true);
          return;
        }

        // 拉详情 JSON
        const d2 = await fetchJson(`/api/clip_details?id=${clipId}&_t=${Date.now()}`);
        if (!mounted) return;

        let dj = d2?.details_json ?? null;

        // 如果后端把 details_json 存成了字符串，这里自动 parse
        if (typeof dj === "string") {
          try {
            dj = JSON.parse(dj);
          } catch (e) {
            console.log("[clip_details] details_json parse failed:", e);
            dj = null;
          }
        }

        // 调试日志（可留可删）
        try {
          console.log("[clip_details] has_details:", !!dj);
          console.log(
            "[clip_details] segments:",
            Array.isArray(dj?.segments) ? dj.segments.length : "no"
          );
          console.log(
            "[clip_details] vocab_words:",
            Array.isArray(dj?.vocab?.words) ? dj.vocab.words.length : "no"
          );
        } catch {}

        if (mounted) setDetails(dj ?? null);
      } catch (e) {
        console.log("[clip_details] failed:", e);
        if (e?.status === 404) setNotFound(true);
        if (mounted) setDetails(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [router.isReady, clipId]);

  // ✅ details_json -> segments
  const segments = useMemo(() => {
    const arr = details?.segments;
    return Array.isArray(arr) ? arr : [];
  }, [details]);

  // ✅ details_json -> vocab
  const vocab = useMemo(() => {
    const v = details?.vocab || {};
    const words = Array.isArray(v.words) ? v.words : [];
    const phrases = Array.isArray(v.phrases) ? v.phrases : [];
    const expressions = Array.isArray(v.expressions)
      ? v.expressions
      : Array.isArray(v.idioms)
      ? v.idioms
      : [];
    return { words, phrases, expressions };
  }, [details]);

  const vocabList = useMemo(() => {
    if (vocabTab === "phrases") return vocab.phrases;
    if (vocabTab === "expressions") return vocab.expressions;
    return vocab.words;
  }, [vocabTab, vocab]);

  const tabTerms = useMemo(() => {
    const pick = (x) => String(x?.term || x?.word || "").trim();
    const arr = (vocabList || []).map(pick).filter(Boolean);
    return Array.from(new Set(arr)).sort((a, b) => b.length - a.length);
  }, [vocabList]);

  const renderEn = useMemo(() => buildHighlighter(tabTerms), [tabTerms]);

  const canAccess = !!item?.can_access;

  function jumpTo(seg, idx) {
    setActiveSegIdx(idx);
    const v = videoRef.current;
    if (!v) return;
    const t = Number(seg?.start || 0);
    try {
      v.currentTime = t;
      v.play?.();
    } catch {}
  }

  function locateToSegIdx(idx) {
    if (idx < 0 || idx >= segments.length) return;
    const seg = segments[idx];
    jumpTo(seg, idx);

    const wrap = listWrapRef.current;
    const el = rowRefs.current[idx];
    if (wrap && el) {
      const top = el.offsetTop;
      wrap.scrollTo({ top: Math.max(0, top - 120), behavior: "smooth" });
    }
  }

  function toggleFav(term) {
    const t = normTerm(term);
    if (!t) return;
    setFavSet((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      saveFavVocab(next);
      return next;
    });
  }

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.playbackRate = rate;
    } catch {}
  }, [rate]);

  // timeupdate：高亮+循环
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!segments.length) return;

    function findActiveIdx(t) {
      for (let i = 0; i < segments.length; i++) {
        const s = Number(segments[i]?.start || 0);
        const e = Number(segments[i]?.end || 0);
        if (t >= s && t < e) return i;
      }
      return -1;
    }

    function onTime() {
      const t = v.currentTime || 0;
      const idx = findActiveIdx(t);
      if (idx !== -1 && idx !== activeSegIdx) setActiveSegIdx(idx);

      if (loopIdx !== -1) {
        const seg = segments[loopIdx];
        if (!seg) return;
        const start = Number(seg.start || 0);
        const end = Number(seg.end || 0);
        if (t >= end - 0.02) {
          try {
            v.currentTime = start;
            if (!v.paused) v.play?.();
          } catch {}
        }
      }
    }

    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [segments, loopIdx, activeSegIdx]);

  // follow滚动
  useEffect(() => {
    if (!follow) return;
    if (activeSegIdx < 0) return;
    const el = rowRefs.current[activeSegIdx];
    const wrap = listWrapRef.current;
    if (!el || !wrap) return;

    const top = el.offsetTop;
    const h = el.offsetHeight;
    const wh = wrap.clientHeight;
    const target = Math.max(0, top - wh * 0.35 + h * 0.5);
    wrap.scrollTo({ top: target, behavior: "smooth" });
  }, [activeSegIdx, follow]);

  function onToggleLoopForIdx(idx) {
    setLoopIdx((prev) => (prev === idx ? -1 : idx));
  }

  // mobile：底部播放条同步 + 可拖动
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    function sync() {
      if (!dragging) setVCur(v.currentTime || 0);
      setVDur(v.duration || 0);
      setVPlaying(!v.paused);
    }

    function onLoaded() {
      setVDur(v.duration || 0);
      if (!dragging) setVCur(v.currentTime || 0);
    }
    function onPlay() {
      setVPlaying(true);
    }
    function onPause() {
      setVPlaying(false);
    }

    v.addEventListener("timeupdate", sync);
    v.addEventListener("durationchange", sync);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);

    sync();
    return () => {
      v.removeEventListener("timeupdate", sync);
      v.removeEventListener("durationchange", sync);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [item?.video_url, canAccess, dragging]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (v.paused) v.play?.();
      else v.pause?.();
    } catch {}
  }

  function seekTo(t) {
    const v = videoRef.current;
    if (!v) return;
    const dur = Number(v.duration || 0);
    const next = Math.max(0, Math.min(Number(t || 0), dur || 0));
    try {
      v.currentTime = next;
    } catch {}
  }

  // mobile：打开词汇卡锁背景
  useEffect(() => {
    if (!isMobile) return;
    const on = !!vocabOpen;
    const prev = document.body.style.overflow;
    if (on) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, vocabOpen]);

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        <div style={{ opacity: 0.7 }}>加载中...</div>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            ← 返回
          </Link>
          <div style={{ fontWeight: 950 }}>Clip #{clipId || "-"}</div>
        </div>
        <Card style={{ padding: 14, marginTop: 14 }}>
          未找到该视频（id={clipId || "-"}）
        </Card>
      </div>
    );
  }

  const tabPillStyle = {
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 950,
  };
  const zhToggleStyle = (on) => ({
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 950,
    border: on ? "1px solid #9ecbff" : "1px solid #cfe6ff",
    background: on ? "#0b5aa6" : "#f3fbff",
    color: on ? "white" : "#0b5aa6",
  });

  // =======================
  // ✅ 手机版布局（固定顶+字幕可滚+底部播放条）
  // =======================
  if (isMobile) {
    const sliderMax = Math.max(0, Number(vDur || 0));
    const sliderValue = dragging
      ? Math.min(Number(dragValue || 0), sliderMax || 0)
      : Math.min(Number(vCur || 0), sliderMax || 0);

    return (
      <div
        style={{
          height: "100vh",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 顶部栏 */}
        <div
          style={{
            padding: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid #eee",
          }}
        >
          <Link
            href="/"
            style={{
              border: "1px solid #eee",
              background: "white",
              borderRadius: 12,
              padding: "8px 12px",
              textDecoration: "none",
              color: "#111",
              fontWeight: 950,
              whiteSpace: "nowrap",
            }}
          >
            ← 返回
          </Link>

          <div style={{ fontSize: 16, fontWeight: 950, flex: 1, minWidth: 0 }}>
            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.title || `Clip #${item.id}`}
            </div>
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>
              登录 {me?.logged_in ? "✅" : "❌"} / 会员{" "}
              {me?.is_member ? "✅" : "❌"}
            </div>
          </div>
        </div>

        {/* 固定区：视频+字幕按钮 */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "white",
            borderBottom: "1px solid #eee",
            padding: 12,
          }}
        >
          <Card style={{ padding: 10 }}>
            {canAccess ? (
              <>
                <video
                  ref={videoRef}
                  controls={false}
                  playsInline
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    background: "#000",
                    maxHeight: 220,
                  }}
                  src={item.video_url}
                  poster={item.cover_url || undefined}
                />

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <Pill active={follow} onClick={() => setFollow((x) => !x)}>
                    自动跟随 {follow ? "ON" : "OFF"}
                  </Pill>

                  <div
                    style={{
                      marginLeft: "auto",
                      fontSize: 12,
                      opacity: 0.65,
                      fontWeight: 900,
                    }}
                  >
                    当前循环：{loopIdx === -1 ? "关闭" : `第 ${loopIdx + 1} 句`}
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  border: "1px solid #ffd5d5",
                  background: "#fff5f5",
                  borderRadius: 14,
                  padding: 12,
                  color: "#b00",
                  fontSize: 13,
                  lineHeight: 1.6,
                  fontWeight: 900,
                }}
              >
                会员专享：该视频需要登录并兑换码激活后观看。
              </div>
            )}
          </Card>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 16 }}>字幕</div>

            <div style={{ display: "flex", gap: 8, marginLeft: 6 }}>
              <Pill active={subLang === "en"} onClick={() => setSubLang("en")}>
                EN
              </Pill>
              <Pill active={subLang === "zh"} onClick={() => setSubLang("zh")}>
                中
              </Pill>
            </div>

            <button
              type="button"
              onClick={() => setVocabOpen(true)}
              style={{
                marginLeft: "auto",
                border: "none",
                background: "#111",
                color: "white",
                borderRadius: 12,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 950,
                fontSize: 12,
              }}
            >
              查看词汇卡
            </button>
          </div>
        </div>

        {/* 只让字幕列表滚动 */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 12,
            paddingBottom: canAccess ? 84 : 16,
          }}
          ref={listWrapRef}
        >
          {segments.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {segments.map((seg, idx) => (
                <SubtitleRow
                  key={idx}
                  seg={seg}
                  idx={idx}
                  active={idx === activeSegIdx}
                  showZh={showZhSub}
                  onClick={() => jumpTo(seg, idx)}
                  loopIdx={loopIdx}
                  onToggleLoopForIdx={onToggleLoopForIdx}
                  renderEn={renderEn}
                  rowRef={(el) => {
                    if (el) rowRefs.current[idx] = el;
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 14,
                padding: 12,
                fontSize: 13,
                opacity: 0.8,
                lineHeight: 1.6,
              }}
            >
              {details
                ? "details_json 里没有 segments 字幕段"
                : "暂无详情内容（details_json）。后续把 AI 生成 JSON 写入 clip_details.details_json 即可。"}
            </div>
          )}
        </div>

        {/* 底部固定播放条：可拖动 */}
        {canAccess ? (
          <div
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
              background: "white",
              borderTop: "1px solid #eee",
              padding: 10,
              touchAction: "none",
            }}
          >
            <div
              style={{
                maxWidth: 1200,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={togglePlay}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  border: "1px solid #eee",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 950,
                  fontSize: 14,
                }}
                title="播放/暂停"
              >
                {vPlaying ? "暂停" : "播放"}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="range"
                  min={0}
                  max={sliderMax || 0.000001}
                  step="0.01"
                  value={sliderValue}
                  onPointerDown={() => {
                    setDragging(true);
                    setDragValue(sliderValue);
                  }}
                  onPointerUp={() => {
                    setDragging(false);
                    seekTo(dragValue);
                  }}
                  onTouchStart={() => {
                    setDragging(true);
                    setDragValue(sliderValue);
                  }}
                  onTouchEnd={() => {
                    setDragging(false);
                    seekTo(dragValue);
                  }}
                  onMouseDown={() => {
                    setDragging(true);
                    setDragValue(sliderValue);
                  }}
                  onMouseUp={() => {
                    setDragging(false);
                    seekTo(dragValue);
                  }}
                  onInput={(e) => {
                    const val = Number(e.target.value || 0);
                    setDragValue(val);
                    seekTo(val);
                  }}
                  onChange={(e) => {
                    const val = Number(e.target.value || 0);
                    setDragValue(val);
                    seekTo(val);
                  }}
                  style={{ width: "100%" }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    opacity: 0.7,
                    fontWeight: 900,
                    marginTop: 4,
                  }}
                >
                  <div>{fmtSec(dragging ? dragValue : vCur)}</div>
                  <div>{fmtSec(vDur)}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
                  倍速
                </div>
                <select
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: "8px 10px",
                    fontWeight: 900,
                    background: "white",
                  }}
                >
                  {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                    <option key={r} value={r}>
                      {r}x
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setVocabOpen(true)}
                style={{
                  border: "none",
                  background: "#111",
                  color: "white",
                  borderRadius: 14,
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontWeight: 950,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                词卡
              </button>
            </div>
          </div>
        ) : null}

        {/* 词汇卡：半屏 bottom sheet */}
        {vocabOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: "rgba(0,0,0,0.18)",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-end",
            }}
            onClick={() => setVocabOpen(false)}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 1200,
                background: "white",
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                border: "1px solid #eee",
                boxShadow: "0 -20px 50px rgba(0,0,0,0.12)",
                padding: 12,
                height: "50vh",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: 46,
                  height: 5,
                  borderRadius: 999,
                  background: "#eaeaea",
                  margin: "2px auto 10px",
                }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 950, fontSize: 16 }}>词汇卡</div>

                <button
                  type="button"
                  onClick={() => setVocabOpen(false)}
                  style={{
                    marginLeft: "auto",
                    border: "1px solid #eee",
                    background: "white",
                    borderRadius: 12,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontWeight: 950,
                    fontSize: 12,
                  }}
                >
                  关闭
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 10,
                  alignItems: "center",
                }}
              >
                <Pill
                  active={showZhExplain}
                  onClick={() => setShowZhExplain((x) => !x)}
                  style={zhToggleStyle(showZhExplain)}
                  title="点一下显示中文，再点一下关闭中文"
                >
                  {showZhExplain ? "中文 ON" : "中文 OFF"}
                </Pill>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <Pill
                  active={vocabTab === "words"}
                  onClick={() => setVocabTab("words")}
                  style={tabPillStyle}
                >
                  单词 ({vocab.words.length})
                </Pill>
                <Pill
                  active={vocabTab === "phrases"}
                  onClick={() => setVocabTab("phrases")}
                  style={tabPillStyle}
                >
                  短语 ({vocab.phrases.length})
                </Pill>
                <Pill
                  active={vocabTab === "expressions"}
                  onClick={() => setVocabTab("expressions")}
                  style={tabPillStyle}
                >
                  地道表达 ({vocab.expressions.length})
                </Pill>
              </div>

              <div
                style={{
                  marginTop: 12,
                  overflow: "auto",
                  height: "calc(50vh - 170px)",
                  paddingBottom: 10,
                }}
              >
                {vocabList.length ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      paddingRight: 4,
                    }}
                  >
                    {vocabList.map((v, idx) => (
                      <VocabCard
                        key={idx}
                        v={v}
                        kind={vocabTab}
                        showZh={showZhExplain}
                        segments={segments}
                        onLocate={(i) => {
                          setVocabOpen(false);
                          setTimeout(() => locateToSegIdx(i), 80);
                        }}
                        favSet={favSet}
                        onToggleFav={toggleFav}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 14,
                      padding: 12,
                      fontSize: 13,
                      opacity: 0.8,
                      lineHeight: 1.6,
                    }}
                  >
                    当前分类暂无词汇卡内容。
                    <div style={{ marginTop: 6, opacity: 0.75 }}>
                      （后续你把 AI 输出的 vocab 写入 details_json 即可）
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <style jsx>{`
          input[type="range"] {
            width: 100%;
          }
        `}</style>
      </div>
    );
  }

  // =======================
  // ✅ 电脑版：保持你原来结构
  // =======================
  const gridCols = vocabOpen
    ? "minmax(320px, 1.05fr) minmax(360px, 1fr) minmax(340px, 0.95fr)"
    : "minmax(420px, 1.15fr) minmax(420px, 1fr)";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            border: "1px solid #eee",
            background: "white",
            borderRadius: 12,
            padding: "8px 12px",
            textDecoration: "none",
            color: "#111",
            fontWeight: 950,
          }}
        >
          ← 返回
        </Link>

        <div style={{ fontSize: 20, fontWeight: 950, flex: 1, minWidth: 220 }}>
          {item.title || `Clip #${item.id}`}
        </div>

        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
          登录 {me?.logged_in ? "✅" : "❌"} / 会员 {me?.is_member ? "✅" : "❌"}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: gridCols,
          gap: 14,
          alignItems: "start",
        }}
      >
        <Card style={{ padding: 12, position: "sticky", top: 12 }}>
          {canAccess ? (
            <>
              <video
                ref={videoRef}
                controls
                playsInline
                style={{ width: "100%", borderRadius: 14, background: "#000" }}
                src={item.video_url}
                poster={item.cover_url || undefined}
              />

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <Pill active={follow} onClick={() => setFollow((x) => !x)}>
                  自动跟随 {follow ? "ON" : "OFF"}
                </Pill>

                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
                    倍速
                  </div>
                  <select
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: "8px 10px",
                      fontWeight: 900,
                    }}
                  >
                    {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                      <option key={r} value={r}>
                        {r}x
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                border: "1px solid #ffd5d5",
                background: "#fff5f5",
                borderRadius: 14,
                padding: 12,
                color: "#b00",
                fontSize: 13,
                lineHeight: 1.6,
                fontWeight: 900,
              }}
            >
              会员专享：该视频需要登录并兑换码激活后观看。
            </div>
          )}
        </Card>

        <Card style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>字幕</div>

            <div style={{ display: "flex", gap: 8, marginLeft: 6 }}>
              <Pill active={subLang === "en"} onClick={() => setSubLang("en")}>
                EN
              </Pill>
              <Pill active={subLang === "zh"} onClick={() => setSubLang("zh")}>
                中
              </Pill>
            </div>

            {!vocabOpen ? (
              <button
                type="button"
                onClick={() => setVocabOpen(true)}
                style={{
                  marginLeft: "auto",
                  border: "none",
                  background: "#111",
                  color: "white",
                  borderRadius: 12,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: 950,
                  fontSize: 12,
                }}
              >
                词汇卡
              </button>
            ) : (
              <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>
                当前循环：{loopIdx === -1 ? "关闭" : `第 ${loopIdx + 1} 句`}
              </div>
            )}
          </div>

          <div style={{ marginTop: 10 }}>
            {segments.length ? (
              <div
                ref={listWrapRef}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  maxHeight: 540,
                  overflow: "auto",
                  paddingRight: 4,
                }}
              >
                {segments.map((seg, idx) => (
                  <SubtitleRow
                    key={idx}
                    seg={seg}
                    idx={idx}
                    active={idx === activeSegIdx}
                    showZh={showZhSub}
                    onClick={() => jumpTo(seg, idx)}
                    loopIdx={loopIdx}
                    onToggleLoopForIdx={onToggleLoopForIdx}
                    renderEn={renderEn}
                    rowRef={(el) => {
                      if (el) rowRefs.current[idx] = el;
                    }}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: 12,
                  fontSize: 13,
                  opacity: 0.8,
                  lineHeight: 1.6,
                }}
              >
                {details
                  ? "details_json 里没有 segments 字幕段"
                  : "暂无详情内容（details_json）。后续把 AI 生成 JSON 写入 clip_details.details_json 即可。"}
              </div>
            )}
          </div>
        </Card>

        {vocabOpen ? (
          <Card style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>词汇卡</div>

              <button
                type="button"
                onClick={() => setVocabOpen(false)}
                style={{
                  marginLeft: "auto",
                  border: "1px solid #eee",
                  background: "white",
                  borderRadius: 12,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: 950,
                  fontSize: 12,
                }}
              >
                收起
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 10,
                alignItems: "center",
              }}
            >
              <Pill
                active={showZhExplain}
                onClick={() => setShowZhExplain((x) => !x)}
                style={zhToggleStyle(showZhExplain)}
                title="点一下显示中文，再点一下关闭中文"
              >
                {showZhExplain ? "中文 ON" : "中文 OFF"}
              </Pill>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              <Pill
                active={vocabTab === "words"}
                onClick={() => setVocabTab("words")}
                style={tabPillStyle}
              >
                单词 ({vocab.words.length})
              </Pill>
              <Pill
                active={vocabTab === "phrases"}
                onClick={() => setVocabTab("phrases")}
                style={tabPillStyle}
              >
                短语 ({vocab.phrases.length})
              </Pill>
              <Pill
                active={vocabTab === "expressions"}
                onClick={() => setVocabTab("expressions")}
                style={tabPillStyle}
              >
                地道表达 ({vocab.expressions.length})
              </Pill>
            </div>

            <div style={{ marginTop: 12 }}>
              {vocabList.length ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    maxHeight: 540,
                    overflow: "auto",
                    paddingRight: 4,
                  }}
                >
                  {vocabList.map((v, idx) => (
                    <VocabCard
                      key={idx}
                      v={v}
                      kind={vocabTab}
                      showZh={showZhExplain}
                      segments={segments}
                      onLocate={locateToSegIdx}
                      favSet={favSet}
                      onToggleFav={toggleFav}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: 12,
                    fontSize: 13,
                    opacity: 0.8,
                    lineHeight: 1.6,
                  }}
                >
                  当前分类暂无词汇卡内容。
                  <div style={{ marginTop: 6, opacity: 0.75 }}>
                    （后续你把 AI 输出的 vocab 写入 details_json 即可）
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : null}
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="position: sticky"] {
            position: static !important;
          }
        }
        input[type="range"] {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
