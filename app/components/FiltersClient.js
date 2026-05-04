"use client";

// app/components/FiltersClient.js
import { useEffect, useMemo, useRef, useState } from "react";
import { THEME } from "./home/theme";

function toggleInArray(arr, value) {
  const set = new Set(arr || []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

function useOutsideClose(open, setOpen, refs = []) {
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      for (const r of refs) {
        if (r?.current && r.current.contains(e.target)) return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen, refs]);
}

// 多选下拉（油管站用）
function MultiSelectDropdown({ label, options, selected, onToggle, onSelectAll, renderItemLabel }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useOutsideClose(open, setOpen, [wrapRef]);

  const allSlugs = useMemo(() => (options || []).map((o) => o.slug), [options]);
  const isAll = allSlugs.length > 0 && selected.length === allSlugs.length;
  const buttonText = useMemo(() => selected?.length ? selected.join("、") : "全部", [selected]);

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 0 }}>
      <div style={{ fontSize: 12, color: THEME.colors.faint, marginBottom: 6 }}>{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 12,
          border: `1px solid ${THEME.colors.border2}`, background: THEME.colors.surface,
          color: THEME.colors.ink, fontSize: 13, display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 10, cursor: "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{buttonText}</span>
        <span style={{ color: THEME.colors.faint, fontSize: 12 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", zIndex: 30, top: "calc(100% + 8px)", left: 0,
          width: "100%", minWidth: 220, maxHeight: 280, overflow: "auto",
          borderRadius: 12, border: `1px solid ${THEME.colors.border}`,
          background: "rgba(255,255,255,0.98)", boxShadow: "0 18px 46px rgba(11,18,32,0.18)", padding: 8,
        }}>
          <label
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderRadius: 10, cursor: "pointer", userSelect: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(11,18,32,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <input type="checkbox" checked={isAll} onChange={() => onSelectAll(!isAll)} style={{ width: 14, height: 14 }} />
            <span style={{ fontSize: 13, color: THEME.colors.ink }}>全选</span>
          </label>
          <div style={{ height: 1, background: THEME.colors.border, margin: "6px 0" }} />
          {(options || []).map((o) => (
            <label
              key={o.slug}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderRadius: 10, cursor: "pointer", userSelect: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(11,18,32,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <input type="checkbox" checked={selected.includes(o.slug)} onChange={() => onToggle(o.slug)} style={{ width: 14, height: 14 }} />
              <span style={{ fontSize: 13, color: THEME.colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {renderItemLabel ? renderItemLabel(o) : o.slug}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// 单选下拉（美剧站用）
function SingleSelectDropdown({ label, options, selected, onSelect, renderLabel }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useOutsideClose(open, setOpen, [wrapRef]);
  const buttonText = selected ? (renderLabel ? renderLabel(selected) : selected) : "全部";

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 0 }}>
      <div style={{ fontSize: 12, color: THEME.colors.faint, marginBottom: 6 }}>{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 12,
          border: `1px solid ${THEME.colors.border2}`, background: THEME.colors.surface,
          color: THEME.colors.ink, fontSize: 13, display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 10, cursor: "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{buttonText}</span>
        <span style={{ color: THEME.colors.faint, fontSize: 12 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", zIndex: 30, top: "calc(100% + 8px)", left: 0,
          width: "100%", minWidth: 180, maxHeight: 280, overflow: "auto",
          borderRadius: 12, border: `1px solid ${THEME.colors.border}`,
          background: "rgba(255,255,255,0.98)", boxShadow: "0 18px 46px rgba(11,18,32,0.18)", padding: 8,
        }}>
          {/* 全部选项 */}
          <div
            onClick={() => { onSelect(""); setOpen(false); }}
            style={{
              padding: "8px 10px", borderRadius: 10, cursor: "pointer", fontSize: 13,
              color: !selected ? "#4f46e5" : THEME.colors.ink,
              fontWeight: !selected ? 700 : 400,
              background: !selected ? "rgba(79,70,229,0.08)" : "transparent",
            }}
            onMouseEnter={(e) => { if (selected) e.currentTarget.style.background = "rgba(11,18,32,0.04)"; }}
            onMouseLeave={(e) => { if (selected) e.currentTarget.style.background = "transparent"; }}
          >
            全部
          </div>
          {(options || []).map((o) => (
            <div
              key={o.slug}
              onClick={() => { onSelect(o.slug); setOpen(false); }}
              style={{
                padding: "8px 10px", borderRadius: 10, cursor: "pointer", fontSize: 13,
                color: selected === o.slug ? "#4f46e5" : THEME.colors.ink,
                fontWeight: selected === o.slug ? 700 : 400,
                background: selected === o.slug ? "rgba(79,70,229,0.08)" : "transparent",
              }}
              onMouseEnter={(e) => { if (selected !== o.slug) e.currentTarget.style.background = "rgba(11,18,32,0.04)"; }}
              onMouseLeave={(e) => { if (selected !== o.slug) e.currentTarget.style.background = "transparent"; }}
            >
              {renderLabel ? renderLabel(o.slug) : o.slug}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 剧集目录抽屉（点击筛选）────────────────────────────────
const PINNED_SOURCES = ["美剧", "电影", "动画", "英剧"];

function ShowDrawer({ shows, sources, selectedShows, onSelectShow, onClose }) {
  const sortedSources = useMemo(() => {
    const pinned = PINNED_SOURCES.map(name => sources.find(s => s.slug === name)).filter(Boolean);
    const rest = sources.filter(s => !PINNED_SOURCES.includes(s.slug));
    return [...pinned, ...rest];
  }, [sources]);

  const [activeSource, setActiveSource] = useState(sortedSources[0]?.slug || null);

  const displayShows = useMemo(() => {
    if (!activeSource) return shows;
    return shows.filter((s) => s.source === activeSource);
  }, [shows, activeSource, sortedSources]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function handleSelectShow(slug) {
    if (selectedShows?.includes(slug)) {
      onSelectShow("");
    } else {
      onSelectShow(slug);
    }
    onClose();
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(11,18,32,0.35)", backdropFilter: "blur(2px)",
        }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
        width: "min(420px, 96vw)", background: "#fff",
        boxShadow: "-16px 0 60px rgba(11,18,32,0.14)",
        display: "flex", flexDirection: "column",
        animation: "drawerSlideIn 0.22s ease",
      }}>
        <style>{`
          @keyframes drawerSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
          .drawerBody::-webkit-scrollbar { width: 4px; }
          .drawerBody::-webkit-scrollbar-thumb { background: rgba(11,18,32,0.12); border-radius: 4px; }
          .drawerItem { display: flex; align-items: center; gap: 14px; padding: 11px 20px; border-bottom: 1px solid rgba(15,23,42,0.06); cursor: pointer; transition: background 0.12s; }
          .drawerItem:hover { background: rgba(99,102,241,0.06) !important; }
        `}</style>
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(15,23,42,0.08)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#0b1220" }}>🎬 全部剧集目录</div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(15,23,42,0.08)",
              background: "#f4f6fb", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8",
            }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sortedSources.map((src) => {
              const isActive = activeSource === src.slug;
              return (
                <button key={src.slug} onClick={() => setActiveSource(src.slug)} style={{
                  padding: "6px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                  cursor: "pointer", border: "none", transition: "all 0.15s",
                  background: isActive ? "#4f46e5" : "#f0f1f8",
                  color: isActive ? "#fff" : "#94a3b8",
                }}>{src.slug}</button>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(11,18,32,0.38)" }}>点击剧名筛选该剧集片段，再次点击取消</div>
        </div>
        <div className="drawerBody" style={{ flex: 1, overflowY: "auto", padding: "4px 0 24px" }}>
          {displayShows.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "rgba(11,18,32,0.38)", fontSize: 13 }}>暂无剧集</div>
          ) : (
            <div>
              {displayShows.map((s, i) => {
                const isSelected = selectedShows?.includes(s.slug);
                return (
                  <div key={s.slug} onClick={() => handleSelectShow(s.slug)} className="drawerItem"
                    style={{ background: isSelected ? "rgba(99,102,241,0.10)" : i % 2 === 0 ? "#fff" : "#fafbfd" }}>
                    <span style={{ minWidth: 22, fontSize: 12, fontWeight: 700, color: isSelected ? "#4f46e5" : "rgba(11,18,32,0.38)", textAlign: "right" }}>{i + 1}</span>
                    <span style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: isSelected ? "#4f46e5" : "#0b1220", flex: 1 }}>{s.slug}</span>
                    {isSelected && <span style={{ fontSize: 11, color: "#4f46e5", fontWeight: 700, whiteSpace: "nowrap" }}>筛选中 ✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── 剧名行：热门标签 + 全目录按钮 ────────────────────────
const HOT_COUNT = 10;
const HOT_COUNT_MOBILE = 5;
const PINNED_SHOWS = ["绝望主妇", "生活大爆炸", "老友记", "破产姐妹", "绝命毒师"];
const TAG_COLORS = [
  { bg: "rgba(99,102,241,0.10)", color: "#4338ca", border: "rgba(99,102,241,0.25)" },
  { bg: "rgba(16,185,129,0.10)", color: "#065f46", border: "rgba(16,185,129,0.25)" },
  { bg: "rgba(245,158,11,0.10)", color: "#92400e", border: "rgba(245,158,11,0.25)" },
  { bg: "rgba(239,68,68,0.10)",  color: "#991b1b", border: "rgba(239,68,68,0.25)"  },
  { bg: "rgba(6,182,212,0.10)",  color: "#0e7490", border: "rgba(6,182,212,0.25)"  },
  { bg: "rgba(139,92,246,0.10)", color: "#5b21b6", border: "rgba(139,92,246,0.25)" },
  { bg: "rgba(236,72,153,0.10)", color: "#9d174d", border: "rgba(236,72,153,0.25)" },
  { bg: "rgba(52,211,153,0.10)", color: "#065f46", border: "rgba(52,211,153,0.25)" },
];

function ShowFilter({ shows, sources, selectedShows, showSearch, onSelectShow, onSearchChange, onClearShows }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredShows = useMemo(() => {
    if (!showSearch.trim()) return shows;
    return shows.filter((s) => s.slug.toLowerCase().includes(showSearch.toLowerCase()));
  }, [shows, showSearch]);

  const hotShows = useMemo(() => {
    const pinned = PINNED_SHOWS.map(name => shows.find(s => s.slug === name)).filter(Boolean);
    const rest = shows.filter(s => !PINNED_SHOWS.includes(s.slug));
    return [...pinned, ...rest].slice(0, HOT_COUNT);
  }, [shows]);

  const displayShows = showSearch.trim() ? filteredShows : hotShows;

  function handleSelectShow(slug) {
    if (selectedShows.includes(slug)) {
      onSelectShow("");
    } else {
      onSelectShow(slug);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <style>{`
        .showTagMobileHide { display: inline-block; }
        @media (max-width: 960px) { .showTagMobileHide { display: none !important; } }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: THEME.colors.faint }}>剧集筛选</span>
        {selectedShows.length > 0 && (
          <span onClick={onClearShows} style={{ fontSize: 11, color: THEME.colors.accent, cursor: "pointer" }}>清空已选</span>
        )}
      </div>
      <div style={{ marginBottom: 8 }}>
        <input
          type="text" value={showSearch} onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索剧名…"
          style={{
            width: "100%", boxSizing: "border-box", padding: "7px 12px",
            borderRadius: 10, border: `1px solid ${THEME.colors.border2}`,
            background: THEME.colors.surface, color: THEME.colors.ink,
            fontSize: 13, outline: "none",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {displayShows.map((s, i) => {
          const isSelected = selectedShows.includes(s.slug);
          const palette = TAG_COLORS[i % TAG_COLORS.length];
          const hiddenOnMobile = !showSearch.trim() && i >= HOT_COUNT_MOBILE;
          return (
            <span
              key={s.slug}
              onClick={() => handleSelectShow(s.slug)}
              className={hiddenOnMobile ? "showTagMobileHide" : undefined}
              style={{
                padding: isSelected ? "6px 15px" : "5px 13px",
                borderRadius: 999, fontSize: isSelected ? 13 : 12, cursor: "pointer",
                userSelect: "none", transition: "all 0.18s", whiteSpace: "nowrap",
                fontWeight: 700,
                border: `1.5px solid ${isSelected ? THEME.colors.accent : palette.border}`,
                background: isSelected ? THEME.colors.accent : palette.bg,
                color: isSelected ? "#fff" : palette.color,
                boxShadow: isSelected ? "0 2px 10px rgba(99,102,241,0.35)" : "none",
                transform: isSelected ? "scale(1.06)" : "scale(1)",
              }}
            >{s.slug}</span>
          );
        })}
        {!showSearch.trim() && (
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              cursor: "pointer", whiteSpace: "nowrap", border: "none",
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.30)",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >🎬 全部剧集目录</button>
        )}
      </div>
      {drawerOpen && (
        <ShowDrawer
          shows={shows}
          sources={sources || []}
          selectedShows={selectedShows}
          onSelectShow={onSelectShow}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

const GENRE_LABELS = {
  喜剧: "喜剧", 悬疑: "悬疑", 爱情: "爱情", 犯罪: "犯罪",
  剧情: "剧情", 科幻: "科幻", 电影: "电影", 美剧: "美剧",
};

const DEFAULT_FILTERS_YT = { sort: "newest", access: [], difficulty: [], topic: [], channel: [], genre: "", duration: "", show: [] };
const DEFAULT_FILTERS_DRAMA = { sort: "newest", access: [], difficulty: [], genre: "", duration: "", show: [], showSearch: "", topic: [], channel: [] };

export default function FiltersClient({ filters, onFiltersChange, initialTaxonomies, site }) {
  const tax = initialTaxonomies || { difficulties: [], topics: [], channels: [], genres: [], durations: [], shows: [] };

  function update(patch) {
    onFiltersChange({ ...filters, ...patch });
  }

  // 当前激活的筛选chips
  const chips = useMemo(() => {
    const out = [];
    if (site === "yt") {
      (filters.difficulty || []).forEach((v) => out.push({ kind: "difficulty", v, label: v }));
      (filters.topic || []).forEach((v) => out.push({ kind: "topic", v, label: v }));
      (filters.channel || []).forEach((v) => out.push({ kind: "channel", v, label: v }));
    } else {
      if (filters.genre) out.push({ kind: "genre", v: filters.genre, label: GENRE_LABELS[filters.genre] || filters.genre });
      if (filters.duration) out.push({ kind: "duration", v: filters.duration, label: filters.duration });
      (filters.show || []).forEach((v) => out.push({ kind: "show", v, label: v }));
    }
    (filters.access || []).forEach((v) =>
      out.push({ kind: "access", v, label: v === "free" ? "免费" : v === "vip" ? "会员" : v })
    );
    return out;
  }, [filters, site]);

  function removeChip(kind, v) {
    if (kind === "difficulty") update({ difficulty: filters.difficulty.filter((x) => x !== v) });
    if (kind === "topic") update({ topic: filters.topic.filter((x) => x !== v) });
    if (kind === "channel") update({ channel: filters.channel.filter((x) => x !== v) });
    if (kind === "access") update({ access: filters.access.filter((x) => x !== v) });
    if (kind === "genre") update({ genre: "" });
    if (kind === "duration") update({ duration: "" });
    if (kind === "show") update({ show: filters.show.filter((x) => x !== v) });
  }

  const accessOptions = useMemo(() => [{ slug: "free" }, { slug: "vip" }], []);

  function clearAll() {
    onFiltersChange(site === "yt" ? DEFAULT_FILTERS_YT : DEFAULT_FILTERS_DRAMA);
  }

  return (
    <div>
      <style>{`
        .panel { position: relative; border: 1px solid ${THEME.colors.border}; border-radius: ${THEME.radii.lg}px; background: rgba(255,255,255,0.72); box-shadow: 0 10px 26px rgba(11,18,32,0.08); padding: 10px 12px; }
        .chipsRow { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
        .chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(79,70,229,0.20); background: rgba(79,70,229,0.10); color: #3730a3; font-size: 13px; user-select: none; }
        .chipX { width: 18px; height: 18px; border-radius: 999px; display: grid; place-items: center; border: 1px solid rgba(11,18,32,0.14); background: rgba(255,255,255,0.75); cursor: pointer; font-size: 12px; color: ${THEME.colors.ink}; }
        .row { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr; gap: 10px; align-items: end; }
        .rowDrama { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; gap: 10px; align-items: end; }
        .select { padding: 8px 10px; border-radius: 12px; border: 1px solid ${THEME.colors.border2}; background: ${THEME.colors.surface}; color: ${THEME.colors.ink}; font-size: 13px; outline: none; width: 100%; }
        .clearBtn { padding: 7px 12px; border-radius: 999px; border: 1px solid ${THEME.colors.border2}; background: ${THEME.colors.surface}; cursor: pointer; color: ${THEME.colors.ink}; font-size: 13px; }
        .clearBtnDesktop { display: flex; align-items: flex-end; }
        .clearBtnMobile { display: none; }
        @media (max-width: 960px) {
          .row { grid-template-columns: 1fr 1fr; }
          .rowDrama { grid-template-columns: 1fr 1fr; }
          .clearBtnDesktop { display: none; }
          .clearBtnMobile { display: flex; align-items: flex-end; }
        }
      `}</style>

      <div className="panel">
        {chips.length > 0 && (
          <div className="chipsRow">
            {chips.map((c) => (
              <span key={`${c.kind}:${c.v}`} className="chip">
                {c.label}
                <span className="chipX" onClick={() => removeChip(c.kind, c.v)}>×</span>
              </span>
            ))}
          </div>
        )}

        {/* 油管站筛选项 */}
        {site === "yt" && (
          <div className="row">
            <div>
              <div style={{ fontSize: 12, color: THEME.colors.faint, marginBottom: 6 }}>上传时间</div>
              <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="select">
                <option value="newest">最新优先</option>
                <option value="oldest">最早优先</option>
              </select>
            </div>
            <MultiSelectDropdown
              label="视频难度"
              options={tax.difficulties}
              selected={filters.difficulty || []}
              onToggle={(slug) => update({ difficulty: toggleInArray(filters.difficulty, slug) })}
              onSelectAll={(all) => update({ difficulty: all ? tax.difficulties.map((x) => x.slug) : [] })}
            />
            <MultiSelectDropdown
              label="访问权限"
              options={accessOptions}
              selected={filters.access || []}
              onToggle={(slug) => update({ access: toggleInArray(filters.access, slug) })}
              onSelectAll={(all) => update({ access: all ? accessOptions.map((x) => x.slug) : [] })}
              renderItemLabel={(o) => (o.slug === "free" ? "免费" : "会员")}
            />
            <MultiSelectDropdown
              label="视频话题"
              options={tax.topics}
              selected={filters.topic || []}
              onToggle={(slug) => update({ topic: toggleInArray(filters.topic, slug) })}
              onSelectAll={(all) => update({ topic: all ? tax.topics.map((x) => x.slug) : [] })}
            />
            <MultiSelectDropdown
              label="视频频道"
              options={tax.channels}
              selected={filters.channel || []}
              onToggle={(slug) => update({ channel: toggleInArray(filters.channel, slug) })}
              onSelectAll={(all) => update({ channel: all ? tax.channels.map((x) => x.slug) : [] })}
            />
            <div className="clearBtnDesktop">
              <button onClick={clearAll} className="clearBtn">清空筛选</button>
            </div>
            <div className="clearBtnMobile">
              <button onClick={clearAll} className="clearBtn">清空筛选</button>
            </div>
          </div>
        )}

        {/* 美剧站筛选项 */}
        {site === "drama" && (
          <>
            <div className="rowDrama">
              <div>
                <div style={{ fontSize: 12, color: THEME.colors.faint, marginBottom: 6 }}>上传时间</div>
                <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="select">
                  <option value="newest">最新优先</option>
                  <option value="oldest">最早优先</option>
                </select>
              </div>
              <MultiSelectDropdown
                label="访问权限"
                options={accessOptions}
                selected={filters.access || []}
                onToggle={(slug) => update({ access: toggleInArray(filters.access, slug) })}
                onSelectAll={(all) => update({ access: all ? accessOptions.map((x) => x.slug) : [] })}
                renderItemLabel={(o) => (o.slug === "free" ? "免费" : "会员")}
              />
              <SingleSelectDropdown
                label="内容类型"
                options={tax.genres || []}
                selected={filters.genre || ""}
                onSelect={(slug) => update({ genre: slug })}
                renderLabel={(slug) => GENRE_LABELS[slug] || slug}
              />
              <SingleSelectDropdown
                label="来源"
                options={tax.durations || []}
                selected={filters.duration || ""}
                onSelect={(slug) => update({ duration: slug })}
              />
              <div className="clearBtnDesktop">
                <button onClick={clearAll} className="clearBtn">清空筛选</button>
              </div>
              <div className="clearBtnMobile">
                <button onClick={clearAll} className="clearBtn">清空筛选</button>
              </div>
            </div>
            <ShowFilter
              shows={tax.shows || []}
              sources={tax.durations || []}
              selectedShows={filters.show || []}
              showSearch={filters.showSearch || ""}
              onSelectShow={(slug) => update({ show: slug ? [slug] : [] })}
              onSearchChange={(v) => update({ showSearch: v })}
              onClearShows={() => update({ show: [], showSearch: "" })}
            />
          </>
        )}
      </div>
    </div>
  );
}
