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
    info: { bg: "rgba(79,70,229,0.10)", fg: "#3730a3", bd: "rgba(79,70,229,0.16)" },
    cyan: { bg: "rgba(6,182,212,0.10)", fg: "#155e75", bd: "rgba(6,182,212,0.16)" },
    warn: { bg: "rgba(245,158,11,0.12)", fg: "#92400e", bd: "rgba(245,158,11,0.18)" },
  };
  const t = map[tone] || map.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 9px",
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
        height: 260,
        background:
          "linear-gradient(135deg, rgba(79,70,229,0.18), rgba(6,182,212,0.14)), radial-gradient(700px 240px at 20% 0%, rgba(255,255,255,0.58), transparent 55%), rgba(11,18,32,0.06)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.2,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 18,
          bottom: 18,
          color: "#fff",
          fontWeight: 900,
          fontSize: 18,
          textShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}
      >
        Featured Example
      </div>
    </div>
  );
}

export default function FeaturedExamples({ featured }) {
  if (!featured?.id) {
    return (
      <div
        style={{
          width: "100%",
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78))",
          border: `1px solid ${THEME.colors.border}`,
          boxShadow: THEME.colors.shadow,
          overflow: "hidden",
          minHeight: 100,
        }}
      >
        <CoverPlaceholder />
        <div style={{ padding: 18, color: THEME.colors.faint, fontSize: 13 }}>暂无示例视频</div>
      </div>
    );
  }

  const cover = featured.cover_url || featured.video_url || "";
  const duration = formatDuration(featured.duration_sec);
  const title = featured.title || `Clip #${featured.id}`;
  const desc = featured.description || "从真实场景中理解表达，再把它带进自己的口语系统。";

  const topics = Array.isArray(featured.topics) ? featured.topics.slice(0, 2) : [];
  const channels = Array.isArray(featured.channels) ? featured.channels.slice(0, 2) : [];

  const isVip = featured.access_tier === "vip";
  const accessPill = isVip ? <Pill tone="vip">会员专享</Pill> : <Pill tone="free">免费试看</Pill>;
  const difficultyPill = featured.difficulty ? <Pill tone="warn">{String(featured.difficulty)}</Pill> : null;

  return (
    <>
      <style>{`
        a.featuredCard {
          transform: translateY(0);
          transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
        }
        a.featuredCard:hover {
          transform: translateY(-2px);
          box-shadow: ${THEME.colors.shadowHover};
          border-color: ${THEME.colors.border2};
        }
      `}</style>

      <Link
        href={`/clips/${featured.id}`}
        className="featuredCard"
        style={{
          width: "100%",
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78))",
          border: `1px solid ${THEME.colors.border}`,
          boxShadow: THEME.colors.shadow,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          textDecoration: "none",
          color: "inherit",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ position: "relative" }}>
          {cover ? (
            <div style={{ position: "relative", width: "100%", height: 260 }}>
              <Image
                src={cover}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 520px"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          ) : (
            <CoverPlaceholder />
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(8,15,30,0.04) 0%, rgba(8,15,30,0.00) 30%, rgba(8,15,30,0.36) 100%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 14,
              top: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                background: "rgba(255,255,255,0.78)",
                border: `1px solid rgba(255,255,255,0.62)`,
                display: "grid",
                placeItems: "center",
                color: THEME.colors.ink,
                fontSize: 16,
                userSelect: "none",
                pointerEvents: "none",
                backdropFilter: "blur(10px)",
                boxShadow: "0 10px 24px rgba(15,23,42,0.10)",
              }}
              aria-label="bookmark"
            >
              ♡
            </div>

            {accessPill}
          </div>

          <div
            style={{
              position: "absolute",
              left: 16,
              bottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.82)",
                border: "1px solid rgba(255,255,255,0.62)",
                backdropFilter: "blur(12px)",
                color: THEME.colors.ink,
                fontSize: 12,
                fontWeight: 800,
                boxShadow: "0 12px 26px rgba(15,23,42,0.10)",
              }}
            >
              本周示例视频
            </span>

            {duration ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: 999,
                  background: "rgba(11,18,32,0.68)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  boxShadow: "0 12px 26px rgba(15,23,42,0.16)",
                }}
              >
                {duration}
              </span>
            ) : null}
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 950,
                  fontSize: 20,
                  lineHeight: 1.25,
                  color: THEME.colors.ink,
                  letterSpacing: "-0.03em",
                }}
              >
                {title}
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: THEME.colors.muted,
                  fontSize: 13,
                  lineHeight: 1.72,
                }}
              >
                {desc}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {channels.map((t) => (
              <Pill key={`c-${t}`} tone="info">
                {String(t)}
              </Pill>
            ))}
            {topics.map((t) => (
              <Pill key={`t-${t}`} tone="cyan">
                {String(t)}
              </Pill>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {difficultyPill}
              <span
                style={{
                  color: THEME.colors.faint,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                适合用来快速进入学习状态
              </span>
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
      </Link>
    </>
  );
}
