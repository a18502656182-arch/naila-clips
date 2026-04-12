// app/components/home/FeaturedExamples.jsx
"use client";
import Link from "next/link";
import { THEME } from "./theme";

function formatDuration(sec) {
  const s = Number(sec || 0);
  if (!Number.isFinite(s) || s <= 0) return null;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function FeaturedExamples({ featured }) {
  if (!featured?.id) return null;

  const cover = featured.cover_url || "";
  const duration = formatDuration(featured.duration_sec);
  const title = featured.title || `Clip #${featured.id}`;
  const isVip = featured.access_tier === "vip";

  return (
    <>
      <style>{`
        .featCard {
          display: flex;
          flex-direction: column;
          width: 100%;
          align-self: stretch;
          border-radius: ${THEME.radii.lg}px;
          border: 1px solid ${THEME.colors.border};
          background: ${THEME.colors.surface};
          box-shadow: ${THEME.colors.shadow};
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transform: translateY(0);
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }
        .featCard:hover {
          transform: translateY(-1px);
          box-shadow: ${THEME.colors.shadowHover};
          border-color: ${THEME.colors.border2};
        }
        .featCover {
          position: relative;
          width: 100%;
          height: 240px;
          background: rgba(11,18,32,0.06);
          overflow: hidden;
          flex-shrink: 0;
        }
        @media (max-width: 640px) {
          .featCover {
            height: auto;
            aspect-ratio: 5/3;
          }
        }
        .featBody {
          padding: 12px;
          background: ${THEME.colors.surface};
        }
        .featTitle {
          font-size: 15px;
          font-weight: 950;
          color: ${THEME.colors.ink};
          line-height: 1.25;
          margin: 0 0 6px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <div style={{ width: "100%", minWidth: 0 }}>
      <Link href={`/clips/${featured.id}`} className="featCard">

        {/* 封面图区域 */}
        <div className="featCover">
          {cover ? (
            <img
              src={cover}
              alt={title}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "rgba(11,18,32,0.06)" }} />
          )}

          {/* 左上角：免费/会员标签 */}
          <div style={{
            position: "absolute", left: 10, top: 10,
            display: "flex", gap: 6, zIndex: 2,
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center",
              padding: "3px 8px", borderRadius: 999,
              background: isVip ? "#7c3aed" : "#10b981",
              color: "#fff", fontSize: 11, fontWeight: 800,
            }}>
              {isVip ? "会员" : "免费"}
            </span>
          </div>

          {/* 右下角：时长 */}
          {duration && (
            <div style={{
              position: "absolute", right: 10, bottom: 10, zIndex: 2,
              background: "rgba(11,18,32,0.78)", color: "#fff",
              fontSize: 12, padding: "4px 6px", borderRadius: 8, fontWeight: 700,
            }}>
              {duration}
            </div>
          )}
        </div>

        {/* 白底内容区 */}
        <div className="featBody">
          <h3 className="featTitle">{title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {featured.difficulty && (
              <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "rgba(245,158,11,0.14)", color: "#92400e" }}>
                {featured.difficulty}
              </span>
            )}
            {(featured.topics || []).map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "rgba(99,102,241,0.12)", color: "#3730a3" }}>
                {t}
              </span>
            ))}
            {(featured.channels || []).map((c) => (
              <span key={c} style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "rgba(6,182,212,0.13)", color: "#0e7490" }}>
                {c}
              </span>
            ))}
          </div>
        </div>

      </Link>
      </div>
    </>
  );
}
