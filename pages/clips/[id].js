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
        fontWeight: 700,
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

function SubtitleRow({ seg, active, onClick, showZh }) {
  return (
    <div
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
        {seg.repeat ? <div style={{ fontSize: 12, opacity: 0.6, marginLeft: "auto" }}>{seg.repeat}</div> : null}
      </div>

      <div style={{ marginTop: 8, lineHeight: 1.55 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{seg.en || "-"}</div>
        {showZh ? <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>{seg.zh || "（暂无中文）"}</div> : null}
      </div>
    </div>
  );
}

function VocabCard({ v, showZh }) {
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>{v.term || v.word || "-"}</div>
          {v.ipa ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>/ {v.ipa} /</div> : null}
        </div>
      </div>

      {showZh ? (
        <div style={{ marginTop: 10, border: "1px solid #ffe3a3", background: "#fff8e8", borderRadius: 14, padding: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#b86b00" }}>中文含义</div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55 }}>{v.meaning_zh || v.zh || "（暂无）"}</div>
        </div>
      ) : null}

      {(v.example_en || v.example_zh) && (
        <div style={{ marginTop: 10, border: "1px solid #cfe6ff", background: "#f3fbff", borderRadius: 14, padding: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#0b5aa6" }}>例句</div>
          {v.example_en ? <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55 }}>{v.example_en}</div> : null}
          {showZh && v.example_zh ? <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9, lineHeight: 1.55 }}>{v.example_zh}</div> : null}
        </div>
      )}
    </Card>
  );
}

export default function ClipDetailPage() {
  const router = useRouter();

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

  const clipId = useMemo(() => {
    const raw = router.query?.id;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [router.query?.id]);

  // ✅ 单独拉 details：先试 clip_detail，再试 clip_details；失败当 null（不影响整页）
  async function loadDetailsSafe(id) {
    try {
      const d2 = await fetchJson(`/api/clip_detail?id=${id}`);
      return d2?.details_json ?? null;
    } catch (e1) {
      // 如果 clip_detail 不存在，就试 clip_details
      try {
        const d3 = await fetchJson(`/api/clip_details?id=${id}`);
        return d3?.details_json ?? null;
      } catch {
        return null;
      }
    }
  }

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
        // ✅ 先拉 clip：只有这个失败才算 notFound
        const d1 = await fetchJson(`/api/clip?id=${clipId}`);
        if (!mounted) return;

        const gotItem = d1?.item || null;
        setItem(gotItem);
        setMe(d1?.me || null);

        if (!gotItem) {
          setNotFound(true);
          return;
        }

        // ✅ details 失败不影响整页
        const dj = await loadDetailsSafe(clipId);
        if (!mounted) return;
        setDetails(dj);
      } catch (e) {
        if (!mounted) return;
        // 只有 /api/clip 真的 404 才 notFound
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
          <div style={{ fontWeight: 900 }}>Clip #{clipId || "-"}</div>
        </div>
        <Card style={{ padding: 14, marginTop: 14 }}>
          未找到该视频（id={clipId || "-"}）
        </Card>
      </div>
    );
  }

  const canAccess = !!item.can_access;

  const gridCols = vocabOpen
    ? "minmax(320px, 1.05fr) minmax(360px, 1fr) minmax(340px, 0.95fr)"
    : "minmax(420px, 1.15fr) minmax(420px, 1fr)";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link
          href="/"
          style={{
            border: "1px solid #eee",
            background: "white",
            borderRadius: 12,
            padding: "8px 12px",
            textDecoration: "none",
            color: "#111",
            fontWeight: 800,
          }}
        >
          ← 返回
        </Link>

        <div style={{ fontSize: 20, fontWeight: 900 }}>{item.title || `Clip #${item.id}`}</div>

        <div style={{ marginLeft: "auto" }}>
          <Link
            href="/"
            style={{
              border: "1px solid #eee",
              background: "white",
              borderRadius: 12,
              padding: "8px 12px",
              textDecoration: "none",
              color: "#111",
              fontWeight: 800,
            }}
          >
            回首页
          </Link>
        </div>
      </div>

      <Card style={{ padding: 12, marginTop: 14 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>难度：{item?.difficulty_slugs?.[0] || "unknown"}</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>时长：{item.duration_sec ? `${item.duration_sec}s` : "-"}</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>权限：{item.access_tier || "-"}</div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>登录：{me?.logged_in ? "✅" : "❌"}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>会员：{me?.is_member ? "✅" : "❌"}</div>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: gridCols, gap: 14, alignItems: "start" }}>
        <Card style={{ padding: 12 }}>
          {canAccess ? (
            <video
              ref={videoRef}
              controls
              playsInline
              style={{ width: "100%", borderRadius: 14, background: "#000" }}
              src={item.video_url}
              poster={item.cover_url || undefined}
            />
          ) : (
            <div style={{ border: "1px solid #ffd5d5", background: "#fff5f5", borderRadius: 14, padding: 12, color: "#b00", fontSize: 13, lineHeight: 1.6, fontWeight: 700 }}>
              会员专享
              <div style={{ marginTop: 6, fontWeight: 500, color: "#b00" }}>该视频需要登录并先兑换码激活后观看。</div>
            </div>
          )}
        </Card>

        <Card style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>字幕</div>

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
                  fontWeight: 900,
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
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 540, overflow: "auto", paddingRight: 4 }}>
                {segments.map((seg, idx) => (
                  <SubtitleRow key={idx} seg={seg} active={idx === activeSegIdx} showZh={showZhSub} onClick={() => jumpTo(seg, idx)} />
                ))}
              </div>
            ) : (
              <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
                {details ? "details_json 里没有 segments 字幕段" : "暂无详情内容（details_json）。后续把 AI 生成 JSON 写入 clip_details.details_json 即可。"}
              </div>
            )}
          </div>
        </Card>

        {vocabOpen ? (
          <Card style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>词汇卡</div>

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
                  fontWeight: 900,
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
        }
      `}</style>
    </div>
  );
}
