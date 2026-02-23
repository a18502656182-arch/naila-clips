// pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import HoverPreview from "../components/HoverPreview";

/**
 * 首页（成品风格版）
 * - 不改功能：筛选/无限滚动/收藏/登录弹窗/会员弹窗/右上角菜单 都保留
 * - 改 UI：背景更丰富、卡片更大、标签更美观、去掉 Topics/Channels 文本行
 * - 顶部条不 sticky
 * - 加一个固定“推荐示例视频”：单独请求不带筛选参数，不参与筛选
 * - 去掉“复制分享链接”按钮
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

function MultiSelectDropdown({ label, placeholder = "请选择", options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useOutsideClick(wrapRef, () => setOpen(false));

  const selected = useMemo(() => new Set(value || []), [value]);

  const selectedLabels = useMemo(() => {
    if (!value?.length) return "";
    const map = new Map((options || []).map((o) => [o.slug, o.name || o.slug]));
    return value.map((v) => map.get(v) || v).join("、");
  }, [value, options]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div className="fLabel">{label}</div>

      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="fBtn"
        style={{ justifyContent: "space-between" }}
      >
        <div className="fBtnText">{selectedLabels || <span style={{ opacity: 0.55 }}>{placeholder}</span>}</div>
        <div style={{ opacity: 0.65 }}>{open ? "▲" : "▼"}</div>
      </button>

      {open ? (
        <div className="fPanel">
          <div style={{ padding: 8, borderBottom: "1px solid #eee", display: "flex", gap: 8 }}>
            <button type="button" className="miniBtn" onClick={() => onChange([])} style={{ background: "white" }}>
              清空
            </button>
            <button
              type="button"
              className="miniBtn"
              onClick={() => onChange((options || []).map((o) => o.slug))}
              style={{ background: "white" }}
            >
              全选
            </button>
            <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>
              {value?.length || 0}/{options?.length || 0}
            </div>
          </div>

          <div style={{ maxHeight: 280, overflow: "auto", padding: 8 }}>
            {(options || []).map((opt) => {
              const checked = selected.has(opt.slug);
              return (
                <label
                  key={opt.slug}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "10px 10px",
                    borderRadius: 12,
                    cursor: "pointer",
                    alignItems: "center",
                    background: checked ? "rgba(99,102,241,0.08)" : "transparent",
                    border: checked ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(toggleInArray(value || [], opt.slug))}
                  />
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{opt.name || opt.slug}</div>
                  {typeof opt.count === "number" ? (
                    <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.65 }}>{opt.count}</div>
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SingleSelectDropdown({ label, options, value, onChange }) {
  return (
    <div>
      <div className="fLabel">{label}</div>
      <select className="fSelect" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** 彩色标签（更丰富） */
