import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

/**
 * ✅ 横向筛选条（自动换行）
 * ✅ 勾选立即请求 /api/clips
 * ✅ URL 自动同步（可分享）
 * ✅ F5 刷新后从 URL 还原筛选状态
 */

function splitParam(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v.join(",");
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toggleInArray(arr, value) {
  const set = new Set(arr);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

export default function HomePage() {
  const router = useRouter();

  // taxonomies options
  const [tax, setTax] = useState({
    difficulties: [],
    topics: [],
    channels: [],
  });

  // filters
  const [difficulty, setDifficulty] = useState([]);
  const [topic, setTopic] = useState([]);
  const [channel, setChannel] = useState([]);
  const [access, setAccess] = useState([]); // free / vip
  const [sort, setSort] = useState("newest"); // newest / oldest

  // data
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // UI options
  const accessOptions = [
    { slug: "free", name: "免费" },
    { slug: "vip", name: "会员专享" },
  ];

  const blockStyle = {
    minWidth: 220,
    flex: "1 1 220px",
  };

  const checkboxRowStyle = {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 6,
  };

  // 1) 拉取 taxonomies
  useEffect(() => {
    fetch("/api/taxonomies")
      .then((r) => r.json())
      .then((d) => {
        setTax({
          difficulties: d?.difficulties || [],
          topics: d?.topics || [],
          channels: d?.channels || [],
        });
      })
      .catch(() => {
        // 不阻断页面
      });
  }, []);

  // 2) 路由 ready 后：从 URL 还原筛选（保证刷新不丢）
  useEffect(() => {
    if (!router.isReady) return;

    const q = router.query;
    setDifficulty(splitParam(q.difficulty));
    setTopic(splitParam(q.topic));
    setChannel(splitParam(q.channel));
    setAccess(splitParam(q.access));
    setSort(q.sort === "oldest" ? "oldest" : "newest");
  }, [router.isReady]);

  // 3) 生成请求 querystring
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (difficulty.length) p.set("difficulty", difficulty.join(","));
    if (topic.length) p.set("topic", topic.join(","));
    if (channel.length) p.set("channel", channel.join(","));
    if (access.length) p.set("access", access.join(","));
    if (sort) p.set("sort", sort);

    // 暂时固定：不分页（后面再加）
    p.set("limit", "50");
    p.set("offset", "0");

    return p.toString();
  }, [difficulty, topic, channel, access, sort]);

  // 4) 筛选变化：同步 URL + 请求 clips
  useEffect(() => {
    if (!router.isReady) return;

    // 4.1 同步 URL（shallow，不整页刷新）
    const nextQuery = {};
    if (difficulty.length) nextQuery.difficulty = difficulty.join(",");
    if (topic.length) nextQuery.topic = topic.join(",");
    if (channel.length) nextQuery.channel = channel.join(",");
    if (access.length) nextQuery.access = access.join(",");
    if (sort && sort !== "newest") nextQuery.sort = sort;

    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, {
      shallow: true,
    });

    // 4.2 拉取 clips
    setLoading(true);
    fetch(`/api/clips?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d?.items || []);
        setTotal(d?.total || 0);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [router.isReady, qs]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>视频库（接口式筛选测试版）</h1>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>
        {loading ? "加载中..." : `共 ${total} 条`}
      </div>

      {/* ✅ Filters（横向工具栏） */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,

          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        {/* sort */}
        <div style={blockStyle}>
          <b style={{ marginRight: 8 }}>排序</b>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">最新</option>
            <option value="oldest">最早</option>
          </select>
        </div>

        {/* difficulty */}
        <div style={blockStyle}>
          <b>难度（多选）</b>
          <div style={checkboxRowStyle}>
            {tax.difficulties.map((x) => (
              <label key={x.slug} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={difficulty.includes(x.slug)}
                  onChange={() =>
                    setDifficulty((prev) => toggleInArray(prev, x.slug))
                  }
                />{" "}
                {x.name || x.slug}
              </label>
            ))}
            {tax.difficulties.length === 0 && (
              <span style={{ opacity: 0.6 }}>
                （没有拿到 difficulty 选项，请检查 /api/taxonomies）
              </span>
            )}
          </div>
        </div>

        {/* access */}
        <div style={blockStyle}>
          <b>权限（多选）</b>
          <div style={checkboxRowStyle}>
            {accessOptions.map((x) => (
              <label key={x.slug} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={access.includes(x.slug)}
                  onChange={() => setAccess((prev) => toggleInArray(prev, x.slug))}
                />{" "}
                {x.name}
              </label>
            ))}
          </div>
        </div>

        {/* topic */}
        <div style={blockStyle}>
          <b>Topic（多选）</b>
          <div style={checkboxRowStyle}>
            {tax.topics.map((x) => (
              <label key={x.slug} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={topic.includes(x.slug)}
                  onChange={() => setTopic((prev) => toggleInArray(prev, x.slug))}
                />{" "}
                {x.name || x.slug}
              </label>
            ))}
            {tax.topics.length === 0 && (
              <span style={{ opacity: 0.6 }}>
                （没有 topic 选项，请检查 /api/taxonomies）
              </span>
            )}
          </div>
        </div>

        {/* channel */}
        <div style={blockStyle}>
          <b>Channel（多选）</b>
          <div style={checkboxRowStyle}>
            {tax.channels.map((x) => (
              <label key={x.slug} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={channel.includes(x.slug)}
                  onChange={() =>
                    setChannel((prev) => toggleInArray(prev, x.slug))
                  }
                />{" "}
                {x.name || x.slug}
              </label>
            ))}
            {tax.channels.length === 0 && (
              <span style={{ opacity: 0.6 }}>
                （没有 channel 选项，请检查 /api/taxonomies）
              </span>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {items.map((it) => (
          <div
            key={it.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {it.title || `Clip #${it.id}`}
            </div>

            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
              {it.access_tier} · {it.difficulty || "unknown"} ·{" "}
              {it.duration_sec ? `${it.duration_sec}s` : ""}
            </div>

            {it.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.cover_url}
                alt=""
                style={{ width: "100%", borderRadius: 10, marginBottom: 8 }}
              />
            ) : null}

            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
              Topics: {(it.topics || []).join(", ") || "-"}
              <br />
              Channels: {(it.channels || []).join(", ") || "-"}
            </div>

            {it.can_access ? (
              <a href={it.video_url} target="_blank" rel="noreferrer">
                播放视频
              </a>
            ) : (
              <div style={{ color: "#b00", fontSize: 12 }}>
                会员专享：请登录并兑换码激活
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && items.length === 0 ? (
        <div style={{ marginTop: 16, opacity: 0.7 }}>
          没有结果（请换筛选条件）
        </div>
      ) : null}

      <div style={{ marginTop: 18, fontSize: 12, opacity: 0.6 }}>
        当前 URL Query：{typeof window !== "undefined" ? window.location.search : ""}
      </div>
    </div>
  );
}
