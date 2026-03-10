"use client";

// app/components/FiltersClient.js
// ✅ 纯客户端筛选，不改 URL，通过 onFiltersChange 回调通知父组件
// ✅ 修复：taxonomies 只用服务端传来的初始数据，筛选时不再重新请求

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
    return selected?.length ? selected.join("、") : "全部";
  }, [selected]);

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 0 }}>
      <div style={{ fontSize: 12, color: THEME.colors.faint, marginBottom: 6 }}>
        {label}
      </div>
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

      {open && (
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
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(11,18,32,0.04)")
            }
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
          <div style={{ height: 1, background: THEME.colors.border, margin: "6px 0" }} />
          {(options || []).map((o) => (
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
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(11,18,32,0.04)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <input
                type="checkbox"
                checked={selected.includes(o.slug)}
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
          ))}
        </div>
      )}
    </div>
  );
}

export default function FiltersClient({ filters, onFiltersChange, initialTaxonomies }) {
  // ✅ 关键修改：直接用 initialTaxonomies，不再有任何 useEffect 请求 taxonomies
  const tax = initialTaxonomies || { difficulties: [], topics: [], channels: [] };

  function update(patch) {
    onFiltersChange({ ...filters, ...patch });
  }

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
    if (kind === "difficulty") update({ difficulty: filters.difficulty.filter((x) => x !== v) });
    if (kind === "topic") update({ topic: filters.topic.filter((x) => x !== v) });
    if (kind === "channel") update({ channel: filters.channel.filter((x) => x !== v) });
    if (kind === "access") update({ access: filters.access.filter((x) => x !== v) });
  }

  const accessOptions = useMemo(() => [{ slug: "free" }, { slug: "vip" }], []);

  return (
    <div>
      <style>{`
        .panel { border: 1px solid ${THEME.colors.border}; border-radius: ${THEME.radii.lg}px; background: rgba(255,255,255,0.72); box-shadow: 0 10px 26px rgba(11,18,32,0.08); padding: 10px 12px; }
        .chipsRow { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
        .chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(79,70,229,0.20); background: rgba(79,70,229,0.10); color: #3730a3; font-size: 13px; user-select: none; }
        .chipX { width: 18px; height: 18px; border-radius: 999px; display: grid; place-items: center; border: 1px solid rgba(11,18,32,0.14); background: rgba(255,255,255,0.75); cursor: pointer; font-size: 12px; color: ${THEME.colors.ink}; }
        .row { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr; gap: 10px; align-items: end; }
        .select { padding: 8px 10px; border-radius: 12px; border: 1px solid ${THEME.colors.border2}; background: ${THEME.colors.surface}; color: ${THEME.colors.ink}; font-size: 13px; outline: none; width: 100%; }
        .clearBtn { padding: 7px 12px; border-radius: 999px; border: 1px solid ${THEME.colors.border2}; background: ${THEME.colors.surface}; cursor: pointer; color: ${THEME.colors.ink}; font-size: 13px; width: 100%; }
        @media (max-width: 960px) { .row { grid-template-columns: 1fr 1fr; } }
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

        <div className="row">
          <div>
            <div style={{ fontSize: 12, color: THEME.colors.faint, marginBottom: 6 }}>
              上传时间
            </div>
            <select
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value })}
              className="select"
            >
              <option value="newest">最新优先</option>
              <option value="oldest">最早优先</option>
            </select>
          </div>

          <MultiSelectDropdown
            label="视频难度"
            options={tax.difficulties}
            selected={filters.difficulty}
            onToggle={(slug) => update({ difficulty: toggleInArray(filters.difficulty, slug) })}
            onSelectAll={(all) =>
              update({ difficulty: all ? tax.difficulties.map((x) => x.slug) : [] })
            }
          />

          <MultiSelectDropdown
            label="访问权限"
            options={accessOptions}
            selected={filters.access}
            onToggle={(slug) => update({ access: toggleInArray(filters.access, slug) })}
            onSelectAll={(all) => update({ access: all ? accessOptions.map((x) => x.slug) : [] })}
            renderItemLabel={(o) => (o.slug === "free" ? "免费" : "会员")}
          />

          <MultiSelectDropdown
            label="视频话题"
            options={tax.topics}
            selected={filters.topic}
            onToggle={(slug) => update({ topic: toggleInArray(filters.topic, slug) })}
            onSelectAll={(all) => update({ topic: all ? tax.topics.map((x) => x.slug) : [] })}
          />

          <MultiSelectDropdown
            label="视频频道"
            options={tax.channels}
            selected={filters.channel}
            onToggle={(slug) => update({ channel: toggleInArray(filters.channel, slug) })}
            onSelectAll={(all) => update({ channel: all ? tax.channels.map((x) => x.slug) : [] })}
          />

          {/* 清空筛选：桌面端紧跟第5列；手机端2列布局时自然落到左列，与上方对齐 */}
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={() => onFiltersChange({ sort: "newest", access: [], difficulty: [], topic: [], channel: [] })}
              className="clearBtn"
            >
              清空筛选
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
