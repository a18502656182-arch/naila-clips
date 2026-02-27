"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { THEME } from "./home/theme";

function formatDate(d) {
  if (!d) return "";
  return String(d).slice(0, 10);
}

function formatDuration(sec) {
  const s = Number(sec || 0);
  if (!Number.isFinite(s) || s <= 0) return "";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function isMp4(url) {
  if (!url) return false;
  const u = String(url).toLowerCase();
  return u.includes(".mp4");
}

function HoverMedia({ coverUrl, videoUrl, title }) {
  const [hover, setHover] = useState(false);
  const vref = useRef(null);

  useEffect(() => {
    const v = vref.current;
    if (!v) return;

    if (!hover) {
      try {
        v.pause();
        v.removeAttribute("src");
        v.load();
      } catch {}
      return;
    }

    if (!isMp4(videoUrl)) return;

    try {
      v.src = videoUrl;
      v.muted = true;
      v.playsInline = true;
      v.loop = true;
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {}
  }, [hover, videoUrl]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title || ""}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "rgba(11,18,32,0.06)" }} />
      )}

      <video
        ref={vref}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: hover && isMp4(videoUrl) ? "block" : "none",
        }}
        preload="none"
      />
    </div>
  );
}

export default function ClipsGridClient({ initialItems, initialHasMore, queryKey }) {
  const sp = useSearchParams();
  const clientQueryKey = useMemo(() => sp.toString(), [sp]);

  const [items, setItems] = useState(initialItems || []);
  const [hasMore, setHasMore] = useState(!!initialHasMore);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const inFlightRef = useRef(false);
  const reqVersionRef = useRef(0);
  const coolDownRef = useRef(false);

  const userScrolledRef = useRef(false);
  const autoFillOnceRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      userScrolledRef.current = true;
      window.removeEventListener("scroll", onScroll, { passive: true });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll, { passive: true });
  }, []);

  // ✅ 关键：筛选 URL 变化 → RSC 直出新 initialItems
  // 这里用 queryKey 作为重置触发点，防止旧列表残留。
  useEffect(() => {
    setItems(initialItems || []);
    setHasMore(!!initialHasMore);
    setLoading(false);
    setErr("");
    inFlightRef.current = false;
    coolDownRef.current = false;
    userScrolledRef.current = false;
    autoFillOnceRef.current = false;
    reqVersionRef.current += 1;
  }, [queryKey, initialItems, initialHasMore]);

  async function loadMore() {
    if (!hasMore || loading || inFlightRef.current || coolDownRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setErr("");

    const myVersion = ++reqVersionRef.current;

    try {
      const offset = items.length;
      const url = `/rsc-api/clips?${clientQueryKey}${clientQueryKey ? "&" : ""}offset=${offset}`;

      const r = await fetch(url, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Load more failed");

      if (myVersion !== reqVersionRef.current) return;

      setItems((prev) => prev.concat(data.items || []));
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

  // 自动补满一页（解决“页面不够高滑不动”）
  useEffect(() => {
    if (!hasMore || loading) return;
    if (autoFillOnceRef.current) return;

    const t = setTimeout(() => {
      const docH = document.documentElement.scrollHeight || 0;
      const winH = window.innerHeight || 0;

      if (docH <= winH + 120) {
        autoFillOnceRef.current = true;
        loadMore();
      }
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, hasMore, loading]);

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
        if (!userScrolledRef.current) return;
        loadMore();
      },
      { root: null, rootMargin: "140px 0px", threshold: 0.01 }
    );

    io.observe(el);
    el.__io = io;
  };

  return (
    <div>
      <style>{`
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .card { display: block; border-radius: ${THEME.radii.lg}px; border: 1px solid ${THEME.colors.border}; background: ${THEME.colors.surface}; box-shadow: ${THEME.colors.shadow}; overflow: hidden; text-decoration: none; color: inherit; transform: translateY(0); transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
        .card:hover { transform: translateY(-1px); box-shadow: ${THEME.colors.shadowHover}; border-color: ${THEME.colors.border2}; }
        .coverWrap { position: relative; width: 100%; height: 150px; background: rgba(11,18,32,0.06); overflow: hidden; }
        .pillRow { position: absolute; left: 10px; top: 10px; display: flex; gap: 8px; align-items: center; z-index: 2; }
        .pill { display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 999px; font-size: 12px; border: 1px solid ${THEME.colors.border}; background: rgba(255,255,255,0.72); color: ${THEME.colors.ink}; white-space: nowrap; }
        .pillFree { border-color: rgba(16,185,129,0.22); background: rgba(16,185,129,0.12); color:#065f46; }
        .pillVip { border-color: rgba(124,58,237,0.22); background: rgba(124,58,237,0.12); color:#5b21b6; }
        .pillDiff { border-color: rgba(245,158,11,0.22); background: rgba(245,158,11,0.14); color:#92400e; }
        .duration { position: absolute; right: 10px; bottom: 10px; z-index: 2; background: rgba(11,18,32,0.78); color: #fff; font-size: 12px; padding: 4px 6px; border-radius: 8px; }
        .body { padding: 12px; }
        .title { font-size: 15px; font-weight: 950; color: ${THEME.colors.ink}; line-height: 1.25; margin: 0 0 6px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .desc { font-size: 12.5px; color: ${THEME.colors.muted}; line-height: 1.5; margin: 0 0 10px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 38px; }
        .meta { font-size: 12px; color: ${THEME.colors.faint}; white-space: nowrap; }
        .foot { margin-top: 14px; display:flex; justify-content:center; gap:10px; flex-wrap:wrap; }
        .status { font-size: 13px; color: ${THEME.colors.faint}; padding: 10px 12px; border-radius: ${THEME.radii.md}px; border: 1px solid ${THEME.colors.border}; background: rgba(255,255,255,0.7); }
        .btn { padding: 9px 12px; border-radius: 999px; border: 1px solid ${THEME.colors.border2}; background: ${THEME.colors.surface}; cursor: pointer; color: ${THEME.colors.ink}; font-size: 13px; }
      `}</style>

      <div className="grid">
        {items.map((r) => {
          const isVip = r.access_tier === "vip";
          const duration = formatDuration(r.duration_sec);
          const dateStr = formatDate(r.created_at);

          return (
            <Link key={r.id} href={`/clips/${r.id}`} className="card">
              <div className="coverWrap">
                <HoverMedia coverUrl={r.cover_url} videoUrl={r.video_url} title={r.title} />

                <div className="pillRow">
                  <span className={`pill ${isVip ? "pillVip" : "pillFree"}`}>{isVip ? "会员" : "免费"}</span>
                  {r.difficulty ? <span className="pill pillDiff">{r.difficulty}</span> : null}
                </div>

                {duration ? <div className="duration">{duration}</div> : null}
              </div>

              <div className="body">
                <h3 className="title">{r.title || `Clip #${r.id}`}</h3>
                <p className="desc">{r.description || "打开视频，跟读字幕，沉浸式练听力和表达。"}</p>
                <div className="meta">{dateStr}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div ref={setSentinel} style={{ height: 1, marginTop: 1 }} />

      <div className="foot">
        {err ? <div className="status" style={{ color: "crimson" }}>{err}</div> : null}

        {hasMore ? (
          <>
            <div className="status">{loading ? "加载中..." : "继续下滑自动加载"}</div>
            <button className="btn" onClick={loadMore} disabled={loading}>
              {loading ? "加载中…" : "加载更多"}
            </button>
          </>
        ) : (
          <div className="status">没有更多了</div>
        )}
      </div>
    </div>
  );
}
