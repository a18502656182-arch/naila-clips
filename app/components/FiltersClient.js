"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

    // sort
    if (next.sort && next.sort !== "newest") params.set("sort", next.sort);

    // access/difficulty/topic/channel
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

  const chipStyle = (active) => ({
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? "#111" : "#ddd"}`,
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    cursor: "pointer",
    fontSize: 13,
    userSelect: "none",
    whiteSpace: "nowrap",
  });

  const groupBox = {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    background: "#fff",
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>筛选</div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ opacity: 0.7 }}>排序</span>
          <select
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value })}
            style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="newest">最新</option>
            <option value="oldest">最早</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ opacity: 0.7 }}>权限</span>
          <div
            style={chipStyle(filters.access.includes("free"))}
            onClick={() => update({ access: toggleInArray(filters.access, "free") })}
          >
            免费
          </div>
          <div
            style={chipStyle(filters.access.includes("vip"))}
            onClick={() => update({ access: toggleInArray(filters.access, "vip") })}
          >
            会员
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div style={groupBox}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>难度</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(tax?.difficulties || []).map((x) => (
              <div
                key={x.slug}
                style={chipStyle(filters.difficulty.includes(x.slug))}
                onClick={() => update({ difficulty: toggleInArray(filters.difficulty, x.slug) })}
                title={taxLoading ? "计数加载中..." : ""}
              >
                {x.slug} <span style={{ opacity: 0.8 }}>({typeof x.count === "number" ? x.count : 0})</span>
              </div>
            ))}
          </div>
        </div>

        <div style={groupBox}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Topic</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(tax?.topics || []).map((x) => (
              <div
                key={x.slug}
                style={chipStyle(filters.topic.includes(x.slug))}
                onClick={() => update({ topic: toggleInArray(filters.topic, x.slug) })}
                title={taxLoading ? "计数加载中..." : ""}
              >
                {x.slug} <span style={{ opacity: 0.8 }}>({typeof x.count === "number" ? x.count : 0})</span>
              </div>
            ))}
          </div>
        </div>

        <div style={groupBox}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Channel</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(tax?.channels || []).map((x) => (
              <div
                key={x.slug}
                style={chipStyle(filters.channel.includes(x.slug))}
                onClick={() => update({ channel: toggleInArray(filters.channel, x.slug) })}
                title={taxLoading ? "计数加载中..." : ""}
              >
                {x.slug} <span style={{ opacity: 0.8 }}>({typeof x.count === "number" ? x.count : 0})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        <button
          onClick={() => update({ difficulty: [], topic: [], channel: [], access: [], sort: "newest" })}
          style={{
            padding: "7px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          清空筛选
        </button>
        {taxLoading ? <span style={{ marginLeft: 10, opacity: 0.6 }}>计数更新中…</span> : null}
      </div>
    </div>
  );
}
