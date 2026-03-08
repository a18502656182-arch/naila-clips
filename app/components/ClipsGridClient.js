"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { THEME } from "./home/theme";
import { createSupabaseBrowserClient } from "../../utils/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

function getToken() {
  try {
    return localStorage.getItem("sb_access_token") || null;
  } catch {
    return null;
  }
}
function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers, credentials: "include" });
}

// 会员拦截弹窗
function VipModal({ me, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(11,18,32,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: THEME.colors.surface,
          borderRadius: THEME.radii.lg,
          border: `1px solid ${THEME.colors.border}`,
          boxShadow: "0 24px 60px rgba(11,18,32,0.18)",
          padding: 24,
          width: "100%",
          maxWidth: 380,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 22 }}>🔒</div>
          <div
            style={{
              fontWeight: 900,
              fontSize: 16,
              color: THEME.colors.ink,
            }}
          >
            会员专享视频
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: "auto",
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.md,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            关闭
          </button>
        </div>
        <div
          style={{
            fontSize: 13,
            color: THEME.colors.muted,
            lineHeight: 1.7,
            marginBottom: 18,
          }}
        >
          {me?.logged_in
            ? "该视频为会员专享，请输入兑换码开通会员后观看。"
            : "该视频为会员专享，请先登录，再使用兑换码开通会员。"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {me?.logged_in ? (
            <a
              href="/redeem"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 0",
                borderRadius: THEME.radii.pill,
                background: THEME.colors.vip,
                color: "#fff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              去兑换开通
            </a>
          ) : (
            <>
              <a
                href="/login"
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 0",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border2}`,
                  color: THEME.colors.ink,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                去登录
              </a>
              <a
                href="/register"
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 0",
                  borderRadius: THEME.radii.pill,
                  background: THEME.colors.vip,
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                注册并开通
              </a>
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

function isHls(url) {
  if (!url) return false;
  return String(url).toLowerCase().includes(".m3u8");
}

function isMp4(url) {
  if (!url) return false;
  return String(url).toLowerCase().includes(".mp4");
}

function isPlayable(url) {
  return isHls(url) || isMp4(url);
}

function isTouchDevice() {
  try { return window.matchMedia("(hover: none)").matches; } catch { return false; }
}

// 动态加载 hls.js（只加载一次）
let hlsJsPromise = null;
function loadHlsJs() {
  if (hlsJsPromise) return hlsJsPromise;
  hlsJsPromise = new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    if (window.Hls) return resolve(window.Hls);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js";
    script.onload = () => resolve(window.Hls || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return hlsJsPromise;
}

function HoverMedia({ coverUrl, videoUrl, title }) {
  const [hover, setHover] = useState(false);
  const vref = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const v = vref.current;
    if (!v) return;

    // 离开时：销毁 hls 实例，清空视频
    if (!hover) {
      try {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        v.pause();
        v.removeAttribute("src");
        v.load();
      } catch {}
      return;
    }

    if (!isPlayable(videoUrl)) return;

    v.muted = true;
    v.playsInline = true;
    v.loop = true;

    if (isHls(videoUrl)) {
      // HLS 流：用 hls.js 播放
      loadHlsJs().then((Hls) => {
        if (!Hls) {
          // 浏览器原生支持 HLS（Safari）
          if (v.canPlayType("application/vnd.apple.mpegurl")) {
            v.src = videoUrl;
            v.play().catch(() => {});
          }
          return;
        }
        if (!Hls.isSupported()) return;
        // 再次检查是否还在 hover（异步加载期间可能已离开）
        if (!vref.current) return;

        const hls = new Hls({
          enableWorker: false,
          lowLatencyMode: true,
          maxBufferLength: 8,
          maxMaxBufferLength: 15,
        });
        hlsRef.current = hls;
        hls.loadSource(videoUrl);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          v.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            hls.destroy();
            hlsRef.current = null;
          }
        });
      });
    } else {
      // 普通 mp4
      try {
        v.src = videoUrl;
        v.currentTime = 0;
        v.play().catch(() => {});
      } catch {}
    }

    return () => {
      // cleanup：组件卸载时销毁
      try {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      } catch {}
    };
  }, [hover, videoUrl]);

  const showVideo = hover && isPlayable(videoUrl);

  return (
    <div
      onMouseEnter={() => { if (!isTouchDevice()) setHover(true); }}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {/* 封面图：始终渲染，视频出现时淡出 */}
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={title || ""}
          fill
          style={{
            objectFit: "cover",
            transition: "opacity 200ms ease",
            opacity: showVideo ? 0 : 1,
          }}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "rgba(11,18,32,0.06)" }} />
      )}

      {/* 视频层：始终挂载，hover 时显示 */}
      <video
        ref={vref}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: showVideo ? 1 : 0,
          transition: "opacity 200ms ease",
          pointerEvents: "none",
        }}
        preload="none"
        muted
        playsInline
        loop
      />
    </div>
  );
}

