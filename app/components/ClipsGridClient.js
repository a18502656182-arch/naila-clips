"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function getToken() { try { return localStorage.getItem("sb_access_token") || null; } catch { return null; } }
function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}
import { THEME } from "./home/theme";

// 会员拦截弹窗
function VipModal({ me, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(11,18,32,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: THEME.colors.surface, borderRadius: THEME.radii.lg,
        border: `1px solid ${THEME.colors.border}`, boxShadow: "0 24px 60px rgba(11,18,32,0.18)",
        padding: 24, width: "100%", maxWidth: 380,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 22 }}>🔒</div>
          <div style={{ fontWeight: 900, fontSize: 16, color: THEME.colors.ink }}>会员专享视频</div>
          <button type="button" onClick={onClose} style={{
            marginLeft: "auto", border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface, borderRadius: THEME.radii.md,
            padding: "6px 12px", cursor: "pointer", fontSize: 12,
          }}>关闭</button>
        </div>
        <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.7, marginBottom: 18 }}>
          {me?.logged_in
            ? "该视频为会员专享，请输入兑换码开通会员后观看。"
            : "该视频为会员专享，请先登录，再使用兑换码开通会员。"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {me?.logged_in ? (
            <a href="/register" style={{
              flex: 1, textAlign: "center", padding: "10px 0",
              borderRadius: THEME.radii.pill, background: THEME.colors.vip,
              color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700,
            }}>去兑换开通</a>
          ) : (
            <>
              <a href="/login" style={{
                flex: 1, textAlign: "center", padding: "10px 0",
                borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border2}`,
                color: THEME.colors.ink, textDecoration: "none", fontSize: 13, fontWeight: 600,
              }}>去登录</a>
              <a href="/register" style={{
                flex: 1, textAlign: "center", padding: "10px 0",
                borderRadius: THEME.radii.pill, background: THEME.colors.vip,
                color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700,
              }}>注册并开通</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
  return String(url).toLowerCase().includes(".mp4");
}

function HoverMedia({ coverUrl, videoUrl, title }) {
  const [hover, setHover] = useState(false);
  const vref = useRef(null);

  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    if (!hover) {
      try { v.pause(); v.removeAttribute("src"); v.load(); } catch {}
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
        <img src={coverUrl} alt={title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "rgba(11,18,32,0.06)" }} />
      )}
      <video
        ref={vref}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", display: hover && isMp4(videoUrl) ? "block" : "none",
        }}
        preload="none"
      />
    </div>
  );
}

// 未登录收藏弹窗
function LoginToBookmarkModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(11,18,32,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: THEME.colors.surface, borderRadius: THEME.radii.lg,
        border: `1px solid ${THEME.colors.border}`, boxShadow: "0 24px 60px rgba(11,18,32,0.18)",
        padding: 24, width: "100%", maxWidth: 380,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 22 }}>🤍</div>
          <div style={{ fontWeight: 900, fontSize: 16, color: THEME.colors.ink }}>收藏视频</div>
          <button type="button" onClick={onClose} style={{
            marginLeft: "auto", border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface, borderRadius: THEME.radii.md,
            padding: "6px 12px", cursor: "pointer", fontSize: 12,
          }}>关闭</button>
        </div>
        <div style={{ fontSize: 13, color: THEME.colors.muted, lineHeight: 1.7, marginBottom: 18 }}>
          请先登录，再收藏喜欢的视频。
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/login" style={{
            flex: 1, textAlign: "center", padding: "10px 0",
            borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border2}`,
            color: THEME.colors.ink, textDecoration: "none", fontSize: 13, fontWeight: 600,
          }}>去登录</a>
          <a href="/register" style={{
            flex: 1, textAlign: "center", padding: "10px 0",
            borderRadius: THEME.radii.pill, background: THEME.colors.ink,
            color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700,
          }}>去注册</a>
        </div>
      </div>
    </div>
  );
}

// 收藏按钮组件 — saved 状态由父组件统一管理，不单独发请求
function BookmarkBtn({ clipId, saved, loggedIn, onNeedLogin, onToggle }) {
  const [loading, setLoading] = useState(false);

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) { onNeedLogin(); return; }
    if (loading) return;
    setLoading(true);
    try {
      const url = saved ? "/api/bookmarks_delete" : "/api/bookmarks_add";
      await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: clipId }),
      });
      onToggle(clipId); // 通知父组件更新
    } catch {}
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={saved ? "取消收藏" : "收藏"}
      style={{
        position: "absolute", right: 10, top: 10, zIndex: 3,
        width: 32, height: 32, borderRadius: "50%",
        border: `1px solid ${saved ? "rgba(239,68,68,0.3)" : THEME.colors.border}`,
        background: saved ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.82)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: 16,
        backdropFilter: "blur(4px)",
        opacity: loading ? 0.6 : 1,
        transition: "all 150ms ease",
      }}
    >
      {saved ? "❤️" : "🤍"}
    </button>
  );
}

