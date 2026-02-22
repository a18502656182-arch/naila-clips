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
    const msg =
      (data && (data.error || data.message)) || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec || 0)));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function safeParseDetails(details_json) {
  if (!details_json) return null;
  if (typeof details_json === "object") return details_json;
  if (typeof details_json === "string") {
    try {
      return JSON.parse(details_json);
    } catch {
      return null;
    }
  }
  return null;
}

export default function ClipDetailPage() {
  const router = useRouter();
  const clipId = useMemo(() => {
    const v = router.query?.id;
    const n = parseInt(String(Array.isArray(v) ? v[0] : v || ""), 10);
    return Number.isFinite(n) ? n : null;
  }, [router.query?.id]);

  const videoRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [clip, setClip] = useState(null);
  const [details, setDetails] = useState(null); // parsed details_json
  const [detailsRaw, setDetailsRaw] = useState(null); // for debug if needed

  // right panel state
  const [tab, setTab] = useState("timeline"); // timeline | transcript | vocab | expressions
  const [lang, setLang] = useState("zh"); // zh | en | both

  function seekTo(t) {
    const el = videoRef.current;
    if (!el) return;
    const sec = Math.max(0, Number(t || 0));
    el.currentTime = sec;
    // 尽量和参考站体验接近：点击就播放
    el.play?.().catch(() => {});
  }

  async function reload() {
    if (!clipId) return;
    setLoading(true);
    setNotFound(false);
    setErrMsg("");

    try {
      const d1 = await fetchJson(`/api/clip?id=${clipId}`);
      if (!d1?.ok || !d1?.item) {
        setNotFound(true);
        setClip(null);
        setDetails(null);
        setDetailsRaw(null);
        setLoading(false);
        return;
      }
      setClip(d1.item);

      // details_json（可能为空，不算错误）
      const d2 = await fetchJson(`/api/clip_detail?id=${clipId}`);
      setDetailsRaw(d2);
      const parsed = safeParseDetails(d2?.details_json);
      setDetails(parsed);
    } catch (e) {
      setErrMsg(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!router.isReady) return;
    if (!clipId) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, clipId]);

  // --------- data adapters (尽量兼容你未来 AI 输出的多种字段名) ---------
  const timelineItems = useMemo(() => {
    if (!details) return [];
    const arr =
      details.timeline ||
      details.timecodes ||
      details.cues ||
      details.subtitles ||
      details.caption_timeline ||
      [];
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => {
        const t = x.t ?? x.time ?? x.start ?? x.start_sec ?? x.seconds ?? 0;
        const en = x.en ?? x.english ?? x.text_en ?? x.textEnglish ?? x.text ?? "";
        const zh = x.zh ?? x.chinese ?? x.text_zh ?? x.textChinese ?? "";
        return { t: Number(t || 0), en: String(en || ""), zh: String(zh || "") };
      })
      .filter((x) => Number.isFinite(x.t));
  }, [details]);

  const transcriptItems = useMemo(() => {
    if (!details) return [];
    const arr =
      details.transcript ||
      details.full_transcript ||
      details.script ||
      details.text ||
      [];
    if (!Array.isArray(arr)) {
      // 如果 AI 只给了一整段文本
      if (typeof arr === "string" && arr.trim()) {
        return [{ t: 0, en: arr.trim(), zh: "" }];
      }
      return [];
    }
    return arr.map((x) => {
      const t = x.t ?? x.time ?? x.start ?? x.start_sec ?? 0;
      const en = x.en ?? x.english ?? x.text_en ?? x.text ?? "";
      const zh = x.zh ?? x.chinese ?? x.text_zh ?? "";
      return { t: Number(t || 0), en: String(en || ""), zh: String(zh || "") };
    });
  }, [details]);

  const vocabItems = useMemo(() => {
    if (!details) return [];
    const arr = details.vocab || details.vocabulary || details.words || [];
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => ({
      term: String(x.term ?? x.word ?? x.phrase ?? ""),
      ipa: String(x.ipa ?? x.pron ?? x.pronunciation ?? ""),
      meaning_zh: String(x.meaning_zh ?? x.zh ?? x.cn ?? x.meaning ?? ""),
      meaning_en: String(x.meaning_en ?? x.en ?? ""),
      example: String(x.example ?? x.eg ?? ""),
      note: String(x.note ?? x.usage ?? ""),
      level: String(x.level ?? ""),
    }));
  }, [details]);

  const exprItems = useMemo(() => {
    if (!details) return [];
    const arr = details.expressions || details.phrases || details.key_points || [];
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => ({
      text: String(x.text ?? x.phrase ?? x.expression ?? ""),
      meaning_zh: String(x.meaning_zh ?? x.zh ?? x.cn ?? ""),
      meaning_en: String(x.meaning_en ?? x.en ?? ""),
      example: String(x.example ?? ""),
      note: String(x.note ?? ""),
    }));
  }, [details]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: 16 }}>
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

        <div style={{ fontSize: 20, fontWeight: 900 }}>
          {clip?.title || (clipId ? `Clip #${clipId}` : "Clip")}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a
            href="/"
            style={{
              border: "1px solid #eee",
              background: "white",
              borderRadius: 12,
              padding: "8px 12px",
              textDecoration: "none",
              color: "#111",
              fontWeight: 700,
            }}
          >
            回首页
          </a>

          <button
            type="button"
            onClick={reload}
            style={{
              border: "1px solid #eee",
              background: "white",
              borderRadius: 12,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            刷新
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ opacity: 0.7 }}>加载中...</div>
      ) : notFound ? (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 14,
            background: "white",
          }}
        >
          未找到该视频（id={clipId}）
        </div>
      ) : errMsg ? (
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 14,
            background: "white",
            color: "#b00020",
          }}
        >
          加载失败：{errMsg}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          {/* LEFT: video */}
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 16,
              background: "white",
              padding: 14,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
              难度：{clip?.difficulty || "-"}　时长：
              {clip?.duration_sec ? `${clip.duration_sec}s` : "-"}　权限：
              {clip?.access_tier || "-"}
            </div>

            <div style={{ borderRadius: 14, overflow: "hidden", background: "#111" }}>
              <video
                ref={videoRef}
                src={clip?.video_url || ""}
                controls
                playsInline
                style={{ width: "100%", display: "block" }}
              />
            </div>

            {/* 未来可放：收藏/进度/笔记等 */}
          </div>

          {/* RIGHT: tabs */}
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 16,
              background: "white",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {[
                ["timeline", "时间轴"],
                ["transcript", "转写文本"],
                ["vocab", "词汇卡"],
                ["expressions", "表达"],
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
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  {label}
                </button>
              ))}

              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  style={{
                    border: "1px solid #eee",
                    background: "white",
                    borderRadius: 10,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <option value="zh">中英：中文优先</option>
                  <option value="en">仅英文</option>
                  <option value="both">中英双显</option>
                </select>
              </div>
            </div>

            <div
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 14,
                padding: 12,
                minHeight: 420,
                maxHeight: 520,
                overflow: "auto",
              }}
            >
              {/* 时间轴 */}
              {tab === "timeline" ? (
                timelineItems.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {timelineItems.map((x, idx) => (
                      <button
                        key={`${x.t}-${idx}`}
                        type="button"
                        onClick={() => seekTo(x.t)}
                        style={{
                          textAlign: "left",
                          border: "1px solid #eee",
                          background: "white",
                          borderRadius: 12,
                          padding: "10px 10px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
                          <div
                            style={{
                              flex: "0 0 auto",
                              fontWeight: 900,
                              fontSize: 12,
                              color: "#0b57d0",
                              padding: "2px 8px",
                              borderRadius: 8,
                              border: "1px solid #e6efff",
                              background: "#f5f9ff",
                            }}
                          >
                            {fmtTime(x.t)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            {lang !== "zh" ? (
                              <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                                {x.en || "—"}
                              </div>
                            ) : null}
                            {lang !== "en" ? (
                              <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.85 }}>
                                {x.zh || "—"}
                              </div>
                            ) : null}
                            {lang === "both" ? (
                              <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>
                                （点击跳转并播放）
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ opacity: 0.7, lineHeight: 1.7 }}>
                    还没有详情内容（details_json）。
                    <br />
                    你把 AI 生成的 JSON 存进 <code>clip_details.details_json</code> 后，这里就会出现时间轴。
                  </div>
                )
              ) : null}

              {/* 转写文本 */}
              {tab === "transcript" ? (
                transcriptItems.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {transcriptItems.map((x, idx) => (
                      <div
                        key={`${x.t}-${idx}`}
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 12,
                          padding: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            type="button"
                            onClick={() => seekTo(x.t || 0)}
                            style={{
                              border: "1px solid #e6efff",
                              background: "#f5f9ff",
                              color: "#0b57d0",
                              borderRadius: 10,
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontWeight: 900,
                              fontSize: 12,
                            }}
                          >
                            {fmtTime(x.t || 0)}
                          </button>
                          <div style={{ fontSize: 12, opacity: 0.6 }}>点击时间跳转播放</div>
                        </div>

                        {lang !== "zh" ? (
                          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7 }}>
                            {x.en || "—"}
                          </div>
                        ) : null}
                        {lang !== "en" ? (
                          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, opacity: 0.85 }}>
                            {x.zh || "—"}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ opacity: 0.7, lineHeight: 1.7 }}>
                    暂无转写内容（details_json 里没有 transcript）。
                  </div>
                )
              ) : null}

              {/* 词汇卡 */}
              {tab === "vocab" ? (
                vocabItems.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {vocabItems.map((x, idx) => (
                      <div
                        key={`${x.term}-${idx}`}
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                          <div style={{ fontWeight: 900, fontSize: 14 }}>
                            {x.term || "—"}
                          </div>
                          {x.ipa ? (
                            <div style={{ fontSize: 12, opacity: 0.65 }}>{x.ipa}</div>
                          ) : null}
                          {x.level ? (
                            <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>
                              {x.level}
                            </div>
                          ) : null}
                        </div>

                        {lang !== "zh" ? (
                          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7 }}>
                            {x.meaning_en || ""}
                          </div>
                        ) : null}
                        {lang !== "en" ? (
                          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, opacity: 0.85 }}>
                            {x.meaning_zh || ""}
                          </div>
                        ) : null}

                        {x.example ? (
                          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>
                            <b>例句：</b>{x.example}
                          </div>
                        ) : null}
                        {x.note ? (
                          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7, lineHeight: 1.6 }}>
                            <b>备注：</b>{x.note}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ opacity: 0.7, lineHeight: 1.7 }}>
                    暂无词汇卡内容（details_json 里没有 vocab）。
                  </div>
                )
              ) : null}

              {/* 表达 */}
              {tab === "expressions" ? (
                exprItems.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {exprItems.map((x, idx) => (
                      <div
                        key={`${x.text}-${idx}`}
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: 14 }}>{x.text || "—"}</div>

                        {lang !== "zh" ? (
                          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7 }}>
                            {x.meaning_en || ""}
                          </div>
                        ) : null}
                        {lang !== "en" ? (
                          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, opacity: 0.85 }}>
                            {x.meaning_zh || ""}
                          </div>
                        ) : null}

                        {x.example ? (
                          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>
                            <b>例句：</b>{x.example}
                          </div>
                        ) : null}
                        {x.note ? (
                          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7, lineHeight: 1.6 }}>
                            <b>备注：</b>{x.note}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ opacity: 0.7, lineHeight: 1.7 }}>
                    暂无表达内容（details_json 里没有 expressions）。
                  </div>
                )
              ) : null}

              {/* 小提示：你需要时可以打开看看后端有没有返回 */}
              {/* <pre style={{ fontSize: 12, opacity: 0.6 }}>{JSON.stringify(detailsRaw, null, 2)}</pre> */}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6, lineHeight: 1.6 }}>
              提示：后续你把 AI 生成的统一 JSON 存进 <code>clip_details.details_json</code>，
              右侧就会自动出现时间轴/字幕/词汇卡/表达。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
