// pages/clips/[id].js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function tsToSec(ts) {
  // "mm:ss" -> seconds
  const m = String(ts || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  const mm = parseInt(m[1], 10);
  const ss = parseInt(m[2], 10);
  return mm * 60 + ss;
}

function formatTs(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function ClipDetailPage() {
  const router = useRouter();
  const id = useMemo(() => parseInt(router.query.id || "0", 10), [router.query.id]);

  const videoRef = useRef(null);
  const listRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [clip, setClip] = useState(null); // from /api/clip?id
  const [detail, setDetail] = useState(null); // from /api/clip_detail?id
  const [tab, setTab] = useState("timeline"); // timeline | transcript | vocab | expr | takeaways

  const [currentSec, setCurrentSec] = useState(0);
  const [langMode, setLangMode] = useState("both"); // en | both | zh
  const [search, setSearch] = useState("");

  // 1) 拉 clip 基础信息（复用你已有 /api/clips 的字段逻辑）
  // 这里我们用 /api/clips?limit=1&offset=0&id=xx 不一定有，所以更稳：你后面可以加 /api/clip
  // 暂时：直接调用 /api/clips 并在前端找（数据少时可行）
  useEffect(() => {
    if (!router.isReady || !id) return;

    (async () => {
      setLoading(true);
      try {
        // A) 取 clip 基本信息：从 clips 接口里拿（临时方案）
        const d1 = await fetchJson(`/api/clips?limit=1&offset=0&id=${id}`);
        const item = d1?.items?.[0] || null;
        setClip(item);

        // B) 取详情 JSON
        const d2 = await fetchJson(`/api/clip_detail?id=${id}`);
        setDetail(d2?.details || null);
      } catch (e) {
        setClip(null);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [router.isReady, id]);

  // 2) 视频时间更新 -> 高亮字幕
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => setCurrentSec(v.currentTime || 0);
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  const timeline = useMemo(() => detail?.timeline || [], [detail]);
  const vocab = useMemo(() => detail?.vocabulary || [], [detail]);
  const expressions = useMemo(() => detail?.expressions || [], [detail]);
  const takeaways = useMemo(() => detail?.key_takeaways || [], [detail]);

  const activeIndex = useMemo(() => {
    if (!timeline.length) return -1;
    // 找最后一个 start <= currentSec
    let idx = -1;
    for (let i = 0; i < timeline.length; i++) {
      const t = timeline[i];
      const s = typeof t.start === "number" ? t.start : tsToSec(t.start_ts);
      if (s <= currentSec + 0.2) idx = i;
      else break;
    }
    return idx;
  }, [timeline, currentSec]);

  // 3) 自动滚动让高亮字幕在中间
  useEffect(() => {
    if (activeIndex < 0) return;
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-line="${activeIndex}"]`);
    if (!el) return;

    const top = el.offsetTop;
    const h = el.offsetHeight;
    const ch = container.clientHeight;
    const target = Math.max(0, top - ch / 2 + h / 2);
    container.scrollTo({ top: target, behavior: "smooth" });
  }, [activeIndex]);

  function seekTo(sec) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, sec);
    v.play?.();
  }

  const filteredVocab = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return vocab;
    return vocab.filter((x) => {
      return (
        String(x.term || "").toLowerCase().includes(q) ||
        String(x.meaning_zh || "").includes(q) ||
        String(x.meaning_en || "").toLowerCase().includes(q)
      );
    });
  }, [vocab, search]);

  const filteredExpr = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return expressions;
    return expressions.filter((x) => {
      return (
        String(x.phrase || "").toLowerCase().includes(q) ||
        String(x.meaning_zh || "").includes(q)
      );
    });
  }, [expressions, search]);

  const title =
    detail?.clip?.title_zh ||
    clip?.title ||
    (id ? `Clip #${id}` : "Clip");

  const canAccess = clip?.can_access ?? true;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            border: "1px solid #eee",
            background: "white",
            borderRadius: 10,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          ← 返回
        </button>

        <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a
            href="/"
            style={{
              border: "1px solid #eee",
              background: "white",
              borderRadius: 10,
              padding: "6px 10px",
              textDecoration: "none",
              color: "#111",
            }}
          >
            回首页
          </a>
        </div>
      </div>

      {loading ? (
        <div style={{ opacity: 0.7, padding: 10 }}>加载中...</div>
      ) : null}

      {!loading && !clip ? (
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 14, background: "white" }}>
          未找到该视频（id={id}）
        </div>
      ) : null}

      {clip ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 380px",
            gap: 12,
          }}
        >
          {/* 左：视频区 */}
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 16,
              background: "white",
              padding: 12,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 12, opacity: 0.75 }}>
              <span>难度：{clip.difficulty || "-"}</span>
              <span>时长：{clip.duration_sec ? `${clip.duration_sec}s` : "-"}</span>
              <span>权限：{clip.access_tier || "-"}</span>
            </div>

            {canAccess ? (
              <video
                ref={videoRef}
                src={clip.video_url}
                controls
                style={{ width: "100%", borderRadius: 14, background: "#000" }}
              />
            ) : (
              <div style={{ padding: 16, border: "1px dashed #ddd", borderRadius: 14, color: "#b00" }}>
                会员专享：请登录并兑换码激活
              </div>
            )}

            {/* 快捷重点（来自 AI） */}
            {takeaways?.length ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>重点</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {takeaways.slice(0, 4).map((t, i) => (
                    <div
                      key={i}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 14,
                        padding: 10,
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>{t.title_zh}</div>
                      <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>{t.detail_zh}</div>
                      {t.refs?.length ? (
                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {t.refs.slice(0, 4).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => seekTo(tsToSec(r))}
                              style={{
                                border: "1px solid #eee",
                                background: "white",
                                borderRadius: 999,
                                padding: "4px 8px",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* 右：学习面板 */}
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 16,
              background: "white",
              padding: 12,
              minHeight: 520,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {[
                ["timeline", "时间轴"],
                ["transcript", "转写文本"],
                ["vocab", "词汇卡"],
                ["expr", "表达"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  style={{
                    border: "1px solid #eee",
                    background: tab === k ? "#111" : "white",
                    color: tab === k ? "white" : "#111",
                    borderRadius: 999,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {label}
                </button>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <select
                  value={langMode}
                  onChange={(e) => setLangMode(e.target.value)}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 10,
                    padding: "6px 8px",
                    fontSize: 12,
                    background: "white",
                  }}
                >
                  <option value="en">只看英文</option>
                  <option value="both">中英</option>
                  <option value="zh">只看中文</option>
                </select>
              </div>
            </div>

            {/* 搜索：词汇/表达用 */}
            {tab === "vocab" || tab === "expr" ? (
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索…（英文/中文）"
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 13,
                  marginBottom: 10,
                }}
              />
            ) : null}

            {/* 内容区 */}
            <div style={{ flex: 1, minHeight: 0 }}>
              {/* Timeline */}
              {tab === "timeline" ? (
                <div
                  ref={listRef}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 14,
                    height: 520,
                    overflow: "auto",
                    padding: 8,
                  }}
                >
                  {timeline?.length ? (
                    timeline.map((t, i) => {
                      const s = typeof t.start === "number" ? t.start : tsToSec(t.start_ts);
                      const ts = t.start_ts || formatTs(s);
                      const active = i === activeIndex;

                      const showEn = langMode === "en" || langMode === "both";
                      const showZh = langMode === "zh" || langMode === "both";

                      return (
                        <div
                          key={i}
                          data-line={i}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "64px minmax(0, 1fr)",
                            gap: 10,
                            padding: "8px 8px",
                            borderRadius: 12,
                            background: active ? "rgba(0,0,0,0.06)" : "transparent",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => seekTo(s)}
                            style={{
                              border: "1px solid #eee",
                              background: "white",
                              borderRadius: 10,
                              padding: "6px 8px",
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {ts}
                          </button>

                          <div style={{ minWidth: 0 }}>
                            {t.type === "stage" ? (
                              <div style={{ opacity: 0.6, fontSize: 13 }}>
                                {t.en || ""}
                              </div>
                            ) : (
                              <>
                                {showEn ? (
                                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
                                    {t.en}
                                  </div>
                                ) : null}
                                {showZh ? (
                                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, lineHeight: 1.5 }}>
                                    {t.zh}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: 12, opacity: 0.7 }}>
                      还没有详情内容（details_json）。  
                      你把 AI 生成的 JSON 存进 clip_details.details_json 后，这里就会出现时间轴。
                    </div>
                  )}
                </div>
              ) : null}

              {/* Transcript */}
              {tab === "transcript" ? (
                <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, height: 520, overflow: "auto" }}>
                  {detail?.full_transcript ? (
                    <>
                      {langMode !== "zh" ? (
                        <>
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>English</div>
                          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 13 }}>
                            {detail.full_transcript.en || ""}
                          </div>
                        </>
                      ) : null}
                      {langMode !== "en" ? (
                        <>
                          <div style={{ fontWeight: 900, marginTop: 14, marginBottom: 8 }}>中文</div>
                          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 13 }}>
                            {detail.full_transcript.zh || ""}
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ opacity: 0.7 }}>暂无转写文本（需要 details_json.full_transcript）</div>
                  )}
                </div>
              ) : null}

              {/* Vocabulary */}
              {tab === "vocab" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {filteredVocab?.length ? (
                    filteredVocab.map((v, i) => (
                      <div key={i} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>{v.term}</div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            {v.pos || "other"} · {v.cefr || "-"}
                          </div>
                        </div>
                        <div style={{ marginTop: 6, lineHeight: 1.6 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{v.meaning_zh || ""}</div>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>{v.meaning_en || ""}</div>
                        </div>
                        {v.example_en ? (
                          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                            <div style={{ fontWeight: 800 }}>例句</div>
                            <div>{v.example_en}</div>
                            <div style={{ opacity: 0.85 }}>{v.example_zh || ""}</div>
                          </div>
                        ) : null}
                        {v.refs?.length ? (
                          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {v.refs.slice(0, 4).map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => seekTo(tsToSec(r))}
                                style={{
                                  border: "1px solid #eee",
                                  background: "white",
                                  borderRadius: 999,
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.7 }}>暂无词汇卡（需要 details_json.vocabulary）</div>
                  )}
                </div>
              ) : null}

              {/* Expressions */}
              {tab === "expr" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {filteredExpr?.length ? (
                    filteredExpr.map((x, i) => (
                      <div key={i} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>{x.phrase}</div>
                        <div style={{ marginTop: 6, lineHeight: 1.6 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{x.meaning_zh || ""}</div>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>{x.usage || ""}</div>
                        </div>
                        {x.example_en ? (
                          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                            <div style={{ fontWeight: 800 }}>例句</div>
                            <div>{x.example_en}</div>
                            <div style={{ opacity: 0.85 }}>{x.example_zh || ""}</div>
                          </div>
                        ) : null}
                        {x.alternatives?.length ? (
                          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                            替换说法：{x.alternatives.join(" / ")}
                          </div>
                        ) : null}
                        {x.refs?.length ? (
                          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {x.refs.slice(0, 4).map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => seekTo(tsToSec(r))}
                                style={{
                                  border: "1px solid #eee",
                                  background: "white",
                                  borderRadius: 999,
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.7 }}>暂无表达卡（需要 details_json.expressions）</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile：强制单列 */}
      <style jsx>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: minmax(0, 1fr) 380px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
