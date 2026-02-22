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
    throw new Error(msg);
  }
  return data;
}

function fmtDur(sec) {
  const s = Number(sec || 0);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function slugToCN(s) {
  if (!s) return "-";
  const m = {
    beginner: "初级",
    intermediate: "中级",
    advanced: "高级",
  };
  return m[s] || s;
}

export default function ClipDetailPage() {
  const router = useRouter();
  const id = router.query?.id;

  const [me, setMe] = useState({ loading: true, logged_in: false, is_member: false, email: null });
  const [clip, setClip] = useState(null);
  const [subs, setSubs] = useState([]); // [{start_sec,end_sec,en,zh,repeat}]
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [lang, setLang] = useState("en"); // en / zh
  const [completed, setCompleted] = useState(false);
  const [busyComplete, setBusyComplete] = useState(false);

  const title = clip?.title || (id ? `Clip #${id}` : "Clip");
  const difficulty = clip?.difficulty || "-";
  const duration = clip?.duration_sec ? fmtDur(clip.duration_sec) : "-";
  const accessTier = clip?.access_tier || "-";
  const canAccess = !!clip?.can_access;

  async function loadMe() {
    try {
      setMe((x) => ({ ...x, loading: true }));
      const d = await fetchJson("/api/me");
      setMe({
        loading: false,
        logged_in: !!d?.logged_in,
        is_member: !!d?.is_member,
        email: d?.email || null,
      });
      return d;
    } catch {
      setMe({ loading: false, logged_in: false, is_member: false, email: null });
      return null;
    }
  }

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    setMsg("");

    try {
      await loadMe();

      // 详情
      const d = await fetchJson(`/api/clip?id=${encodeURIComponent(id)}`);
      setClip(d?.clip || null);

      // 字幕（可为空）
      const s = await fetchJson(`/api/subtitles?clip_id=${encodeURIComponent(id)}`);
      setSubs(s?.items || []);

      // 完成状态（只有登录才查）
      if (d?.me?.logged_in) {
        const p = await fetchJson(`/api/progress_status?clip_id=${encodeURIComponent(id)}`);
        setCompleted(!!p?.completed);
      } else {
        setCompleted(false);
      }
    } catch (e) {
      setMsg(e.message || "加载失败");
      setClip(null);
      setSubs([]);
      setCompleted(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!router.isReady) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, id]);

  async function toggleComplete() {
    if (!me.logged_in) {
      alert("需要登录后才能标记完成");
      return;
    }
    setBusyComplete(true);
    try {
      const r = await fetchJson("/api/progress_toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: Number(id) }),
      });
      setCompleted(!!r?.completed);
    } catch (e) {
      alert("操作失败：" + e.message);
    } finally {
      setBusyComplete(false);
    }
  }

  const subtitleRows = useMemo(() => {
    return (subs || []).map((x, idx) => {
      const start = fmtDur(Math.floor(x.start_sec || 0));
      const end = fmtDur(Math.floor(x.end_sec || 0));
      const repeat = x.repeat ?? 3;
      const line = lang === "en" ? x.en : x.zh;
      return { idx, start, end, repeat, line: line || "" };
    });
  }, [subs, lang]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      {/* 顶部返回 + 标题信息（参考站风格） */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => router.back()}
          style={{
            border: "1px solid #eee",
            background: "white",
            borderRadius: 10,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          ←
        </button>

        <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>
          {title}
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7, fontWeight: 500 }}>
            时长 {duration} · {slugToCN(difficulty)} ·{" "}
            {accessTier === "vip" ? (me.is_member ? "会员" : "非会员") : "免费"}
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {me.loading ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>检查登录...</div>
          ) : me.logged_in ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>{me.email}</div>
          ) : (
            <a
              href="/login"
              style={{
                border: "1px solid #eee",
                background: "white",
                borderRadius: 10,
                padding: "6px 10px",
                textDecoration: "none",
                color: "#111",
                fontSize: 13,
              }}
            >
              去登录
            </a>
          )}
        </div>
      </div>

      {/* 标记完成 */}
      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={toggleComplete}
          disabled={busyComplete}
          style={{
            border: "1px solid #eee",
            background: completed ? "#111" : "white",
            color: completed ? "white" : "#111",
            borderRadius: 12,
            padding: "8px 12px",
            cursor: busyComplete ? "not-allowed" : "pointer",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {busyComplete ? "处理中..." : completed ? "已完成 ✅" : "标记完成"}
        </button>

        <a
          href={`/vocab?clip_id=${encodeURIComponent(id || "")}`}
          style={{ fontSize: 13, opacity: 0.8 }}
        >
          查看词汇卡片
        </a>
      </div>

      {msg ? <div style={{ marginTop: 12, color: "#b00020" }}>{msg}</div> : null}

      {/* 播放区 */}
      <div
        style={{
          marginTop: 14,
          border: "1px solid #eee",
          borderRadius: 14,
          padding: 12,
          background: "white",
        }}
      >
        {loading ? (
          <div style={{ opacity: 0.7 }}>加载中...</div>
        ) : !clip ? (
          <div style={{ opacity: 0.7 }}>未找到该视频</div>
        ) : canAccess ? (
          <video
            src={clip.video_url}
            controls
            playsInline
            style={{ width: "100%", borderRadius: 12, background: "#000" }}
          />
        ) : (
          <div style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>无视频预览</div>
            <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
              这是会员视频。请登录并使用兑换码开通会员后观看。
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
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

      {/* 标题/描述/标签（参考页下半部分） */}
      {clip ? (
        <div style={{ marginTop: 14 }}>
          <h2 style={{ margin: "10px 0 6px" }}>{clip.title}</h2>
          {clip.description ? (
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.7 }}>
              {clip.description}
            </div>
          ) : null}

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            难度: {slugToCN(difficulty)}　|　权限: {accessTier}　|　
            Topics: {(clip.topics || []).join(", ") || "-"}　|　
            Channels: {(clip.channels || []).join(", ") || "-"}
          </div>
        </div>
      ) : null}

      {/* 字幕区（结构尽量贴近参考站） */}
      <div style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10 }}>字幕</h3>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <button
            onClick={() => setLang("en")}
            style={{
              border: "1px solid #eee",
              background: lang === "en" ? "#111" : "white",
              color: lang === "en" ? "white" : "#111",
              borderRadius: 10,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            EN
          </button>
          <button
            onClick={() => setLang("zh")}
            style={{
              border: "1px solid #eee",
              background: lang === "zh" ? "#111" : "white",
              color: lang === "zh" ? "white" : "#111",
              borderRadius: 10,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            中
          </button>

          <a
            href={`/vocab?clip_id=${encodeURIComponent(id || "")}`}
            style={{ marginLeft: "auto", fontSize: 13, opacity: 0.85 }}
          >
            查看词汇卡片
          </a>
        </div>

        {subtitleRows.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {subtitleRows.map((r) => (
              <div key={r.idx} style={{ borderTop: "1px solid #f0f0f0", paddingTop: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                  {r.start} – {r.end}　{r.repeat}x
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.7 }}>{r.line}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            暂无字幕（后面我们可以导入字幕表，就会像参考站一样显示时间段列表）
          </div>
        )}
      </div>
    </div>
  );
}
