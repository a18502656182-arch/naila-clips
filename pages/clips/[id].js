// pages/clips/[id].js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

/** 小工具：安全拉 JSON */
async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
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

/** 秒数格式化 0:00 */
function fmtTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** 兼容 AI 生成 details_json 的不同字段名 */
function normalizeDetails(detailsJson) {
  const d = detailsJson || {};

  // segments: [{start,end,en,zh}] 或 [{start_sec,end_sec,text_en,text_zh}] 等
  const rawSegments = Array.isArray(d.segments) ? d.segments : [];
  const segments = rawSegments
    .map((x) => {
      const start =
        x.start ??
        x.start_sec ??
        x.startSeconds ??
        x.start_seconds ??
        x.t0 ??
        0;
      const end =
        x.end ?? x.end_sec ?? x.endSeconds ?? x.end_seconds ?? x.t1 ?? null;

      const en =
        x.en ??
        x.text_en ??
        x.english ??
        x.text ??
        x.transcript_en ??
        "";
      const zh =
        x.zh ?? x.text_zh ?? x.chinese ?? x.translation_zh ?? "";

      return {
        start: Number(start) || 0,
        end: end === null || end === undefined ? null : Number(end) || null,
        en: String(en || "").trim(),
        zh: String(zh || "").trim(),
      };
    })
    .filter((x) => x.en || x.zh);

  // vocab: {words, phrases, expressions} 或 {vocab:{...}} 或 {cards:{...}}
  const vocabRoot =
    d.vocab ||
    d.cards ||
    d.vocabulary ||
    d.word_cards ||
    d.vocab_cards ||
    {};
  const words = Array.isArray(vocabRoot.words) ? vocabRoot.words : [];
  const phrases = Array.isArray(vocabRoot.phrases) ? vocabRoot.phrases : [];
  const expressions = Array.isArray(vocabRoot.expressions)
    ? vocabRoot.expressions
    : Array.isArray(vocabRoot.idioms)
    ? vocabRoot.idioms
    : [];

  function normCard(x) {
    const term = x.term ?? x.word ?? x.phrase ?? x.expression ?? x.title ?? "";
    const ipa = x.ipa ?? x.phonetic ?? "";
    const meaning_zh =
      x.meaning_zh ?? x.zh ?? x.cn ?? x.translation_zh ?? x.definition_zh ?? "";
    const example_en =
      x.example_en ?? x.example ?? x.en_example ?? x.sentence_en ?? "";
    const example_zh =
      x.example_zh ??
      x.example_cn ??
      x.zh_example ??
      x.sentence_zh ??
      "";
    const note_zh = x.note_zh ?? x.note ?? x.usage_zh ?? x.tip_zh ?? "";

    return {
      term: String(term || "").trim(),
      ipa: String(ipa || "").trim(),
      meaning_zh: String(meaning_zh || "").trim(),
      example_en: String(example_en || "").trim(),
      example_zh: String(example_zh || "").trim(),
      note_zh: String(note_zh || "").trim(),
    };
  }

  const vocab = {
    words: words.map(normCard).filter((x) => x.term),
    phrases: phrases.map(normCard).filter((x) => x.term),
    expressions: expressions.map(normCard).filter((x) => x.term),
  };

  return { segments, vocab };
}