// 未登录收藏弹窗
function LoginToBookmarkModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(11,18,32,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: THEME.colors.surface,
          borderRadius: THEME.radii.lg,
          border: `1px solid ${THEME.colors.border}`,
          boxShadow: "0 24px 60px rgba(11,18,32,0.18)",
          padding: 24,
          width: "100%",
          maxWidth: 380,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 22 }}>🤍</div>
          <div
            style={{
              fontWeight: 900,
              fontSize: 16,
              color: THEME.colors.ink,
            }}
          >
            收藏视频
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: "auto",
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.md,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            关闭
          </button>
        </div>
        <div
          style={{
            fontSize: 13,
            color: THEME.colors.muted,
            lineHeight: 1.7,
            marginBottom: 18,
          }}
        >
          请先登录，再收藏喜欢的视频。
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="/login"
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 0",
              borderRadius: THEME.radii.pill,
              border: `1px solid ${THEME.colors.border2}`,
              color: THEME.colors.ink,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            去登录
          </a>
          <a
            href="/register"
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 0",
              borderRadius: THEME.radii.pill,
              background: THEME.colors.ink,
              color: "#fff",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            去注册
          </a>
        </div>
      </div>
    </div>
  );
}

// 收藏按钮组件
function BookmarkBtn({ clipId, saved, loggedIn, onNeedLogin, onToggle }) {
  const [loading, setLoading] = useState(false);

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      onNeedLogin();
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const url = saved ? remote("/api/bookmarks_delete") : remote("/api/bookmarks_add");
      await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: clipId }),
      });
      onToggle(clipId);
    } catch {}
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={saved ? "取消收藏" : "收藏"}
      style={{
        position: "absolute",
        right: 10,
        top: 10,
        zIndex: 3,
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: `1px solid ${saved ? "rgba(239,68,68,0.3)" : THEME.colors.border}`,
        background: saved ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 16,
        backdropFilter: "blur(4px)",
        opacity: loading ? 0.6 : 1,
        transition: "all 150ms ease",
      }}
    >
      {saved ? "❤️" : "🤍"}
    </button>
  );
}

const PAGE_SIZE = 12;

