// app/components/ClipsGridClient.js
"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ClipsGridClient({ initialItems, initialHasMore }) {
  const sp = useSearchParams();

  const [items, setItems] = useState(initialItems || []);
  const [hasMore, setHasMore] = useState(!!initialHasMore);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 用于 IntersectionObserver 的哨兵
  const sentinelRef = useRef(null);

  // 防止同一轮触发多次 loadMore
  const inFlightRef = useRef(false);

  const queryKey = useMemo(() => sp.toString(), [sp]);

  async function loadMore() {
    if (loading || !hasMore) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setErr("");

    try {
      const offset = items.length;

      // 继续走我们实验线的 /rsc-api/clips（不和 pages/api 冲突）
      const url = `/rsc-api/clips?${queryKey}${queryKey ? "&" : ""}offset=${offset}`;

      const r = await fetch(url, { cache: "no-store" });
      const data = await r.json();

      if (!r.ok) throw new Error(data?.error || "Load more failed");

      const newItems = data.items || [];
      setItems((prev) => prev.concat(newItems));
      setHasMore(!!data.has_more);
    } catch (e) {
      setErr(e?.message || "Load more failed");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  // IntersectionObserver：滚动接近底部时自动触发
  // 这里用 callback ref 的方式，避免 useEffect 依赖复杂
  const setSentinel = (el) => {
    sentinelRef.current = el;

    if (!el) return;

    // 每次渲染都会调用一次，先断开旧 observer
    if (el.__io) {
      el.__io.disconnect();
      el.__io = null;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first) return;
        if (first.isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        // 提前一点触发（更像参考站“无感加载”）
        rootMargin: "600px 0px",
        threshold: 0.01,
      }
    );

    io.observe(el);
    el.__io = io;
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {items.map((r) => (
          <Link
            key={r.id}
            href={`/clips/${r.id}`}
            style={{
              display: "block",
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              {r.access_tier === "free" ? "免费" : "会员"}
              {r.difficulty ? ` · ${r.difficulty}` : ""}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              {r.title || `Clip #${r.id}`}
            </div>
            {r.cover_url ? (
              <img
                src={r.cover_url}
                alt=""
                style={{ width: "100%", borderRadius: 10 }}
                loading="lazy"
              />
            ) : (
              <div style={{ height: 120, background: "#f3f3f3", borderRadius: 10 }} />
            )}
          </Link>
        ))}
      </div>

      {/* 哨兵：滚动到这里附近会自动 loadMore */}
      <div
        ref={setSentinel}
        style={{
          height: 1,
          marginTop: 1,
        }}
      />

      <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
        {err ? (
          <div style={{ color: "crimson", padding: 10 }}>
            {err}{" "}
            <button
              onClick={loadMore}
              style={{
                marginLeft: 8,
                padding: "6px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              重试
            </button>
          </div>
        ) : hasMore ? (
          <div style={{ opacity: 0.7, padding: 10 }}>
            {loading ? "加载中..." : "继续下滑自动加载"}
          </div>
        ) : (
          <div style={{ opacity: 0.6, padding: 10 }}>没有更多了</div>
        )}
      </div>
    </div>
  );
}
