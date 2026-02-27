"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { THEME } from "./home/theme";

function firstOrEmpty(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : "";
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

  // 内部仍用数组（兼容你原逻辑），但 UI 下拉框只控制“单选”
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

    // 下拉框单选：如果数组有值，就取第一个写入
    if (next.access?.length) params.set("access", next.access[0]);
    if (next.difficulty?.length) params.set("difficulty", next.difficulty[0]);
    if (next.topic?.length) params.set("topic", next.topic[0]);
    if (next.channel?.length) params.set("channel", next.channel[0]);

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

  // 当前选中值（单选）
  const selDifficulty = firstOrEmpty(filters.difficulty);
  const selTopic = firstOrEmpty(filters.topic);
  const selChannel = firstOrEmpty(filters.channel);
  const selAccess = firstOrEmpty(filters.access);

  return (
    <div>
      <style jsx>{`
        details.panel {
          border: 1px solid ${THEME.colors.border};
          border-radius: ${THEME.radii.lg}px;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 10px 26px rgba(11, 18, 32, 0.08);
          padding: 10px 12px;
        }

        summary.head {
          list-style: none;
          cursor: pointer;
          display: none;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          user-select: none;
        }
        summary.head::-webkit-details-marker {
          display: none;
        }

        .headLeft {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 950;
          color: ${THEME.colors.ink};
        }

        .badge {
          font-size: 12px;
          color: ${THEME.colors.faint};
        }

        .row {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr;
          gap: 10px;
          align-items: end;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .label {
          font-size: 12px;
          color: ${THEME.colors.faint};
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

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
          display: flex;
          align-items: center;
          justify-content: space-between;
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
          box-shadow: 0 10px 20px rgba(11, 18, 32, 0.1);
        }

        .hint {
          font-size: 12px;
          color: ${THEME.colors.faint};
        }

        /* 移动端：变成折叠面板 + 控件上下排列 */
        @media (max-width: 960px) {
          summary.head {
            display: flex;
            padding: 2px 2px 10px 2px;
          }
          .row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <details className="panel" open>
        <summary className="head">
          <div className="headLeft">
            <span>筛选</span>
            {taxLoading ? <span className="badge">计数更新中…</span> : <span className="badge">点击展开/收起</span>}
          </div>
          <span style={{ color: THEME.colors.faint, fontSize: 12 }}>⌄</span>
        </summary>

        <div className="row">
          <div className="field">
            <div className="label">上传时间</div>
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="select">
              <option value="newest">最新优先</option>
              <option value="oldest">最早优先</option>
            </select>
          </div>

          <div className="field">
            <div className="label">视频难度</div>
            <select
              value={selDifficulty}
              onChange={(e) => update({ difficulty: e.target.value ? [e.target.value] : [] })}
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
              value={selAccess}
              onChange={(e) => update({ access: e.target.value ? [e.target.value] : [] })}
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
              value={selTopic}
              onChange={(e) => update({ topic: e.target.value ? [e.target.value] : [] })}
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
              value={selChannel}
              onChange={(e) => update({ channel: e.target.value ? [e.target.value] : [] })}
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

          <div className="hint">{taxLoading ? "计数更新中…" : "筛选不会影响示例视频（固定免费示例）"}</div>
        </div>
      </details>
    </div>
  );
}