export default function ClipDetailPage() {
  const router = useRouter();
  const clipId = useMemo(() => Number(router.query.id), [router.query.id]);

  // 主 clip 信息
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [item, setItem] = useState(null);
  const [me, setMe] = useState(null);

  // details_json
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [details, setDetails] = useState(null);

  // UI states
  const [lang, setLang] = useState("en"); // en | zh
  const [activeSegIndex, setActiveSegIndex] = useState(-1);

  const [showVocab, setShowVocab] = useState(false);
  const [vocabTab, setVocabTab] = useState("words"); // words | phrases | expressions
  const [openExplainKey, setOpenExplainKey] = useState(null); // 只展开一张解释卡

  const videoRef = useRef(null);

  // 拉 clip
  useEffect(() => {
    if (!router.isReady) return;
    if (!clipId) return;

    let alive = true;
    setLoading(true);
    setNotFound(false);
    setErrMsg("");
    setItem(null);
    setMe(null);

    fetchJson(`/api/clip?id=${clipId}`)
      .then((d) => {
        if (!alive) return;
        if (!d?.ok || !d?.item) {
          setNotFound(true);
          return;
        }
        setItem(d.item);
        setMe(d.me || null);
      })
      .catch((e) => {
        if (!alive) return;
        if (e?.status === 404) setNotFound(true);
        else setErrMsg(e?.message || "加载失败");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [router.isReady, clipId]);

  // 拉 details_json（允许为空）
  useEffect(() => {
    if (!router.isReady) return;
    if (!clipId) return;

    let alive = true;
    setDetailsLoading(true);
    setDetails(null);

    fetchJson(`/api/clip_detail?id=${clipId}`)
      .then((d) => {
        if (!alive) return;
        const normalized = normalizeDetails(d?.details_json || null);
        setDetails(normalized);
      })
      .catch(() => {
        if (!alive) return;
        setDetails(null);
      })
      .finally(() => {
        if (!alive) return;
        setDetailsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [router.isReady, clipId]);

  const segments = details?.segments || [];
  const vocab = details?.vocab || { words: [], phrases: [], expressions: [] };

  const vocabList = useMemo(() => {
    if (vocabTab === "phrases") return vocab.phrases || [];
    if (vocabTab === "expressions") return vocab.expressions || [];
    return vocab.words || [];
  }, [vocabTab, vocab]);

  function seekAndPlay(seconds) {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = Math.max(0, Number(seconds) || 0);
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {}
  }

  function onClickSegment(i) {
    setActiveSegIndex(i);
    const seg = segments[i];
    if (seg) seekAndPlay(seg.start);
  }

  // 页面头部显示
  const title = item?.title || (clipId ? `Clip #${clipId}` : "Clip");

  const difficulty = (item?.difficulty_slugs && item.difficulty_slugs[0]) || "unknown";
  const durationSec = item?.duration_sec || null;
  const accessTier = item?.access_tier || "-";

  const loggedIn = !!me?.logged_in;
  const isMember = !!me?.is_member;

  const canAccess = !!item?.can_access; // 后端已经算好

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            border: "1px solid #eee",
            background: "white",
            borderRadius: 12,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          ← 返回
        </button>

        <div style={{ fontWeight: 900, fontSize: 22 }}>{title}</div>

        <div style={{ marginLeft: "auto" }}>
          <a
            href="/"
            style={{
              border: "1px solid #eee",
              background: "white",
              borderRadius: 12,
              padding: "8px 12px",
              textDecoration: "none",
              color: "#111",
              display: "inline-block",
            }}
          >
            回首页
          </a>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 14, background: "white" }}>
          加载中...
        </div>
      ) : notFound ? (
        <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 14, background: "white" }}>
          未找到该视频（id={clipId}）
        </div>
      ) : errMsg ? (
        <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 14, background: "white", color: "#b00" }}>
          加载失败：{errMsg}
        </div>
      ) : (
        <>
          {/* 顶部信息条 */}
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              background: "white",
              padding: 12,
              marginBottom: 12,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            <div>难度：{difficulty}</div>
            <div>时长：{durationSec ? `${durationSec}s` : "-"}</div>
            <div>权限：{accessTier}</div>
            <div>登录：{loggedIn ? "✅" : "❌"}</div>
            <div>会员：{isMember ? "✅" : "❌"}</div>
          </div>

          {/* ✅ 两列/三列布局 */}
          <div className={`detailGrid ${showVocab ? "vocabOpen" : ""}`}>
            {/* 左：视频 */}
            <div className="colVideo">
              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: 16,
                  background: "white",
                  padding: 12,
                }}
              >
                {canAccess ? (
                  <video
                    ref={videoRef}
                    src={item?.video_url || ""}
                    controls
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      display: "block",
                      background: "#000",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      borderRadius: 14,
                      background: "#fafafa",
                      border: "1px solid #eee",
                      padding: 14,
                      color: "#b00",
                      lineHeight: 1.7,
                    }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>会员专享</div>
                    <div>该视频需要登录并兑换码激活后观看。</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                      <a
                        href="/login"
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
                        去登录/兑换
                      </a>
                      <a
                        href="/register"
                        style={{
                          border: "none",
                          background: "#111",
                          color: "white",
                          borderRadius: 12,
                          padding: "8px 12px",
                          textDecoration: "none",
                          fontWeight: 800,
                        }}
                      >
                        去注册
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 中/右：字幕区 */}
            <div className="colSubs">
              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: 16,
                  background: "white",
                  padding: 12,
                  height: "100%",
                  minHeight: 420,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* 顶栏：字幕 + EN/中 + 词汇卡按钮 */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>字幕</div>

                  <div style={{ display: "flex", gap: 8, marginLeft: 6 }}>
                    <button
                      type="button"
                      onClick={() => setLang("en")}
                      className={`pill ${lang === "en" ? "active" : ""}`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang("zh")}
                      className={`pill ${lang === "zh" ? "active" : ""}`}
                    >
                      中
                    </button>
                  </div>

                  <div style={{ marginLeft: "auto" }}>
                    <button
                      type="button"
                      onClick={() => setShowVocab((x) => !x)}
                      style={{
                        border: showVocab ? "1px solid #eee" : "none",
                        background: showVocab ? "white" : "#111",
                        color: showVocab ? "#111" : "white",
                        borderRadius: 12,
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      {showVocab ? "收起词汇卡" : "词汇卡"}
                    </button>
                  </div>
                </div>

                <div style={{ height: 10 }} />

                {/* 内容区：字幕列表 */}
                <div style={{ flex: 1, overflow: "auto", paddingRight: 4 }}>
                  {detailsLoading ? (
                    <div style={{ padding: 10, opacity: 0.75, fontSize: 13 }}>加载详情内容中...</div>
                  ) : !details || (segments.length === 0 && vocab.words.length === 0 && vocab.phrases.length === 0 && vocab.expressions.length === 0) ? (
                    <div style={{ padding: 10, opacity: 0.75, fontSize: 13, lineHeight: 1.7 }}>
                      暂无详情内容（details_json）。
                      <br />
                      后续你把 AI 生成的 JSON 存进 <b>clip_details.details_json</b> 后，这里会自动出现时间轴字幕 & 词汇卡。
                    </div>
                  ) : segments.length === 0 ? (
                    <div style={{ padding: 10, opacity: 0.75, fontSize: 13 }}>
                      details_json 里没有 segments 字幕段
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {segments.map((s, i) => {
                        const active = i === activeSegIndex;
                        const text = lang === "zh" ? s.zh || s.en : s.en || s.zh;

                        return (
                          <button
                            key={`${s.start}-${i}`}
                            type="button"
                            onClick={() => onClickSegment(i)}
                            style={{
                              textAlign: "left",
                              border: active ? "2px solid #b9d9ff" : "1px solid #eee",
                              background: active ? "#f3f9ff" : "white",
                              borderRadius: 14,
                              padding: "10px 12px",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                              <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.75 }}>
                                {fmtTime(s.start)}
                                {s.end != null ? ` - ${fmtTime(s.end)}` : ""}
                              </div>
                              <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>
                                点击跳转播放
                              </div>
                            </div>
                            <div style={{ fontSize: 14, lineHeight: 1.65 }}>
                              {text || "（空）"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右：词汇卡（打开时显示） */}
            {showVocab ? (
              <div className="colVocab">
                <div
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 16,
                    background: "white",
                    padding: 12,
                    height: "100%",
                    minHeight: 420,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>词汇卡</div>
                    <div style={{ marginLeft: "auto" }}>
                      <button
                        type="button"
                        onClick={() => setShowVocab(false)}
                        style={{
                          border: "1px solid #eee",
                          background: "white",
                          borderRadius: 12,
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        收起
                      </button>
                    </div>
                  </div>

                  <div style={{ height: 10 }} />

                  {/* 词汇卡分类 Tab */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={`tabBtn ${vocabTab === "words" ? "active" : ""}`}
                      onClick={() => setVocabTab("words")}
                    >
                      单词 ({vocab.words?.length || 0})
                    </button>
                    <button
                      type="button"
                      className={`tabBtn ${vocabTab === "phrases" ? "active" : ""}`}
                      onClick={() => setVocabTab("phrases")}
                    >
                      短语 ({vocab.phrases?.length || 0})
                    </button>
                    <button
                      type="button"
                      className={`tabBtn ${vocabTab === "expressions" ? "active" : ""}`}
                      onClick={() => setVocabTab("expressions")}
                    >
                      地道表达 ({vocab.expressions?.length || 0})
                    </button>
                  </div>

                  <div style={{ height: 10 }} />

                  <div style={{ flex: 1, overflow: "auto", paddingRight: 4 }}>
                    {detailsLoading ? (
                      <div style={{ padding: 10, opacity: 0.75, fontSize: 13 }}>加载中...</div>
                    ) : vocabList.length === 0 ? (
                      <div style={{ padding: 10, opacity: 0.75, fontSize: 13, lineHeight: 1.7 }}>
                        当前分类暂无词汇卡内容。
                        <br />
                        （后续你把 AI 输出的 vocab 写入 details_json 即可）
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {vocabList.map((c, idx) => {
                          const key = `${vocabTab}-${idx}-${c.term}`;
                          const open = openExplainKey === key;

                          return (
                            <div
                              key={key}
                              style={{
                                border: "1px solid #eee",
                                borderRadius: 16,
                                padding: 12,
                                background: "white",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ fontSize: 18, fontWeight: 900 }}>{c.term}</div>
                                {c.ipa ? (
                                  <div style={{ opacity: 0.65, fontSize: 13 }}>/{c.ipa}/</div>
                                ) : null}

                                <div style={{ marginLeft: "auto" }}>
                                  <button
                                    type="button"
                                    onClick={() => setOpenExplainKey(open ? null : key)}
                                    style={{
                                      border: open ? "1px solid #ddd" : "none",
                                      background: open ? "white" : "#111",
                                      color: open ? "#111" : "white",
                                      borderRadius: 999,
                                      padding: "6px 10px",
                                      cursor: "pointer",
                                      fontWeight: 800,
                                      fontSize: 12,
                                    }}
                                  >
                                    中文解释
                                  </button>
                                </div>
                              </div>

                              {open ? (
                                <div style={{ marginTop: 10 }}>
                                  {c.meaning_zh ? (
                                    <div
                                      style={{
                                        border: "1px solid #ffe2a8",
                                        background: "#fff7e6",
                                        borderRadius: 14,
                                        padding: 10,
                                        lineHeight: 1.65,
                                        fontSize: 13,
                                      }}
                                    >
                                      <div style={{ fontWeight: 900, marginBottom: 6 }}>中文含义</div>
                                      <div>{c.meaning_zh}</div>
                                    </div>
                                  ) : null}

                                  {(c.example_en || c.example_zh) ? (
                                    <div
                                      style={{
                                        marginTop: 10,
                                        border: "1px solid #d7e7ff",
                                        background: "#f3f9ff",
                                        borderRadius: 14,
                                        padding: 10,
                                        lineHeight: 1.65,
                                        fontSize: 13,
                                      }}
                                    >
                                      <div style={{ fontWeight: 900, marginBottom: 6 }}>例句</div>
                                      {c.example_en ? (
                                        <div style={{ marginBottom: 6 }}>
                                          <b>EN:</b> {c.example_en}
                                        </div>
                                      ) : null}
                                      {c.example_zh ? (
                                        <div>
                                          <b>中:</b> {c.example_zh}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}

                                  {c.note_zh ? (
                                    <div
                                      style={{
                                        marginTop: 10,
                                        border: "1px solid #eee",
                                        background: "#fafafa",
                                        borderRadius: 14,
                                        padding: 10,
                                        lineHeight: 1.65,
                                        fontSize: 13,
                                      }}
                                    >
                                      <div style={{ fontWeight: 900, marginBottom: 6 }}>使用提示</div>
                                      <div>{c.note_zh}</div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 样式：两列/三列 + pills/tabs */}
          <style jsx>{`
            .detailGrid {
              display: grid;
              gap: 14px;
              align-items: start;

              /* 默认：两列（视频 + 字幕） */
              grid-template-columns: minmax(520px, 1.4fr) minmax(360px, 1fr);
            }

            /* 打开词汇卡：三列（视频变窄 + 字幕 + 词汇卡） */
            .detailGrid.vocabOpen {
              grid-template-columns: minmax(420px, 1.15fr) minmax(360px, 1fr)
                minmax(340px, 0.95fr);
            }

            .colVideo,
            .colSubs,
            .colVocab {
              min-width: 0; /* 防止内容撑爆导致重叠/溢出 */
            }

            .pill {
              border: 1px solid #eee;
              background: white;
              border-radius: 999px;
              padding: 6px 10px;
              cursor: pointer;
              font-weight: 800;
              font-size: 12px;
              color: #111;
              opacity: 0.85;
            }
            .pill.active {
              background: #111;
              color: white;
              border-color: #111;
              opacity: 1;
            }

            .tabBtn {
              border: 1px solid #eee;
              background: white;
              border-radius: 999px;
              padding: 6px 10px;
              cursor: pointer;
              font-weight: 900;
              font-size: 12px;
              color: #111;
              opacity: 0.85;
            }
            .tabBtn.active {
              background: #1e88ff;
              color: white;
              border-color: #1e88ff;
              opacity: 1;
            }

            /* 移动端：全部改成单列堆叠 */
            @media (max-width: 900px) {
              .detailGrid,
              .detailGrid.vocabOpen {
                grid-template-columns: 1fr;
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
