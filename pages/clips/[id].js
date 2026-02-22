// pages/clips/[id].js
import { useEffect, useMemo, useState } from "react";
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

function formatSec(sec) {
  const s = Number(sec || 0);
  if (!s) return "";
  return `${s}s`;
}

export default function ClipDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const clipId = useMemo(() => {
    const n = parseInt(String(id || ""), 10);
    return Number.isFinite(n) ? n : null;
  }, [id]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [clip, setClip] = useState(null);
  const [me, setMe] = useState(null);

  useEffect(() => {
    // ✅ 没 ready / 没 id：不要乱设 notFound（否则就会“闪一下又跳回”）
    if (!router.isReady) return;
    if (!clipId) return;

    // ✅ id 变化时先重置状态
    setLoading(true);
    setNotFound(false);
    setErrMsg("");
    setClip(null);
    setMe(null);

    fetchJson(`/api/clip?id=${clipId}`)
      .then((d) => {
        if (!d?.ok || !d?.item) {
          setNotFound(true);
          return;
        }
        setClip(d.item);
        setMe(d.me || null);
      })
      .catch((e) => {
        // 既可能是 404，也可能是后端报错
        if (e?.status === 404) setNotFound(true);
        else setErrMsg(e.message || "加载失败");
      })
      .finally(() => setLoading(false));
  }, [router.isReady, clipId]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

        <div style={{ fontWeight: 900, fontSize: 18 }}>
          {clip?.title ? clip.title : clipId ? `Clip #${clipId}` : "Clip"}
        </div>

        <a
          href="/"
          style={{
            marginLeft: "auto",
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

      {loading ? (
        <div style={{ marginTop: 16, opacity: 0.7 }}>加载中...</div>
      ) : notFound ? (
        <div
          style={{
            marginTop: 16,
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 16,
            background: "white",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            未找到该视频（id={clipId || "-"}）
          </div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            请检查：/api/clip?id={clipId || "-"} 是否 ok:true 且 item 不为空
          </div>
        </div>
      ) : errMsg ? (
        <div
          style={{
            marginTop: 16,
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 16,
            background: "white",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>加载失败</div>
          <div style={{ fontSize: 13, color: "#b00" }}>{errMsg}</div>
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12, gridTemplateColumns: "1.7fr 1fr" }}>
          {/* 左：视频 */}
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 12,
              background: "white",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 10 }}>
              难度：{(clip?.difficulty_slugs || [])[0] || clip?.difficulty || "-"}　
              时长：{formatSec(clip?.duration_sec)}　
              权限：{clip?.access_tier || "-"}
            </div>

            {clip?.can_access ? (
              <video
                src={clip?.video_url || ""}
                controls
                style={{ width: "100%", borderRadius: 12, background: "#000" }}
              />
            ) : (
              <div
                style={{
                  border: "1px dashed #ddd",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fafafa",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  会员专享：请登录并兑换码激活
                </div>
                <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 10 }}>
                  当前登录：{me?.logged_in ? "✅ 是" : "❌ 否"}　
                  会员：{me?.is_member ? "✅ 是" : "❌ 否"}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <a
                    href="/login"
                    style={{
                      flex: 1,
                      textAlign: "center",
                      border: "1px solid #eee",
                      background: "white",
                      borderRadius: 12,
                      padding: "10px 12px",
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
                      flex: 1,
                      textAlign: "center",
                      border: "none",
                      background: "#111",
                      color: "white",
                      borderRadius: 12,
                      padding: "10px 12px",
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

          {/* 右：占位（后面我们做时间轴/词汇卡/表达） */}
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 12,
              background: "white",
              minHeight: 260,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>学习面板</div>
            <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.7 }}>
              这里后面接入：时间轴 / 转写文本 / 词汇卡 / 表达 / 中英。
              <br />
              先把 c-1 验证跑通：页面不再“闪一下又跳回”。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
