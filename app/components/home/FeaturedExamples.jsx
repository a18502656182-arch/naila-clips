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
    neutral: { bg: "rgba(11,18,32,0.06)", fg: THEME.colors.ink, bd: THEME.colors.border },
    free: { bg: "rgba(16,185,129,0.12)", fg: "#065f46", bd: "rgba(16,185,129,0.18)" },
    vip: { bg: "rgba(124,58,237,0.12)", fg: "#5b21b6", bd: "rgba(124,58,237,0.20)" },
    info: { bg: "rgba(79,70,229,0.12)", fg: "#3730a3", bd: "rgba(79,70,229,0.20)" },
    cyan: { bg: "rgba(6,182,212,0.12)", fg: "#155e75", bd: "rgba(6,182,212,0.20)" },
    warn: { bg: "rgba(245,158,11,0.14)", fg: "#92400e", bd: "rgba(245,158,11,0.20)" },
  };
  const t = map[tone] || map.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontSize: 12,
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
        height: 210,
        background:
          "linear-gradient(135deg, rgba(79,70,229,0.16), rgba(6,182,212,0.12)), radial-gradient(600px 220px at 20% 0%, rgba(255,255,255,0.55), transparent 55%), rgba(11,18,32,0.06)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(11,18,32,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(11,18,32,0.08) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          opacity: 0.22,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "absolute", left: 14, bottom: 14, color: THEME.colors.ink, opacity: 0.65, fontWeight: 800 }}>
        示例视频（免费）
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
          borderRadius: THEME.radii.lg,
          background: THEME.colors.surface,
          border: `1px solid ${THEME.colors.border}`,
          boxShadow: THEME.colors.shadow,
          overflow: "hidden",
        }}
      >
        <CoverPlaceholder />
        <div style={{ padding: 14, color: THEME.colors.faint, fontSize: 13 }}>暂无示例视频</div>
      </div>
    );
  }

  const cover = featured.cover_url || featured.video_url || "";
  const duration = formatDuration(featured.duration_sec);

  const title = featured.title || `Clip #${featured.id}`;
  const desc = featured.description || "打开一条场景短片，边看边学地道表达。";

  const topics = Array.isArray(featured.topics) ? featured.topics.slice(0, 2) : [];
  const channels = Array.isArray(featured.channels) ? featured.channels.slice(0, 2) : [];

  const isVip = featured.access_tier === "vip";
  const accessPill = isVip ? <Pill tone="vip">会员专享</Pill> : <Pill tone="free">免费示例</Pill>;
  const difficultyPill = featured.difficulty ? <Pill tone="warn">{String(featured.difficulty)}</Pill> : null;

  return (
    <>
      <style>{`
        a.featuredCard {
          transform: translateY(0);
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }
        a.featuredCard:hover {
          transform: translateY(-1px);
          box-shadow: ${THEME.colors.shadowHover};
          border-color: ${THEME.colors.border2};
        }
      `}</style>

      <Link
        href={`/clips/${featured.id}`}
        className="featuredCard"
        style={{
          width: "100%",
          borderRadius: THEME.radii.lg,
          background: THEME.colors.surface,
          border: `1px solid ${THEME.colors.border}`,
          boxShadow: THEME.colors.shadow,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div style={{ position: "relative" }}>
          {cover ? (
            <div style={{ position: "relative", width: "100%", height: 210 }}>
              <Image
                src={cover}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 500px"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          ) : (
            <CoverPlaceholder />
          )}

          {/* ✅ 收藏按钮：纯展示占位，不绑定 onClick（避免 Server->Client 事件传递报错） */}
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 10,
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "rgba(255,255,255,0.72)",
              border: `1px solid ${THEME.colors.border}`,
              display: "grid",
              placeItems: "center",
              color: THEME.colors.ink,
              fontSize: 16,
              userSelect: "none",
              pointerEvents: "none", // ✅ 防止点到它影响 Link 点击
            }}
            aria-label="bookmark"
          >
            ♡
          </div>

          <div style={{ position: "absolute", left: 52, top: 12 }}>{accessPill}</div>

          {duration ? (
            <div
              style={{
                position: "absolute",
                right: 10,
                bottom: 10,
                background: "rgba(11,18,32,0.78)",
                color: "#fff",
                fontSize: 12,
                padding: "4px 6px",
                borderRadius: 8,
                letterSpacing: "0.02em",
              }}
            >
              {duration}
            </div>
          ) : null}
        </div>

        <div style={{ padding: 14 }}>
          <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 6, color: THEME.colors.ink }}>{title}</div>
          <div style={{ color: THEME.colors.muted, fontSize: 13, lineHeight: 1.55 }}>{desc}</div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
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

          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{difficultyPill}</div>
            <div style={{ color: THEME.colors.faint, fontSize: 12 }}>
              {featured.created_at ? String(featured.created_at).slice(0, 10) : ""}
            </div>
          </div>
        </div>
      </Link>
    </>
  );
}
