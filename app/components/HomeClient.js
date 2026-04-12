"use client";
// app/components/HomeClient.js
import { useState, useEffect } from "react";

const BANNER_KEY = "naila_free_banner_closed_v1";
import FiltersClient from "./FiltersClient";
import ClipsGridClient from "./ClipsGridClient";
export default function HomeClient({ allItems, initialTaxonomies }) {
  const [filters, setFilters] = useState({
    sort: "newest",
    access: [],
    difficulty: [],
    topic: [],
    channel: [],
  });
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try { if (!localStorage.getItem(BANNER_KEY)) setShowBanner(true); } catch {}
  }, []);

  function closeBanner() {
    try { localStorage.setItem(BANNER_KEY, "1"); } catch {}
    setShowBanner(false);
  }

  function handleClickFree() {
    setFilters(f => ({ ...f, access: ["free"] }));
    closeBanner();
  }

  return (
    <div>
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
            <button onClick={handleClickFree} style={{ display: "inline", border: "none", padding: "2px 8px", borderRadius: 6, background: "rgba(99,102,241,0.12)", color: "#6366f1", fontWeight: 900, fontSize: 13, cursor: "pointer" }}>访问权限 → 免费</button>
            {" "}先体验免费视频 🎬
          </span>
          <button onClick={closeBanner} style={{ border: "none", background: "transparent", color: "rgba(11,18,32,0.35)", fontSize: 16, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>×</button>
        </div>
      )}
      <FiltersClient filters={filters} onFiltersChange={setFilters} initialTaxonomies={initialTaxonomies} />
      <div style={{ marginTop: 14 }}>
        <ClipsGridClient
          allItems={allItems || []}
          filters={filters}
        />
      </div>
    </div>
  );
}
