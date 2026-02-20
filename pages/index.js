import { useEffect, useMemo, useState } from "react";

function readArrayParam(searchParams, key) {
  // 兼容 ?difficulty=beginner,advanced  或 ?difficulty=beginner&difficulty=advanced
  const all = searchParams.getAll(key);
  if (all.length > 1) return all.filter(Boolean);
  const v = searchParams.get(key);
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function writeUrl({ difficulty, access, sort }) {
  const params = new URLSearchParams(window.location.search);

  // 清空旧值
  params.delete("difficulty");
  params.delete("access");
  params.delete("sort");

  // 写入新值（用逗号方式更短）
  if (difficulty.length) params.set("difficulty", difficulty.join(","));
  if (access.length) params.set("access", access.join(","));
  if (sort) params.set("sort", sort);

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

export default function Home() {
  const [difficulty, setDifficulty] = useState([]); // ["beginner","intermediate"]
  const [access, setAccess] = useState([]);         // ["free","member"]
  const [sort, setSort] = useState("newest");       // newest | oldest

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  // 1) 首次加载：从 URL 读参数，恢复筛选
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setDifficulty(readArrayParam(sp, "difficulty"));
    setAccess(readArrayParam(sp, "access"));
    setSort(sp.get("sort") || "newest");
  }, []);

  // 2) 当筛选变化：写入 URL + 拉接口
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (difficulty.length) params.set("difficulty", difficulty.join(","));
    if (access.length) params.set("access", access.join(","));
    if (sort) params.set("sort", sort);
    return params.toString();
  }, [difficulty, access, sort]);

  useEffect(() => {
    // 初次 url 读完后才会触发；这里同步 URL
    writeUrl({ difficulty, access, sort });

    const controller = new AbortController();
    async function run() {
      setLoading(true);
      try {
        const res = await fetch(`/api/clips?${queryString}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setItems(data.items || []);
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [queryString]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleInArray(arr, value) {
    if (arr.includes(value)) return arr.filter((x) => x !== value);
    return [...arr, value];
  }

  return (
    <div style={{ maxWidth: 920, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1 style={{ textAlign: "center", marginBottom: 18 }}>视频库（接口式筛选测试版）</h1>

      <div style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        border: "1px solid #eee",
        borderRadius: 12
      }}>
        {/* 难度：多选 */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <b>难度：</b>
          {[
            { slug: "beginner", label: "初级" },
            { slug: "intermediate", label: "中级" },
            { slug: "advanced", label: "高级" },
          ].map((o) => (
            <label key={o.slug} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={difficulty.includes(o.slug)}
                onChange={() => setDifficulty((d) => toggleInArray(d, o.slug))}
              />
              {o.label}
            </label>
          ))}
        </div>

        {/* 权限：多选 */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <b>权限：</b>
          {[
            { slug: "free", label: "免费" },
            { slug: "member", label: "会员专享" },
          ].map((o) => (
            <label key={o.slug} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={access.includes(o.slug)}
                onChange={() => setAccess((a) => toggleInArray(a, o.slug))}
              />
              {o.label}
            </label>
          ))}
        </div>

        {/* 排序 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <b>排序：</b>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">最新优先</option>
            <option value="oldest">最旧优先</option>
          </select>
        </div>

        {/* 清空 */}
        <button onClick={() => { setDifficulty([]); setAccess([]); setSort("newest"); }}>
          清空筛选
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: 10, color: "#666" }}>
        {loading ? "加载中..." : `结果：${items.length} 条`}
      </div>

      <div style={{
        marginTop: 22,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 16
      }}>
        {items.map((it) => (
          <div key={it.id} style={{
            border: "1px solid #eee",
            borderRadius: 14,
            overflow: "hidden",
            background: "#fff"
          }}>
            <div style={{ height: 160, background: "#f3f3f3" }}>
              {it.cover_url ? (
                <img src={it.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{it.title}</div>
              <div style={{ color: "#666", marginTop: 6 }}>
                {it.access_tier || it.access_tier === "" ? it.access_tier : ""} {it.duration_sec ? `· ${it.duration_sec}s` : ""}
              </div>
              {it.video_url ? (
                <a href={it.video_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8 }}>
                  打开视频链接
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