function Tag({ children, tone = "gray", size = "md" }) {
  const map = {
    gray: { bg: "rgba(17,24,39,0.06)", bd: "rgba(17,24,39,0.10)", tx: "rgba(17,24,39,0.92)" },
    vip: { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.25)", tx: "rgba(185,28,28,0.95)" },
    free: { bg: "rgba(59,130,246,0.10)", bd: "rgba(59,130,246,0.25)", tx: "rgba(29,78,216,0.95)" },

    diff: { bg: "rgba(245,158,11,0.14)", bd: "rgba(245,158,11,0.28)", tx: "rgba(146,64,14,0.95)" },
    dur: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.26)", tx: "rgba(4,120,87,0.95)" },

    topic: { bg: "rgba(168,85,247,0.12)", bd: "rgba(168,85,247,0.26)", tx: "rgba(107,33,168,0.95)" },
    channel: { bg: "rgba(6,182,212,0.12)", bd: "rgba(6,182,212,0.26)", tx: "rgba(14,116,144,0.95)" },
  };
  const s = map[tone] || map.gray;
  const pad = size === "sm" ? "4px 9px" : "5px 10px";
  const fs = size === "sm" ? 11 : 12;

  return (
    <span
      className="tag"
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: pad,
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 900,
        background: s.bg,
        border: `1px solid ${s.bd}`,
        color: s.tx,
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

/** 右上角用户菜单 */
function UserMenu({ me, onLogout }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  useOutsideClick(wrapRef, () => setOpen(false));

  if (!me?.logged_in) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <a className="topBtn" href="/login">
          登录
        </a>
        <a className="topBtn dark" href="/register">
          注册
        </a>
      </div>
    );
  }

  const email = me?.email || "";
  const initial = (email.trim()[0] || "U").toUpperCase();

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="avatarBtn"
        onClick={() => setOpen((v) => !v)}
        title={email || "账号"}
      >
        <span className="avatarCircle">{initial}</span>
        <span className="caret">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="menuPanel">
          <div className="menuHead">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="avatarCircle big">{initial}</span>
              <div style={{ minWidth: 0 }}>
                <div className="menuEmail">{email || "（无邮箱）"}</div>
                <div style={{ marginTop: 2, fontSize: 12, opacity: 0.75 }}>
                  {me?.is_member ? "会员" : "非会员"}
                </div>
              </div>
            </div>
          </div>

          <div className="menuBody">
            <a className="menuItem" href="/bookmarks" onClick={() => setOpen(false)}>
              ❤️ 视频收藏
            </a>

            <button
              type="button"
              className="menuItem danger"
              onClick={() => {
                setOpen(false);
                onLogout?.();
              }}
            >
              退出
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HowToCard({ step, title, desc }) {
  return (
    <div className="howCard">
      <div className="howNum">{step}</div>
      <div style={{ minWidth: 0 }}>
        <div className="howTitle">{title}</div>
        <div className="howDesc">{desc}</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

  const [tax, setTax] = useState({ difficulties: [], topics: [], channels: [] });

  // filters
  const [difficulty, setDifficulty] = useState([]);
  const [topic, setTopic] = useState([]);
  const [channel, setChannel] = useState([]);
  const [access, setAccess] = useState([]); // free / vip
  const [sort, setSort] = useState("newest"); // newest / oldest

  // paging
  const PAGE_SIZE = 12;
  const [offset, setOffset] = useState(0);

  // data
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchingRef = useRef(false);
  const sentinelRef = useRef(null);

  const accessOptions = useMemo(
    () => [
      { slug: "free", name: "免费" },
      { slug: "vip", name: "会员专享" },
    ],
    []
  );

  // -------- 登录状态 & 收藏 --------
  const [me, setMe] = useState({ loading: true, logged_in: false, is_member: false, email: null });
  const [bookmarkIds, setBookmarkIds] = useState(() => new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkBusyId, setBookmarkBusyId] = useState(null);

  const [toast, setToast] = useState("");
  const [clipsReloadKey, setClipsReloadKey] = useState(0);

  // 弹窗：未登录（收藏/会员卡片共用）
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [pendingReason, setPendingReason] = useState("bookmark"); // bookmark | vip

  // 弹窗：已登录但非会员点会员卡
  const [showVipModal, setShowVipModal] = useState(false);
  const [pendingVipClipId, setPendingVipClipId] = useState(null);

  // 固定推荐示例视频（不参与筛选）
  const [featured, setFeatured] = useState(null);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  function showToast(s) {
    setToast(s);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2500);
  }

  async function loadMe() {
    try {
      setMe((x) => ({ ...x, loading: true }));
      const d = await fetchJson("/api/me");
      setMe({
        loading: false,
        logged_in: !!d?.logged_in,
        is_member: !!d?.is_member,
        email: d?.email || null,
      });
      return d;
    } catch {
      setMe({ loading: false, logged_in: false, is_member: false, email: null });
      return null;
    }
  }

  async function loadBookmarks() {
    if (!me.logged_in) {
      setBookmarkIds(new Set());
      return;
    }
    try {
      setBookmarkLoading(true);
      const d = await fetchJson("/api/bookmarks?limit=500&offset=0");
      const ids = new Set((d?.items || []).map((x) => x.clip_id));
      setBookmarkIds(ids);
    } catch (e) {
      showToast("拉收藏失败：" + e.message);
    } finally {
      setBookmarkLoading(false);
    }
  }

  async function toggleBookmark(clipId) {
    if (!clipId) return;

    if (!me.logged_in) {
      setPendingId(clipId);
      setPendingReason("bookmark");
      setShowAuthModal(true);
      return;
    }

    const has = bookmarkIds.has(clipId);
    setBookmarkBusyId(clipId);
    try {
      if (!has) {
        await fetchJson("/api/bookmarks_add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clip_id: clipId }),
        });
        setBookmarkIds((prev) => {
          const next = new Set(prev);
          next.add(clipId);
          return next;
        });
        showToast("已收藏");
      } else {
        await fetchJson("/api/bookmarks_delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clip_id: clipId }),
        });
        setBookmarkIds((prev) => {
          const next = new Set(prev);
          next.delete(clipId);
          return next;
        });
        showToast("已取消收藏");
      }
    } catch (e) {
      showToast("操作失败：" + e.message);
    } finally {
      setBookmarkBusyId(null);
    }
  }

  async function logout() {
    try {
      await fetchJson("/api/logout", { method: "POST" });
      setMe({ loading: false, logged_in: false, is_member: false, email: null });
      setBookmarkIds(new Set());
      setClipsReloadKey((x) => x + 1);
      showToast("已退出");
    } catch (e) {
      showToast("退出失败：" + e.message);
    }
  }

  async function loadFeatured() {
    try {
      setFeaturedLoading(true);
      // 固定推荐：不带筛选参数，只取最新 1 条
      const d = await fetchJson(`/api/clips?limit=1&offset=0&sort=newest`);
      const first = (d?.items || [])[0] || null;
      setFeatured(first);
    } catch {
      setFeatured(null);
    } finally {
      setFeaturedLoading(false);
    }
  }

  // ---------------- 初始：读 URL 参数 -> 写到 state ----------------
  useEffect(() => {
    if (!router.isReady) return;
    setDifficulty(splitParam(router.query.difficulty));
    setTopic(splitParam(router.query.topic));
    setChannel(splitParam(router.query.channel));
    setAccess(splitParam(router.query.access));
    setSort(router.query.sort === "oldest" ? "oldest" : "newest");
  }, [router.isReady]);

  // ---------------- taxonomies ----------------
  useEffect(() => {
    let mounted = true;
    fetchJson("/api/taxonomies")
      .then((d) => {
        if (!mounted) return;
        setTax({
          difficulties: d?.difficulties || [],
          topics: d?.topics || [],
          channels: d?.channels || [],
        });
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // ---------------- 登录态 + 收藏 + 推荐视频 ----------------
  useEffect(() => {
    loadMe();
    loadFeatured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me.loading) loadBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.loading, me.logged_in]);

  // ---------------- filters -> url ----------------
  useEffect(() => {
    if (!router.isReady) return;

    const q = {};
    if (difficulty.length) q.difficulty = difficulty.join(",");
    if (topic.length) q.topic = topic.join(",");
    if (channel.length) q.channel = channel.join(",");
    if (access.length) q.access = access.join(",");
    if (sort && sort !== "newest") q.sort = sort;

    router.replace({ pathname: "/", query: q }, undefined, { shallow: true });

    setOffset(0);
    setHasMore(false);
    setTotal(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, topic, channel, access, sort]);

  // ---------------- 拉 clips ----------------
  useEffect(() => {
    if (!router.isReady) return;

    async function run() {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);

        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));
        params.set("sort", sort);
        if (difficulty.length) params.set("difficulty", difficulty.join(","));
        if (topic.length) params.set("topic", topic.join(","));
        if (channel.length) params.set("channel", channel.join(","));
        if (access.length) params.set("access", access.join(","));

        const d = await fetchJson(`/api/clips?${params.toString()}`);
        const newItems = d?.items || [];
        const totalCount = d?.total || 0;

        setTotal(totalCount);
        setItems((prev) => (offset === 0 ? newItems : [...prev, ...newItems]));
        setHasMore(offset + newItems.length < totalCount);
      } catch (e) {
        showToast("拉取失败：" + e.message);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }

    run();
  }, [
    router.isReady,
    offset,
    clipsReloadKey,
    sort,
    difficulty.join(","),
    topic.join(","),
    channel.join(","),
    access.join(","),
  ]);

  // ---------------- 无限滚动 ----------------
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!hasMore) return;
        if (loading || loadingMore) return;
        if (fetchingRef.current) return;
        setOffset((x) => x + PAGE_SIZE);
      },
      { root: null, rootMargin: "420px", threshold: 0.01 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore]);

  const selectedChips = useMemo(() => {
    const chips = [];
    const mapName = (arr, opts) => {
      const m = new Map((opts || []).map((o) => [o.slug, o.name || o.slug]));
      return (arr || []).map((x) => ({ slug: x, name: m.get(x) || x }));
    };

    mapName(difficulty, tax.difficulties).forEach((x) => chips.push({ k: "difficulty", ...x }));
    mapName(access, accessOptions).forEach((x) => chips.push({ k: "access", ...x }));
    mapName(topic, tax.topics).forEach((x) => chips.push({ k: "topic", ...x }));
    mapName(channel, tax.channels).forEach((x) => chips.push({ k: "channel", ...x }));

    return chips;
  }, [difficulty, access, topic, channel, tax, accessOptions]);

  function removeChip(chip) {
    if (chip.k === "difficulty") setDifficulty((arr) => arr.filter((x) => x !== chip.slug));
    if (chip.k === "access") setAccess((arr) => arr.filter((x) => x !== chip.slug));
    if (chip.k === "topic") setTopic((arr) => arr.filter((x) => x !== chip.slug));
    if (chip.k === "channel") setChannel((arr) => arr.filter((x) => x !== chip.slug));
  }

  function handleCardClick(e, clip) {
    if (!clip || clip.can_access) return;

    e.preventDefault();
    e.stopPropagation();

    if (!me.logged_in) {
      setPendingId(clip.id);
      setPendingReason("vip");
      setShowAuthModal(true);
      return;
    }

    setPendingVipClipId(clip.id);
    setShowVipModal(true);
  }

  const howTo = useMemo(
    () => [
      {
        step: 1,
        title: "选一个你感兴趣的场景",
        desc: "从 难度 / Topic / Channel 快速筛选，找到最适合你的内容。",
      },
      {
        step: 2,
        title: "看 1 分钟，跟读 3 遍",
        desc: "短视频更适合碎片化学习，练听力 + 口语输出更快。",
      },
      {
        step: 3,
        title: "收藏进「视频收藏」",
        desc: "遇到喜欢的 clip 一键收藏，回看复习更方便。",
      },
    ],
    []
  );

  return (
    <div className="pageBg">
      <div className="shell">
        {/* 顶部栏（不 sticky） */}
        <div className="topbar">
          <div className="brand">
            <div className="brandIcon">
              <span className="dot" />
              <span className="dot faint" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="brandName">naila clips</div>
              <div className="brandSub">用真实场景练英语 · 秒级筛选 · 一键收藏</div>
            </div>
          </div>

          <div className="topbarRight">
            <UserMenu me={me} onLogout={logout} />
          </div>
        </div>

        {toast ? <div className="toast">{toast}</div> : null}

        {/* Hero */}
        <div className="hero">
          {/* 左侧：文案 + how-to（手机端会被放到下面） */}
          <div className="heroLeft">
            <div className="pill">
              <span className="pillDot" />
              场景化英语短视频数据库
            </div>

            <h1 className="heroTitle">
              用真实场景练口语，
              <br />
              每天 5 分钟就有进步
            </h1>

            <div className="heroDesc">
              这里的 clip 都是「短 · 清晰 · 可复习」的英语片段。你可以按难度、Topic、Channel 快速筛选，马上找到要学的内容。
            </div>

            <div className="howWrap">
              {howTo.map((x) => (
                <HowToCard key={x.step} step={x.step} title={x.title} desc={x.desc} />
              ))}
            </div>
          </div>

          {/* 右侧：固定推荐示例视频（不参与筛选） */}
          <div className="heroRight">
            <div className="featuredCard">
              <div className="featuredHead">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="radioOn" />
                  <div style={{ fontWeight: 950 }}>推荐示例</div>
                </div>
                <div>
                  {featured?.access_tier === "vip" ? (
                    <Tag tone="vip" size="sm">
                      会员
                    </Tag>
                  ) : (
                    <Tag tone="free" size="sm">
                      免费
                    </Tag>
                  )}
                </div>
              </div>

              {featuredLoading ? (
                <div className="featuredSkeleton">加载示例视频中...</div>
              ) : featured ? (
                <a
                  href={`/clips/${featured.id}`}
                  className="featuredBody"
                  onClick={(e) => handleCardClick(e, featured)}
                  title={!featured.can_access ? (me.logged_in ? "会员专享：去兑换开通" : "会员专享：请先登录") : "打开详情页"}
                >
                  <div style={{ position: "relative" }}>
                    <HoverPreview
                      coverUrl={featured.cover_url}
                      videoUrl={featured.video_url}
                      alt={featured.title || ""}
                      borderRadius={16}
                    />
                    {/* 收藏按钮 */}
                    <button
                      type="button"
                      className="bmBtn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleBookmark(featured.id);
                      }}
                      title={me.logged_in ? "" : "请先登录"}
                      disabled={bookmarkBusyId === featured.id}
                    >
                      {bookmarkBusyId === featured.id
                        ? "…"
                        : bookmarkIds.has(featured.id)
                        ? "★"
                        : "☆"}
                    </button>
                  </div>

                  <div className="featuredTitle">{featured.title || `Clip #${featured.id}`}</div>

                  {/* 标签一行：不显示 Topics/Channels 文本行 */}
                  <div className="tagRow featuredTags">
                    <Tag tone={featured.access_tier === "vip" ? "vip" : "free"} size="md">
                      {featured.access_tier === "vip" ? "会员可看" : "免费可看"}
                    </Tag>
                    <Tag tone="diff" size="md">
                      {featured.difficulty || "unknown"}
                    </Tag>
                    {featured.duration_sec ? (
                      <Tag tone="dur" size="md">
                        {featured.duration_sec}s
                      </Tag>
                    ) : null}
                    {(featured.topics || []).slice(0, 2).map((t) => (
                      <Tag key={`ft:${t}`} tone="topic" size="md">
                        {t}
                      </Tag>
                    ))}
                    {(featured.channels || []).slice(0, 2).map((c) => (
                      <Tag key={`fc:${c}`} tone="channel" size="md">
                        {c}
                      </Tag>
                    ))}
                  </div>

                  {!featured.can_access ? (
                    <div className="vipHint">会员专享：请登录并兑换码激活</div>
                  ) : (
                    <div className="okHint">点击进入详情页</div>
                  )}

                  <div className="tipLine">小技巧：把鼠标移到封面上可预览播放；喜欢的 clip 点右上角「☆/★」收藏。</div>
                </a>
              ) : (
                <div className="featuredSkeleton">暂无示例视频</div>
              )}
            </div>

            {/* 小亮点（保留少量，不要你标红那种大块） */}
            <div className="miniGrid">
              <div className="miniItem">
                <div className="miniIcon">⚡</div>
                <div className="miniT">秒级筛选</div>
                <div className="miniD">筛选立即刷新，不整页重载</div>
              </div>
              <div className="miniItem">
                <div className="miniIcon">🔒</div>
                <div className="miniT">权限分层</div>
                <div className="miniD">免费/会员内容清晰标识</div>
              </div>
              <div className="miniItem">
                <div className="miniIcon">📌</div>
                <div className="miniT">收藏复习</div>
                <div className="miniD">积累你的「专属学习清单」</div>
              </div>
            </div>
          </div>
        </div>

        {/* 统计 */}
        <div className="statLine">
          <div>{loading ? "加载中..." : `共 ${total} 条（已显示 ${items.length} 条）`}</div>
          {me.logged_in ? <div>收藏：{bookmarkLoading ? "加载中..." : `${bookmarkIds.size} 条`}</div> : null}
        </div>

        {/* 筛选区 */}
        <div className="filterWrap">
          <div className="filterTitle">全部视频</div>

          <div className="filterGrid">
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
              label="难度"
              placeholder="选择难度"
              options={tax.difficulties}
              value={difficulty}
              onChange={setDifficulty}
            />
            <MultiSelectDropdown
              label="权限"
              placeholder="免费/会员"
              options={accessOptions}
              value={access}
              onChange={setAccess}
            />
            <MultiSelectDropdown label="Topic" placeholder="选择 Topic" options={tax.topics} value={topic} onChange={setTopic} />
            <MultiSelectDropdown
              label="Channel"
              placeholder="选择 Channel"
              options={tax.channels}
              value={channel}
              onChange={setChannel}
            />
          </div>

          <div className="filterBottom">
            <button
              type="button"
              className="topBtn"
              onClick={() => {
                setDifficulty([]);
                setTopic([]);
                setChannel([]);
                setAccess([]);
                setSort("newest");
              }}
            >
              清空全部
            </button>

            <div className="chips">
              {selectedChips.length ? (
                selectedChips.map((c) => (
                  <button key={`${c.k}:${c.slug}`} type="button" className="chip" onClick={() => removeChip(c)} title="点我移除">
                    {c.name} <span style={{ opacity: 0.6 }}>×</span>
                  </button>
                ))
              ) : (
                <div style={{ fontSize: 12, opacity: 0.65 }}>（未选择筛选项）</div>
              )}
            </div>

            {/* ✅ 已按要求删除“复制分享链接”按钮 */}
          </div>
        </div>

        {/* 卡片列表 */}
        <div className="cardGrid" style={{ opacity: loading && offset === 0 ? 0.58 : 1 }}>
          {items.map((it) => {
            const isBookmarked = bookmarkIds.has(it.id);
            const busy = bookmarkBusyId === it.id;

            const tags = [];
            tags.push({ text: it.access_tier === "vip" ? "会员可看" : "免费可看", tone: it.access_tier === "vip" ? "vip" : "free" });
            tags.push({ text: it.difficulty || "unknown", tone: "diff" });
            if (it.duration_sec) tags.push({ text: `${it.duration_sec}s`, tone: "dur" });
            (it.topics || []).slice(0, 2).forEach((t) => tags.push({ text: t, tone: "topic" }));
            (it.channels || []).slice(0, 2).forEach((c) => tags.push({ text: c, tone: "channel" }));

            return (
              <a
                key={it.id}
                href={`/clips/${it.id}`}
                className="card"
                onClick={(e) => handleCardClick(e, it)}
                title={!it.can_access ? (me.logged_in ? "会员专享：去兑换开通" : "会员专享：请先登录") : "打开详情页"}
              >
                <div style={{ position: "relative" }}>
                  <HoverPreview coverUrl={it.cover_url} videoUrl={it.video_url} alt={it.title || ""} borderRadius={16} />

                  <button
                    type="button"
                    className="bmBtn"
                    disabled={busy}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleBookmark(it.id);
                    }}
                    title={me.logged_in ? "" : "请先登录"}
                  >
                    {busy ? "…" : isBookmarked ? "★" : "☆"}
                  </button>
                </div>

                <div className="titleLine">{it.title || `Clip #${it.id}`}</div>

                {/* ✅ 不显示 Topics/Channels 文本行，直接彩色标签横排 */}
                <div className="tagRow">
                  {tags.map((t, idx) => (
                    <Tag key={`${it.id}:${idx}`} tone={t.tone} size="md">
                      {t.text}
                    </Tag>
                  ))}
                </div>

                {!it.can_access ? (
                  <div className="vipHint">会员专享：请登录并兑换码激活</div>
                ) : (
                  <div className="okHint">可播放</div>
                )}
              </a>
            );
          })}
        </div>

        {!loading && items.length === 0 ? <div style={{ marginTop: 16, opacity: 0.75 }}>没有结果（请换筛选条件）</div> : null}

        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, opacity: 0.75 }}>
          {loadingMore ? "加载更多中..." : hasMore ? "下滑自动加载更多" : "没有更多了"}
        </div>

        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>

      {/* 未登录弹窗 */}
      {showAuthModal ? (
        <div onClick={() => setShowAuthModal(false)} className="modalMask">
          <div onClick={(e) => e.stopPropagation()} className="modalCard">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>需要登录</div>
              <button
                type="button"
                className="topBtn"
                onClick={() => setShowAuthModal(false)}
                style={{ marginLeft: "auto" }}
              >
                关闭
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
              {pendingReason === "bookmark"
                ? "收藏功能需要登录。登录后你可以在「视频收藏」里随时找到这些视频。"
                : "该视频为会员专享。请先登录（并在登录页兑换码开通会员）后再观看。"}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <a href="/login" className="topBtn" style={{ flex: 1, textAlign: "center" }}>
                去登录
              </a>
              <a href="/register" className="topBtn dark" style={{ flex: 1, textAlign: "center" }}>
                去注册
              </a>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>（刚刚点击的 clip：{pendingId || "-"}）</div>
          </div>
        </div>
      ) : null}

      {/* 已登录但非会员 */}
      {showVipModal ? (
        <div onClick={() => setShowVipModal(false)} className="modalMask">
          <div onClick={(e) => e.stopPropagation()} className="modalCard">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>需要会员</div>
              <button
                type="button"
                className="topBtn"
                onClick={() => setShowVipModal(false)}
                style={{ marginLeft: "auto" }}
              >
                关闭
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
              该视频为会员专享，请先在「登录/兑换」页面输入兑换码开通会员后再观看。
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <a href="/login" className="topBtn dark" style={{ flex: 1, textAlign: "center" }}>
                去兑换/开通
              </a>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>（刚刚点击的 clip：{pendingVipClipId || "-"}）</div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji",
            "Segoe UI Emoji";
          color: #0b1020;
          background: radial-gradient(900px 500px at 14% 0%, rgba(59, 130, 246, 0.22), transparent 55%),
            radial-gradient(900px 500px at 88% 12%, rgba(236, 72, 153, 0.18), transparent 55%),
            radial-gradient(900px 520px at 70% 95%, rgba(16, 185, 129, 0.16), transparent 55%),
            linear-gradient(180deg, rgba(248, 250, 252, 1), rgba(246, 247, 251, 1));
        }
        a {
          color: inherit;
        }

        .pageBg {
          padding: 22px 14px 60px;
        }
        .shell {
          max-width: 1160px;
          margin: 0 auto;
        }

        /* 顶部条：不 sticky */
        .topbar {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          padding: 12px 14px;
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 16px 44px rgba(0, 0, 0, 0.06);
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .brandIcon {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.16), rgba(236, 72, 153, 0.10));
          display: grid;
          place-items: center;
          position: relative;
          overflow: hidden;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.88);
          position: absolute;
          left: 12px;
          top: 15px;
        }
        .dot.faint {
          left: 22px;
          top: 15px;
          opacity: 0.25;
        }
        .brandName {
          font-size: 15px;
          font-weight: 1000;
          line-height: 1.1;
        }
        .brandSub {
          font-size: 12px;
          opacity: 0.7;
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .topbarRight {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .topBtn {
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 999px;
          padding: 9px 14px;
          cursor: pointer;
          text-decoration: none;
          color: rgba(15, 23, 42, 0.92);
          font-weight: 950;
          font-size: 12px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.04);
        }
        .topBtn:hover {
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }
        .topBtn.dark {
          background: rgba(15, 23, 42, 0.95);
          border-color: rgba(15, 23, 42, 0.95);
          color: white;
        }

        /* 头像菜单 */
        .avatarBtn {
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 999px;
          padding: 6px 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.04);
        }
        .avatarCircle {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.92);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 1000;
          font-size: 12px;
          line-height: 1;
        }
        .avatarCircle.big {
          width: 36px;
          height: 36px;
          font-size: 14px;
        }
        .caret {
          font-size: 12px;
          opacity: 0.65;
        }
        .menuPanel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 220px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.14);
          overflow: hidden;
          z-index: 50;
        }
        .menuHead {
          padding: 12px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(248, 250, 252, 0.8);
        }
        .menuEmail {
          font-size: 13px;
          font-weight: 1000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .menuBody {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .menuItem {
          width: 100%;
          text-align: left;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          padding: 10px 10px;
          cursor: pointer;
          text-decoration: none;
          color: rgba(15, 23, 42, 0.92);
          font-weight: 950;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .menuItem:hover {
          background: rgba(248, 250, 252, 1);
        }
        .menuItem.danger {
          border-color: rgba(239, 68, 68, 0.22);
          background: rgba(239, 68, 68, 0.08);
          color: rgba(185, 28, 28, 0.95);
        }

        .toast {
          margin-top: 12px;
          margin-bottom: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(10px);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.08);
          font-size: 13px;
        }

        /* Hero */
        .hero {
          margin-top: 16px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(12px);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.07);
          padding: 18px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 16px;
        }
        .heroLeft {
          min-width: 0;
          padding: 6px 6px 4px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 950;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(59, 130, 246, 0.22);
          background: rgba(59, 130, 246, 0.10);
          color: rgba(29, 78, 216, 0.95);
        }
        .pillDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(29, 78, 216, 0.9);
        }
        .heroTitle {
          margin: 12px 0 0;
          font-size: 40px;
          line-height: 1.05;
          letter-spacing: -0.02em;
          font-weight: 1000;
        }
        .heroDesc {
          margin-top: 10px;
          font-size: 14px;
          line-height: 1.7;
          opacity: 0.82;
          max-width: 540px;
        }

        .howWrap {
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }
        .howCard {
          display: flex;
          gap: 10px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.86);
          border-radius: 16px;
          padding: 10px 12px;
        }
        .howNum {
          width: 30px;
          height: 30px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-weight: 1000;
          background: rgba(15, 23, 42, 0.06);
          border: 1px solid rgba(15, 23, 42, 0.10);
        }
        .howTitle {
          font-weight: 1000;
          font-size: 13px;
        }
        .howDesc {
          margin-top: 3px;
          font-size: 12px;
          opacity: 0.78;
          line-height: 1.55;
        }

        .heroRight {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .featuredCard {
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 20px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.90);
          box-shadow: 0 18px 54px rgba(0, 0, 0, 0.10);
        }
        .featuredHead {
          padding: 12px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.10), rgba(236, 72, 153, 0.06));
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }
        .radioOn {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.95);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18);
        }
        .featuredSkeleton {
          padding: 18px 12px;
          opacity: 0.7;
          font-size: 13px;
        }
        .featuredBody {
          display: block;
          text-decoration: none;
          color: inherit;
          padding: 12px;
        }
        .featuredTitle {
          margin-top: 10px;
          font-weight: 1000;
          font-size: 14px;
          line-height: 1.3;
        }
        .featuredTags {
          margin-top: 10px;
        }
        .tipLine {
          margin-top: 10px;
          font-size: 12px;
          opacity: 0.74;
          line-height: 1.55;
        }

        .miniGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .miniItem {
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.84);
          padding: 10px 10px;
        }
        .miniIcon {
          font-size: 16px;
        }
        .miniT {
          margin-top: 6px;
          font-size: 12px;
          font-weight: 1000;
        }
        .miniD {
          margin-top: 2px;
          font-size: 11px;
          opacity: 0.78;
          line-height: 1.45;
        }

        .statLine {
          margin: 14px 2px 10px;
          font-size: 13px;
          opacity: 0.82;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* 筛选 */
        .filterWrap {
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 20px;
          padding: 14px;
          margin-bottom: 14px;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(10px);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.06);
        }
        .filterTitle {
          font-weight: 1000;
          margin-bottom: 10px;
          opacity: 0.9;
        }
        .filterGrid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(140px, 1fr));
        }
        @media (min-width: 1024px) {
          .filterGrid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }
        .filterBottom {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .chip {
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(248, 250, 252, 1);
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .fLabel {
          font-size: 12px;
          opacity: 0.75;
          margin-bottom: 6px;
          font-weight: 900;
        }
        .fBtn {
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .fBtnText {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 900;
        }
        .fPanel {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.14);
          z-index: 50;
          overflow: hidden;
        }
        .miniBtn {
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 12px;
          padding: 6px 10px;
          cursor: pointer;
          font-weight: 950;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.92);
        }
        .fSelect {
          width: 100%;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.9);
          font-weight: 950;
        }

        /* 卡片：桌面端一行 3 个 */
        .cardGrid {
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 720px) {
          .cardGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1024px) {
          .cardGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .card {
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 20px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.90);
          display: block;
          color: inherit;
          text-decoration: none;
          cursor: pointer;
          transition: box-shadow 0.18s ease, transform 0.18s ease;
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.08);
        }
        .card:hover {
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }
        .bmBtn {
          position: absolute;
          top: 10px;
          right: 10px;
          border: 1px solid rgba(255, 255, 255, 0.70);
          background: rgba(255, 255, 255, 0.90);
          border-radius: 12px;
          padding: 8px 10px;
          font-weight: 1000;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.10);
        }

        .titleLine {
          margin-top: 10px;
          font-size: 15px;
          font-weight: 1000;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 42px;
        }

        .tagRow {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .vipHint {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 1000;
          color: rgba(185, 28, 28, 0.95);
        }
        .okHint {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 1000;
          color: rgba(29, 78, 216, 0.95);
        }

        /* 弹窗 */
        .modalMask {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 9999;
        }
        .modalCard {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.96);
          border-radius: 16px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          padding: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(10px);
        }

        /* 手机端：hero 变单列，并把“示例视频”放到上面，文案卡片更紧凑 */
        @media (max-width: 980px) {
          .hero {
            grid-template-columns: 1fr;
          }
          .heroRight {
            order: 1;
          }
          .heroLeft {
            order: 2;
          }
          .heroTitle {
            font-size: 34px;
          }
          .howCard {
            padding: 9px 10px;
          }
        }
        @media (max-width: 520px) {
          .heroTitle {
            font-size: 30px;
          }
          /* 手机端标签字体略小 */
          .tag {
            font-size: 11px !important;
          }
          .miniGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
