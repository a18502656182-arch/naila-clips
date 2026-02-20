import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

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

  const [tax, setTax] = useState({ difficulties: [], topics: [], channels: [] });

  // filters
  const [difficulty, setDifficulty] = useState([]);
  const [topic, setTopic] = useState([]);
  const [channel, setChannel] = useState([]);
  const [access, setAccess] = useState([]);
  const [sort, setSort] = useState("newest");

  // paging
  const PAGE_SIZE = 12;
  const [offset, setOffset] = useState(0);

  // data
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const accessOptions = [
    { slug: "free", name: "免费" },
    { slug: "vip", name: "会员专享" },
  ];

  const blockStyle = { minWidth: 220, flex: "1 1 220px" };
  const checkboxRowStyle = {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 6,
  };

  // 1) taxonomies
  useEffect(() => {
    fetch("/api/taxonomies")
      .then((r) => r.json())
      .then((d) =>
        setTax({
          difficulties: d?.difficulties || [],
          topics: d?.topics || [],
          channels: d?.channels || [],
        })
      )
      .catch(() => {});
  }, []);

  // 2) restore filters from URL (on first ready)
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    setDifficulty(splitParam(q.difficulty));
    setTopic(splitParam(q.topic));
    setChannel(splitParam(q.channel));
    setAccess(splitParam(q.access));
    setSort(q.sort === "oldest" ? "oldest" : "newest");
  }, [router.isReady]);

  // 3) build qs by filters + paging
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (difficulty.length) p.set("difficulty", difficulty.join(","));
    if (topic.length) p.set("topic", topic.join(","));
    if (channel.length) p.set("channel", channel.join(","));
    if (access.length) p.set("access", access.join(","));
    if (sort) p.set("sort", sort);

    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(offset));
    return p.toString();
  }, [difficulty, topic, channel, access, sort, offset]);

  // 4) when filters change -> reset offset + sync URL
  useEffect(() => {
    if (!router.isReady) return;

    // ✅ 只要筛选/排序变化，就回到第一页
    setOffset(0);
    setItems([]);
  }, [difficulty.join(","), topic.join(","), channel.join(","), access.join(","), sort, router.isReady]);

  // 5) sync URL (only filters) + fetch clips
  useEffect(() => {
    if (!router.isReady) return;

    // 5.1 sync URL (clean: no offset)
    const nextQuery = {};
    if (difficulty.length) nextQuery.difficulty = difficulty.join(",");
    if (topic.length) nextQuery.topic = topic.join(",");
    if (channel.length) nextQuery.channel = channel.join(",");
    if (access.length) nextQuery.access = access.join(",");
    if (sort && sort !== "newest") nextQuery.sort = sort;

    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, {
      shallow: true,
    });

    // 5.2 fetch
    const isFirstPage = offset === 0;
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

    fetch(`/api/clips?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        const newItems = d?.items || [];
        setTotal(d?.total || 0);
        setHasMore(Boolean(d?.has_more));

        setItems((prev) => (isFirstPage ? newItems : [...prev, ...newItems]));
      })
      .catch(() => {
        if (isFirstPage) {
          setItems([]);
          setTotal(0);
          setHasMore(false);
        }
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [router.isReady, qs]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>视频库（接口式筛选测试版）</h1>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>
        {loading ? "加载中..." : `共 ${total} 条（已显示 ${items.length} 条）`}
      </div>

      {/* Filters */}
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
        <div style={blockStyle}>
          <b style={{ marginRight: 8 }}>排序</b>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">最新</option>
            <option value="oldest">最早</option>
          </select>
        </div>

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
          </div>
        </div>

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
          </div>
        </div>

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
            style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}
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

      {/* Load more */}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        {loading ? null : hasMore ? (
          <button
            onClick={() => setOffset((x) => x + PAGE_SIZE)}
            disabled={loadingMore}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              cursor: "pointer",
              background: "white",
            }}
          >
            {loadingMore ? "加载中..." : "加载更多"}
          </button>
        ) : (
          <div style={{ opacity: 0.6, fontSize: 12 }}>没有更多了</div>
        )}
      </div>

      <div style={{ marginTop: 18, fontSize: 12, opacity: 0.6 }}>
        当前 URL Query：{typeof window !== "undefined" ? window.location.search : ""}
      </div>
    </div>
  );
}
