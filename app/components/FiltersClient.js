// app/components/FiltersClient.js
"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function toComma(v) {
  if (!v || !v.length) return "";
  return v.join(",");
}

function fromComma(v) {
  if (!v) return [];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function FiltersClient({ initialFilters, taxonomies }) {
  const router = useRouter();
  const sp = useSearchParams();

  const state = useMemo(() => {
    // 以 URL 为准（RSC 也会按 URL 渲染）
    return {
      difficulty: fromComma(sp.get("difficulty")) || initialFilters.difficulty,
      topic: fromComma(sp.get("topic")) || initialFilters.topic,
      channel: fromComma(sp.get("channel")) || initialFilters.channel,
      access: fromComma(sp.get("access")) || initialFilters.access,
      sort: sp.get("sort") === "oldest" ? "oldest" : "newest",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  function update(next) {
    const params = new URLSearchParams(sp.toString());

    // 重置分页
    params.delete("offset");

    const setList = (k, arr) => {
      if (arr && arr.length) params.set(k, toComma(arr));
      else params.delete(k);
    };

    setList("difficulty", next.difficulty);
    setList("topic", next.topic);
    setList("channel", next.channel);
    setList("access", next.access);

    if (next.sort && next.sort !== "newest") params.set("sort", next.sort);
    else params.delete("sort");

    router.push(`/?${params.toString()}`);
  }

  function toggle(arr, v) {
    const s = new Set(arr || []);
    if (s.has(v)) s.delete(v);
    else s.add(v);
    return Array.from(s);
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>筛选</div>

        {/* sort */}
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ opacity: 0.7 }}>排序</span>
          <select
            value={state.sort}
            onChange={(e) => update({ ...state, sort: e.target.value })}
          >
            <option value="newest">最新</option>
            <option value="oldest">最早</option>
          </select>
        </label>

        {/* access */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.7 }}>权限</span>
          {["free", "member"].map((v) => (
            <button
              key={v}
              onClick={() => update({ ...state, access: toggle(state.access, v) })}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: state.access.includes(v) ? "#111" : "#fff",
                color: state.access.includes(v) ? "#fff" : "#111",
                cursor: "pointer",
              }}
            >
              {v === "free" ? "免费" : "会员"}
            </button>
          ))}
        </div>
      </div>

      {/* difficulty / topic / channel */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
        <Field
          title="难度"
          items={taxonomies.difficulties}
          selected={state.difficulty}
          onToggle={(slug) => update({ ...state, difficulty: toggle(state.difficulty, slug) })}
        />
        <Field
          title="Topic"
          items={taxonomies.topics}
          selected={state.topic}
          onToggle={(slug) => update({ ...state, topic: toggle(state.topic, slug) })}
        />
        <Field
          title="Channel"
          items={taxonomies.channels}
          selected={state.channel}
          onToggle={(slug) => update({ ...state, channel: toggle(state.channel, slug) })}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <button
          onClick={() => update({ difficulty: [], topic: [], channel: [], access: [], sort: "newest" })}
          style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
        >
          清空筛选
        </button>
      </div>
    </div>
  );
}

function Field({ title, items, selected, onToggle }) {
  return (
    <div style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(items || []).map((it) => {
          const on = (selected || []).includes(it.slug);
          return (
            <button
              key={it.slug}
              onClick={() => onToggle(it.slug)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: on ? "#111" : "#fff",
                color: on ? "#fff" : "#111",
                cursor: "pointer",
              }}
              title={typeof it.count === "number" ? `count: ${it.count}` : ""}
            >
              {it.name || it.slug}
              {typeof it.count === "number" ? ` (${it.count})` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
