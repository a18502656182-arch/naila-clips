"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { THEME } from "./home/theme";

function formatDate(d) {
  if (!d) return "";
  try {
    return String(d).slice(0, 10);
  } catch {
    return "";
  }
}

function formatDuration(sec) {
  const s = Number(sec || 0);
  if (!Number.isFinite(s) || s <= 0) return "";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function ClipsGridClient({ initialItems, initialHasMore }) {
  const sp = useSearchParams();

  const [items, setItems] = useState(initialItems || []);
  const [hasMore, setHasMore] = useState(!!initialHasMore);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const inFlightRef = useRef(false);
  const reqVersionRef = useRef(0);
  const coolDownRef = useRef(false);

  // ✅ 用户是否发生过滚动（必须滚动才触发自动加载）
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
        rootMargin: "140px 0px",
        threshold: 0.01,
      }
    );

    io.observe(el);
    el.__io = io;
  };

  return (
    <div>
      {/* 仅样式：产品化卡片 + hover 提升（不影响逻辑） */}
      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }

        .card {
          display: block;
          border-radius: ${THEME.radii.lg}px;
          border: 1px solid ${THEME.colors.border};
          background: ${THEME.colors.surface};
          box-shadow: ${THEME.colors.shadow};
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transform: translateY(0);
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }
        .card:hover {
          transform: translateY(-1px);
          box-shadow: ${THEME.colors.shadowHover};
          border-color: ${THEME.colors.border2};
        }

        .coverWrap {
          position: relative;
          width: 100%;
          height: 150px;
          background: rgba(11, 18, 32, 0.06);
          overflow: hidden;
        }
        .coverImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .coverPlaceholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.16), rgba(6, 182, 212, 0.12)),
            radial-gradient(600px 220px at 20% 0%, rgba(255, 255, 255, 0.55), transparent 55%),
            rgba(11, 18, 32, 0.06);
          position: relative;
        }
        .coverPlaceholder:before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(11, 18, 32, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(11, 18, 32, 0.08) 1px, transparent 1px);
          background-size: 22px 22px;
          opacity: 0.22;
          pointer-events: none;
        }

        .pillRow {
          position: absolute;
          left: 10px;
          top: 10px;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 12px;
          border: 1px solid ${THEME.colors.border};
          background: rgba(255, 255, 255, 0.72);
          color: ${THEME.colors.ink};
          white-space: nowrap;
        }
        .pillFree {
          border-color: rgba(16, 185, 129, 0.22);
          background: rgba(16, 185, 129, 0.12);
          color: #065f46;
        }
        .pillVip {
          border-color: rgba(124, 58, 237, 0.22);
          background: rgba(124, 58, 237, 0.12);
          color: #5b21b6;
        }
        .pillDiff {
          border-color: rgba(245, 158, 11, 0.22);
          background: rgba(245, 158, 11, 0.14);
          color: #92400e;
        }

        .bookmark {
          position: absolute;
          right: 10px;
          top: 10px;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid ${THEME.colors.border};
          background: rgba(255, 255, 255, 0.72);
          display: grid;
          place-items: center;
          color: ${THEME.colors.ink};
          font-size: 16px;
          user-select: none;
        }

        .duration {
          position: absolute;
          right: 10px;
          bottom: 10px;
          background: rgba(11, 18, 32, 0.78);
          color: #fff;
          font-size: 12px;
          padding: 4px 6px;
          border-radius: 8px;
          letter-spacing: 0.02em;
        }

        .body {
          padding: 12px;
        }

        .title {
          font-size: 15px;
          font-weight: 950;
          color: ${THEME.colors.ink};
          line-height: 1.25;
          margin: 0 0 6px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .desc {
          font-size: 12.5px;
          color: ${THEME.colors.muted};
          line-height: 1.5;
          margin: 0 0 10px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 38px;
        }

        .tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 12px;
          border: 1px solid ${THEME.colors.border};
          background: rgba(11, 18, 32, 0.04);
          color: ${THEME.colors.ink};
        }
        .tagInfo {
          border-color: rgba(79, 70, 229, 0.20);
          background: rgba(79, 70, 229, 0.12);
          color: #3730a3;
        }
        .tagCyan {
          border-color: rgba(6, 182, 212, 0.20);
          background: rgba(6, 182, 212, 0.12);
          color: #155e75;
        }

        .metaRow {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .meta {
          font-size: 12px;
          color: ${THEME.colors.faint};
          white-space: nowrap;
        }

        .foot {
          margin-top: 14px;
          display: flex;
          justify-content: center;
        }

        .status {
          font-size: 13px;
          color: ${THEME.colors.faint};
          padding: 10px 12px;
          border-radius: ${THEME.radii.md}px;
          border: 1px solid ${THEME.colors.border};
          background: rgba(255, 255, 255, 0.7);
        }

        .err {
          color: #b91c1c;
          padding: 10px 12px;
          border-radius: ${THEME.radii.md}px;
          border: 1px solid rgba(185, 28, 28, 0.18);
          background: rgba(185, 28, 28, 0.06);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid ${THEME.colors.border2};
          background: ${THEME.colors.surface};
          cursor: pointer;
          font-size: 13px;
          color: ${THEME.colors.ink};
        }
        .btn:hover {
          border-color: ${THEME.colors.border2};
          box-shadow: 0 10px 20px rgba(11, 18, 32, 0.10);
        }
      `}</style>

      <div className="grid">
        {items.map((r) => {
          const isVip = r.access_tier === "vip";
          const duration = formatDuration(r.duration_sec);
          const dateStr = formatDate(r.created_at);
          const topics = Array.isArray(r.topics) ? r.topics : [];
          const channels = Array.isArray(r.channels) ? r.channels : [];

          // 展示策略：最多 2 个 tag + 剩余计数（不改数据语义）
          const tagList = [];
          if (channels[0]) tagList.push({ k: `c-${channels[0]}`, t: channels[0], tone: "info" });
          if (topics[0]) tagList.push({ k: `t-${topics[0]}`, t: topics[0], tone: "cyan" });
          const remain = Math.max(0, (channels.length > 0 ? channels.length - 1 : 0) + (topics.length > 0 ? topics.length - 1 : 0));

          return (
            <Link key={r.id} href={`/clips/${r.id}`} className="card">
              <div className="coverWrap">
                {r.cover_url ? (
                  <img className="coverImg" src={r.cover_url} alt="" loading="lazy" />
                ) : (
                  <div className="coverPlaceholder" />
                )}

                <div className="pillRow">
                  <span className={`pill ${isVip ? "pillVip" : "pillFree"}`}>{isVip ? "会员" : "免费"}</span>
                  {r.difficulty ? <span className="pill pillDiff">{r.difficulty}</span> : null}
                </div>

                <div className="bookmark" title="收藏（实验线 UI 占位）" aria-label="bookmark">
                  ♡
                </div>

                {duration ? <div className="duration">{duration}</div> : null}
              </div>

              <div className="body">
                <h3 className="title">{r.title || `Clip #${r.id}`}</h3>
                <p className="desc">{r.description || "打开视频，跟读字幕，沉浸式练听力和表达。"}</p>

                <div className="tags">
                  {tagList.map((x) => (
                    <span key={x.k} className={`tag ${x.tone === "info" ? "tagInfo" : "tagCyan"}`}>
                      {x.t}
                    </span>
                  ))}
                  {remain > 0 ? <span className="tag">+{remain}</span> : null}
                </div>

                <div className="metaRow">
                  <div className="meta">{dateStr}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div ref={setSentinel} style={{ height: 1, marginTop: 1 }} />

      <div className="foot">
        {err ? (
          <div className="err">
            <span>{err}</span>
            <button onClick={loadMore} className="btn">
              重试
            </button>
          </div>
        ) : hasMore ? (
          <div className="status">{loading ? "加载中..." : "继续下滑自动加载"}</div>
        ) : (
          <div className="status">没有更多了</div>
        )}
      </div>
    </div>
  );
}
