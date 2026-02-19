import { useEffect, useMemo, useState } from "react";

const DIFFICULTY_OPTIONS = [
  { label: "初级", value: "beginner" },
  { label: "中级", value: "intermediate" },
  { label: "高级", value: "advanced" }
];

export default function Home() {
  const [difficulty, setDifficulty] = useState("beginner");
  const [access, setAccess] = useState("free");
  const [order, setOrder] = useState("newest");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", "12");
    p.set("offset", "0");
    p.set("order", order);
    if (difficulty) p.set("difficulty", difficulty);
    if (access) p.set("access", access);
    return p.toString();
  }, [difficulty, access, order]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetch(`/api/clips?${qs}`)
      .then(r => r.json())
      .then(d => {
        if (ignore) return;
        setItems(d.items || []);
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => (ignore = true);
  }, [qs]);

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 12 }}>视频库（接口式筛选测试版）</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
        <label>
          难度：
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ marginLeft: 8 }}>
            {DIFFICULTY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label>
          权限：
          <select value={access} onChange={(e) => setAccess(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="free">免费</option>
            <option value="vip">会员专享</option>
          </select>
        </label>

        <label>
          排序：
          <select value={order} onChange={(e) => setOrder(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="newest">最新优先</option>
            <option value="oldest">最早优先</option>
          </select>
        </label>

        <div style={{ marginLeft: "auto", opacity: 0.7 }}>
          {loading ? "加载中..." : `共 ${items.length} 条`}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginTop: 16 }}>
        {items.map(it => (
          <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ aspectRatio: "16/9", background: "#f6f6f6" }}>
              {it.cover_url ? (
                <img src={it.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
            </div>

            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{it.title}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                {it.access_tier === "vip" ? "会员专享" : "免费"} · {it.duration_sec}s
              </div>

              <div style={{ marginTop: 10 }}>
                {it.can_access ? (
                  <a href={it.video_url || "#"} target="_blank" rel="noreferrer">打开视频链接</a>
                ) : (
                  <button onClick={() => alert("会员专享：请登录并兑换码激活会员")} style={{ padding: "8px 10px" }}>
                    会员专享（弹窗）
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 18, opacity: 0.65 }}>
        这是最小版：先验证“筛选秒刷新”。下一步我会帮你加：话题/博主多选、登录+兑换码、收藏。
      </p>
    </div>
  );
}
