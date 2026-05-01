"use client";
// app/components/SiteTabs.js
// 顶部导航栏的油管/美剧切换Tab
// 纯客户端组件，状态存在 sessionStorage，不影响任何SSR逻辑

import { useEffect, useState } from "react";

const SITE_KEY = "naila_home_site_v1";

const TABS = [
  { id: "yt",    label: "🎥 油管博主" },
  { id: "drama", label: "🎬 影视美剧" },
];

export default function SiteTabs() {
  const [site, setSite] = useState("yt");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 从 sessionStorage 读取上次选中的Tab
    try {
      const saved = sessionStorage.getItem(SITE_KEY);
      if (saved === "drama" || saved === "yt") setSite(saved);
    } catch {}
    setMounted(true);
  }, []);

  function handleSwitch(newSite) {
    setSite(newSite);
    try { sessionStorage.setItem(SITE_KEY, newSite); } catch {}
    // 通知页面上其他组件（HomeClient、HeroSection等）
    window.dispatchEvent(new CustomEvent("site-change", { detail: newSite }));
  }

  // 未挂载时不渲染，避免服务端/客户端不一致
  if (!mounted) return (
    <div style={{ display: "flex", gap: 4 }}>
      {TABS.map(tab => (
        <div key={tab.id} style={{ padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, color: "rgba(11,18,32,0.35)" }}>
          {tab.label}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 4, background: "rgba(15,23,42,0.05)", borderRadius: 999, padding: 3 }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleSwitch(tab.id)}
          style={{
            padding: "7px 14px",
            border: "none",
            borderRadius: 999,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: site === tab.id ? 800 : 600,
            background: site === tab.id ? "#fff" : "transparent",
            color: site === tab.id ? "#4f46e5" : "rgba(11,18,32,0.45)",
            boxShadow: site === tab.id ? "0 2px 8px rgba(11,18,32,0.10)" : "none",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
