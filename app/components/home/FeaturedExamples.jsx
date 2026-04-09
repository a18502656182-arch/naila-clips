// app/components/home/FeaturedExamples.jsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { THEME } from "./theme";

function formatDuration(sec) {
  const s = Number(sec || 0);
  if (!Number.isFinite(s) || s <= 0) return null;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// 标签：实色背景，和视频卡片保持一致
function Pill({ children, tone = "neutral" }) {
  const map = {
    neutral: { bg: "rgba(11,18,32,0.72)", fg: "#fff", bd: "transparent" },
    free:    { bg: "#10b981", fg: "#fff", bd: "transparent" },
    vip:     { bg: "#7c3aed", fg: "#fff", bd: "transparent" },
    cyan:    { bg: "rgba(6,182,212,0.85)", fg: "#fff", bd: "transparent" },
  };
  const t = map[tone] || map.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontSize: 12,
        fontWeight: 800,
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function isHls(url) { return typeof url === "string" && url.includes(".m3u8"); }
function isPlayable(url) { return typeof url === "string" && url.length > 0; }

let hlsJsPromise = null;
function loadHlsJs() {
  if (hlsJsPromise) return hlsJsPromise;
  hlsJsPromise = new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    if (window.Hls) return resolve(window.Hls);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js";
    script.onload = () => resolve(window.Hls || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return hlsJsPromise;
}

function FeaturedHoverMedia({ coverUrl, videoUrl, title, hover }) {
  const vref = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    if (!hover) {
      try {
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        v.pause(); v.removeAttribute("src"); v.load();
      } catch {}
      return;
    }
    if (!isPlayable(videoUrl)) return;
    v.muted = true; v.playsInline = true; v.loop = true;
    if (isHls(videoUrl)) {
      loadHlsJs().then((Hls) => {
        if (!Hls) {
          if (v.canPlayType("application/vnd.apple.mpegurl")) { v.src = videoUrl; v.play().catch(() => {}); }
          return;
        }
        if (!Hls.isSupported() || !vref.current) return;
        const hls = new Hls({ enableWorker: false, lowLatencyMode: true, maxBufferLength: 8, maxMaxBufferLength: 15 });
        hlsRef.current = hls;
        hls.loadSource(videoUrl); hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => v.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) { hls.destroy(); hlsRef.current = null; } });
      });
    } else {
      try { v.src = videoUrl; v.currentTime = 0; v.play().catch(() => {}); } catch {}
    }
    return () => { try { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } } catch {} };
  }, [hover, videoUrl]);

  const showVideo = hover && isPlayable(videoUrl);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
      {coverUrl ? (
        <Image
          src={coverUrl} alt={title || ""} fill priority
          sizes="(max-width: 960px) 100vw, 460px"
          style={{ objectFit: "cover", transition: "opacity 200ms ease", opacity: showVideo ? 0 : 1 }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "rgba(11,18,32,0.06)" }} />
      )}
      <video
        ref={vref}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: showVideo ? 1 : 0, transition: "opacity 200ms ease", pointerEvents: "none" }}
        preload="none" muted playsInline loop
      />
    </div>
  );
}

function CoverPlaceholder() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 320,
        background:
          "linear-gradient(135deg, rgba(79,70,229,0.18), rgba(6,182,212,0.14)), radial-gradient(700px 240px at 20% 0%, rgba(255,255,255,0.58), transparent 55%), rgba(11,18,32,0.06)",
        position: "relative",
      }}
    />
  );
}

