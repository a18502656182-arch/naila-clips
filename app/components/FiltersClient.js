"use client";

import { useEffect, useMemo, useState } from "react";
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

    if (next.sort && next.sort !== "newest") params.set("sort", next.sort);

    if (next.access?.length) params.set("access", next.access.join(","));
    if (next.difficulty?.length) params.set("difficulty", next.difficulty.join(","));
    if (next.topic?.length) params.set("topic", next.topic.join(","));
    if (next.channel?.length) params.set("channel", next.channel.join(","));

    const qs = params.toString();
    router.push(qs ? `/?${qs}` : `/`);

    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
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

  return (
    <div>
      <style jsx>{`
        .wrap {
          border: 1px solid ${THEME.colors.border};
          border-radius: ${THEME.radii.lg}px;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 10px 26px rgba(11, 18, 32, 0.08);
          padding: 12px;
        }

        .topRow {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .title {
          font-weight: 950;
          color: ${THEME.colors.ink};
          margin-right: 4px;
        }

        .control {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .label {
          font-size: 12px;
          color: ${THEME.colors.faint};
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .select {
          padding: 7px 10px;
          border-radius: 12px;
          border: 1px solid ${THEME.colors.border2};
          background: ${THEME.colors.surface};
          color: ${THEME.colors.ink};
          font-size: 13px;
          outline: none;
        }

        .chip {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid ${THEME.colors.border2};
          background: rgba(255, 255, 255, 0.9);
          color: ${THEME.colors.ink};
          cursor: pointer;
          font-size: 13px;
          user-select: none;
          white-space: nowrap;
          transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease, border-color 140ms ease;
        }
        .chip:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(11, 18, 32, 0.10);
          border-color: ${THEME.colors.border2};
        }

        .chipActive {
          border-color: rgba(79, 70, 229, 0.30);
          background: rgba(79, 70, 229, 0.12);
          color: #3730a3;
        }

        .chipCount {
          opacity: 0.7;
          margin-left: 6px;
          font-size: 12px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        .group {
          border: 1px solid ${THEME.colors.border};
          border-radius: ${THEME.radii.md}px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.88);
        }

        .groupTitle {
          font-weight: 900;
          color: ${THEME.colors.ink};
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .foot {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
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
        .clearBtn:hover {
          box-shadow: 0 10px 20px rgba(11, 18, 32, 0.10);
        }

        .loadingHint {
          opacity: 0.65;
          color: ${THEME.colors.faint};
          font-size: 12px;
        }

        @media (max-width: 960px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="wrap">
        <div className="topRow">
          <div className="title">筛选</div>

          <div className="control">
            <span className="label">排序</span>
            <select
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value })}
              className="select"
            >
              <option value="newest">最新</option>
              <option value="oldest">最早</option>
            </select>
          </div>

          <div className="control">
            <span className="label">权限</span>
            <div
              className={`chip ${filters.access.includes("free") ? "chipActive" : ""}`}
              onClick={() => update({ access: toggleInArray(filters.access, "free") })}
            >
              免费
            </div>
            <div
              className={`chip ${filters.access.includes("vip") ? "chipActive" : ""}`}
              onClick={() => update({ access: toggleInArray(filters.access, "vip") })}
            >
              会员
            </div>
          </div>

          {taxLoading ? <span className="loadingHint">计数更新中…</span> : null}
        </div>

        <div className="grid">
          <div className="group">
            <div className="groupTitle">难度</div>
            <div className="chips">
              {(tax?.difficulties || []).map((x) => {
                const active = filters.difficulty.includes(x.slug);
                return (
                  <div
                    key={x.slug}
                    className={`chip ${active ? "chipActive" : ""}`}
                    onClick={() => update({ difficulty: toggleInArray(filters.difficulty, x.slug) })}
                    title={taxLoading ? "计数加载中..." : ""}
                  >
                    {x.slug}
                    <span className="chipCount">({typeof x.count === "number" ? x.count : 0})</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="group">
            <div className="groupTitle">Topic</div>
            <div className="chips">
              {(tax?.topics || []).map((x) => {
                const active = filters.topic.includes(x.slug);
                return (
                  <div
                    key={x.slug}
                    className={`chip ${active ? "chipActive" : ""}`}
                    onClick={() => update({ topic: toggleInArray(filters.topic, x.slug) })}
                    title={taxLoading ? "计数加载中..." : ""}
                  >
                    {x.slug}
                    <span className="chipCount">({typeof x.count === "number" ? x.count : 0})</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="group">
            <div className="groupTitle">Channel</div>
            <div className="chips">
              {(tax?.channels || []).map((x) => {
                const active = filters.channel.includes(x.slug);
                return (
                  <div
                    key={x.slug}
                    className={`chip ${active ? "chipActive" : ""}`}
                    onClick={() => update({ channel: toggleInArray(filters.channel, x.slug) })}
                    title={taxLoading ? "计数加载中..." : ""}
                  >
                    {x.slug}
                    <span className="chipCount">({typeof x.count === "number" ? x.count : 0})</span>
                  </div>
                );
              })}
            </div>
          </div>
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
