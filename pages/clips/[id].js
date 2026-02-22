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

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec || 0)));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function ClipDetailPage() {
  const router = useRouter();
  const clipId = useMemo(() => Number(router.query.id), [router.query.id]);

  const videoRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [clip, setClip] = useState(null); // 对应 d.item
  const [me, setMe] = useState(null); // 对应 d.me
  const [details, setDetails] = useState(null); // 对应 d.details_json（从 /api/clip_details）

  // 右侧：字幕 EN/中 切换
  const [subLang, setSubLang] = useState("zh"); // "en" | "zh"

  // 右侧：词汇卡展开/收起（先保留结构，后面再做成你图里那种 2列/3列切换）
  const [showVocabPanel, setShowVocabPanel] = useState(false);

  // --- 拉 clip 基础信息（/api/clip?id=）
  useEffect(() => {
    if (!router.isReady) return;
    if (!clipId) return;

    let alive = true;
    setLoading(true);
    setErr("");
    setClip(null);
    setMe(null);

    fetchJson(`/api/clip?id=${clipId}`)
      .then((d) => {
        if (!alive) return;
        // ✅ 关键：你的 API 返回是 { ok, item, me }
        setClip(d?.item || null);
        setMe(d?.me || null);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e.message || "加载失败");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [router.isReady, clipId]);

  // --- 拉 details_json（/api/clip_detail 或 /api/clip_details）
  // 你现在的文件叫 pages/api/clip_detail.js（单数），我们就按这个来请求
  useEffect(() => {
    if (!router.isReady) return;
    if (!clipId) return;

    let alive = true;
    setDetails(null);

    fetchJson(`/api/clip_detail?id=${clipId}`)
      .then((d) => {
        if (!alive) return;
        // 兼容：你返回是 { ok, clip_id, details_json, updated_at }
        setDetails(d?.details_json || null);
      })
      .catch(() => {
        // details 没有也没关系，右侧显示引导文案
        if (!alive) return;
        setDetails(null);
      });

    return () => {
      alive = false;
    };
  }, [router.isReady, clipId]);

  const canAccess = !!clip?.can_access; // ✅ 必须从 d.item.can_access 来

  const segments = useMemo(() => {
    // 你后续会把 AI 生成的内容写进 details_json.segments
    const arr = details?.segments;
    return Array.isArray(arr) ? arr : [];
  }, [details]);

  function seekTo(sec) {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = Math.max(0, Number(sec || 0));
      v.play?.();
    } catch {}
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
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

        <div style={{ fontSize: 20, fontWeight: 900 }}>
          {clip?.title || `Clip #${clipId || ""}`}
        </div>

        <div style={{ marginLeft: "auto" }}>
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
        <div style={{ opacity: 0.7 }}>加载中...</div>
      ) : err ? (
        <div style={{ color: "#b00" }}>加载失败：{err}</div>
      ) : !clip ? (
        <div style={{ opacity: 0.7 }}>未找到该视频（id={clipId}）</div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.2fr)",
            alignItems: "start",
          }}
        >
          {/* 左：视频 + 基础信息 */}
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 16,
              background: "white",
              padding: 14,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>
              难度：{clip?.difficulty_slugs?.[0] || "unknown"}　时长：
              {clip?.duration_sec ? `${clip.duration_sec}s` : "-"}　权限：
              {clip?.access_tier || "-"}　
              <span style={{ marginLeft: 10 }}>
                登录：{me?.logged_in ? "✅" : "❌"} / 会员：{me?.is_member ? "✅" : "❌"}
              </span>
            </div>

            {canAccess ? (
              <video
                ref={videoRef}
                src={clip.video_url}
                controls
                style={{ width: "100%", borderRadius: 14, background: "#000" }}
                poster={clip.cover_url || undefined}
              />
            ) : (
              <div
                style={{
                  border: "1px solid #f1d2d2",
                  background: "#fff7f7",
                  borderRadius: 14,
                  padding: 14,
                  color: "#b00",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 6 }}>会员专享</div>
                该视频需要登录并先兑换激活后观看。
              </div>
            )}
          </div>

          {/* 右：字幕/词汇卡区域（先把结构搭对） */}
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 16,
              background: "white",
              padding: 14,
              minHeight: 420,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>字幕</div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setSubLang("en")}
                  style={{
                    border: "1px solid #eee",
                    background: subLang === "en" ? "#111" : "white",
                    color: subLang === "en" ? "white" : "#111",
                    borderRadius: 999,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setSubLang("zh")}
                  style={{
                    border: "1px solid #eee",
                    background: subLang === "zh" ? "#111" : "white",
                    color: subLang === "zh" ? "white" : "#111",
                    borderRadius: 999,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  中
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowVocabPanel((x) => !x)}
                style={{
                  marginLeft: "auto",
                  border: "1px solid #eee",
                  background: showVocabPanel ? "#111" : "white",
                  color: showVocabPanel ? "white" : "#111",
                  borderRadius: 12,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                {showVocabPanel ? "收起词汇卡" : "词汇卡"}
              </button>
            </div>

            {/* 主体：字幕列表 */}
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 14,
                padding: 10,
                maxHeight: 520,
                overflow: "auto",
              }}
            >
              {!details ? (
                <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.6 }}>
                  还没有详情内容（details_json）。
                  <br />
                  你把 AI 生成的 JSON 存进 clip_details.details_json 后，这里就会出现时间轴字幕。
                </div>
              ) : segments.length === 0 ? (
                <div style={{ fontSize: 13, opacity: 0.75 }}>
                  details_json 里没有 segments 字幕段
                </div>
              ) : (
                segments.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 14,
                      padding: 10,
                      marginBottom: 10,
                      cursor: "pointer",
                    }}
                    onClick={() => seekTo(s.start_sec)}
                    title="点击跳到该时间并播放"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          background: "#f5f5f5",
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        {fmtTime(s.start_sec)} - {fmtTime(s.end_sec)}
                      </div>
                      {s?.repeat ? (
                        <div style={{ fontSize: 12, opacity: 0.65 }}>🔁 x{s.repeat}</div>
                      ) : null}
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                      {subLang === "en" ? s.en : s.zh}
                    </div>

                    {subLang === "en" ? (
                      s.zh ? <div style={{ fontSize: 13, opacity: 0.75 }}>{s.zh}</div> : null
                    ) : s.en ? (
                      <div style={{ fontSize: 13, opacity: 0.75 }}>{s.en}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            {/* 词汇卡面板：先占位，下一步我们再做成你截图那种“第三列抽屉式”结构 */}
            {showVocabPanel ? (
              <div
                style={{
                  marginTop: 12,
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: 10,
                  fontSize: 13,
                  opacity: 0.85,
                  lineHeight: 1.6,
                }}
              >
                这里下一步会做成「单词 / 短语 / 地道表达」三类，并且每张卡只保留“中文解释”按钮（不做英文解释）。
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