export default function ClipsGridClient({ initialItems, initialHasMore, filters }) {
  const [items, setItems] = useState(initialItems || []);
  const [hasMore, setHasMore] = useState(!!initialHasMore);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 登录状态（用于弹窗判断 & 收藏按钮）
  const [me, setMe] = useState(null);
  // ✅ 批量收藏状态：{ clipId: true/false }
  const [savedMap, setSavedMap] = useState({});

  useEffect(() => {
    authFetch("/api/me", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        setMe(data);
        // 登录后一次性批量查所有收藏状态
        if (data?.logged_in) {
          authFetch("/api/bookmarks_list_ids", { cache: "no-store" })
            .then(r => r.json())
            .then(d => {
              const map = {};
              (d?.clip_ids || []).forEach(id => { map[id] = true; });
              setSavedMap(map);
            })
            .catch(() => {});
        }
      })
      .catch(() => setMe({ logged_in: false }));
  }, []);

  // items 加载更多后，新 item 默认 false（已在 savedMap 里的保持不变）
  function toggleSaved(clipId) {
    setSavedMap(prev => ({ ...prev, [clipId]: !prev[clipId] }));
  }

  // 会员弹窗
  const [showVipModal, setShowVipModal] = useState(false);
  // 未登录收藏弹窗
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ✅ 优先用 me.is_member 判断，避免首页缓存数据缺少 can_access 的问题
  function handleCardClick(e, item) {
    if (item.access_tier !== "vip") return;
    if (me?.is_member) return;
    if (item.can_access) return;
    e.preventDefault();
    e.stopPropagation();
    setShowVipModal(true);
  }

  const inFlightRef = useRef(false);
  const reqVersionRef = useRef(0);
  const coolDownRef = useRef(false);
  const userScrolledRef = useRef(false);
  const autoFillOnceRef = useRef(false);
  const isFirstRender = useRef(true);

  // filters 变化时重新从头加载
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    reqVersionRef.current += 1;
    const myVersion = reqVersionRef.current;

    setItems([]);
    setHasMore(false);
    setLoading(true);
    setErr("");
    inFlightRef.current = false;
    coolDownRef.current = false;
    userScrolledRef.current = false;
    autoFillOnceRef.current = false;

    const qs = buildQS(filters, 0);
    fetch(`/rsc-api/clips?${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (myVersion !== reqVersionRef.current) return;
        setItems(data.items || []);
        setHasMore(!!data.has_more);
      })
      .catch((e) => {
        if (myVersion !== reqVersionRef.current) return;
        setErr(e?.message || "加载失败");
      })
      .finally(() => {
        if (myVersion === reqVersionRef.current) setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    const onScroll = () => {
      userScrolledRef.current = true;
      window.removeEventListener("scroll", onScroll, { passive: true });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll, { passive: true });
  }, []);

  function buildQS(f, offset) {
    const p = new URLSearchParams();
    if (f?.sort) p.set("sort", f.sort);
    if (f?.access?.length) f.access.forEach((v) => p.append("access", v));
    if (f?.difficulty?.length) f.difficulty.forEach((v) => p.append("difficulty", v));
    if (f?.topic?.length) f.topic.forEach((v) => p.append("topic", v));
    if (f?.channel?.length) f.channel.forEach((v) => p.append("channel", v));
    p.set("offset", String(offset));
    return p.toString();
  }

  async function loadMore() {
    if (!hasMore || loading || inFlightRef.current || coolDownRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setErr("");

    const myVersion = ++reqVersionRef.current;

    try {
      const qs = buildQS(filters, items.length);
      const r = await fetch(`/rsc-api/clips?${qs}`, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Load more failed");
      if (myVersion !== reqVersionRef.current) return;

      setItems((prev) => prev.concat(data.items || []));
      setHasMore(!!data.has_more);

      coolDownRef.current = true;
      setTimeout(() => (coolDownRef.current = false), 450);
    } catch (e) {
      if (myVersion !== reqVersionRef.current) return;
      setErr(e?.message || "加载失败");
    } finally {
      if (myVersion === reqVersionRef.current) {
        setLoading(false);
        inFlightRef.current = false;
      }
    }
  }

  // 自动补满一页
  useEffect(() => {
    if (!hasMore || loading) return;
    if (autoFillOnceRef.current) return;
    const t = setTimeout(() => {
      if ((document.documentElement.scrollHeight || 0) <= (window.innerHeight || 0) + 120) {
        autoFillOnceRef.current = true;
        loadMore();
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, hasMore, loading]);

  const setSentinel = (el) => {
    if (!el) return;
    if (el.__io) { el.__io.disconnect(); el.__io = null; }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
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
      {showVipModal && <VipModal me={me} onClose={() => setShowVipModal(false)} />}
      {showLoginModal && <LoginToBookmarkModal onClose={() => setShowLoginModal(false)} />}
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

      {loading && items.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: THEME.colors.faint }}>加载中...</div>
      ) : (
        <div className="grid">
          {items.map((r) => {
            const isVip = r.access_tier === "vip";
            const duration = formatDuration(r.duration_sec);
            const dateStr = formatDate(r.created_at);
            return (
              <Link key={r.id} href={`/clips/${r.id}`} className="card" onClick={e => handleCardClick(e, r)}>
                <div className="coverWrap">
                  <HoverMedia coverUrl={r.cover_url} videoUrl={r.video_url} title={r.title} />
                  <div className="pillRow">
                    <span className={`pill ${isVip ? "pillVip" : "pillFree"}`}>{isVip ? "会员" : "免费"}</span>
                    {r.difficulty ? <span className="pill pillDiff">{r.difficulty}</span> : null}
                  </div>
                  {duration ? <div className="duration">{duration}</div> : null}
                  {/* ❤️ 收藏按钮 — 右上角 */}
                  <BookmarkBtn clipId={r.id} saved={!!savedMap[r.id]} loggedIn={!!me?.logged_in} onNeedLogin={() => setShowLoginModal(true)} onToggle={toggleSaved} />
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
      )}

      <div ref={setSentinel} style={{ height: 1, marginTop: 1 }} />

      <div className="foot">
        {err ? <div className="status" style={{ color: "crimson" }}>{err}</div> : null}
        {hasMore ? (
          <>
            <div className="status">{loading ? "加载中..." : "继续下滑自动加载"}</div>
            <button className="btn" onClick={loadMore} disabled={loading}>{loading ? "加载中…" : "加载更多"}</button>
          </>
        ) : items.length > 0 ? (
          <div className="status">没有更多了</div>
        ) : null}
      </div>
    </div>
  );
}
