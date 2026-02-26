// app/components/home/SectionTitle.jsx
import { THEME } from "./theme";

export default function SectionTitle({ title }) {
  return (
    <div id="all" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`,
            boxShadow: "0 10px 24px rgba(79,70,229,0.18)",
          }}
          aria-hidden
        />
        <div style={{ fontSize: 16, fontWeight: 950, color: THEME.colors.ink }}>{title}</div>
      </div>
    </div>
  );
}
