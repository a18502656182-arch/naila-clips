// app/components/home/theme.js
export const THEME = {
  // “高级感但不黑白灰”：用 Ink Navy + Indigo + Cyan + Soft background
  colors: {
    bg: "#f6f7fb",
    surface: "#ffffff",
    ink: "#0b1220",
    muted: "rgba(11,18,32,0.62)",
    faint: "rgba(11,18,32,0.42)",
    border: "rgba(11,18,32,0.10)",
    border2: "rgba(11,18,32,0.16)",
    shadow: "0 10px 28px rgba(11,18,32,0.10)",
    shadowHover: "0 16px 44px rgba(11,18,32,0.16)",
    accent: "#4f46e5", // Indigo
    accent2: "#06b6d4", // Cyan
    good: "#10b981",
    warn: "#f59e0b",
    vip: "#7c3aed",
  },
  radii: {
    sm: 10,
    md: 14,
    lg: 18,
    pill: 999,
  },
  spacing: {
    pageW: 1200,
  },
  font: {
    h1: 34,
    h2: 16,
    body: 14,
    small: 12,
  },
};

export function cxShadow(hover = false) {
  return hover ? THEME.colors.shadowHover : THEME.colors.shadow;
}