export default function ClipsGridClient({ allItems, filters }) {
  // 当前显示条数（无限滚动通过增加这个数字实现）
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [loading, setLoading] = useState(false);
  const [err] = useState("");

  const [me, setMe] = useState(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [savedMap, setSavedMap] = useState({});

  // 封装：根据当前 token 拉取 me + bookmarks，登录/退出都调用
  function fetchMeAndBookmarks() {
    Promise.all([
      authFetch(remote("/api/me"), { cache: "no-store" }).then(r => r.json()).catch(() => ({ logged_in: false })),
      authFetch(remote("/api/bookmarks_list_ids"), { cache: "no-store" }).then(r => r.json()).catch(() => null),
    ]).then(([meData, bData]) => {
      setMe(meData);
      setMeLoaded(true);
      if (meData?.logged_in && bData?.clip_ids) {
        const map = {};
        bData.clip_ids.forEach((id) => { map[id] = true; });
        setSavedMap(map);
      } else {
        setSavedMap({});
      }
    });
  }

  useEffect(() => {
    fetchMeAndBookmarks();
    const supabase = createSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setMe({ logged_in: false });
        setMeLoaded(true);
        setSavedMap({});
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchMeAndBookmarks();
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSaved(clipId) {
    setSavedMap((prev) => ({ ...prev, [clipId]: !prev[clipId] }));
  }

  const [showVipModal, setShowVipModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ✅ 本地筛选：纯内存操作，无网络请求
  const filteredAll = useMemo(() => {
    let result = allItems || [];
    const f = filters || {};

    // access 筛选
    if (f.access?.length) {
      const expanded = new Set();
      f.access.forEach(a => {
        if (a === "member") { expanded.add("member"); expanded.add("vip"); }
        else expanded.add(a);
      });
      result = result.filter(r => expanded.has(r.access_tier));
    }
    // difficulty 筛选
    if (f.difficulty?.length) {
      result = result.filter(r => f.difficulty.includes(r.difficulty));
    }
    // topic 筛选（overlaps：视频的topics数组和筛选项有交集）
    if (f.topic?.length) {
      result = result.filter(r => (r.topics || []).some(t => f.topic.includes(t)));
    }
    // channel 筛选
    if (f.channel?.length) {
      result = result.filter(r => (r.channels || []).some(c => f.channel.includes(c)));
    }
    // sort
    if (f.sort === "oldest") {
      result = [...result].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    // newest 是默认顺序（SSR已按created_at desc排好）
    return result;
  }, [allItems, filters]);

  // 筛选条件变化时重置显示条数
  const prevFiltersRef = useRef(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevFiltersRef.current = JSON.stringify(filters);
      return;
    }
    const cur = JSON.stringify(filters);
    if (cur !== prevFiltersRef.current) {
      prevFiltersRef.current = cur;
      setVisibleCount(PAGE_SIZE);
    }
  }, [filters]);

  // 当前实际显示的条目
  const items = filteredAll.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAll.length;

  const userScrolledRef = useRef(false);
  const autoFillOnceRef = useRef(false);
  const coolDownRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      userScrolledRef.current = true;
      window.removeEventListener("scroll", onScroll, { passive: true });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll, { passive: true });
  }, []);

  function loadMore() {
    if (!hasMore || loading || coolDownRef.current) return;
    setLoading(true);
    coolDownRef.current = true;
    // 本地切片，用 setTimeout 模拟异步避免卡顿
    setTimeout(() => {
      setVisibleCount(v => v + PAGE_SIZE);
      setLoading(false);
      setTimeout(() => { coolDownRef.current = false; }, 450);
    }, 0);
  }

  // 自动补满一页
  useEffect(() => {
    if (!hasMore || loading) return;
    if (autoFillOnceRef.current) return;
    const t = setTimeout(() => {
      if (
        (document.documentElement.scrollHeight || 0) <=
        (window.innerHeight || 0) + 120
      ) {
        autoFillOnceRef.current = true;
        loadMore();
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, hasMore, loading]);

  // 自动补满后重置 autoFillOnce（筛选变了需要重新检查）
  useEffect(() => {
    autoFillOnceRef.current = false;
  }, [filters]);

  const setSentinel = (el) => {
    if (!el) return;
    if (el.__io) {
      el.__io.disconnect();
      el.__io = null;
    }
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
      {showLoginModal && (
        <LoginToBookmarkModal onClose={() => setShowLoginModal(false)} />
      )}

      <style>{`
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .card { display: block; border-radius: ${THEME.radii.lg}px; border: 1px solid ${THEME.colors.border}; background: ${THEME.colors.surface}; box-shadow: ${THEME.colors.shadow}; overflow: hidden; text-decoration: none; color: inherit; transform: translateY(0); transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
        .card:hover { transform: translateY(-1px); box-shadow: ${THEME.colors.shadowHover}; border-color: ${THEME.colors.border2}; }
        .coverWrap { position: relative; width: 100%; height: 150px; background: rgba(11,18,32,0.06); overflow: hidden; }
        .pillRow { position: absolute; left: 10px; top: 10px; display: flex; gap: 6px; align-items: center; z-index: 2; }
        .pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; font-size: 11px; border: 1px solid ${THEME.colors.border}; background: rgba(255,255,255,0.82); color: ${THEME.colors.ink}; white-space: nowrap; backdrop-filter: blur(4px); }
        .pillFree { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.15); color:#065f46; }
        .pillVip { border-color: rgba(124,58,237,0.3); background: rgba(124,58,237,0.15); color:#5b21b6; }
        .duration { position: absolute; right: 10px; bottom: 10px; z-index: 2; background: rgba(11,18,32,0.78); color: #fff; font-size: 12px; padding: 4px 6px; border-radius: 8px; }
        .body { padding: 12px; }
        .title { font-size: 15px; font-weight: 950; color: ${THEME.colors.ink}; line-height: 1.25; margin: 0 0 6px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .desc { font-size: 12.5px; color: ${THEME.colors.muted}; line-height: 1.5; margin: 0 0 10px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 38px; }
        .meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; color: ${THEME.colors.faint}; }
        .metaTag { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 999px; font-size: 11px; border: 1px solid ${THEME.colors.border}; background: ${THEME.colors.bg}; color: ${THEME.colors.faint}; white-space: nowrap; }
        .foot { margin-top: 14px; display:flex; justify-content:center; gap:10px; flex-wrap:wrap; }
        .status { font-size: 13px; color: ${THEME.colors.faint}; padding: 10px 12px; border-radius: ${THEME.radii.md}px; border: 1px solid ${THEME.colors.border}; background: rgba(255,255,255,0.7); }
        .btn { padding: 9px 12px; border-radius: 999px; border: 1px solid ${THEME.colors.border2}; background: ${THEME.colors.surface}; cursor: pointer; color: ${THEME.colors.ink}; font-size: 13px; }
        .loadingOverlay { opacity: 0.45; pointer-events: none; transition: opacity 150ms ease; }
      `}</style>

      <div>
        {items.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: THEME.colors.faint }}>
            没有符合条件的视频
          </div>
        ) : (
          <div className="grid">
            {items.map((r) => {
              const isVip = r.access_tier === "vip";
              const isBlocked = isVip && meLoaded && !me?.is_member && !r.can_access;
              const duration = formatDuration(r.duration_sec);
              const dateStr = formatDate(r.created_at);
              const cardContent = (
                <>
                  <div className="coverWrap">
                    <HoverMedia coverUrl={r.cover_url} videoUrl={r.video_url} title={r.title} />
                    <div className="pillRow">
                      <span className={`pill ${isVip ? "pillVip" : "pillFree"}`}>
                        {isVip ? "会员" : "免费"}
                      </span>
                    </div>
                    {duration ? <div className="duration">{duration}</div> : null}
                    <BookmarkBtn
                      clipId={r.id}
                      saved={!!savedMap[r.id]}
                      loggedIn={!!me?.logged_in}
                      onNeedLogin={() => setShowLoginModal(true)}
                      onToggle={toggleSaved}
                    />
                  </div>
                  <div className="body">
                    <h3 className="title">{r.title || `Clip #${r.id}`}</h3>
                    <p className="desc">
                      {r.description || "打开视频，跟读字幕，沉浸式练听力和表达。"}
                    </p>
                    <div className="meta">
                      {dateStr ? <span>{dateStr}</span> : null}
                      {r.difficulty ? <span className="metaTag">{r.difficulty}</span> : null}
                      {(r.topics || []).map((t) => (
                        <span key={t} className="metaTag">{t}</span>
                      ))}
                      {(r.channels || []).map((c) => (
                        <span key={c} className="metaTag">{c}</span>
                      ))}
                    </div>
                  </div>
                </>
              );
              return isBlocked ? (
                <Link key={r.id} href="/redeem" className="card">
                  {cardContent}
                </Link>
              ) : (
                <Link key={r.id} href={`/clips/${r.id}`} className="card">
                  {cardContent}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div ref={setSentinel} style={{ height: 1, marginTop: 1 }} />

      <div className="foot">
        {err ? (
          <div className="status" style={{ color: "crimson" }}>{err}</div>
        ) : null}
        {hasMore ? (
          <>
            <div className="status">{loading ? "加载中..." : "继续下滑自动加载"}</div>
            <button className="btn" onClick={loadMore} disabled={loading}>
              {loading ? "加载中…" : "加载更多"}
            </button>
          </>
        ) : items.length > 0 ? (
          <div className="status">没有更多了</div>
        ) : null}
      </div>
    </div>
  );
}
