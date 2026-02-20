// pages/index.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

function parseCSV(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v[0];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toCSV(arr) {
  if (!arr || arr.length === 0) return undefined;
  return arr.join(",");
}

function toggleValue(list, value) {
  const set = new Set(list);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

export default function HomePage() {
  const router = useRouter();

  // ===== 你可以先用“固定选项”，后续我们再做从数据库动态拉 topic/channel 列表 =====
  const DIFFICULTY_OPTIONS = [
    { label: "初级", value: "beginner" },
    { label: "中级", value: "intermediate" },
    { label: "高级", value: "advanced" },
  ];
  const ACCESS_OPTIONS = [
    { label: "免费", value: "free" },
    { label: "会员专享", value: "member" },
  ];

  // 先放一些示例 topic/channel（你后面可以改成你真实的 slug）
  const TOPIC_OPTIONS = [
    { label: "日常口语", value: "daily" },
    { label: "商务英语", value: "business" },
    { label: "影视片段", value: "movie" },
  ];
  const CHANNEL_OPTIONS = [
    { label: "频道A", value: "channel-a" },
    { label: "频道B", value: "channel-b" },
    { label: "频道C", value: "channel-c" },
  ];

  // ===== UI state（从 URL 初始化）=====
  const [difficulty, setDifficulty] = useState([]);
  const [access, setAccess] = useState([]);
  const [topic, setTopic] = useState([]);
  const [channel, setChannel] = useState([]);
  const [sort, setSort] = useState("newest"); // newest | oldest

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(12);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ===== 1) 页面打开/刷新：从 URL -> state（刷新保留筛选）=====
  useEffect(() => {
    if (!router.isReady) return;

    const q = router.query;

    const qDifficulty = parseCSV(q.difficulty);
    const qAccess = parseCSV(q.access);
    const qTopic = parseCSV(q.topic);
    const qChannel = parseCSV(q.channel);

    const qSortRaw = Array.isArray(q.sort) ? q.sort[0] : q.sort;
    const qSort = qSortRaw === "oldest" ? "oldest" : "newest";

    const qLimitRaw = Array.isArray(q.limit) ? q.limit[0] : q.limit;
    const qOffsetRaw = Array.isArray(q.offset) ? q.offset[0] : q.offset;
    const qLimit = qLimitRaw ? Math.max(1, Math.min(50, parseInt(qLimitRaw, 10))) : 12;
    const qOffset = qOffsetRaw ? Math.max(0, parseInt(qOffsetRaw, 10)) : 0;

    setDifficulty(qDifficulty);
    setAccess(qAccess);
    setTopic(qTopic);
    setChannel(qChannel);
    setSort(qSort);
    setLimit(qLimit);
    setOffset(qOffset);
  }, [router.isReady, router.query]);

  // ===== 2) state 改变：写回 URL（可分享）=====
  const urlQuery = useMemo(() => {
    return {
      difficulty: toCSV(difficulty),
      access: toCSV(access),
      topic: toCSV(topic),
      channel: toCSV(channel),
      sort,
      limit: String(limit),
      offset: String(offset),
    };
  }, [difficulty, access, topic, channel, sort, limit, offset]);

  function pushURL(next = {}) {
    // 合并并清理 undefined
    const merged = { ...urlQuery, ...next };
    Object.keys(merged).forEach((k) => {
      if (merged[k] === undefined) delete merged[k];
    });

    router.push(
      { pathname: "/", query: merged },
      undefined,
      { shallow: true } // 关键：不整页刷新
    );
  }

  // ===== 3) URL 改变：请求 /api/clips 取列表（接口式刷新）=====
  useEffect(() => {
    if (!router.isReady) return;

    const qs = new URLSearchParams();
    if (urlQuery.difficulty) qs.set("difficulty", urlQuery.difficulty);
    if (urlQuery.access) qs.set("access", urlQuery.access);
    if (urlQuery.topic) qs.set("topic", urlQuery.topic);
    if (urlQuery.channel) qs.set("channel", urlQuery.channel);
    if (urlQuery.sort) qs.set("sort", urlQuery.sort);
    if (urlQuery.limit) qs.set("limit", urlQuery.limit);
    if (urlQuery.offset) qs.set("offset", urlQuery.offset);

    const apiUrl = `/api/clips?${qs.toString()}`;

    setLoading(true);
    setErr("");
    fetch(apiUrl)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data?.error || `Request failed (${r.status})`);
        }
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch((e) => setErr(e.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, [router.isReady, urlQuery.difficulty, urlQuery.access, urlQuery.topic, urlQuery.channel, urlQuery.sort, urlQuery.limit, urlQuery.offset]);

  // ===== 操作：切换筛选时，offset 归零（更像 englishclips）=====
  function onToggleDifficulty(v) {
    const next = toggleValue(difficulty, v);
    setOffset(0);
    pushURL({ difficulty: toCSV(next), offset: "0" });
  }
  function onToggleAccess(v) {
    const next = toggleValue(access, v);
    setOffset(0);
    pushURL({ access: toCSV(next), offset: "0" });
  }
  function onToggleTopic(v) {
    const next = toggleValue(topic, v);
    setOffset(0);
    pushURL({ topic: toCSV(next), offset: "0" });
  }
  function onToggleChannel(v) {
    const next = toggleValue(channel, v);
    setOffset(0);
    pushURL({ channel: toCSV(next), offset: "0" });
  }
  function onChangeSort(v) {
    setOffset(0);
    pushURL({ sort: v, offset: "0" });
  }

  const pageInfo = useMemo(() => {
    const start = total === 0 ? 0 : offset + 1;
    const end = Math.min(offset + limit, total);
    return { start, end };
  }, [offset, limit, total]);

  function goPrev() {
    const nextOffset = Math.max(0, offset - limit);
    pushURL({ offset: String(nextOffset) });
  }
  function goNext() {
    const nextOffset = offset + limit;
    if (nextOffset >= total) return;
    pushURL({ offset: String(nextOffset) });
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h1 style={{ margin: "8px 0 6px" }}>视频库（接口式筛选测试版）</h1>
      <div style={{ color: "#666", marginBottom: 16 }}>
        勾选筛选会立刻请求 <code>/api/clips</code>，URL 可分享，刷新会保留筛选。
      </div>

      {/* 筛选栏 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 12, border: "1px solid #eee", borderRadius: 10, marginBottom: 16 }}>
        <FilterGroup
          title="难度（多选）"
          options={DIFFICULTY_OPTIONS}
          selected={difficulty}
          onToggle={onToggleDifficulty}
        />
        <FilterGroup
          title="权限（多选）"
          options={ACCESS_OPTIONS}
          selected={access}
          onToggle={onToggleAccess}
        />

        <FilterGroup
          title="Topic（多选，先用示例，后续改为真实 slug）"
          options={TOPIC_OPTIONS}
          selected={topic}
          onToggle={onToggleTopic}
        />
        <FilterGroup
          title="Channel（多选，先用示例，后续改为真实 slug）"
          options={CHANNEL_OPTIONS}
          selected={channel}
          onToggle={onToggleChannel}
        />

        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>排序</div>
            <select value={sort} onChange={(e) => onChangeSort(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}>
              <option value="newest">最新</option>
              <option value="oldest">最早</option>
            </select>
          </div>

          <button
            onClick={() => {
              setDifficulty([]);
              setAccess([]);
              setTopic([]);
              setChannel([]);
              setOffset(0);
              pushURL({ difficulty: undefined, access: undefined, topic: undefined, channel: undefined, sort: "newest", offset: "0" });
            }}
            style={{ marginTop: 22, padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "white", cursor: "pointer" }}
          >
            清空筛选
          </button>

          <div style={{ marginLeft: "auto", color: "#666", marginTop: 22 }}>
            {loading ? "加载中…" : `共 ${total} 条，当前 ${pageInfo.start}-${pageInfo.end}`}
          </div>
        </div>
      </div>

      {/* 状态 */}
      {err ? (
        <div style={{ padding: 12, borderRadius: 10, border: "1px solid #f5c2c7", background: "#fff5f5", color: "#b42318", marginBottom: 12 }}>
          请求失败：{err}
          <div style={{ marginTop: 6, color: "#666" }}>
            请打开浏览器 DevTools → Network → 找 <code>/api/clips</code> → 截图给我（Headers + Response）。
          </div>
        </div>
      ) : null}

      {/* 列表 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {items.map((it) => (
          <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden", background: "white" }}>
            <div style={{ aspectRatio: "16 / 9", background: "#f4f4f4" }}>
              {it.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.cover_url} alt={it.title || "cover"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
            </div>

            <div style={{ padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{it.title || "(无标题)"}</div>
              <div style={{ color: "#666", fontSize: 13, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span>难度：{it.difficulty_level || "-"}</span>
                <span>权限：{it.access_tier || "-"}</span>
                <span>时长：{it.duration_sec ? `${it.duration_sec}s` : "-"}</span>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                {it.video_url ? (
                  <a
                    href={it.video_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #ddd", textDecoration: "none", color: "#111" }}
                  >
                    打开视频
                  </a>
                ) : null}

                {/* 先用占位：以后我们做详情页 /clips/[id] 时再替换 */}
                <a
                  href={it.can_access ? `/clips/${it.id}` : "#"}
                  onClick={(e) => {
                    if (!it.can_access) {
                      e.preventDefault();
                      alert("会员专享：请登录并输入兑换码激活后访问");
                    }
                  }}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    textDecoration: "none",
                    color: it.can_access ? "#111" : "#999",
                  }}
                >
                  详情页（后续做）
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页 */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, margin: "18px 0 30px" }}>
        <button onClick={goPrev} disabled={offset === 0} style={btnStyle(offset === 0)}>
          上一页
        </button>
        <button onClick={goNext} disabled={offset + limit >= total} style={btnStyle(offset + limit >= total)}>
          下一页
        </button>
      </div>

      {/* 当前 URL 显示（便于你验证 URL 同步） */}
      <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
        当前查询参数：<code>{JSON.stringify(router.query)}</code>
      </div>
    </div>
  );
}

function FilterGroup({ title, options, selected, onToggle }) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {options.map((op) => {
          const checked = selected.includes(op.value);
          return (
            <label key={op.value} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={checked} onChange={() => onToggle(op.value)} />
              <span>{op.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function btnStyle(disabled) {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: disabled ? "#f6f6f6" : "white",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