export default function FeaturedExamples({ featured }) {
  const [hover, setHover] = useState(false);
  if (!featured?.id) {
    return (
      <div
        style={{
          width: "100%",
          height: 320,
          borderRadius: 24,
          overflow: "hidden",
          border: `1px solid ${THEME.colors.border}`,
          background: "rgba(255,255,255,0.76)",
        }}
      >
        <CoverPlaceholder />
      </div>
    );
  }

  const cover = featured.cover_url || featured.video_url || "";
  const duration = formatDuration(featured.duration_sec);
  const title = featured.title || `Clip #${featured.id}`;
  const desc = featured.description || "从真实场景里理解表达，也把表达带进自己的口语系统。";
  const topics = Array.isArray(featured.topics) ? featured.topics.slice(0, 1) : [];
  const isVip = featured.access_tier === "vip";

  return (
    <>
      <style>{`
        .featuredHeroCard {
          transform: translateY(0);
          transition: transform 200ms ease, box-shadow 200ms ease;
        }
        .featuredHeroCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 48px rgba(15,23,42,0.14);
        }

        @media (max-width: 960px) {
          .featuredHeroCard {
            height: 300px !important;
            min-height: 300px !important;
          }
        }

        @media (max-width: 640px) {
          .featuredHeroCard {
            height: 260px !important;
            min-height: 260px !important;
            border-radius: 22px !important;
          }
          .featuredHeroInfo {
            left: 14px !important;
            right: 14px !important;
            bottom: 14px !important;
          }
          .featuredHeroInner {
            padding: 14px !important;
            border-radius: 18px !important;
          }
          .featuredHeroTitle {
            font-size: 20px !important;
            line-height: 1.1 !important;
          }
          .featuredHeroDesc {
            display: none !important;
          }
        }
      `}</style>

      <Link
        href={`/clips/${featured.id}`}
        className="featuredHeroCard"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: "relative",
          width: "100%",
          height: 320,
          minHeight: 320,
          borderRadius: 24,
          overflow: "hidden",
          display: "block",
          textDecoration: "none",
          color: "inherit",
          border: `1px solid ${THEME.colors.border}`,
          boxShadow: "0 16px 38px rgba(15,23,42,0.10)",
          background: "#dbe4f3",
        }}
      >
        <FeaturedHoverMedia coverUrl={cover} videoUrl={featured.video_url} title={title} hover={hover} />

        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            background:
              "linear-gradient(180deg, rgba(8,15,30,0.06) 0%, rgba(8,15,30,0.00) 24%, rgba(8,15,30,0.56) 100%)",
          }}
        />

        {/* 顶部标签区域 — zIndex:3 确保始终显示在媒体层之上 */}
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
            flexWrap: "wrap",
            zIndex: 3,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.86)",
              border: "1px solid rgba(255,255,255,0.65)",
              color: THEME.colors.ink,
              fontSize: 12,
              fontWeight: 900,
              boxShadow: "0 10px 24px rgba(15,23,42,0.10)",
              backdropFilter: "blur(10px)",
            }}
          >
            示例视频
          </span>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill tone={isVip ? "vip" : "free"}>{isVip ? "会员专享" : "免费试看"}</Pill>
            {duration ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(11,18,32,0.70)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {duration}
              </span>
            ) : null}
          </div>
        </div>

        {/* 底部信息区域 — zIndex:3 确保始终显示在媒体层之上 */}
        <div
          className="featuredHeroInfo"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
            zIndex: 3,
          }}
        >
          <div
            style={{
              width: "fit-content",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            {topics.map((t) => (
              <Pill key={t} tone="cyan">
                {String(t)}
              </Pill>
            ))}
          </div>

          <div
            className="featuredHeroInner"
            style={{
              padding: 16,
              borderRadius: 18,
              background: "rgba(255,255,255,0.82)",
              border: "1px solid rgba(255,255,255,0.62)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 14px 30px rgba(15,23,42,0.12)",
            }}
          >
            <div
              className="featuredHeroTitle"
              style={{
                fontSize: 18,
                lineHeight: 1.15,
                fontWeight: 950,
                letterSpacing: "-0.03em",
                color: THEME.colors.ink,
              }}
            >
              {title}
            </div>

            <div
              className="featuredHeroDesc"
              style={{
                marginTop: 6,
                color: THEME.colors.muted,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {desc}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  color: THEME.colors.ink,
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                点击进入精学
              </div>

              <div
                style={{
                  color: THEME.colors.faint,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {featured.created_at ? String(featured.created_at).slice(0, 10) : ""}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </>
  );
}
