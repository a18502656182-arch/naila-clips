"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { THEME } from "./home/theme";

function toggleInArray(arr, value) {
  const set = new Set(arr || []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

function sameArray(a, b) {
  const aa = Array.isArray(a) ? a : [];
  const bb = Array.isArray(b) ? b : [];
  if (aa.length !== bb.length) return false;
  const sa = [...aa].sort();
  const sb = [...bb].sort();
  return sa.every((x, i) => x === sb[i]);
}

function joinSelected(arr) {
  const a = Array.isArray(arr) ? arr : [];
  if (!a.length) return "全部";
  return a.join("、");
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

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  onSelectAll,
  renderItemLabel,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useOutsideClose(open, setOpen, [wrapRef]);

  const allSlugs = useMemo(() => (options || []).map((o) => o.slug), [options]);
  const isAll = allSlugs.length > 0 && selected.length === allSlugs.length;

  const buttonText = useMemo(() => {
    // ✅ 不要 “已选：”，直接显示选项（按你要求）
    return selected?.length ? joinSelected(selected) : "全部";
  }, [selected]);

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 0 }}>
      <div style={{ fontSize: 12, color: THEME.colors.faint, marginBottom: 6 }}>{label}</div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "8px 10px",
          borderRadius: 12,
          border: `1px solid ${THEME.colors.border2}`,
          background: THEME.colors.surface,
          color: THEME.colors.ink,
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          cursor: "pointer",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {buttonText}
        </span>
        <span style={{ color: THEME.colors.faint, fontSize: 12 }}>▾</span>
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            zIndex: 30,
            top: "calc(100% + 8px)",
            left: 0,
            width: "100%",
            minWidth: 220,
            maxHeight: 280,
            overflow: "auto",
            borderRadius: 12,
            border: `1px solid ${THEME.colors.border}`,
            background: "rgba(255,255,255,0.98)",
            boxShadow: "0 18px 46px rgba(11,18,32,0.18)",
            padding: 8,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 8px",
              borderRadius: 10,
              cursor: "pointer",
              userSelect: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(11,18,32,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <input
              type="checkbox"
              checked={isAll}
              onChange={() => onSelectAll(!isAll)}
              style={{ width: 14, height: 14 }}
            />
            <span style={{ fontSize: 13, color: THEME.colors.ink }}>全选</span>
          </label>

          <div style={{ height: 1, background: THEME.colors.border, margin: "6px 0 6px" }} />

          {(options || []).map((o) => {
            const checked = selected.includes(o.slug);
            return (
              <label
                key={o.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 8px",
                  borderRadius: 10,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(11,18,32,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(o.slug)}
                  style={{ width: 14, height: 14 }}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: THEME.colors.ink,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {renderItemLabel ? renderItemLabel(o) : o.slug}
                </span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function FiltersClient({ initialFilters, taxonomies }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // ✅ 只用 initialFilters 的“值”做 key，避免因为 taxonomies 传入新对象导致重置闪烁
  const initKey = useMemo(
    () =>
      JSON.stringify({
        difficulty: initialFilters?.difficulty || [],
        topic: initialFilters?.topic || [],
        channel: initialFilters?.channel || [],
        access: initialFilters?.access || [],
        sort: initialFilters?.sort || "newest",
      }),
    [initialFilters]
  );

  const [filters, setFilters] = useState(() => ({
    difficulty: initialFilters?.difficulty || [],
    topic: initialFilters?.topic || [],
    channel: initialFilters?.channel || [],
    access: initialFilters?.access || [],
    sort: initialFilters?.sort || "newest",
  }));

  const [tax, setTax] = useState(() => taxonomies || { difficulties: [], topics: [], channels: [] });

  // ✅ 只在 initKey 变化时同步（不会被 taxonomies 新对象触发）
  useEffect(() => {
    setFilters({
      difficulty: initialFilters?.difficulty || [],
      topic: initialFilters?.topic || [],
      channel: initialFilters?.channel || [],
      access: initialFilters?.access || [],
      sort: initialFilters?.sort || "newest",
    });
  }, [initKey, initialFilters]);

  // taxonomies counts：仍异步拉，但不显示“计数更新中…”
  const cleanedQueryString = useMemo(() => {
    const params = new URLSearchParams(sp.toString());
    params.delete("offset");
    return params.toString();
  }, [sp]);

  useEffect(() => {
    let aborted = false;

    async function run() {
      try {
        const url = `/rsc-api/taxonomies?${cleanedQueryString}`;
        const r = await fetch(url, { cache: "no-store" });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "taxonomies load failed");
        if (aborted) return;
        setTax({
          difficulties: data.difficulties || [],
          topics: data.topics || [],
          channels: data.channels || [],
        });
      } catch {
        // 失败不影响使用
      }
    }

    run();
    return () => {
      aborted = true;
    };
  }, [cleanedQueryString]);

  function pushWith(next) {
    const params = new URLSearchParams();

    if (next.sort && next.sort !== "newest") params.set("sort", next.sort);

    if (next.access?.length) params.set("access", next.access.join(","));
    if (next.difficulty?.length) params.set("difficulty", next.difficulty.join(","));
    if (next.topic?.length) params.set("topic", next.topic.join(","));
    if (next.channel?.length) params.set("channel", next.channel.join(","));

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/?${qs}` : `/`, { scroll: false });
    });
  }

  function update(patch) {
    const next = { ...filters, ...patch };

    const same =
      next.sort === filters.sort &&
      sameArray(next.access, filters.access) &&
      sameArray(next.difficulty, filters.difficulty) &&
      sameArray(next.topic, filters.topic) &&
      sameArray(next.channel, filters.channel);

    setFilters(next);
    if (!same) pushWith(next);
  }

  // ✅ chips 展示区（你明确要保留）
  const chips = useMemo(() => {
    const out = [];
    (filters.difficulty || []).forEach((v) => out.push({ kind: "difficulty", v, label: v }));
    (filters.topic || []).forEach((v) => out.push({ kind: "topic", v, label: v }));
    (filters.channel || []).forEach((v) => out.push({ kind: "channel", v, label: v }));
    (filters.access || []).forEach((v) =>
      out.push({ kind: "access", v, label: v === "free" ? "免费" : v === "vip" ? "会员" : v })
    );
    return out;
  }, [filters]);

  function removeChip(kind, v) {
    if (kind === "difficulty") update({ difficulty: (filters.difficulty || []).filter((x) => x !== v) });
    if (kind === "topic") update({ topic: (filters.topic || []).filter((x) => x !== v) });
    if (kind === "channel") update({ channel: (filters.channel || []).filter((x) => x !== v) });
    if (kind === "access") update({ access: (filters.access || []).filter((x) => x !== v) });
  }

  const accessOptions = useMemo(
    () => [{ slug: "free" }, { slug: "vip" }],
    []
  );

  return (
    <div>
      <style>{`
        .panel {
          border: 1px solid ${THEME.colors.border};
          border-radius: ${THEME.radii.lg}px;
          background: rgba(255,255,255,0.72);
          box-shadow: 0 10px 26px rgba(11,18,32,0.08);
          padding: 10px 12px;
        }

        .chipsRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(79,70,229,0.20);
          background: rgba(79,70,229,0.10);
          color: #3730a3;
          font-size: 13px;
          user-select: none;
        }
        .chipX {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(11,18,32,0.14);
          background: rgba(255,255,255,0.75);
          cursor: pointer;
          line-height: 1;
          font-size: 12px;
          color: ${THEME.colors.ink};
        }

        .row {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr;
          gap: 10px;
          align-items: end;
        }

        .field { display:flex; flex-direction:column; gap:6px; min-width:0; }
        .label { font-size:12px; color:${THEME.colors.faint}; white-space:nowrap; display:flex; gap:8px; align-items:center; }
        .badge { font-size:12px; color:${THEME.colors.faint}; }

        .select {
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid ${THEME.colors.border2};
          background: ${THEME.colors.surface};
          color: ${THEME.colors.ink};
          font-size: 13px;
          outline: none;
        }

        .foot {
          margin-top: 10px;
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap:10px;
          flex-wrap:wrap;
        }

        .clearBtn {
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid ${THEME.colors.border2};
          background: ${THEME.colors.surface};
          cursor: pointer;
          color: ${THEME.colors.ink};
          font-size: 13px;
        }

        @media (max-width: 960px) {
          .row { grid-template-columns: 1fr 1fr; }
          .span2 { grid-column: span 2; }
        }
      `}</style>

      <div className="panel">
        {/* ✅ chips 区：必须显示 */}
        {chips.length ? (
          <div className="chipsRow">
            {chips.map((c) => (
              <span key={`${c.kind}:${c.v}`} className="chip">
                {c.label}
                <span className="chipX" onClick={() => removeChip(c.kind, c.v)} aria-label="remove">
                  ×
                </span>
              </span>
            ))}
          </div>
        ) : null}

        <div className="row">
          <div className="field span2">
            <div className="label">
              上传时间
              {isPending ? <span className="badge">筛选中…</span> : null}
            </div>
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="select">
              <option value="newest">最新优先</option>
              <option value="oldest">最早优先</option>
            </select>
          </div>

          <MultiSelectDropdown
            label="视频难度"
            options={tax?.difficulties || []}
            selected={filters.difficulty}
            onToggle={(slug) => update({ difficulty: toggleInArray(filters.difficulty, slug) })}
            onSelectAll={(all) => update({ difficulty: all ? (tax?.difficulties || []).map((x) => x.slug) : [] })}
          />

          <MultiSelectDropdown
            label="访问权限"
            options={accessOptions}
            selected={filters.access}
            onToggle={(slug) => update({ access: toggleInArray(filters.access, slug) })}
            onSelectAll={(all) => update({ access: all ? accessOptions.map((x) => x.slug) : [] })}
            renderItemLabel={(o) => (o.slug === "free" ? "免费" : o.slug === "vip" ? "会员" : o.slug)}
          />

          <MultiSelectDropdown
            label="视频话题"
            options={tax?.topics || []}
            selected={filters.topic}
            onToggle={(slug) => update({ topic: toggleInArray(filters.topic, slug) })}
            onSelectAll={(all) => update({ topic: all ? (tax?.topics || []).map((x) => x.slug) : [] })}
          />

          <MultiSelectDropdown
            label="视频频道"
            options={tax?.channels || []}
            selected={filters.channel}
            onToggle={(slug) => update({ channel: toggleInArray(filters.channel, slug) })}
            onSelectAll={(all) => update({ channel: all ? (tax?.channels || []).map((x) => x.slug) : [] })}
          />
        </div>

        <div className="foot">
          <button
            onClick={() => update({ difficulty: [], topic: [], channel: [], access: [], sort: "newest" })}
            className="clearBtn"
          >
            清空筛选
          </button>
        </div>
      </div>
    </div>
  );
}
