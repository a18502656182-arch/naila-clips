// pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import HoverPreview from "../components/HoverPreview";

/**
 * 首页（成品美化版 v2）
 * ✅ 红框区域已删除（左侧说明+pill、右侧小技巧、右下角三小卡）
 * ✅ 黄框内容移到视频下方（标题/徽章/topic/channel）
 * ✅ 卡片放大，桌面端一行固定3个
 * ✅ 保留原有全部功能：筛选、无限滚动、收藏、登录态、弹窗、会员拦截、HoverPreview
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
          <div className="fPanelTop">
            <button type="button" className="miniBtn" onClick={() => onChange([])}>
              清空
            </button>
            <button type="button" className="miniBtn" onClick={() => onChange((options || []).map((o) => o.slug))}>
              全选
            </button>
            <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>
              {value?.length || 0}/{options?.length || 0}
            </div>
          </div>

          <div style={{ maxHeight: 260, overflow: "auto", padding: 8 }}>
            {(options || []).map((opt) => {
              const checked = selected.has(opt.slug);
              return (
                <label
                  key={opt.slug}
                  className={`checkRow ${checked ? "on" : ""}`}
                  style={{ background: checked ? "rgba(19, 109, 255, 0.06)" : "transparent" }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(toggleInArray(value || [], opt.slug))}
                  />
                  <div className="checkName">{opt.name || opt.slug}</div>
                  {typeof opt.count === "number" ? <div className="checkCount">{opt.count}</div> : null}
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
    gray: { bg: "#f5f6f8", bd: "rgba(17,17,17,.06)", tx: "#111" },
    vip: { bg: "rgba(255, 82, 82, 0.08)", bd: "rgba(255, 82, 82, 0.22)", tx: "#b00000" },
    free: { bg: "rgba(19, 109, 255, 0.08)", bd: "rgba(19, 109, 255, 0.22)", tx: "#0b5aa6" },
  };
  const s = map[tone] || map.gray;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        background: s.bg,
        border: `1px solid ${s.bd}`,
        color: s.tx,
        whiteSpace: "nowrap",
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
      <div className="topActions">
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

function HeroSection({ me, sample, onTryVip }) {
  const steps = [
    { t: "选一个你感兴趣的场景", d: "从难度 / Topic / Channel 快速筛选，找到适合你的内容。" },
    { t: "看 1 分钟，跟读 3 遍", d: "短视频更适合碎片化学习，练听力 + 口语输出更快。" },
    { t: "收藏进「视频收藏」", d: "遇到喜欢的 clip 一键收藏，回看复习更方便。" },
  ];

  return (
    <div className="heroWrap">
      <div className="heroBg" />
      <div className="heroGrid">
        {/* left */}
        <div className="heroLeft">
          <div className="heroKicker">🎬 场景化英语短视频库</div>

          <h1 className="heroTitle">
            用真实场景练口语，
            <br />
            每天 5 分钟就有进步
          </h1>

          <div className="heroCtas">
            <a className="ctaPrimary" href="#all">
              立即开始筛选
            </a>

            {!me?.logged_in ? (
              <a className="ctaGhost" href="/register">
                注册并兑换会员
              </a>
            ) : me?.is_member ? (
              <span className="ctaHint">✅ 你已是会员，可直接观看会员内容</span>
            ) : (
              <button type="button" className="ctaGhost" onClick={onTryVip}>
                去兑换/开通会员
              </button>
            )}
          </div>

          {/* ✅ 保留步骤区（不是红框内的那段说明） */}
          <div className="heroSteps">
            <div className="stepsTitle">怎么用更有效？</div>
            <div className="stepsGrid">
              {steps.map((s, idx) => (
                <div key={idx} className="stepCard">
                  <div className="stepNo">{idx + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="stepT">{s.t}</div>
                    <div className="stepD">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right */}
        <div className="heroRight">
          <div className="demoCard">
            <div className="demoTop">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div className="demoDot" />
                <div className="demoTitle">推荐示例</div>
              </div>
              <div className="demoTag">{sample?.access_tier === "vip" ? "会员" : "免费"}</div>
            </div>

            {/* ✅ 视频区域放大 */}
            <div className="demoVideo">
              <HoverPreview
                coverUrl={sample?.cover_url}
                videoUrl={sample?.video_url}
                alt={sample?.title || ""}
                borderRadius={18}
              />
            </div>

            {/* ✅ 黄框内容全部下移到视频下方（标题/徽章/topic/channel） */}
            <div className="demoBody">
              <div className="demoName">{sample?.title || "从下方列表选择任意 clip"}</div>

              <div className="demoBadges">
                {sample?.difficulty ? <Badge>难度：{sample.difficulty}</Badge> : null}
                {sample?.duration_sec ? <Badge>{sample.duration_sec}s</Badge> : null}
                {sample?.access_tier ? (
                  <Badge tone={sample.access_tier === "vip" ? "vip" : "free"}>
                    {sample.access_tier === "vip" ? "会员专享" : "免费可看"}
                  </Badge>
                ) : null}
              </div>

              <div className="demoLine">
                <span className="demoKey">Topic：</span>
                <span className="demoVal">{(sample?.topics || []).slice(0, 3).join(", ") || "-"}</span>
              </div>
              <div className="demoLine">
                <span className="demoKey">Channel：</span>
                <span className="demoVal">{(sample?.channels || []).slice(0, 3).join(", ") || "-"}</span>
              </div>
            </div>
          </div>

          {/* ✅ 右下角三张小卡（红框）已删除 */}
        </div>
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

  // ---------------- 登录态 + 收藏 ----------------
  useEffect(() => {
    loadMe();
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

    // reset paging（不清空 items 避免闪屏）
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
    // 只有“不能访问”才拦截
    if (!clip || clip.can_access) return;

    e.preventDefault();
    e.stopPropagation();

    if (!me.logged_in) {
      setPendingId(clip.id);
      setPendingReason("vip");
      setShowAuthModal(true);
      return;
    }

    // 已登录但非会员
    setPendingVipClipId(clip.id);
    setShowVipModal(true);
  }

  const heroSample = useMemo(() => {
    if (!items?.length) return null;
    const free = items.find((x) => x.access_tier === "free");
    return free || items[0];
  }, [items]);

  return (
    <div className="page">
      {/* 顶部栏 */}
      <div className="topbarShell">
        <div className="topbar">
          <div className="brand">
            <div className="logoMark">
              <div className="logoDot" />
              <div className="logoDot soft" />
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
      </div>

      <div className="container">
        {toast ? <div className="toast">{toast}</div> : null}

        {/* Hero */}
        <HeroSection
          me={me}
          sample={heroSample}
          onTryVip={() => {
            window.location.href = "/login";
          }}
        />

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

        {/* “全部视频”标题 + 统计 */}
        <div id="all" className="sectionHead">
          <div>
            <div className="sectionTitle">全部视频</div>
            <div className="sectionSub">按难度 / 权限 / Topic / Channel 筛选，找到更适合你的练习片段</div>
          </div>

          <div className="statsPills">
            <div className="statPill">{loading ? "加载中..." : `共 ${total} 条（已显示 ${items.length} 条）`}</div>
            {me.logged_in ? <div className="statPill">收藏：{bookmarkLoading ? "加载中..." : `${bookmarkIds.size} 条`}</div> : null}
          </div>
        </div>

        {/* 筛选区 */}
        <div className="filterWrap">
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

        {/* 卡片列表 */}
        <div className="cardGrid" style={{ opacity: loading && offset === 0 ? 0.55 : 1 }}>
          {items.map((it) => {
            const isBookmarked = bookmarkIds.has(it.id);
            const busy = bookmarkBusyId === it.id;
            const accessTone = it.access_tier === "vip" ? "vip" : "free";
            const diffText = it.difficulty || "unknown";

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

                  <div className="cardCorner">
                    <span className={`cornerTag ${it.access_tier === "vip" ? "vip" : "free"}`}>
                      {it.access_tier === "vip" ? "会员专享" : "免费"}
                    </span>
                  </div>
                </div>

                <div className="cardBadges">
                  <Badge tone={accessTone}>{it.access_tier === "vip" ? "会员" : "免费"}</Badge>
                  <Badge>{diffText}</Badge>
                  {it.duration_sec ? <Badge>{it.duration_sec}s</Badge> : null}
                </div>

                <div className="titleLine">{it.title || `Clip #${it.id}`}</div>

                <div className="metaLine">
                  <div>
                    <span style={{ opacity: 0.7 }}>Topics：</span>
                    {(it.topics || []).slice(0, 3).join(", ") || "-"
                  }</div>
                  <div>
                    <span style={{ opacity: 0.7 }}>Channels：</span>
                    {(it.channels || []).slice(0, 3).join(", ") || "-"
                  }</div>
                </div>

                {!it.can_access ? <div className="vipHint">会员专享：请登录并兑换码激活</div> : <div className="okHint">可播放</div>}
              </a>
            );
          })}
        </div>

        {!loading && items.length === 0 ? <div style={{ marginTop: 16, opacity: 0.7 }}>没有结果（请换筛选条件）</div> : null}

        <div className="footerHint">{loadingMore ? "加载更多中..." : hasMore ? "下滑自动加载更多" : "没有更多了"}</div>

        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>

      <style jsx global>{`
        :root {
          --bd: rgba(17, 17, 17, 0.08);
          --bd2: rgba(17, 17, 17, 0.06);
          --txt: #111;
          --muted: rgba(17, 17, 17, 0.65);
          --shadow: 0 18px 60px rgba(0, 0, 0, 0.08);
        }

        html,
        body {
          background: #f6f7fb;
        }

        .page {
          min-height: 100vh;
        }

        .container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 14px 16px 28px;
        }

        /* Topbar */
        .topbarShell {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 10px 10px 0;
        }

        .topbar {
          max-width: 1120px;
          margin: 0 auto;
          border: 1px solid var(--bd);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(12px);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.06);
          padding: 12px 14px;
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .logoMark {
          width: 34px;
          height: 34px;
          border-radius: 14px;
          border: 1px solid var(--bd);
          background: linear-gradient(135deg, rgba(19, 109, 255, 0.14), rgba(255, 82, 82, 0.08));
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .logoDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #111;
        }
        .logoDot.soft {
          background: rgba(17, 17, 17, 0.35);
        }

        .brandName {
          font-size: 14px;
          font-weight: 1000;
          letter-spacing: 0.2px;
          line-height: 1.1;
        }
        .brandSub {
          margin-top: 2px;
          font-size: 12px;
          opacity: 0.7;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .topbarRight {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }

        .topActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .topBtn {
          border: 1px solid var(--bd);
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 9px 12px;
          cursor: pointer;
          text-decoration: none;
          color: var(--txt);
          font-weight: 950;
          font-size: 12px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
        }
        .topBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
        }
        .topBtn.dark {
          background: #111;
          border-color: #111;
          color: white;
        }

        /* Avatar menu */
        .avatarBtn {
          border: 1px solid var(--bd);
          background: rgba(255, 255, 255, 0.95);
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
          border: 1px solid var(--bd);
          background: rgba(255, 255, 255, 0.96);
          border-radius: 16px;
          box-shadow: var(--shadow);
          overflow: hidden;
          z-index: 80;
          backdrop-filter: blur(12px);
        }
        .menuHead {
          padding: 12px;
          border-bottom: 1px solid var(--bd2);
          background: rgba(17, 17, 17, 0.03);
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
          border: 1px solid var(--bd);
          background: white;
          border-radius: 12px;
          padding: 10px 10px;
          cursor: pointer;
          text-decoration: none;
          color: var(--txt);
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
          border-color: rgba(255, 82, 82, 0.25);
          background: rgba(255, 82, 82, 0.08);
          color: #b00000;
        }

        /* Toast */
        .toast {
          margin-top: 10px;
          margin-bottom: 10px;
          padding: 10px 12px;
          border: 1px solid var(--bd);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.92);
          font-size: 13px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
        }

        /* Modal */
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
          background: white;
          border-radius: 18px;
          border: 1px solid var(--bd);
          padding: 16px;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.22);
        }

        /* Hero */
        .heroWrap {
          position: relative;
          border-radius: 26px;
          border: 1px solid var(--bd);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.6);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.06);
          margin-top: 12px;
        }
        .heroBg {
          position: absolute;
          inset: 0;
          background: radial-gradient(900px 360px at 20% 15%, rgba(19, 109, 255, 0.18), transparent 60%),
            radial-gradient(700px 320px at 85% 20%, rgba(255, 82, 82, 0.14), transparent 55%),
            radial-gradient(900px 500px at 60% 95%, rgba(17, 17, 17, 0.06), transparent 55%);
          pointer-events: none;
        }
        .heroGrid {
          position: relative;
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          padding: 18px;
        }
        @media (min-width: 980px) {
          .heroGrid {
            grid-template-columns: 1fr 1fr; /* ✅ 右侧更宽 */
            gap: 18px;
            padding: 20px;
            align-items: start;
          }
        }

        .heroLeft {
          padding: 6px 4px;
        }
        .heroKicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(19, 109, 255, 0.22);
          background: rgba(19, 109, 255, 0.08);
          color: #0b5aa6;
          padding: 7px 10px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 12px;
        }
        .heroTitle {
          margin: 12px 0 0;
          font-size: 30px;
          line-height: 1.15;
          font-weight: 1100;
          letter-spacing: -0.6px;
        }
        @media (min-width: 980px) {
          .heroTitle {
            font-size: 36px;
          }
        }

        .heroCtas {
          margin-top: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .ctaPrimary {
          border-radius: 14px;
          padding: 10px 14px;
          font-weight: 1000;
          font-size: 13px;
          border: 1px solid rgba(17, 17, 17, 0.12);
          background: #111;
          color: white;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .ctaPrimary:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.18);
        }
        .ctaGhost {
          border-radius: 14px;
          padding: 10px 14px;
          font-weight: 1000;
          font-size: 13px;
          border: 1px solid rgba(17, 17, 17, 0.12);
          background: rgba(255, 255, 255, 0.85);
          color: #111;
          text-decoration: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .ctaGhost:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.1);
        }
        .ctaHint {
          font-size: 12px;
          font-weight: 900;
          color: rgba(17, 17, 17, 0.68);
        }

        .heroSteps {
          margin-top: 14px;
        }
        .stepsTitle {
          font-weight: 1000;
          font-size: 13px;
          opacity: 0.9;
        }
        .stepsGrid {
          margin-top: 10px;
          display: grid;
          gap: 10px;
          grid-template-columns: 1fr;
        }
        .stepCard {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border: 1px solid rgba(17, 17, 17, 0.08);
          background: rgba(255, 255, 255, 0.72);
          border-radius: 16px;
          padding: 12px;
        }
        .stepNo {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          border: 1px solid rgba(17, 17, 17, 0.1);
          background: rgba(17, 17, 17, 0.04);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 1100;
        }
        .stepT {
          font-weight: 1000;
          font-size: 13px;
        }
        .stepD {
          margin-top: 3px;
          font-size: 12px;
          line-height: 1.55;
          color: rgba(17, 17, 17, 0.68);
        }

        .heroRight {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .demoCard {
          border-radius: 22px;
          border: 1px solid rgba(17, 17, 17, 0.1);
          background: rgba(255, 255, 255, 0.86);
          overflow: hidden;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.08);
        }
        .demoTop {
          padding: 12px 12px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .demoDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(19, 109, 255, 0.8);
          box-shadow: 0 0 0 6px rgba(19, 109, 255, 0.12);
        }
        .demoTitle {
          font-weight: 1000;
          font-size: 13px;
        }
        .demoTag {
          font-size: 12px;
          font-weight: 1000;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(17, 17, 17, 0.08);
          background: rgba(17, 17, 17, 0.03);
        }

        /* ✅ 放大示例视频（让它更像参考站的“主视觉卡”） */
        .demoVideo {
          padding: 0 12px 0;
        }
        .demoVideo > :global(*) {
          /* 不依赖 HoverPreview 内部结构，外层给到足够空间即可 */
        }

        .demoBody {
          padding: 12px 12px 14px;
        }
        .demoName {
          font-weight: 1100;
          font-size: 14px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .demoBadges {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .demoLine {
          display: flex;
          gap: 8px;
          font-size: 12px;
          line-height: 1.4;
          margin-top: 10px;
        }
        .demoKey {
          opacity: 0.65;
          font-weight: 900;
          width: 68px;
          flex: 0 0 auto;
        }
        .demoVal {
          opacity: 0.9;
          font-weight: 900;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Section head */
        .sectionHead {
          margin-top: 18px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .sectionTitle {
          font-size: 16px;
          font-weight: 1100;
        }
        .sectionSub {
          margin-top: 3px;
          font-size: 12px;
          color: rgba(17, 17, 17, 0.62);
        }
        .statsPills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
        }
        .statPill {
          border: 1px solid rgba(17, 17, 17, 0.08);
          background: rgba(255, 255, 255, 0.75);
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 950;
          color: rgba(17, 17, 17, 0.78);
        }

        /* Filter */
        .filterWrap {
          margin-top: 10px;
          border: 1px solid rgba(17, 17, 17, 0.08);
          border-radius: 20px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.06);
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
          border: 1px solid rgba(17, 17, 17, 0.08);
          background: rgba(17, 17, 17, 0.03);
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
          padding: 11px 12px;
          border-radius: 16px;
          border: 1px solid rgba(17, 17, 17, 0.09);
          background: rgba(255, 255, 255, 0.92);
          cursor: pointer;
          display: flex;
          gap: 8px;
          align-items: center;
          transition: box-shadow 0.12s ease, transform 0.12s ease;
        }
        .fBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 44px rgba(0, 0, 0, 0.07);
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
          border: 1px solid rgba(17, 17, 17, 0.09);
          background: rgba(255, 255, 255, 0.98);
          border-radius: 16px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.12);
          z-index: 80;
          overflow: hidden;
          backdrop-filter: blur(12px);
        }
        .fPanelTop {
          padding: 8px;
          border-bottom: 1px solid rgba(17, 17, 17, 0.06);
          display: flex;
          gap: 8px;
          background: rgba(17, 17, 17, 0.02);
        }
        .miniBtn {
          border: 1px solid rgba(17, 17, 17, 0.1);
          border-radius: 12px;
          padding: 7px 10px;
          cursor: pointer;
          font-weight: 950;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.95);
        }
        .fSelect {
          width: 100%;
          padding: 11px 12px;
          border-radius: 16px;
          border: 1px solid rgba(17, 17, 17, 0.09);
          background: rgba(255, 255, 255, 0.92);
          font-weight: 950;
        }

        .checkRow {
          display: flex;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 14px;
          cursor: pointer;
          align-items: center;
          border: 1px solid transparent;
        }
        .checkRow.on {
          border-color: rgba(19, 109, 255, 0.22);
        }
        .checkName {
          font-size: 13px;
          font-weight: 900;
        }
        .checkCount {
          margin-left: auto;
          font-size: 12px;
          opacity: 0.6;
          font-weight: 900;
        }

        /* Cards */
        .cardGrid {
          margin-top: 12px;
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr; /* mobile */
        }
        @media (min-width: 640px) {
          .cardGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .cardGrid {
            grid-template-columns: repeat(3, 1fr); /* ✅ 桌面端固定一行3个 */
          }
        }

        .card {
          border: 1px solid rgba(17, 17, 17, 0.08);
          border-radius: 18px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.9);
          display: block;
          color: inherit;
          text-decoration: none;
          cursor: pointer;
          transition: box-shadow 0.18s ease, transform 0.18s ease;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }
        .card:hover {
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }
        .bmBtn {
          position: absolute;
          top: 10px;
          right: 10px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          padding: 8px 10px;
          font-weight: 1000;
          cursor: pointer;
          backdrop-filter: blur(10px);
        }
        .cardCorner {
          position: absolute;
          top: 10px;
          left: 10px;
        }
        .cornerTag {
          font-size: 12px;
          font-weight: 1000;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(17, 17, 17, 0.08);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
        }
        .cornerTag.vip {
          border-color: rgba(255, 82, 82, 0.25);
          background: rgba(255, 82, 82, 0.1);
          color: #b00000;
        }
        .cornerTag.free {
          border-color: rgba(19, 109, 255, 0.25);
          background: rgba(19, 109, 255, 0.1);
          color: #0b5aa6;
        }

        .cardBadges {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .titleLine {
          margin-top: 10px;
          font-size: 14px;
          font-weight: 1100;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 38px;
        }
        .metaLine {
          margin-top: 8px;
          font-size: 12px;
          opacity: 0.85;
          line-height: 1.5;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .vipHint {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 1000;
          color: #b00000;
        }
        .okHint {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 1000;
          color: #0b5aa6;
        }

        .footerHint {
          margin-top: 14px;
          text-align: center;
          font-size: 12px;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
