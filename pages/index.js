// pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import HoverPreview from "../components/HoverPreview";

/**
 * ✅ 本次只修复：电脑版 Hero 区标题/按钮重复渲染
 * - 让 heroLeftHead 只在手机端显示（桌面端隐藏）
 * - 其它全部不动（功能、筛选、卡片、示例固定免费、样式等）
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
    <div ref={wrapRef} className="fWrap">
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
          <div className="fPanelTop">
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

          <div className="fPanelList">
            {(options || []).map((opt) => {
              const checked = selected.has(opt.slug);
              return (
                <label
                  key={opt.slug}
                  className="fOpt"
                  style={{
                    background: checked ? "rgba(59,130,246,0.08)" : "transparent",
                    border: checked ? "1px solid rgba(59,130,246,0.35)" : "1px solid transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(toggleInArray(value || [], opt.slug))}
                  />
                  <div className="fOptName">{opt.name || opt.slug}</div>
                  {typeof opt.count === "number" ? <div className="fOptCount">{opt.count}</div> : null}
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

function Badge({ children, tone = "gray" }) {
  const map = {
    gray: { bg: "rgba(17,17,17,0.06)", bd: "rgba(17,17,17,0.08)", tx: "#111" },
    vip: { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.22)", tx: "#b00000" },
    free: { bg: "rgba(59,130,246,0.10)", bd: "rgba(59,130,246,0.22)", tx: "#0b5aa6" },
    diff: { bg: "rgba(16,185,129,0.10)", bd: "rgba(16,185,129,0.22)", tx: "#0f766e" },
    topic: { bg: "rgba(168,85,247,0.10)", bd: "rgba(168,85,247,0.22)", tx: "#6d28d9" },
    channel: { bg: "rgba(245,158,11,0.10)", bd: "rgba(245,158,11,0.22)", tx: "#92400e" },
  };
  const s = map[tone] || map.gray;
  return (
    <span
      className="tag"
      style={{
        background: s.bg,
        border: `1px solid ${s.bd}`,
        color: s.tx,
      }}
    >
      {children}
    </span>
  );
}

function UserMenu({ me, onLogout }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  useOutsideClick(wrapRef, () => setOpen(false));

  if (!me?.logged_in) {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
      <button type="button" className="avatarBtn" onClick={() => setOpen((v) => !v)} title={email || "账号"}>
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
                <div style={{ marginTop: 2, fontSize: 12, opacity: 0.7 }}>{me?.is_member ? "会员" : "非会员"}</div>
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

function TipRow({ n, title, desc }) {
  return (
    <div className="tipRow">
      <div className="tipNum">{n}</div>
      <div style={{ minWidth: 0 }}>
        <div className="tipTitle">{title}</div>
        <div className="tipDesc">{desc}</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

  const [tax, setTax] = useState({ difficulties: [], topics: [], channels: [] });

  const [difficulty, setDifficulty] = useState([]);
  const [topic, setTopic] = useState([]);
  const [channel, setChannel] = useState([]);
  const [access, setAccess] = useState([]);
  const [sort, setSort] = useState("newest");

  const PAGE_SIZE = 12;
  const [offset, setOffset] = useState(0);

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

  const [me, setMe] = useState({ loading: true, logged_in: false, is_member: false, email: null });
  const [bookmarkIds, setBookmarkIds] = useState(() => new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkBusyId, setBookmarkBusyId] = useState(null);

  const [toast, setToast] = useState("");
  const [clipsReloadKey, setClipsReloadKey] = useState(0);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [pendingReason, setPendingReason] = useState("bookmark");

  const [showVipModal, setShowVipModal] = useState(false);
  const [pendingVipClipId, setPendingVipClipId] = useState(null);

  const [exampleClip, setExampleClip] = useState(null);

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

  useEffect(() => {
    if (!router.isReady) return;
    setDifficulty(splitParam(router.query.difficulty));
    setTopic(splitParam(router.query.topic));
    setChannel(splitParam(router.query.channel));
    setAccess(splitParam(router.query.access));
    setSort(router.query.sort === "oldest" ? "oldest" : "newest");
  }, [router.isReady]);

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

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (!me.loading) loadBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.loading, me.logged_in]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("limit", "1");
        params.set("offset", "0");
        params.set("sort", "newest");
        params.set("access", "free");
        params.set("_t", String(Date.now()));
        const d = await fetchJson(`/api/clips?${params.toString()}`);
        const it = (d?.items || [])[0] || null;
        if (!mounted) return;
        setExampleClip(it);
      } catch {
        if (!mounted) return;
        setExampleClip(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [clipsReloadKey]);

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
      { root: null, rootMargin: "400px", threshold: 0.01 }
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

  function renderTagsRow(it) {
    const tags = [];
    tags.push(
      <Badge key="acc" tone={it.access_tier === "vip" ? "vip" : "free"}>
        {it.access_tier === "vip" ? "会员" : "免费可看"}
      </Badge>
    );
    tags.push(
      <Badge key="diff" tone="diff">
        {it.difficulty || "unknown"}
      </Badge>
    );
    if (it.duration_sec) tags.push(<Badge key="dur">{it.duration_sec}s</Badge>);
    (it.topics || []).slice(0, 3).forEach((t) => tags.push(<Badge key={`t:${t}`} tone="topic">{t}</Badge>));
    (it.channels || []).slice(0, 2).forEach((c) => tags.push(<Badge key={`c:${c}`} tone="channel">{c}</Badge>));
    return <div className="tagsRow">{tags}</div>;
  }

  const HeroDesktop = (
    <div className="heroGrid">
      <div className="heroLeft">
        <div className="heroPill">🎬 场景化英语短视频数据库</div>
        <h1 className="heroTitle">
          用真实场景练口语，
          <br />
          每天 5 分钟就有进步
        </h1>

        <div className="heroBtns">
          <a href="#filters" className="heroBtn primary">
            立即开始筛选
          </a>
          <a href="/register" className="heroBtn">
            注册并兑换会员
          </a>
        </div>

        <div className="tipsTitlePlain">怎么用更有效？</div>
        <div className="tipsPlain">
          <TipRow n="1" title="选一个你感兴趣的场景" desc="从难度 / Topic / Channel 快速筛选，找到适合你的内容。" />
          <TipRow n="2" title="看 1 分钟，跟读 3 遍" desc="短视频更适合碎片化学习，练听力 + 口语输出更快。" />
          <TipRow n="3" title="收藏进「视频收藏」" desc="遇到喜欢的 clip 一键收藏，回看复习更方便。" />
        </div>
      </div>

      <div className="heroRight">
        <div className="exampleHeadPlain">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="exampleDot" />
            <span style={{ fontWeight: 950 }}>推荐示例</span>
          </div>
          <span className="pill">免费</span>
        </div>

        {exampleClip ? (
          <a className="exampleCardPlain" href={`/clips/${exampleClip.id}`} onClick={(e) => handleCardClick(e, exampleClip)}>
            <div style={{ position: "relative" }}>
              <HoverPreview
                coverUrl={exampleClip.cover_url}
                videoUrl={exampleClip.video_url}
                alt={exampleClip.title || ""}
                borderRadius={18}
              />
              <button
                type="button"
                className="bmBtn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleBookmark(exampleClip.id);
                }}
                disabled={bookmarkBusyId === exampleClip.id}
                title={me.logged_in ? "" : "请先登录"}
              >
                {bookmarkBusyId === exampleClip.id ? "…" : bookmarkIds.has(exampleClip.id) ? "★" : "☆"}
              </button>
            </div>

            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 1000, fontSize: 14, lineHeight: 1.3 }}>
                {exampleClip.title || `Clip #${exampleClip.id}`}
              </div>

              <div style={{ marginTop: 8 }}>{renderTagsRow(exampleClip)}</div>

              <div className="exampleHintPlain">点击卡片进入详情页 →</div>
            </div>
          </a>
        ) : (
          <div style={{ padding: 14, fontSize: 13, opacity: 0.75 }}>暂无示例视频（请先确保有免费 clip）</div>
        )}
      </div>
    </div>
  );

  const HeroMobile = (
    <div className="heroMobile">
      <div className="exampleHeadPlain">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="exampleDot" />
          <span style={{ fontWeight: 950 }}>推荐示例</span>
        </div>
        <span className="pill">免费</span>
      </div>

      {exampleClip ? (
        <a className="exampleCardPlain" href={`/clips/${exampleClip.id}`} onClick={(e) => handleCardClick(e, exampleClip)}>
          <div style={{ position: "relative" }}>
            <HoverPreview
              coverUrl={exampleClip.cover_url}
              videoUrl={exampleClip.video_url}
              alt={exampleClip.title || ""}
              borderRadius={18}
            />
            <button
              type="button"
              className="bmBtn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleBookmark(exampleClip.id);
              }}
              disabled={bookmarkBusyId === exampleClip.id}
              title={me.logged_in ? "" : "请先登录"}
            >
              {bookmarkBusyId === exampleClip.id ? "…" : bookmarkIds.has(exampleClip.id) ? "★" : "☆"}
            </button>
          </div>

          <div style={{ padding: 12 }}>
            <div style={{ fontWeight: 1000, fontSize: 14, lineHeight: 1.3 }}>
              {exampleClip.title || `Clip #${exampleClip.id}`}
            </div>
            <div style={{ marginTop: 8 }}>{renderTagsRow(exampleClip)}</div>
            <div className="exampleHintPlain">点击卡片进入详情页 →</div>
          </div>
        </a>
      ) : (
        <div style={{ padding: 14, fontSize: 13, opacity: 0.75 }}>暂无示例视频（请先确保有免费 clip）</div>
      )}

      <div className="tipsTitlePlain" style={{ marginTop: 12 }}>
        怎么用更有效？
      </div>
      <div className="tipsPlain">
        <TipRow n="1" title="选一个你感兴趣的场景" desc="从难度 / Topic / Channel 快速筛选，找到适合你的内容。" />
        <TipRow n="2" title="看 1 分钟，跟读 3 遍" desc="短视频更适合碎片化学习，练听力 + 口语输出更快。" />
        <TipRow n="3" title="收藏进「视频收藏」" desc="遇到喜欢的 clip 一键收藏，回看复习更方便。" />
      </div>
    </div>
  );

  return (
    <div className="pageBg">
      <div className="container">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div className="brandMark">
              <div className="brandDot" />
              <div className="brandDot2" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 950, lineHeight: 1.1 }}>naila clips</div>
              <div className="brandSub">用真实场景练英语 · 秒级筛选 · 一键收藏</div>
            </div>
          </div>

          <div className="topbarRight">
            <UserMenu me={me} onLogout={logout} />
          </div>
        </div>

        {toast ? <div className="toast">{toast}</div> : null}

        <div className="heroShell">
          {/* ✅ 修复点：这一块只在手机端显示，桌面端隐藏，防止重复 */}
          <div className="heroLeftHead mobileOnly">
            <div className="heroPill">🎬 场景化英语短视频数据库</div>
            <h1 className="heroTitle">
              用真实场景练口语，
              <br />
              每天 5 分钟就有进步
            </h1>
            <div className="heroBtns">
              <a href="#filters" className="heroBtn primary">
                立即开始筛选
              </a>
              <a href="/register" className="heroBtn">
                注册并兑换会员
              </a>
            </div>
          </div>

          <div className="heroDesktopOnly">{HeroDesktop}</div>
          <div className="heroMobileOnly">{HeroMobile}</div>
        </div>

        <div id="filters" className="filterWrap">
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
            <MultiSelectDropdown label="难度" placeholder="选择难度" options={tax.difficulties} value={difficulty} onChange={setDifficulty} />
            <MultiSelectDropdown label="权限" placeholder="免费/会员" options={accessOptions} value={access} onChange={setAccess} />
            <MultiSelectDropdown label="Topic" placeholder="选择 Topic" options={tax.topics} value={topic} onChange={setTopic} />
            <MultiSelectDropdown label="Channel" placeholder="选择 Channel" options={tax.channels} value={channel} onChange={setChannel} />
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
                <div style={{ fontSize: 12, opacity: 0.6 }}>（未选择筛选项）</div>
              )}
            </div>
          </div>
        </div>

        <div className="statsRow">
          <div>{loading ? "加载中..." : `共 ${total} 条（已显示 ${items.length} 条）`}</div>
          {me.logged_in ? <div>收藏：{bookmarkLoading ? "加载中..." : `${bookmarkIds.size} 条`}</div> : null}
        </div>

        {showAuthModal ? (
          <div onClick={() => setShowAuthModal(false)} className="modalMask">
            <div onClick={(e) => e.stopPropagation()} className="modalCard">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>需要登录</div>
                <button type="button" className="topBtn" onClick={() => setShowAuthModal(false)} style={{ marginLeft: "auto" }}>
                  关闭
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
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

        {showVipModal ? (
          <div onClick={() => setShowVipModal(false)} className="modalMask">
            <div onClick={(e) => e.stopPropagation()} className="modalCard">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>需要会员</div>
                <button type="button" className="topBtn" onClick={() => setShowVipModal(false)} style={{ marginLeft: "auto" }}>
                  关闭
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
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

        <div className="cardGrid" style={{ opacity: loading && offset === 0 ? 0.55 : 1 }}>
          {items.map((it) => {
            const isBookmarked = bookmarkIds.has(it.id);
            const busy = bookmarkBusyId === it.id;

            return (
              <a
                key={it.id}
                href={`/clips/${it.id}`}
                className="card"
                onClick={(e) => handleCardClick(e, it)}
                title={!it.can_access ? (me.logged_in ? "会员专享：去兑换开通" : "会员专享：请先登录") : ""}
              >
                <div style={{ position: "relative" }}>
                  <HoverPreview coverUrl={it.cover_url} videoUrl={it.video_url} alt={it.title || ""} borderRadius={18} />

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

                <div className="cardBody">
                  {renderTagsRow(it)}
                  <div className="titleLine">{it.title || `Clip #${it.id}`}</div>

                  {!it.can_access ? <div className="vipHint">会员专享：请登录并兑换码激活</div> : <div className="okHint">可播放</div>}
                </div>
              </a>
            );
          })}
        </div>

        {!loading && items.length === 0 ? <div style={{ marginTop: 16, opacity: 0.7 }}>没有结果（请换筛选条件）</div> : null}

        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, opacity: 0.7 }}>
          {loadingMore ? "加载更多中..." : hasMore ? "下滑自动加载更多" : "没有更多了"}
        </div>

        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>

      <style jsx global>{`
        html,
        body {
          background: #f7f8fb;
        }
        .pageBg {
          min-height: 100vh;
          background:
            radial-gradient(900px 500px at 12% 0%, rgba(59, 130, 246, 0.22), transparent 60%),
            radial-gradient(900px 600px at 92% 0%, rgba(244, 114, 182, 0.16), transparent 55%),
            radial-gradient(900px 700px at 50% 100%, rgba(16, 185, 129, 0.10), transparent 55%),
            linear-gradient(180deg, #fbfcff 0%, #f7f8fb 55%, #f7f8fb 100%);
          padding: 18px 0 60px;
        }
        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 16px;
        }

        .topbar {
          position: relative;
          z-index: 10;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(17, 17, 17, 0.08);
          border-radius: 18px;
          padding: 12px 14px;
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
        }
        .brandMark {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          background: rgba(17, 17, 17, 0.06);
          border: 1px solid rgba(17, 17, 17, 0.08);
          display: grid;
          place-items: center;
          position: relative;
          overflow: hidden;
        }
        .brandDot,
        .brandDot2 {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #111;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
        }
        .brandDot {
          left: 11px;
          opacity: 0.9;
        }
        .brandDot2 {
          left: 21px;
          opacity: 0.35;
        }
        .brandSub {
          font-size: 12px;
          opacity: 0.62;
          margin-top: 2px;
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
          border: 1px solid rgba(17, 17, 17, 0.10);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 999px;
          padding: 9px 14px;
          cursor: pointer;
          text-decoration: none;
          color: #111;
          font-weight: 950;
          font-size: 12px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .topBtn:hover {
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }
        .topBtn.dark {
          background: #111;
          border-color: #111;
          color: white;
        }

        .avatarBtn {
          border: 1px solid rgba(17, 17, 17, 0.10);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 999px;
          padding: 6px 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .avatarCircle {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: #111;
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
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
          border: 1px solid rgba(17, 17, 17, 0.10);
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.12);
          overflow: hidden;
          z-index: 80;
        }
        .menuHead {
          padding: 12px;
          border-bottom: 1px solid rgba(17, 17, 17, 0.08);
          background: rgba(17, 17, 17, 0.03);
        }
        .menuEmail {
          font-size: 13px;
          font-weight: 950;
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
          border: 1px solid rgba(17, 17, 17, 0.10);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          padding: 10px 10px;
          cursor: pointer;
          text-decoration: none;
          color: #111;
          font-weight: 950;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .menuItem:hover {
          background: rgba(17, 17, 17, 0.03);
        }
        .menuItem.danger {
          border-color: rgba(239, 68, 68, 0.25);
          background: rgba(239, 68, 68, 0.08);
          color: #b00000;
        }

        .toast {
          margin-top: 12px;
          margin-bottom: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(17, 17, 17, 0.10);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
        }

        .heroShell {
          margin-top: 14px;
          border-radius: 22px;
          border: 1px solid rgba(17, 17, 17, 0.08);
          background: linear-gradient(
            135deg,
            rgba(59, 130, 246, 0.16) 0%,
            rgba(236, 72, 153, 0.10) 45%,
            rgba(16, 185, 129, 0.10) 100%
          );
          padding: 18px;
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.08);
        }

        .heroLeftHead {
          padding: 6px 6px 10px 6px;
        }

        /* ✅ 新增：只给手机显示 */
        .mobileOnly {
          display: none;
        }

        .heroPill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 12px;
          border: 1px solid rgba(59, 130, 246, 0.22);
          background: rgba(59, 130, 246, 0.10);
          color: #0b5aa6;
        }
        .heroTitle {
          margin: 12px 0 8px;
          font-size: 42px;
          line-height: 1.12;
          letter-spacing: -0.02em;
          font-weight: 1000;
          color: #0b0b0b;
        }
        .heroBtns {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .heroBtn {
          border: 1px solid rgba(17, 17, 17, 0.10);
          background: rgba(255, 255, 255, 0.92);
          border-radius: 999px;
          padding: 11px 16px;
          font-weight: 1000;
          font-size: 13px;
          text-decoration: none;
          color: #111;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .heroBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.10);
        }
        .heroBtn.primary {
          background: #111;
          color: white;
          border-color: #111;
        }

        .heroDesktopOnly {
          display: block;
        }
        .heroMobileOnly {
          display: none;
        }

        .heroGrid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 22px;
          align-items: start;
        }
        .heroLeft {
          padding: 0 6px 6px 6px;
        }
        .heroRight {
          padding: 0 6px 6px 6px;
        }

        .tipsTitlePlain {
          margin-top: 14px;
          font-weight: 1000;
          font-size: 14px;
        }
        .tipsPlain {
          margin-top: 8px;
          display: grid;
          gap: 12px;
        }
        .tipRow {
          border: 1px solid rgba(17, 17, 17, 0.10);
          background: rgba(255, 255, 255, 0.75);
          border-radius: 16px;
          padding: 12px 12px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .tipNum {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-weight: 1000;
          background: rgba(17, 17, 17, 0.06);
          border: 1px solid rgba(17, 17, 17, 0.08);
          flex: 0 0 auto;
        }
        .tipTitle {
          font-weight: 1000;
          font-size: 13px;
        }
        .tipDesc {
          margin-top: 3px;
          font-size: 12px;
          opacity: 0.75;
          line-height: 1.55;
        }

        .exampleHeadPlain {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .exampleDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.9);
          box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.12);
          display: inline-block;
        }
        .pill {
          border: 1px solid rgba(17, 17, 17, 0.10);
          background: rgba(255, 255, 255, 0.9);
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
        }
        .exampleCardPlain {
          display: block;
          border: 1px solid rgba(17, 17, 17, 0.10);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.75);
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
        }
        .exampleHintPlain {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 950;
          opacity: 0.7;
        }

        .tagsRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }
        @media (max-width: 640px) {
          .tag {
            font-size: 11px;
            padding: 4px 9px;
          }
          .heroTitle {
            font-size: 30px;
          }
        }

        .filterWrap {
          margin-top: 16px;
          border: 1px solid rgba(17, 17, 17, 0.08);
          border-radius: 18px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.06);
          position: relative;
          z-index: 40;
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
          border: 1px solid rgba(17, 17, 17, 0.10);
          background: rgba(17, 17, 17, 0.04);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .fWrap {
          position: relative;
        }
        .fLabel {
          font-size: 12px;
          opacity: 0.7;
          margin-bottom: 6px;
          font-weight: 900;
        }
        .fBtn {
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(17, 17, 17, 0.10);
          background: rgba(255, 255, 255, 0.92);
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
          border: 1px solid rgba(17, 17, 17, 0.10);
          background: rgba(255, 255, 255, 0.96);
          border-radius: 16px;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.14);
          z-index: 90;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }
        .fPanelTop {
          padding: 8px;
          border-bottom: 1px solid rgba(17, 17, 17, 0.08);
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .fPanelList {
          max-height: 260px;
          overflow: auto;
          padding: 8px;
        }
        .fOpt {
          display: flex;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 12px;
          cursor: pointer;
          align-items: center;
        }
        .fOptName {
          font-size: 13px;
          font-weight: 800;
        }
        .fOptCount {
          margin-left: auto;
          font-size: 12px;
          opacity: 0.6;
        }
        .miniBtn {
          border: 1px solid rgba(17, 17, 17, 0.10);
          border-radius: 12px;
          padding: 6px 10px;
          cursor: pointer;
          font-weight: 950;
          font-size: 12px;
        }
        .fSelect {
          width: 100%;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(17, 17, 17, 0.10);
          background: rgba(255, 255, 255, 0.92);
          font-weight: 950;
        }

        .statsRow {
          opacity: 0.78;
          margin: 14px 0 10px;
          font-size: 13px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .cardGrid {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
          margin-top: 14px;
        }
        @media (min-width: 640px) {
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
          border: 1px solid rgba(17, 17, 17, 0.08);
          border-radius: 20px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.82);
          display: block;
          color: inherit;
          text-decoration: none;
          cursor: pointer;
          transition: box-shadow 0.18s ease, transform 0.18s ease;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
        }
        .card:hover {
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }
        .bmBtn {
          position: absolute;
          top: 10px;
          right: 10px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.90);
          border-radius: 12px;
          padding: 8px 10px;
          font-weight: 1000;
          cursor: pointer;
          z-index: 5;
        }
        .cardBody {
          margin-top: 10px;
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
          min-height: 40px;
        }
        .vipHint {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 950;
          color: #b00000;
        }
        .okHint {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 950;
          color: #0b5aa6;
        }

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
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          border: 1px solid rgba(17, 17, 17, 0.10);
          padding: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(10px);
        }

        @media (max-width: 900px) {
          .heroDesktopOnly {
            display: none;
          }
          .heroMobileOnly {
            display: block;
          }
          .mobileOnly {
            display: block;
          }
          .heroGrid {
            grid-template-columns: 1fr;
          }
          .heroTitle {
            font-size: 34px;
          }
          .heroMobile {
            margin-top: 10px;
          }
        }
      `}</style>
    </div>
  );
}
