// pages/bookmarks.js
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
      (data && (data.error || data.message)) ||
      text ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export default function BookmarksPage() {
  const router = useRouter();

  const [me, setMe] = useState({ loading: true, logged_in: false, email: null });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");

  async function loadMe() {
    try {
      setMe((x) => ({ ...x, loading: true }));
      const d = await fetchJson("/api/me");
      setMe({ loading: false, logged_in: !!d?.logged_in, email: d?.email || null });
      return d;
    } catch {
      setMe({ loading: false, logged_in: false, email: null });
      return null;
    }
  }

  async function loadBookmarks() {
    setLoading(true);
    setMsg("");
    try {
      const d = await fetchJson("/api/bookmarks?limit=500&offset=0");
      // 你 bookmarks 接口通常会带 clips_view 字段（如 title/cover_url/video_url...）
      setItems(d?.items || []);
    } catch (e) {
      setMsg(e.message || "加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (me.loading) return;
    if (!me.logged_in) {
      setLoading(false);
      setItems([]);
      return;
    }
    loadBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.loading, me.logged_in]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => {
      const t = String(x?.title || "").toLowerCase();
      return t.includes(s);
    });
  }, [items, q]);

  async function removeBookmark(clipId) {
    try {
      await fetchJson("/api/bookmarks_delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: clipId }),
      });
      setItems((prev) => prev.filter((x) => x.clip_id !== clipId && x.id !== clipId));
    } catch (e) {
      alert("取消收藏失败：" + e.message);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h1 style={{ margin: 0 }}>我的收藏</h1>
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
            返回首页
          </a>
          <button
            onClick={() => loadBookmarks()}
            style={{
              border: "1px solid #eee",
              background: "white",
              borderRadius: 10,
              padding: "6px 10px",
              cursor: "pointer",
            }}
            disabled={!me.logged_in}
          >
            刷新
          </button>
        </div>
      </div>

      <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
        {me.loading ? "登录状态检查中..." : me.logged_in ? `已登录：${me.email || "-"}` : "未登录"}
      </div>

      {!me.loading && !me.logged_in ? (
        <div style={{ marginTop: 14, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ fontWeight: 800 }}>你还没登录</div>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
            登录后才能查看收藏列表。
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
                fontWeight: 700,
              }}
            >
              去登录
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
                fontWeight: 700,
              }}
            >
              去注册
            </a>
          </div>
        </div>
      ) : null}

      {me.logged_in ? (
        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索标题..."
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: 12,
            }}
          />
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {loading ? "加载中..." : `共 ${filtered.length} 条`}
          </div>
        </div>
      ) : null}

      {msg ? <div style={{ marginTop: 12, color: "#b00020" }}>{msg}</div> : null}

      {me.logged_in ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {loading ? (
            <div style={{ opacity: 0.7 }}>加载中...</div>
          ) : filtered.length ? (
            filtered.map((x) => (
              <div
                key={x.clip_id || x.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: 12,
                  background: "white",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
                  <div style={{ fontWeight: 800, flex: 1 }}>
                    {x.title || `Clip #${x.clip_id || x.id}`}
                  </div>
                  <button
                    onClick={() => removeBookmark(x.clip_id || x.id)}
                    style={{
                      border: "1px solid #eee",
                      background: "white",
                      borderRadius: 10,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    取消收藏
                  </button>
                </div>

                {x.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={x.cover_url}
                    alt=""
                    style={{ width: "100%", borderRadius: 12, marginTop: 8, marginBottom: 8 }}
                  />
                ) : null}

                {x.video_url ? (
                  <a href={x.video_url} target="_blank" rel="noreferrer">
                    播放视频
                  </a>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>（无视频链接）</div>
                )}
              </div>
            ))
          ) : (
            <div style={{ opacity: 0.7 }}>还没有收藏任何视频</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
