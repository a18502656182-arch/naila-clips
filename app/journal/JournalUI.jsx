"use client";
import { THEME } from "../components/home/theme";

function Card({ children, style = {} }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 24,
        border: `1px solid ${THEME.colors.border}`,
        background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.86) 100%)",
        boxShadow: "0 18px 60px rgba(15,23,42,0.08), 0 2px 10px rgba(15,23,42,0.04)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        overflow: "hidden",
        boxSizing: "border-box",
        height: "100%",
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -100,
          right: -110,
          width: 250,
          height: 250,
          borderRadius: 999,
          background:
            "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.18), rgba(236,72,153,0.10), rgba(6,182,212,0.08), transparent 72%)",
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}

function SectionTitle({ emoji, title, sub, right }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(236,72,153,0.10), rgba(6,182,212,0.08))",
            border: "1px solid rgba(99,102,241,0.14)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18 }}>{emoji}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 1000, color: THEME.colors.ink }}>{title}</div>
          {sub ? <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 3 }}>{sub}</div> : null}
        </div>
      </div>
      {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </div>
  );
}

function MiniStat({ label, value, hint, accent }) {
  return (
    <div
      style={{
        minHeight: 118,
        padding: "16px 16px 14px",
        borderRadius: 22,
        border: `1px solid ${accent.border}`,
        background: accent.bg,
        boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 42, fontWeight: 1000, color: accent.color, lineHeight: 1 }}>{value}</div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: accent.color,
            padding: "6px 9px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.78)",
            border: `1px solid ${accent.border}`,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, color: THEME.colors.muted, fontWeight: 900, lineHeight: 1.5 }}>{hint}</div>
      </div>
    </div>
  );
}

export { Card, SectionTitle, MiniStat };
