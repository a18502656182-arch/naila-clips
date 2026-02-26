"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ClipsGridClient({ initialItems, initialHasMore }) {
  const sp = useSearchParams();

  const [items, setItems] = useState(initialItems || []);
  const [hasMore, setHasMore] = useState(!!initialHasMore);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const inFlightRef = useRef(false);
  const reqVersionRef = useRef(0);
  const coolDownRef = useRef(false);

  // ✅ 新增：用户是否发生过滚动（像参考站一样，必须滚动才触发自动加载）
  const userScrolledRef = useRef(false);

  const queryKey = useMemo(() => sp.toString(), [sp]);

  useEffect(() => {
    const onScroll = () => {
      userScrolledRef.current = true;
      window.removeEventListener("scroll", onScroll, { passive: true });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll, { passive: true });
  }, []);

  async function loadMore() {
    if (!hasMore || loading) return;
    if (inFlightRef.current) return;
    if (coolDownRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setErr("");

    const myVersion = ++reqVersionRef.current;

    try {
      const offset = items.length;
      const url = `/rsc-api/clips?${queryKey}${queryKey ? "&" : ""}offset=${offset}`;

      const r = await fetch(url, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Load more failed");

      if (myVersion !== reqVersionRef.current) return;

      const newItems = data.items || [];
      setItems((prev) => prev.concat(newItems));
      setHasMore(!!data.has_more);

      coolDownRef.current = true;
      setTimeout(() => (coolDownRef.current = false), 450);
    } catch (e) {
      if (myVersion !== reqVersionRef.current) return;
      setErr(e?.message || "Load more failed");
    } finally {
      if (myVersion === reqVersionRef.current) {
        setLoading(false);
        inFlightRef.current = false;
      }
    }
  }

  const setSentinel = (el) => {
    if (!el) return;

    if (el.__io) {
      el.__io.disconnect();
      el.__io = null;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        // ✅ 关键：用户没滚动过，不允许自动加载
        if (!userScrolledRef.current) return;

        loadMore();
      },
      {
        root: null,
        // 这个可以保持较小，避免过早触发
        rootMargin: "120px 0px",
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

      <div ref={setSentinel} style={{ height: 1, marginTop: 1 }} />

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
