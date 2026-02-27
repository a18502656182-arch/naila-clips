"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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

export default function FiltersClient({ initialFilters, taxonomies }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState(() => ({
    difficulty: initialFilters?.difficulty || [],
    topic: initialFilters?.topic || [],
    channel: initialFilters?.channel || [],
    access: initialFilters?.access || [],
    sort: initialFilters?.sort || "newest",
  }));

  const [tax, setTax] = useState(() => taxonomies || { difficulties: [], topics: [], channels: [] });
  const [taxLoading, setTaxLoading] = useState(false);

  useEffect(() => {
    setFilters({
      difficulty: initialFilters?.difficulty || [],
      topic: initialFilters?.topic || [],
      channel: initialFilters?.channel || [],
      access: initialFilters?.access || [],
      sort: initialFilters?.sort || "newest",
    });
    setTax(taxonomies || { difficulties: [], topics: [], channels: [] });
  }, [initialFilters, taxonomies]);

  const cleanedQueryString = useMemo(() => {
    const params = new URLSearchParams(sp.toString());
    params.delete("offset"); // ✅ 护栏：筛选变化永远从第 1 页开始
    return params.toString();
  }, [sp]);

  useEffect(() => {
    let aborted = false;

    async function run() {
      setTaxLoading(true);
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
      } finally {
        if (!aborted) setTaxLoading(false);
      }
    }

    run();
    return () => {
      aborted = true;
    };
  }, [cleanedQueryString]);

  function pushWith(next) {
    const params = new URLSearchParams();

    // sort
    if (next.sort && next.sort !== "newest") params.set("sort", next.sort);

    // 多选 -> 逗号拼接（与你最初 parseList 兼容）
    if (next.access?.length) params.set("access", next.access.join(","));
    if (next.difficulty?.length) params.set("difficulty", next.difficulty.join(","));
    if (next.topic?.length) params.set("topic", next.topic.join(","));
    if (next.channel?.length) params.set("channel", next.channel.join(","));

    const qs = params.toString();

    // ✅ 不自动回到顶部；保持参考站那种“当前位置更新”
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

  // ✅ 红框 chips：把所有已选项汇总显示
  const selectedChips = useMemo(() => {
    const chips = [];
    (filters.difficulty || []).forEach((v) => chips.push({ kind: "difficulty", v, label: v }));
    (filters.topic || []).forEach((v) => chips.push({ kind: "topic", v, label: v }));
    (filters.channel || []).forEach((v) => chips.push({ kind: "channel", v, label: v }));
    (filters.access || []).forEach((v) =>
      chips.push({ kind: "access", v, label: v === "free" ? "免费" : v === "vip" ? "会员" : v })
    );
    return chips;
  }, [filters]);

  function removeChip(kind, v) {
    if (kind === "difficulty") update({ difficulty: (filters.difficulty || []).filter((x) => x !== v) });
    if (kind === "topic") update({ topic: (filters.topic || []).filter((x) => x !== v) });
    if (kind === "channel") update({ channel: (filters.channel || []).filter((x) => x !== v) });
    if (kind === "access") update({ access: (filters.access || []).filter((x) => x !== v) });
  }

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
        .hint { font-size: 12px; color:${THEME.colors.faint}; }

        /* ✅ 手机端两列（参考站风格） */
        @media (max-width: 960px) {
          .row { grid-template-columns: 1fr 1fr; }
          .span2 { grid-column: span 2; }
        }
      `}</style>

      <div className="panel">
        {/* ✅ 红框：已选 chips（你要“加上”） */}
        {selectedChips.length ? (
          <div className="chipsRow">
            {selectedChips.map((c) => (
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
              {(isPending || taxLoading) ? <span className="badge">筛选中…</span> : null}
            </div>
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="select">
              <option value="newest">最新优先</option>
              <option value="oldest">最早优先</option>
            </select>
          </div>

          <div className="field">
            <div className="label">视频难度</div>
            {/* ✅ 多选：每次选择一个就 toggle 加入 chips，然后 select 自己回到“全部” */}
            <select
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                update({ difficulty: toggleInArray(filters.difficulty, v) });
              }}
              className="select"
            >
              <option value="">全部</option>
              {(tax?.difficulties || []).map((x) => (
                <option key={x.slug} value={x.slug}>
                  {x.slug} ({typeof x.count === "number" ? x.count : 0})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <div className="label">访问权限</div>
            <select
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                update({ access: toggleInArray(filters.access, v) });
              }}
              className="select"
            >
              <option value="">全部</option>
              <option value="free">免费</option>
              <option value="vip">会员</option>
            </select>
          </div>

          <div className="field">
            <div className="label">视频话题</div>
            <select
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                update({ topic: toggleInArray(filters.topic, v) });
              }}
              className="select"
            >
              <option value="">全部</option>
              {(tax?.topics || []).map((x) => (
                <option key={x.slug} value={x.slug}>
                  {x.slug} ({typeof x.count === "number" ? x.count : 0})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <div className="label">视频频道</div>
            <select
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                update({ channel: toggleInArray(filters.channel, v) });
              }}
              className="select"
            >
              <option value="">全部</option>
              {(tax?.channels || []).map((x) => (
                <option key={x.slug} value={x.slug}>
                  {x.slug} ({typeof x.count === "number" ? x.count : 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="foot">
          <button
            onClick={() => update({ difficulty: [], topic: [], channel: [], access: [], sort: "newest" })}
            className="clearBtn"
          >
            清空筛选
          </button>
          <div className="hint">{taxLoading ? "计数更新中…" : ""}</div>
        </div>
      </div>
    </div>
  );
}
