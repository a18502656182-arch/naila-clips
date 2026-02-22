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
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function pickArr(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [];
}

export default function ClipDetailPage() {
  const router = useRouter();
  const clipId = useMemo(() => {
    const v = router.query?.id;
    const n = parseInt(Array.isArray(v) ? v[0] : v, 10);
    return Number.isFinite(n) ? n : null;
  }, [router.query]);

  const videoRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [clip, setClip] = useState(null);
  const [details, setDetails] = useState(null); // clip_details.details_json
  const [me, setMe] = useState(null);

  // 2列/3列切换：词汇卡面板开关
  const [showVocab, setShowVocab] = useState(false);

  // 字幕相关
  const [activeSegIdx, setActiveSegIdx] = useState(-1);
  const [lang, setLang] = useState("zh"); // zh/en（你目前主要要中英同时显示，这里只是预留）

  // 词汇卡相关
  const [vocabTab, setVocabTab] = useState("words"); // words/phrases/idioms
  const [vocabExplainMode, setVocabExplainMode] = useState("zh"); // 只做中文解释：固定 zh
  const [vocabPick, setVocabPick] = useState(null); // 当前选中的词汇卡项（可选）

  // 拉数据：/api/clip + /api/clip_detail（你项目里现在就是这个命名）
  useEffect(() => {
    if (!router.isReady) return;
    if (!clipId) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setNotFound(false);

        // 1) clip 主信息（含 can_access, video_url, cover_url 等）
        const c = await fetchJson(`/api/clip?id=${clipId}`);
        if (!alive) return;
        if (!c?.ok) {
          setNotFound(true);
          setClip(null);
          setDetails(null);
          setMe(null);
          return;
        }
        setClip(c);
        setMe(c?.me || null);

        // 2) 详情内容（details_json）
        const d = await fetchJson(`/api/clip_detail?id=${clipId}`);
        if (!alive) return;
        setDetails(d?.details_json || null);
      } catch (e) {
        if (!alive) return;
        setNotFound(true);
        setClip(null);
        setDetails(null);
        setMe(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router.isReady, clipId]);

  // 从 details_json 读取字幕段
  const segments = useMemo(() => {
    // 你后面用 AI 生成时，建议统一成：
    // details_json.segments = [{ start, end, en, zh, focus?:[] }]
    const segs = details?.segments;
    if (Array.isArray(segs)) return segs;
    return [];
  }, [details]);

  // 从 details_json 读取词汇
  const vocab = useMemo(() => {
    // 建议统一成：
    // details_json.vocab = { words:[], phrases:[], idioms:[] }
    const v = details?.vocab || {};
    return {
      words: pickArr(v.words),
      phrases: pickArr(v.phrases),
      idioms: pickArr(v.idioms),
    };
  }, [details]);

  const vocabList = useMemo(() => {
    if (vocabTab === "phrases") return vocab.phrases;
    if (vocabTab === "idioms") return vocab.idioms;
    return vocab.words;
  }, [vocabTab, vocab]);

  function seekTo(t) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Number(t) || 0);
    v.play?.().catch(() => {});
  }

  // 当前播放时间 -> 高亮字幕段
  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v || !segments.length) return;
    const t = v.currentTime;

    // 线性找（你数据不会太大，够用；后面可二分）
    let idx = -1;
    for (let i = 0; i < segments.length; i++) {
      const s = Number(segments[i]?.start ?? 0);
      const e = Number(segments[i]?.end ?? s);
      if (t >= s && t < e) {
        idx = i;
        break;
      }
    }
    setActiveSegIdx(idx);
  }

  const title = clip?.title || (clipId ? `Clip #${clipId}` : "Clip");
  const canAccess = !!clip?.can_access;
  const videoUrl = clip?.video_url || "";
  const coverUrl = clip?.cover_url || "";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <style jsx>{`
        .shell {
          display: grid;
          gap: 14px;
          align-items: start;
        }
        /* 默认：两列（视频 + 字幕） */
        .twoCol {
          grid-template-columns: minmax(360px, 1.15fr) minmax(360px, 1fr);
        }
        /* 打开词汇卡：三列（视频 + 字幕 + 词汇卡） */
        .threeCol {
          grid-template-columns: minmax(340px, 1.05fr) minmax(340px, 1fr) minmax(340px, 0.95fr);
        }
        @media (max-width: 1100px) {
          .twoCol,
          .threeCol {
            grid-template-columns: 1fr;
          }
        }

        .card {
          border: 1px solid #eee;
          border-radius: 16px;
          background: #fff;
          overflow: hidden;
        }

        .cardPad {
          padding: 12px;
        }

        .topbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .btn {
          border: 1px solid #eee;
          background: white;
          border-radius: 12px;
          padding: 8px 12px;
          cursor: pointer;
          text-decoration: none;
          color: #111;
          font-size: 13px;
          white-space: nowrap;
        }
        .btnPrimary {
          border: none;
          background: #111;
          color: white;
          font-weight: 700;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #eee;
          background: #fff;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          opacity: 0.9;
        }

        .tabsRow {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .tab {
          border: 1px solid #eee;
          background: white;
          border-radius: 999px;
          padding: 7px 10px;
          cursor: pointer;
          font-size: 12px;
        }
        .tabActive {
          background: #111;
          color: white;
          border-color: #111;
          font-weight: 700;
        }

        .segList {
          max-height: 70vh;
          overflow: auto;
          padding: 10px;
        }
        .seg {
          border: 1px solid #f1f1f1;
          border-radius: 14px;
          padding: 10px 10px;
          margin-bottom: 10px;
          cursor: pointer;
          background: white;
        }
        .segActive {
          border-color: #bfe3ff;
          background: #f3faff;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
        }
        .segTime {
          font-size: 12px;
          opacity: 0.6;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .segEn {
          font-size: 14px;
          font-weight: 700;
          line-height: 1.5;
        }
        .segZh {
          font-size: 13px;
          opacity: 0.85;
          margin-top: 6px;
          line-height: 1.6;
        }

        .vocabTop {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-bottom: 1px solid #eee;
        }
        .vocabBody {
          max-height: 70vh;
          overflow: auto;
          padding: 12px;
        }

        .vCard {
          border: 1px solid #eee;
          border-radius: 16px;
          padding: 12px;
          background: #fff;
          margin-bottom: 12px;
        }
        .vHead {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .vWord {
          font-size: 18px;
          font-weight: 800;
        }
        .vPhon {
          font-size: 12px;
          opacity: 0.65;
        }
        .vBtns {
          margin-left: auto;
          display: flex;
          gap: 8px;
        }
        .miniBtn {
          border: 1px solid #eee;
          background: white;
          border-radius: 999px;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 12px;
        }
        .miniBtnActive {
          border-color: #111;
          background: #111;
          color: #fff;
          font-weight: 700;
        }
        .vDef {
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid #f3f3f3;
          border-radius: 14px;
          background: #fafafa;
          font-size: 13px;
          line-height: 1.65;
        }
        .vQuote {
          margin-top: 10px;
          border-left: 4px solid #bfe3ff;
          padding-left: 10px;
          font-size: 13px;
          opacity: 0.9;
          line-height: 1.6;
        }
      `}</style>

      {/* 顶部栏 */}
      <div className="topbar">
        <button className="btn" type="button" onClick={() => router.back()}>
          ← 返回
        </button>

        <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a className="btn" href="/" style={{ textDecoration: "none" }}>
            回首页
          </a>
        </div>
      </div>

      {loading ? (
        <div style={{ opacity: 0.7 }}>加载中...</div>
      ) : notFound ? (
        <div className="card cardPad">
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Clip #{clipId}</div>
          <div style={{ opacity: 0.75 }}>未找到该视频（id={clipId}）</div>
        </div>
      ) : (
        <div className={`shell ${showVocab ? "threeCol" : "twoCol"}`}>
          {/* 左：视频区 */}
          <div className="card">
            <div className="cardPad">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <span className="pill">难度：{clip?.difficulty_slugs?.[0] || clip?.difficulty || "unknown"}</span>
                <span className="pill">时长：{clip?.duration_sec ? `${clip.duration_sec}s` : "-"}</span>
                <span className="pill">权限：{clip?.access_tier || "-"}</span>
                <span className="pill">
                  登录：{me?.logged_in ? "✅" : "❌"} / 会员：{me?.is_member ? "✅" : "❌"}
                </span>
              </div>

              {/* 视频 */}
              <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #eee" }}>
                {canAccess ? (
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    poster={coverUrl || undefined}
                    controls
                    style={{ width: "100%", display: "block", background: "#000" }}
                    onTimeUpdate={onTimeUpdate}
                  />
                ) : (
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>会员专享</div>
                    <div style={{ color: "#b00", fontSize: 13, lineHeight: 1.7 }}>
                      该视频需要登录并兑换码激活后观看。
                    </div>
                  </div>
                )}
              </div>

              {/* 你后面可加：标题下作者/标签等 */}
            </div>
          </div>

          {/* 右：字幕/时间轴（始终存在） */}
          <div className="card">
            <div className="cardPad" style={{ borderBottom: "1px solid #eee" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>字幕</div>

                {/* 这里仅保留 EN/中 切换按钮（如果你要固定中英都显示，也可以删掉） */}
                <div style={{ marginLeft: 8, display: "flex", gap: 8 }}>
                  <button
                    className={`tab ${lang === "en" ? "tabActive" : ""}`}
                    type="button"
                    onClick={() => setLang("en")}
                  >
                    EN
                  </button>
                  <button
                    className={`tab ${lang === "zh" ? "tabActive" : ""}`}
                    type="button"
                    onClick={() => setLang("zh")}
                  >
                    中
                  </button>
                </div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  {!showVocab ? (
                    <button className="btn btnPrimary" type="button" onClick={() => setShowVocab(true)}>
                      词汇卡
                    </button>
                  ) : (
                    <button className="btn" type="button" onClick={() => setShowVocab(false)}>
                      收起词汇卡片
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="segList">
              {!details ? (
                <div style={{ opacity: 0.7, lineHeight: 1.7 }}>
                  还没有详情内容（details_json）。
                  <br />
                  你把 AI 生成的 JSON 存进 clip_details.details_json 后，这里会显示字幕时间轴。
                </div>
              ) : segments.length ? (
                segments.map((s, idx) => {
                  const start = Number(s?.start ?? 0);
                  const end = Number(s?.end ?? start);
                  const en = s?.en || "";
                  const zh = s?.zh || "";
                  const active = idx === activeSegIdx;

                  return (
                    <div
                      key={`${idx}-${start}`}
                      className={`seg ${active ? "segActive" : ""}`}
                      onClick={() => seekTo(start)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") seekTo(start);
                      }}
                    >
                      <div className="segTime">
                        <span>
                          {fmtTime(start)} - {fmtTime(end)}
                        </span>
                        <span style={{ marginLeft: "auto", opacity: 0.55 }}>点击跳转播放</span>
                      </div>

                      {/* 参考站是 EN 为主 + 下方中文 */}
                      <div className="segEn">{en || "（无英文）"}</div>
                      <div className="segZh">{zh || "（无中文）"}</div>
                    </div>
                  );
                })
              ) : (
                <div style={{ opacity: 0.7 }}>details_json 里没有 segments 字幕段</div>
              )}
            </div>
          </div>

          {/* 第三列：词汇卡面板（仅在 showVocab=true 显示） */}
          {showVocab ? (
            <div className="card">
              <div className="vocabTop">
                <div style={{ fontWeight: 900 }}>词汇卡</div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button className="btn" type="button" onClick={() => setShowVocab(false)}>
                    收起词汇卡片
                  </button>
                </div>
              </div>

              <div className="cardPad" style={{ paddingBottom: 0 }}>
                {/* 单词/短语/表达 Tabs */}
                <div className="tabsRow">
                  <button
                    className={`tab ${vocabTab === "words" ? "tabActive" : ""}`}
                    type="button"
                    onClick={() => setVocabTab("words")}
                  >
                    单词 ({vocab.words.length})
                  </button>
                  <button
                    className={`tab ${vocabTab === "phrases" ? "tabActive" : ""}`}
                    type="button"
                    onClick={() => setVocabTab("phrases")}
                  >
                    短语 ({vocab.phrases.length})
                  </button>
                  <button
                    className={`tab ${vocabTab === "idioms" ? "tabActive" : ""}`}
                    type="button"
                    onClick={() => setVocabTab("idioms")}
                  >
                    地道表达 ({vocab.idioms.length})
                  </button>

                  {/* 中文解释按钮：只保留中文 */}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button
                      className={`miniBtn ${vocabExplainMode === "zh" ? "miniBtnActive" : ""}`}
                      type="button"
                      onClick={() => setVocabExplainMode("zh")}
                    >
                      中文解释
                    </button>
                  </div>
                </div>
              </div>

              <div className="vocabBody">
                {!details ? (
                  <div style={{ opacity: 0.7, lineHeight: 1.7 }}>
                    还没有 details_json，所以暂无词汇卡内容。
                    <br />
                    等你用 AI 生成并写入 clip_details.details_json 后，这里会自动渲染。
                  </div>
                ) : vocabList.length ? (
                  vocabList.map((v, idx) => {
                    // 统一建议字段：
                    // { term, ipa?, meaning_zh, example_en?, example_zh?, start? }
                    const term = v?.term || v?.word || v?.phrase || `item-${idx}`;
                    const ipa = v?.ipa || v?.phonetic || "";
                    const meaningZh = v?.meaning_zh || v?.zh || v?.meaning || "";
                    const exEn = v?.example_en || v?.example || "";
                    const exZh = v?.example_zh || v?.exampleZh || "";
                    const jump = Number.isFinite(Number(v?.start)) ? Number(v?.start) : null;

                    return (
                      <div
                        key={`${term}-${idx}`}
                        className="vCard"
                        onClick={() => setVocabPick(v)}
                        style={{ cursor: "default" }}
                      >
                        <div className="vHead">
                          <div>
                            <div className="vWord">{term}</div>
                            {ipa ? <div className="vPhon">{ipa}</div> : null}
                          </div>

                          <div className="vBtns">
                            {/* 只保留中文解释按钮；如果你想“点击按钮才展开解释”，也可以加状态 */}
                            <button className="miniBtn miniBtnActive" type="button">
                              中文解释
                            </button>

                            {jump !== null ? (
                              <button className="miniBtn" type="button" onClick={() => seekTo(jump)}>
                                跳到此处
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="vDef">
                          <div style={{ fontWeight: 800, marginBottom: 6 }}>中文含义</div>
                          <div>{meaningZh || "（暂无中文解释）"}</div>
                        </div>

                        {(exEn || exZh) ? (
                          <div className="vQuote">
                            <div style={{ fontWeight: 800, marginBottom: 6 }}>例句</div>
                            {exEn ? <div>EN: {exEn}</div> : null}
                            {exZh ? <div style={{ marginTop: 6 }}>中: {exZh}</div> : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ opacity: 0.7 }}>
                    details_json 里没有 vocab.{vocabTab} 内容
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
