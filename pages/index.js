// pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import HoverPreview from "../components/HoverPreview";

/**
 * ✅ 只按你的要求改：
 * 1) 恢复 Hero（渐变背景 + “用真实场景...”大标题 + 按钮），位置不动
 * 2) 顶部条不 sticky：上滑可划走
 * 3) Topics/Channels 两行文字不显示 -> 彩色标签横排一行（手机更小）
 * 4) 手机端互换：示例视频卡片 & “怎么用更有效”小卡片的位置（Hero 左侧标题按钮不动）
 * 5) 示例视频固定为【免费】并可点进详情页，且不参与筛选（单独请求，不带筛选参数，只带 access=free）
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

          <div style={{ maxHeight: 260, overflow: "auto", padding: 8 }}>
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
                    background: checked ? "#f3fbff" : "transparent",
                    border: checked ? "1px solid #bfe3ff" : "1px solid transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(toggleInArray(value || [], opt.slug))}
                  />
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{opt.name || opt.slug}</div>
                  {typeof opt.count === "number" ? (
                    <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>{opt.count}</div>
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

function Badge({ children, tone = "gray" }) {
  const map = {
    gray: { bg: "#f5f5f5", bd: "#eee", tx: "#111" },
    vip: { bg: "#fff5f5", bd: "#ffd5d5", tx: "#b00000" },
    free: { bg: "#f3fbff", bd: "#bfe3ff", tx: "#0b5aa6" },
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
        fontWeight: 800,
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

/** 彩色标签：topic/channel */
function ColorTag({ children, kind = "topic" }) {
  const styles = {
    topic: { bg: "#ecfdf3", bd: "#bbf7d0", tx: "#166534" },
    channel: { bg: "#eff6ff", bd: "#bfdbfe", tx: "#1d4ed8" },
  };
  const s = styles[kind] || styles.topic;
  return (
    <span
      className="ctag"
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        fontWeight: 900,
        background: s.bg,
        border: `1px solid ${s.bd}`,
        color: s.tx,
        lineHeight: 1,
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

  // 登录态 & 收藏
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

  // ✅ 固定示例 clip（必须是 FREE）
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

  // 初始：读 URL 参数 -> 写到 state
  useEffect(() => {
    if (!router.isReady) return;
    setDifficulty(splitParam(router.query.difficulty));
    setTopic(splitParam(router.query.topic));
    setChannel(splitParam(router.query.channel));
    setAccess(splitParam(router.query.access));
    setSort(router.query.sort === "oldest" ? "oldest" : "newest");
  }, [router.isReady]);

  // taxonomies
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

  // 登录态 + 收藏
  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (!me.loading) loadBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.loading, me.logged_in]);

  // ✅ 固定示例 clip：只拉 FREE（不参与筛选）
  useEffect(() => {
    let mounted = true;
    fetchJson(`/api/clips?limit=1&offset=0&sort=newest&access=free&_t=${Date.now()}`)
      .then((d) => {
        if (!mounted) return;
        const it = d?.items?.[0] || null;
        setExampleClip(it);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [clipsReloadKey]);

  // filters -> url
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

  // 拉 clips
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

  // 无限滚动
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

  // ✅ 仅用于展示一行标签（topic/channel），不再显示两行文字
  function renderTopicChannelTags(it) {
    const t = Array.isArray(it?.topics) ? it.topics : [];
    const c = Array.isArray(it?.channels) ? it.channels : [];
    const tags = [
      ...t.slice(0, 3).map((x) => ({ kind: "topic", text: x })),
      ...c.slice(0, 3).map((x) => ({ kind: "channel", text: x })),
    ];
    if (!tags.length) return null;
    return (
      <div className="tagRow">
        {tags.map((x, idx) => (
          <ColorTag key={`${x.kind}:${x.text}:${idx}`} kind={x.kind}>
            {x.text}
          </ColorTag>
        ))}
      </div>
    );
  }

  return (
    <div className="pageBg">
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: 16 }}>
        {/* 顶部栏（✅ 不 sticky：上滑可划走） */}
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div className="logoDot" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 950, lineHeight: 1.1 }}>naila clips</div>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.65,
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                用真实场景练英语 · 秒级筛选 · 一键收藏
              </div>
            </div>
          </div>

          <div className="topbarRight">
            <UserMenu me={me} onLogout={logout} />
          </div>
        </div>

        {toast ? <div className="toast">{toast}</div> : null}

        {/* 未登录弹窗 */}
        {showAuthModal ? (
          <div onClick={() => setShowAuthModal(false)} className="modalMask">
            <div onClick={(e) => e.stopPropagation()} className="modalCard">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>需要登录</div>
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
                <div style={{ fontWeight: 900, fontSize: 16 }}>需要会员</div>
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

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>
                （刚刚点击的 clip：{pendingVipClipId || "-"}）
              </div>
            </div>
          </div>
        ) : null}

        {/* 统计 */}
        <div style={{ opacity: 0.75, margin: "14px 0 10px", fontSize: 13, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div>{loading ? "加载中..." : `共 ${total} 条（已显示 ${items.length} 条）`}</div>
          {me.logged_in ? <div>收藏：{bookmarkLoading ? "加载中..." : `${bookmarkIds.size} 条`}</div> : null}
        </div>

        {/* ✅ 恢复 Hero（渐变背景 + 大标题 + 按钮，位置不动） */}
        <div className="hero">
          <div className="heroInner">
            {/* 左侧：标题 + 文案 + 按钮（位置固定不动） */}
            <div className="heroLeft">
              <div className="heroBadge">🎬 场景化英语短视频数据库</div>
              <div className="heroTitle">
                用真实场景练口语，
                <br />
                每天 5 分钟就有进步
              </div>
              <div className="heroDesc">
                这里的 clip 都是「短 · 清晰 · 可复习」的英语片段。你可以按难度、Topic、Channel 快速筛选，马上找到想学的内容。
              </div>

              <div className="heroBtnRow">
                <a className="heroBtnPrimary" href="#filters">
                  立即开始筛选
                </a>
                <a className="heroBtnGhost" href="/register">
                  注册并兑换会员
                </a>
              </div>
            </div>

            {/* 右侧：示例视频 + 怎么用更有效（手机端互换它们的位置） */}
            <div className="heroRight">
              {/* 示例视频卡（固定 FREE + 可点详情页） */}
              <div className="heroExample">
                {exampleClip ? (
                  <a
                    href={`/clips/${exampleClip.id}`}
                    className="exampleCard"
                    onClick={(e) => handleCardClick(e, exampleClip)}
                    title={exampleClip.can_access ? "点击进入详情页" : me.logged_in ? "会员专享：去兑换开通" : "会员专享：请先登录"}
                  >
                    <div style={{ position: "relative" }}>
                      <HoverPreview
                        coverUrl={exampleClip.cover_url}
                        videoUrl={exampleClip.video_url}
                        alt={exampleClip.title || ""}
                        borderRadius={16}
                      />
                    </div>

                    <div className="exampleBody">
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Badge tone="free">免费</Badge>
                        <Badge>{exampleClip.difficulty || "unknown"}</Badge>
                        {exampleClip.duration_sec ? <Badge>{exampleClip.duration_sec}s</Badge> : null}
                      </div>

                      <div className="exampleTitle">{exampleClip.title || `Clip #${exampleClip.id}`}</div>

                      {/* ✅ 不再显示 Topics/Channels 两行文字，改为一行彩色标签 */}
                      {renderTopicChannelTags(exampleClip)}

                      <div className="exampleHint">{exampleClip.can_access ? "点击进入详情页" : "会员专享：请登录并兑换码激活"}</div>
                    </div>
                  </a>
                ) : (
                  <div className="exampleCard" style={{ padding: 14, opacity: 0.7 }}>
                    示例视频加载中...
                  </div>
                )}
              </div>

              {/* 怎么用更有效（1/2/3） */}
              <div className="howCards">
                <div className="howTitle">怎么用更有效？</div>
                <div className="howGrid">
                  <div className="howCard">
                    <div className="howNum">1</div>
                    <div>
                      <div className="howHead">选一个你感兴趣的场景</div>
                      <div className="howDesc">从难度 / Topic / Channel 快速筛选，找到适合你的内容。</div>
                    </div>
                  </div>
                  <div className="howCard">
                    <div className="howNum">2</div>
                    <div>
                      <div className="howHead">看 1 分钟，跟读 3 遍</div>
                      <div className="howDesc">短视频更适合碎片化学习，练听力 + 口语输出更快。</div>
                    </div>
                  </div>
                  <div className="howCard">
                    <div className="howNum">3</div>
                    <div>
                      <div className="howHead">收藏进「视频收藏」</div>
                      <div className="howDesc">遇到喜欢的 clip 一键收藏，随时回看复习。</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* heroRight end */}
          </div>
        </div>

        {/* 筛选区 */}
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

            <button
              type="button"
              className="topBtn"
              onClick={() => {
                try {
                  const url = window.location.href;
                  navigator.clipboard?.writeText(url);
                  showToast("已复制分享链接");
                } catch {
                  showToast("复制失败（请手动复制地址栏）");
                }
              }}
              style={{ marginLeft: "auto" }}
            >
              复制分享链接
            </button>
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
                  <HoverPreview coverUrl={it.cover_url} videoUrl={it.video_url} alt={it.title || ""} borderRadius={14} />

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

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Badge tone={accessTone}>{it.access_tier === "vip" ? "会员" : "免费"}</Badge>
                  <Badge>{diffText}</Badge>
                  {it.duration_sec ? <Badge>{it.duration_sec}s</Badge> : null}
                </div>

                <div className="titleLine">{it.title || `Clip #${it.id}`}</div>

                {/* ✅ 彩色标签一行 */}
                {renderTopicChannelTags(it)}

                {!it.can_access ? <div className="vipHint">会员专享：请登录并兑换码激活</div> : <div className="okHint">可播放</div>}
              </a>
            );
          })}
        </div>

        {!loading && items.length === 0 ? <div style={{ marginTop: 16, opacity: 0.7 }}>没有结果（请换筛选条件）</div> : null}

        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, opacity: 0.7 }}>
          {loadingMore ? "加载更多中..." : hasMore ? "下滑自动加载更多" : "没有更多了"}
        </div>

        <div ref={sentinelRef} style={{ height: 1 }} />

        <style jsx global>{`
          .pageBg {
            min-height: 100vh;
            background: radial-gradient(1200px 600px at 10% 10%, rgba(59, 130, 246, 0.18), transparent 60%),
              radial-gradient(900px 500px at 90% 15%, rgba(236, 72, 153, 0.16), transparent 55%),
              radial-gradient(900px 500px at 50% 100%, rgba(34, 197, 94, 0.12), transparent 55%),
              #f7f8fb;
          }

          .topbar {
            /* ✅ 不 sticky：上滑可划走 */
            position: relative;
            z-index: 20;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(10px);
            border: 1px solid #eee;
            border-radius: 16px;
            padding: 12px 12px;
            display: flex;
            gap: 10px;
            align-items: center;
            justify-content: space-between;
          }
          .logoDot {
            width: 14px;
            height: 14px;
            border-radius: 999px;
            background: #111;
          }
          .topbarRight {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .topBtn {
            border: 1px solid #eee;
            background: white;
            border-radius: 12px;
            padding: 8px 12px;
            cursor: pointer;
            text-decoration: none;
            color: #111;
            font-weight: 900;
            font-size: 12px;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .topBtn:hover {
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
          }
          .topBtn.dark {
            background: #111;
            border-color: #111;
            color: white;
          }

          /* 头像菜单 */
          .avatarBtn {
            border: 1px solid #eee;
            background: white;
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
            border: 1px solid #eee;
            background: white;
            border-radius: 16px;
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.12);
            overflow: hidden;
            z-index: 50;
          }
          .menuHead {
            padding: 12px;
            border-bottom: 1px solid #eee;
            background: #fafafa;
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
            border: 1px solid #eee;
            background: white;
            border-radius: 12px;
            padding: 10px 10px;
            cursor: pointer;
            text-decoration: none;
            color: #111;
            font-weight: 900;
            font-size: 12px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .menuItem:hover {
            background: #fafafa;
          }
          .menuItem.danger {
            border-color: #ffd5d5;
            background: #fff5f5;
            color: #b00000;
          }

          .toast {
            margin-top: 10px;
            margin-bottom: 10px;
            padding: 10px 12px;
            border: 1px solid #eee;
            border-radius: 12px;
            background: white;
            font-size: 13px;
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
            background: white;
            border-radius: 16px;
            border: 1px solid #eee;
            padding: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          }

          /* ✅ Hero 恢复（渐变蓝色背景块） */
          .hero {
            margin-top: 14px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.7);
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.16), rgba(16, 185, 129, 0.12));
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.08);
            overflow: hidden;
          }
          .heroInner {
            padding: 16px;
            display: grid;
            gap: 14px;
            grid-template-columns: 1fr;
          }
          @media (min-width: 960px) {
            .heroInner {
              grid-template-columns: 1.25fr 0.75fr;
              align-items: start;
              padding: 18px;
            }
          }

          .heroLeft {
            background: rgba(255, 255, 255, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.9);
            border-radius: 18px;
            padding: 16px;
            backdrop-filter: blur(10px);
          }
          .heroBadge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            font-weight: 950;
            font-size: 12px;
            background: rgba(59, 130, 246, 0.12);
            border: 1px solid rgba(59, 130, 246, 0.25);
            color: #0b5aa6;
          }
          .heroTitle {
            margin-top: 12px;
            font-weight: 1000;
            font-size: 34px;
            line-height: 1.12;
            letter-spacing: -0.5px;
          }
          @media (max-width: 640px) {
            .heroTitle {
              font-size: 28px;
            }
          }
          .heroDesc {
            margin-top: 10px;
            font-size: 13px;
            opacity: 0.8;
            line-height: 1.7;
          }
          .heroBtnRow {
            margin-top: 14px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .heroBtnPrimary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 14px;
            border-radius: 999px;
            background: #111;
            color: #fff;
            text-decoration: none;
            font-weight: 950;
            font-size: 13px;
            border: 1px solid #111;
          }
          .heroBtnPrimary:hover {
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
          }
          .heroBtnGhost {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 14px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.9);
            color: #111;
            text-decoration: none;
            font-weight: 950;
            font-size: 13px;
            border: 1px solid rgba(0, 0, 0, 0.08);
          }

          .heroRight {
            display: grid;
            gap: 12px;
          }

          /* ✅ 手机端互换：howCards 与 example 的位置 */
          .heroExample {
            order: 1;
          }
          .howCards {
            order: 2;
          }
          @media (max-width: 640px) {
            .heroExample {
              order: 2;
            }
            .howCards {
              order: 1;
            }
          }

          .howCards {
            background: rgba(255, 255, 255, 0.72);
            border: 1px solid rgba(255, 255, 255, 0.9);
            border-radius: 18px;
            padding: 12px;
            backdrop-filter: blur(10px);
          }
          .howTitle {
            font-weight: 950;
            font-size: 13px;
            margin-bottom: 10px;
          }
          .howGrid {
            display: grid;
            gap: 10px;
          }
          .howCard {
            border: 1px solid rgba(0, 0, 0, 0.06);
            border-radius: 14px;
            padding: 10px;
            display: flex;
            gap: 10px;
            align-items: flex-start;
            background: rgba(255, 255, 255, 0.85);
          }
          .howNum {
            width: 28px;
            height: 28px;
            border-radius: 999px;
            border: 1px solid rgba(0, 0, 0, 0.08);
            background: rgba(0, 0, 0, 0.03);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 950;
            font-size: 12px;
            flex: 0 0 auto;
          }
          .howHead {
            font-weight: 950;
            font-size: 13px;
          }
          .howDesc {
            margin-top: 4px;
            font-size: 12px;
            opacity: 0.75;
            line-height: 1.5;
          }

          .exampleCard {
            border: 1px solid rgba(255, 255, 255, 0.9);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.85);
            display: block;
            text-decoration: none;
            color: inherit;
            overflow: hidden;
            backdrop-filter: blur(10px);
            box-shadow: 0 14px 36px rgba(0, 0, 0, 0.08);
          }
          .exampleBody {
            padding: 12px;
          }
          .exampleTitle {
            margin-top: 10px;
            font-size: 14px;
            font-weight: 950;
            line-height: 1.35;
          }
          .exampleHint {
            margin-top: 10px;
            font-size: 12px;
            font-weight: 900;
            opacity: 0.75;
          }

          .filterWrap {
            margin-top: 14px;
            border: 1px solid #eee;
            border-radius: 16px;
            padding: 12px;
            margin-bottom: 16px;
            background: rgba(255, 255, 255, 0.88);
            backdrop-filter: blur(10px);
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
            border: 1px solid #eee;
            background: #fafafa;
            border-radius: 999px;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
          }

          .fLabel {
            font-size: 12px;
            opacity: 0.7;
            margin-bottom: 6px;
            font-weight: 800;
          }
          .fBtn {
            width: 100%;
            text-align: left;
            padding: 10px 12px;
            border-radius: 14px;
            border: 1px solid #eee;
            background: white;
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
            font-weight: 800;
          }
          .fPanel {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            border: 1px solid #eee;
            background: white;
            border-radius: 16px;
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.12);
            z-index: 50;
            overflow: hidden;
          }
          .miniBtn {
            border: 1px solid #eee;
            border-radius: 12px;
            padding: 6px 10px;
            cursor: pointer;
            font-weight: 900;
            font-size: 12px;
          }
          .fSelect {
            width: 100%;
            padding: 10px 12px;
            border-radius: 14px;
            border: 1px solid #eee;
            background: white;
            font-weight: 900;
          }

          .cardGrid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 12px;
          }
          .card {
            border: 1px solid #eee;
            border-radius: 16px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(8px);
            display: block;
            color: inherit;
            text-decoration: none;
            cursor: pointer;
            transition: box-shadow 0.18s ease, transform 0.18s ease;
          }
          .card:hover {
            box-shadow: 0 14px 36px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
          }
          .bmBtn {
            position: absolute;
            top: 10px;
            right: 10px;
            border: 1px solid rgba(255, 255, 255, 0.7);
            background: rgba(255, 255, 255, 0.88);
            border-radius: 12px;
            padding: 8px 10px;
            font-weight: 900;
            cursor: pointer;
          }

          .titleLine {
            margin-top: 10px;
            font-size: 14px;
            font-weight: 950;
            line-height: 1.35;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            min-height: 38px;
          }

          /* ✅ 彩色标签横排一行（手机更小） */
          .tagRow {
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
          }
          .ctag {
            font-size: 12px;
          }
          @media (max-width: 640px) {
            .ctag {
              font-size: 11px;
              padding: 4px 8px !important;
            }
          }

          .vipHint {
            margin-top: 10px;
            font-size: 12px;
            font-weight: 900;
            color: #b00000;
          }
          .okHint {
            margin-top: 10px;
            font-size: 12px;
            font-weight: 900;
            color: #0b5aa6;
          }
        `}</style>
      </div>
    </div>
  );
}
