// pages/clips/[id].js
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const msg = (data && (data.error || data.message || data.detail)) || text || `HTTP ${res.status}`;
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

function Pill({ active, children, onClick }) {
  return (
    <button
      type="button"
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

/** ✅ 模板里的词汇卡组件：原样保留 */
function VocabCard({ v, showZh }) {
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>
            {v.term || v.word || "-"}
          </div>
          {v.ipa ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>/ {v.ipa} /</div> : null}
        </div>
      </div>

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
          <div style={{ fontSize: 12, fontWeight: 900, color: "#b86b00" }}>中文含义</div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55 }}>
            {v.meaning_zh || v.zh || "（暂无）"}
          </div>
        </div>
      ) : null}

      {(v.example_en || v.example_zh) ? (
        <div
          style={{
            marginTop: 10,
            border: "1px solid #cfe6ff",
            background: "#f3fbff",
            borderRadius: 14,
            padding: 10,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, color: "#0b5aa6" }}>例句</div>
          {v.example_en ? <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55 }}>{v.example_en}</div> : null}
          {showZh && v.example_zh ? (
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9, lineHeight: 1.55 }}>{v.example_zh}</div>
          ) : null}
        </div>
      ) : null
      }
    </Card>
  );
}

function SubtitleRow({ seg, active, onClick, showZh, rowRef }) {
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
      </div>

      <div style={{ marginTop: 8, lineHeight: 1.55 }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>{seg.en || "-"}</div>
        {showZh ? (
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>{seg.zh || "（暂无中文）"}</div>
        ) : null}
      </div>
    </div>
  );
}

