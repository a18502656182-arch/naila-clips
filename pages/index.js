import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

/**
 * ✅ 全站筛选：多选下拉 dropdown（电脑/手机统一）
 * ✅ 响应式布局：
 *    - 手机默认两列（更像参考站）
 *    - 电脑端（>=1024px）强制 5 列一整行
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

function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    function handler(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, onOutside]);
}

function MultiSelectDropdown({
  label,
  placeholder = "请选择",
  options,
  value,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useOutsideClick(wrapRef, () => setOpen(false));

  const selected = useMemo(() => new Set(value || []), [value]);

  const selectedLabels = useMemo(() => {
    if (!value?.length) return "";
    const map = new Map(options.map((o) => [o.slug, o.name || o.slug]));
    return value.map((v) => map.get(v) || v).join("、");
  }, [value, options]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
        {label}
      </div>

      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #e5e5e5",
          background: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {value?.length ? (
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {selectedLabels}
            </div>
          ) : (
            <div style={{ fontSize: 13, opacity: 0.6 }}>{placeholder}</div>
          )}
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
            已选 {value?.length || 0} 项
          </div>
        </div>
        <div style={{ opacity: 0.6, flex: "0 0 auto" }}>
          {open ? "▲" : "▼"}
        </div>
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            left: 0,
            right: 0,
            marginTop: 8,
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            background: "white",
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            padding: 10,
            maxHeight: 260,
            overflow: "auto",
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => onChange([])}
              style={{
                border: "1px solid #eee",
                background: "white",
                borderRadius: 10,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              清空
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                marginLeft: "auto",
                border: "1px solid #eee",
                background: "white",
                borderRadius: 10,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              完成
            </button>
          </div>

          {options?.length ? (
            options.map((o) => (
              <label
                key={o.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 8px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(o.slug)}
                  onChange={() => onChange(toggleInArray(value || [], o.slug))}
                />
                <div style={{ fontSize: 13 }}>{o.name || o.slug}</div>
              </label>
            ))
          ) : (
            <div style={{ fontSize: 12, opacity: 0.6, padding: 6 }}>
              暂无选项（请检查 /api/taxonomies）
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SingleSelectDropdown({ label, value, onChange, options }) {
  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #e5e5e5",
          background: "white",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

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

  const accessOptions = useMemo(
    () => [
      { slug: "free", name: "免费" },
      { slug: "vip", name: "会员专享" },
    ],
    []
  );

  // 1) 拉 taxonomies
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
      .catch(() => {});
  }, []);

  // 2) 从 URL 还原筛选（刷新不丢）
  useEffect(() => {
    if (!router.isReady) return;

    const q = router.query;
    setDifficulty(splitParam(q.difficulty));
    setTopic(splitParam(q.topic));
    setChannel(splitParam(q.channel));
    setAccess(splitParam(q.access));
    setSort(q.sort === "oldest" ? "oldest" : "newest");
  }, [router.isReady]);

  // 3) 生成请求 qs
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (difficulty.length) p.set("difficulty", difficulty.join(","));
    if (topic.length) p.set("topic", topic.join(","));
    if (channel.length) p.set("channel", channel.join(","));
    if (access.length) p.set("access", access.join(","));
    if (sort) p.set("sort", sort);

    p.set("limit", "50");
    p.set("offset", "0");
    return p.toString();
  }, [difficulty, topic, channel, access, sort]);

  // 4) 同步 URL + 请求 clips
  useEffect(() => {
    if (!router.isReady) return;

    const nextQuery = {};
    if (difficulty.length) nextQuery.difficulty = difficulty.join(",");
    if (topic.length) nextQuery.topic = topic.join(",");
    if (channel.length) nextQuery.channel = channel.join(",");
    if (access.length) nextQuery.access = access.join(",");
    if (sort && sort !== "newest") nextQuery.sort = sort;

    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, {
      shallow: true,
    });

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

      {/* ✅ 响应式：电脑 5 列一行（不再强制手机 1 列） */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .filterGrid {
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          }
        }
      `}</style>

      {/* ✅ 筛选区（全下拉风格） */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 14,
          padding: 12,
          marginBottom: 16,
          background: "white",
        }}
      >
        <div
          className="filterGrid"
          style={{
            display: "grid",
            gap: 12,

            // ✅ 手机默认两列（每列最小 140px，更稳）
            gridTemplateColumns: "repeat(2, minmax(140px, 1fr))",
          }}
        >
          <SingleSelectDropdown
            label="排序"
            value={sort}
            onChange={setSort}
            options={[
              { value: "newest", label: "最新" },
              { value: "oldest", label: "最早" },
            ]}
          />

          <MultiSelectDropdown
            label="难度（多选）"
            placeholder="选择难度"
            options={tax.difficulties}
            value={difficulty}
            onChange={setDifficulty}
          />

          <MultiSelectDropdown
            label="权限（多选）"
            placeholder="选择权限"
            options={accessOptions}
            value={access}
            onChange={setAccess}
          />

          <MultiSelectDropdown
            label="Topic（多选）"
            placeholder="选择 Topic"
            options={tax.topics}
            value={topic}
            onChange={setTopic}
          />

          <MultiSelectDropdown
            label="Channel（多选）"
            placeholder="选择 Channel"
            options={tax.channels}
            value={channel}
            onChange={setChannel}
          />
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setDifficulty([]);
              setTopic([]);
              setChannel([]);
              setAccess([]);
              setSort("newest");
            }}
            style={{
              border: "1px solid #eee",
              background: "white",
              borderRadius: 12,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            一键清空所有筛选
          </button>

          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>
            {typeof window !== "undefined" ? window.location.search : ""}
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
              borderRadius: 14,
              padding: 12,
              background: "white",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
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
                style={{ width: "100%", borderRadius: 12, marginBottom: 8 }}
              />
            ) : null}

            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
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
    </div>
  );
}
