// app/components/home/SectionTitle.jsx
import { THEME } from "./theme";

export default function SectionTitle({ title }) {
  return (
    <div
      id="all"
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 11px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.76)",
            border: `1px solid ${THEME.colors.border}`,
            boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`,
              boxShadow: "0 0 0 5px rgba(79,70,229,0.10)",
            }}
            aria-hidden
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: THEME.colors.ink,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Content Library
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 26,
            lineHeight: 1.15,
            letterSpacing: "-0.04em",
            fontWeight: 980,
            color: THEME.colors.ink,
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: THEME.colors.faint,
            lineHeight: 1.7,
          }}
        >
          按兴趣、难度和访问权限筛选，找到最适合你当前状态的内容。
        </div>
      </div>
    </div>
  );
}
