"use client";
// app/components/SiteTabs.js
import { useEffect, useState } from "react";

const SITE_KEY = "naila_home_site_v1";

const TABS = [
  { id: "yt",    label: "🎥 油管博主" },
  { id: "drama", label: "🎬 影视美剧" },
];

export default function SiteTabs({ mobile = false }) {
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
        /* 桌面端：导航栏内的胶囊Tab */
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

        /* 手机端：导航栏内Tab隐藏，改用下方全宽Tab */
        .site-tabs-mobile-bar {
          display: none;
        }
        @media (max-width: 640px) {
          .site-tabs-wrap {
            display: none;
          }
          .site-tabs-mobile-bar {
            display: flex;
            border-bottom: 1px solid rgba(11,18,32,0.07);
            background: rgba(246,248,252,0.95);
          }
          .site-tab-mobile-btn {
            flex: 1;
            padding: 11px 0;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            color: rgba(11,18,32,0.4);
            transition: all 0.15s;
            position: relative;
          }
          .site-tab-mobile-btn.active {
            font-weight: 800;
            color: #4f46e5;
          }
          .site-tab-mobile-btn.active::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 20%;
            right: 20%;
            height: 2.5px;
            border-radius: 2px;
            background: #4f46e5;
          }
        }
      `}</style>

      {/* 桌面端：导航栏内胶囊Tab（mobile=false时显示） */}
      {!mobile && (
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
      )}

      {/* 手机端：导航栏下方全宽Tab（mobile=true时显示） */}
      {mobile && (
        <div className="site-tabs-mobile-bar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleSwitch(tab.id)}
              className={`site-tab-mobile-btn${site === tab.id ? " active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
