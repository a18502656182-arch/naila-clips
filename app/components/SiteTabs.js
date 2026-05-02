"use client";
// app/components/SiteTabs.js
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
    try {
      const saved = sessionStorage.getItem(SITE_KEY);
      if (saved === "drama" || saved === "yt") setSite(saved);
    } catch {}
    setMounted(true);
  }, []);

  function handleSwitch(newSite) {
    setSite(newSite);
    try { sessionStorage.setItem(SITE_KEY, newSite); } catch {}
    window.dispatchEvent(new CustomEvent("site-change", { detail: newSite }));
  }

  return (
    <>
      <style>{`
        .site-tabs-wrap {
          display: flex;
          gap: 3px;
          background: rgba(15,23,42,0.05);
          border-radius: 999px;
          padding: 3px;
          flex-shrink: 0;
        }
        .site-tab-btn {
          padding: 7px 14px;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          background: transparent;
          color: rgba(11,18,32,0.45);
          transition: all 0.15s;
          white-space: nowrap;
        }
        .site-tab-btn.active {
          font-weight: 800;
          background: #fff;
          color: #4f46e5;
          box-shadow: 0 2px 8px rgba(11,18,32,0.10);
        }
        @media (max-width: 640px) {
          .site-tab-btn {
            padding: 6px 10px;
            font-size: 12px;
          }
        }
        @media (max-width: 400px) {
          .site-tab-btn {
            padding: 5px 8px;
            font-size: 11px;
          }
        }
      `}</style>
      <div className="site-tabs-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleSwitch(tab.id)}
            className={`site-tab-btn${site === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </>
  );
}