export default function ClipDetailPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [item, setItem] = useState(null);
  const [me, setMe] = useState(null);
  const [details, setDetails] = useState(null);

  // 字幕语言
  const [subLang, setSubLang] = useState("zh");
  const showZhSub = subLang === "zh";

  // ✅ 词汇卡模板状态（原样）
  const [vocabOpen, setVocabOpen] = useState(false);
  const [vocabTab, setVocabTab] = useState("words");
  const [showZhExplain, setShowZhExplain] = useState(true);

  // 字幕增强
  const videoRef = useRef(null);
  const [activeSegIdx, setActiveSegIdx] = useState(-1);
  const [follow, setFollow] = useState(true);
  const [loopSeg, setLoopSeg] = useState(false);
  const [rate, setRate] = useState(1);

  const listWrapRef = useRef(null);
  const rowRefs = useRef({});

  const clipId = useMemo(() => {
    const raw = router.query?.id;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [router.query?.id]);

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

        // ✅ 只用真实存在的接口 /api/clip_details
        try {
          const d2 = await fetchJson(`/api/clip_details?id=${clipId}`);
          if (!mounted) return;
          setDetails(d2?.details_json ?? null);
        } catch {
          setDetails(null);
        }
      } catch (e) {
        if (!mounted) return;
        if (e?.status === 404) setNotFound(true);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [router.isReady, clipId]);

  const segments = useMemo(() => {
    const arr = details?.segments;
    return Array.isArray(arr) ? arr : [];
  }, [details]);

  // ✅ 模板要求：details_json.vocab.words/phrases/idioms
  const vocab = useMemo(() => {
    const v = details?.vocab || {};
    const words = Array.isArray(v.words) ? v.words : [];
    const phrases = Array.isArray(v.phrases) ? v.phrases : [];
    const idioms = Array.isArray(v.idioms) ? v.idioms : [];
    return { words, phrases, idioms };
  }, [details]);

  const vocabList = useMemo(() => {
    if (vocabTab === "phrases") return vocab.phrases;
    if (vocabTab === "idioms") return vocab.idioms;
    return vocab.words;
  }, [vocabTab, vocab]);

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

  // 倍速
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.playbackRate = rate;
    } catch {}
  }, [rate]);

  // ✅ 自动高亮 + 循环（修复版）
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

      if (loopSeg && activeSegIdx !== -1) {
        const seg = segments[activeSegIdx];
        const start = Number(seg?.start || 0);
        const end = Number(seg?.end || 0);
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
  }, [segments, loopSeg, activeSegIdx]);

  // ✅ 自动滚动跟随当前句
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

  // ✅ 快捷键：空格/J/K/L
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const v = videoRef.current;

      if (e.code === "Space") {
        e.preventDefault();
        if (!v) return;
        try {
          if (v.paused) v.play?.();
          else v.pause?.();
        } catch {}
      }

      if (e.key === "k" || e.key === "K") {
        if (!segments.length) return;
        const next = Math.min((activeSegIdx < 0 ? 0 : activeSegIdx + 1), segments.length - 1);
        jumpTo(segments[next], next);
      }

      if (e.key === "j" || e.key === "J") {
        if (!segments.length) return;
        const prev = Math.max((activeSegIdx <= 0 ? 0 : activeSegIdx - 1), 0);
        jumpTo(segments[prev], prev);
      }

      if (e.key === "l" || e.key === "L") setLoopSeg((x) => !x);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [segments, activeSegIdx]);

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
        <Card style={{ padding: 14, marginTop: 14 }}>未找到该视频（id={clipId || "-"}）</Card>
      </div>
    );
  }

  // ✅ 三栏布局：打开词汇卡时显示第三列（与模板一致）
  const gridCols = vocabOpen
    ? "minmax(320px, 1.05fr) minmax(360px, 1fr) minmax(340px, 0.95fr)"
    : "minmax(420px, 1.15fr) minmax(420px, 1fr)";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      {/* 顶部栏 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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

      {/* 主体 */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: gridCols, gap: 14, alignItems: "start" }}>
        {/* 播放器 */}
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

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Pill active={follow} onClick={() => setFollow((x) => !x)}>
                  自动跟随 {follow ? "ON" : "OFF"}
                </Pill>
                <Pill active={loopSeg} onClick={() => setLoopSeg((x) => !x)}>
                  循环当前句 {loopSeg ? "ON" : "OFF"}
                </Pill>

                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>倍速</div>
                  <select
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    style={{ border: "1px solid #eee", borderRadius: 12, padding: "8px 10px", fontWeight: 900 }}
                  >
                    {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                      <option key={r} value={r}>
                        {r}x
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65, lineHeight: 1.6 }}>
                快捷键：空格 播放/暂停；J 上一句；K 下一句；L 循环开关
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

        {/* 字幕 */}
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
              <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>词汇卡已打开 →</div>
            )}
          </div>

          <div style={{ marginTop: 10 }}>
            {segments.length ? (
              <div
                ref={listWrapRef}
                style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 540, overflow: "auto", paddingRight: 4 }}
              >
                {segments.map((seg, idx) => (
                  <SubtitleRow
                    key={idx}
                    seg={seg}
                    active={idx === activeSegIdx}
                    showZh={showZhSub}
                    onClick={() => jumpTo(seg, idx)}
                    rowRef={(el) => {
                      if (el) rowRefs.current[idx] = el;
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
                {details ? "details_json 里没有 segments 字幕段" : "暂无详情内容（details_json）。后续把 AI 生成 JSON 写入 clip_details.details_json 即可。"}
              </div>
            )}
          </div>
        </Card>

        {/* 词汇卡（模板样式 + 模板数据结构） */}
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

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Pill active={showZhExplain} onClick={() => setShowZhExplain(true)}>
                中文解释
              </Pill>
              <Pill active={!showZhExplain} onClick={() => setShowZhExplain(false)}>
                关闭中文
              </Pill>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Pill active={vocabTab === "words"} onClick={() => setVocabTab("words")}>
                单词 ({vocab.words.length})
              </Pill>
              <Pill active={vocabTab === "phrases"} onClick={() => setVocabTab("phrases")}>
                短语 ({vocab.phrases.length})
              </Pill>
              <Pill active={vocabTab === "idioms"} onClick={() => setVocabTab("idioms")}>
                地道表达 ({vocab.idioms.length})
              </Pill>
            </div>

            <div style={{ marginTop: 12 }}>
              {vocabList.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 540, overflow: "auto", paddingRight: 4 }}>
                  {vocabList.map((v, idx) => (
                    <VocabCard key={idx} v={v} showZh={showZhExplain} />
                  ))}
                </div>
              ) : (
                <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
                  当前分类暂无词汇卡内容。
                  <div style={{ marginTop: 6, opacity: 0.75 }}>（后续你把 AI 输出的 vocab 写入 details_json 即可）</div>
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
      `}</style>
    </div>
  );
}
