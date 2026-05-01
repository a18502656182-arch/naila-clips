"use client";
// app/components/HomeClient.js
import { useState, useEffect, useRef } from "react";
import FiltersClient from "./FiltersClient";
import ClipsGridClient from "./ClipsGridClient";

const SCROLL_KEY = "naila_home_scroll_v1";
const BANNER_KEY = "naila_free_banner_closed_v1";
const FILTERS_KEY = "naila_home_filters_v1";
const SITE_KEY = "naila_home_site_v1";

const DEFAULT_FILTERS = {
  sort: "newest",
  access: [],
  difficulty: [],
  topic: [],
  channel: [],
  genre: "",
  duration: "",
  show: [],
};

const TABS = [
  { id: "yt",    label: "🎥 油管博主" },
  { id: "drama", label: "🎬 影视美剧" },
];

export default function HomeClient({ allItems, initialTaxonomies }) {
  // 当前选中的站点 Tab
  const [site, setSite] = useState(() => {
    try { return sessionStorage.getItem(SITE_KEY) || "yt"; } catch { return "yt"; }
  });

  const [filters, setFilters] = useState(() => {
    try {
      const saved = sessionStorage.getItem(FILTERS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_FILTERS;
    } catch { return DEFAULT_FILTERS; }
  });

  const [showBanner, setShowBanner] = useState(false);
  const containerRef = useRef(null);
  const scrollRestored = useRef(false);
  const isRestoring = useRef(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(BANNER_KEY)) setShowBanner(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "auto";
    }
    return () => {
      if (typeof window !== "undefined") {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRestored.current) return;
    scrollRestored.current = true;
    try {
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (!saved) return;
      const top = parseInt(saved, 10);
      if (!top) return;
      let attempts = 0;
      function tryScroll() {
        attempts++;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll >= top || attempts >= 20) {
          isRestoring.current = true;
          window.scrollTo({ top, behavior: "instant" });
          setTimeout(() => { isRestoring.current = false; }, 500);
        } else {
          setTimeout(tryScroll, 100);
        }
      }
      setTimeout(tryScroll, 100);
    } catch {}
  }, []);

  useEffect(() => {
    let timer = null;
    function saveScroll() {
      if (isRestoring.current) return;
      try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch {}
    }
    function onScroll() {
      clearTimeout(timer);
      timer = setTimeout(saveScroll, 200);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("beforeunload", saveScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("beforeunload", saveScroll);
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    } catch {}
  }, [filters]);

  // 切换 Tab 时重置筛选，保存 site
  function handleSiteChange(newSite) {
    setSite(newSite);
    try { sessionStorage.setItem(SITE_KEY, newSite); } catch {}
    setFilters(DEFAULT_FILTERS);
  }

  function closeBanner() {
    try { localStorage.setItem(BANNER_KEY, "1"); } catch {}
    setShowBanner(false);
  }

  function handleClickFree() {
    setFilters(f => ({ ...f, access: ["free"] }));
    closeBanner();
  }

  return (
    <div ref={containerRef}>
      {/* 油管 / 美剧 Tab 切换 */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 16,
        borderBottom: "2px solid rgba(15,23,42,0.08)",
        paddingBottom: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleSiteChange(tab.id)}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "transparent",
              fontSize: 15,
              fontWeight: site === tab.id ? 900 : 500,
              color: site === tab.id ? "#4f46e5" : "rgba(11,18,32,0.45)",
              cursor: "pointer",
              borderBottom: site === tab.id ? "2px solid #4f46e5" : "2px solid transparent",
              marginBottom: -2,
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showBanner && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(124,58,237,0.06))",
          border: "1px solid rgba(99,102,241,0.18)",
          borderRadius: 12, padding: "10px 14px", marginBottom: 14,
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 18 }}>👋</span>
          <span style={{ fontSize: 13, color: "#0b1220", lineHeight: 1.6, flex: 1 }}>
            新来的？点击{" "}
            <button
              onClick={handleClickFree}
              style={{
                display: "inline", border: "none", padding: "2px 8px",
                borderRadius: 6, background: "rgba(99,102,241,0.12)",
                color: "#6366f1", fontWeight: 900, fontSize: 13,
                cursor: "pointer",
              }}
            >访问权限 → 免费</button>
            {" "}先体验免费视频 🎬
          </span>
          <button
            onClick={closeBanner}
            style={{
              border: "none", background: "transparent",
              color: "rgba(11,18,32,0.35)", fontSize: 16,
              cursor: "pointer", padding: "0 4px", flexShrink: 0,
            }}
          >×</button>
        </div>
      )}

      <FiltersClient
        filters={filters}
        onFiltersChange={setFilters}
        initialTaxonomies={initialTaxonomies}
        site={site}
      />
      <div style={{ marginTop: 14 }}>
        <ClipsGridClient
          allItems={allItems || []}
          filters={filters}
          site={site}
        />
      </div>
    </div>
  );
}
