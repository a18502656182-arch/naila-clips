import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

function parseCSV(v) {
  if (!v) return [];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function toggleValue(list, value) {
  const set = new Set(list);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

function buildQuery(obj) {
  const q = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (v === "") continue;
    q[k] = Array.isArray(v) ? v.join(",") : String(v);
  }
  return q;
}

export default function Home() {
  const router = useRouter();

  // ===== taxonomies（动态）=====
  const [tax, setTax] = useState({ difficulties: [], topics: [], channels: [] });
  const [taxLoading, setTaxLoading] = useState(true);

  // ===== clips list =====
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // ===== 从 URL 初始化筛选 =====
  const q = router.query;

  const selectedDifficulty = useMemo(() => parseCSV(q.difficulty), [q.difficulty]);
  const selectedAccess = useMemo(() => parseCSV(q.access), [q.access]);
  const selectedTopic = useMemo(() => parseCSV(q.topic), [q.topic]);
  const selectedChannel = useMemo(() => parseCSV(q.channel), [q.channel]);

  const sort = useMemo(() => (q.sort === "oldest" ? "oldest" : "newest"), [q.sort]);
  const limit = useMemo(() => {
    const n = parseInt(q.limit || "12", 10);
    return Number.isFinite(n) ? Math.max(1, Math.min(50, n)) : 12;
  }, [q.limit]);
  const offset = useMemo(() => {
    const n = parseInt(q.offset || "0", 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }, [q.offset]);

  // ===== 页面首次加载 taxonomies =====
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setTaxLoading(true);
        const r = await fetch(`/api/taxonomies?_ts=${Date.now()}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Failed to load taxonomies");
        if (!alive) return;
        setTax({
          difficulties: j.difficulties || [],
          topics: j.topics || [],
          channels: j.channels || [],
        });
      } catch (e) {
        // tax 加载失败不阻塞 clips，只是 UI 没选项
        console.error(e);
      } finally {
        if (alive) setTaxLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  // ===== 每当 URL query 变化，就请求 clips =====
  useEffect(() => {
    if (!router.isReady) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const params = new URLSearchParams();
        if (selectedDifficulty.length) params.set("difficulty", selectedDifficulty.join(","));
        if (selectedAccess.length) params.set("access", selectedAccess.join(","));
        if (selectedTopic.length) params.set("topic", selectedTopic.join(","));
        if (selectedChannel.length) params.set("channel", selectedChannel.join(","));
        params.set("sort", sort);
        params.set("limit", String(limit));
        params.set("offset", String(offset));
        params.set("_ts", String(Date.now()));

        const r = await fetch(`/api/clips?${params.toString()}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Request failed");
        if (!alive) return;

        setItems(j.items || []);
        setTotal(j.total || 0);
      } catch (e) {
        if (!alive) return;
        setItems([]);
        setTotal(0);
        setErr(e?.message || "Unknown error");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [
    router.isReady,
    selectedDifficulty.join(","),
    selectedAccess.join(","),
    selectedTopic.join(","),
    selectedChannel.join(","),
    sort,
    limit,
    offset,
  ]);

  // ===== 更新 URL 的 helper（勾选后 offset 归零）=====
  function updateQuery(nextPartial) {
    const next = {
      difficulty: selectedDifficulty,
      access: selectedAccess,
      topic: selectedTopic,
      channel: selectedChannel,
      sort,
      limit,
      offset,
      ...nextPartial,
    };

    // 勾选筛选时，回到第一页
    if ("difficulty" in nextPartial || "access" in nextPartial || "topic" in nextPartial || "channel" in nextPartial || "sort" in nextPartial) {
      next.offset = 0;
    }

    router.push(
      { pathname: "/", query: buildQuery(next) },
      undefined,
      { shallow: true }
    );
  }

  function clearAll() {
    router.push(
      { pathname: "/", query: buildQuery({ sort: "newest", limit: 12, offset: 0 }) },
      undefined,
      { shallow: true }
    );
  }

  const pageFrom = total === 0 ? 0 : offset + 1;
  const pageTo = Math.min(offset + limit, total);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 14px" }}>
      <h1 style={{ fontSize: 40, margin: "0 0 8px", fontWeight: 800 }}>视频库（接口式筛选测试版）</h1>
      <div style={{ color: "#666", marginBottom: 18 }}>
        勾选筛选会立刻请求 /api/clips，URL 可分享，刷新会保留筛选。
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Left */}
        <div>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>难度（多选）</div>
          {taxLoading ? (
            <div style={{ color: "#999" }}>加载中...</div>
          ) : (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {tax.difficulties.map((d) => (
                <label key={d.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={selectedDifficulty.includes(d.slug)}
                    onChange={() => updateQuery({ difficulty: toggleValue(selectedDifficulty, d.slug) })}
                  />
                  {d.slug}
                </label>
              ))}
            </div>
          )}

          <div style={{ fontWeight: 800, margin: "14px 0 8px" }}>Topic（多选，真实 slug）</div>
          {taxLoading ? (
            <div style={{ color: "#999" }}>加载中...</div>
          ) : (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {tax.topics.map((t) => (
                <label key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={selectedTopic.includes(t.slug)}
                    onChange={() => updateQuery({ topic: toggleValue(selectedTopic, t.slug) })}
                  />
                  {t.slug}
                </label>
              ))}
            </div>
          )}

          <div style={{ fontWeight: 800, margin: "14px 0 8px" }}>排序</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select value={sort} onChange={(e) => updateQuery({ sort: e.target.value })}>
              <option value="newest">最新</option>
              <option value="oldest">最早</option>
            </select>

            <button onClick={clearAll} style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 8, background: "#fff", cursor: "pointer" }}>
              清空筛选
            </button>
          </div>
        </div>

        {/* Right */}
        <div>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>权限（多选）</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {["free", "member"].map((a) => (
              <label key={a} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={selectedAccess.includes(a)}
                  onChange={() => updateQuery({ access: toggleValue(selectedAccess, a) })}
                />
                {a === "free" ? "免费" : "会员专享"}
              </label>
            ))}
          </div>

          <div style={{ fontWeight: 800, margin: "14px 0 8px" }}>Channel（多选，真实 slug）</div>
          {taxLoading ? (
            <div style={{ color: "#999" }}>加载中...</div>
          ) : (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {tax.channels.map((c) => (
                <label key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={selectedChannel.includes(c.slug)}
                    onChange={() => updateQuery({ channel: toggleValue(selectedChannel, c.slug) })}
                  />
                  {c.slug}
                </label>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, color: "#666", textAlign: "right" }}>
            共 {total} 条，当前 {pageFrom}-{pageTo}
          </div>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 14, padding: 12, border: "1px solid #f2b8b8", background: "#fff2f2", borderRadius: 10, color: "#b00020" }}>
          请求失败：{err}
          <div style={{ marginTop: 6, color: "#333" }}>
            请打开浏览器 DevTools → Network → 找 <code>/api/clips</code> → 截图给我（Headers + Response）。
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {loading ? (
          <div style={{ color: "#666" }}>加载中...</div>
        ) : (
          items.map((it) => (
            <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              <div style={{ height: 180, background: "#ddd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {it.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.cover_url} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ fontSize: 40, color: "#555" }}>cover</div>
                )}
              </div>

              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{it.title}</div>

                {/* 标签展示 */}
                <div style={{ marginTop: 6, fontSize: 12, color: "#444" }}>
                  <div>难度: {(it.difficulty || []).join(", ") || "-"}</div>
                  <div>Topic: {(it.topics || []).join(", ") || "-"}</div>
                  <div>Channel: {(it.channels || []).join(", ") || "-"}</div>
                </div>

                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                  权限：{it.access_tier}　时长：{it.duration_sec}s
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <a
                    href={it.video_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 8, textDecoration: "none", color: "#111" }}
                  >
                    打开视频
                  </a>

                  <button
                    disabled={!it.can_access}
                    onClick={() => alert(it.can_access ? "可进入详情页（后续做）" : "需要登录/兑换码激活（后续做）")}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      background: it.can_access ? "#fff" : "#f5f5f5",
                      color: it.can_access ? "#111" : "#999",
                      cursor: it.can_access ? "pointer" : "not-allowed",
                    }}
                  >
                    详情页（后续做）
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          disabled={offset <= 0}
          onClick={() => updateQuery({ offset: Math.max(0, offset - limit) })}
          style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 10, background: "#fff", cursor: offset <= 0 ? "not-allowed" : "pointer" }}
        >
          上一页
        </button>
        <button
          disabled={offset + limit >= total}
          onClick={() => updateQuery({ offset: offset + limit })}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 10,
            background: "#fff",
            cursor: offset + limit >= total ? "not-allowed" : "pointer",
          }}
        >
          下一页
        </button>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "#777" }}>
        当前查询参数：{JSON.stringify(buildQuery({ difficulty: selectedDifficulty, access: selectedAccess, topic: selectedTopic, channel: selectedChannel, sort, limit, offset }))}
      </div>
    </div>
  );
}
