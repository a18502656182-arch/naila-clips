// app/components/home/FeaturedExamples.jsx
import Link from "next/link";
import Image from "next/image";
import { THEME } from "./theme";

function formatDuration(sec) {
  const s = Number(sec || 0);
  if (!Number.isFinite(s) || s <= 0) return null;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function Pill({ children, tone = "neutral" }) {
  const map = {
    neutral: { bg: "rgba(11,18,32,0.05)", fg: THEME.colors.ink, bd: THEME.colors.border },
    free: { bg: "rgba(16,185,129,0.12)", fg: "#065f46", bd: "rgba(16,185,129,0.16)" },
    vip: { bg: "rgba(124,58,237,0.12)", fg: "#5b21b6", bd: "rgba(124,58,237,0.18)" },
    cyan: { bg: "rgba(6,182,212,0.10)", fg: "#155e75", bd: "rgba(6,182,212,0.16)" },
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
        fontWeight: 700,
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
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
        <div style={{ position: "absolute", inset: 0 }}>
          {cover ? (
            <Image
              src={cover}
              alt={title}
              fill
              sizes="(max-width: 960px) 100vw, 460px"
              style={{ objectFit: "cover" }}
              priority
            />
          ) : (
            <CoverPlaceholder />
          )}
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(8,15,30,0.06) 0%, rgba(8,15,30,0.00) 24%, rgba(8,15,30,0.56) 100%)",
          }}
        />

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

        <div
          className="featuredHeroInfo"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
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
