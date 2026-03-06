// app/components/home/theme.js
export const THEME = {
  colors: {
    bg: "#f4f6fb",
    bgSoft: "#eef2ff",
    surface: "#ffffff",
    surface2: "rgba(255,255,255,0.82)",
    ink: "#0b1220",
    ink2: "#111827",
    muted: "rgba(11,18,32,0.68)",
    faint: "rgba(11,18,32,0.48)",
    faint2: "rgba(11,18,32,0.32)",
    border: "rgba(15,23,42,0.08)",
    border2: "rgba(15,23,42,0.14)",
    line: "rgba(99,102,241,0.12)",
    shadow: "0 14px 40px rgba(15,23,42,0.08)",
    shadowSoft: "0 10px 28px rgba(15,23,42,0.06)",
    shadowHover: "0 20px 56px rgba(15,23,42,0.14)",
    accent: "#4f46e5",
    accent2: "#06b6d4",
    accent3: "#818cf8",
    good: "#10b981",
    warn: "#f59e0b",
    vip: "#7c3aed",
    darkChip: "#111827",
  },
  radii: {
    xs: 10,
    sm: 12,
    md: 18,
    lg: 24,
    xl: 30,
    pill: 999,
  },
  spacing: {
    pageW: 1200,
  },
  font: {
    hero: 48,
    h1: 36,
    h2: 18,
    body: 14,
    small: 12,
  },
};

export function cxShadow(hover = false) {
  return hover ? THEME.colors.shadowHover : THEME.colors.shadow;
}
