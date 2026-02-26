// app/components/home/HeroSection.jsx
import { THEME } from "./theme";

export default function HeroSection({ children }) {
  return (
    <section
      style={{
        borderRadius: THEME.radii.lg,
        border: `1px solid ${THEME.colors.border}`,
        background:
          "radial-gradient(900px 280px at 30% 0%, rgba(79,70,229,0.16), transparent 60%), radial-gradient(800px 260px at 85% 10%, rgba(6,182,212,0.14), transparent 55%), rgba(255,255,255,0.55)",
        boxShadow: "0 14px 46px rgba(11,18,32,0.10)",
        padding: 18,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            borderRadius: THEME.radii.md,
            background: "rgba(255,255,255,0.88)",
            border: `1px solid ${THEME.colors.border}`,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 270,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 980,
                letterSpacing: "-0.03em",
                color: THEME.colors.ink,
                lineHeight: 1.12,
              }}
            >
              看场景短片，
              <br />
              把口语练到敢开口
            </div>

            <div
              style={{
                marginTop: 10,
                color: THEME.colors.muted,
                fontSize: 14,
                lineHeight: 1.65,
                maxWidth: 520,
              }}
            >
              精选 YouTube 场景短片，配合双语字幕与词汇卡片。用更低成本、更高频率的方式，持续把输入变成输出。
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <a
                href="#all"
                style={{
                  background: THEME.colors.ink,
                  color: "#fff",
                  textDecoration: "none",
                  padding: "10px 14px",
                  borderRadius: THEME.radii.pill,
                  fontSize: 13,
                  fontWeight: 800,
                  boxShadow: "0 12px 26px rgba(11,18,32,0.18)",
                }}
              >
                立即观看示例
              </a>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: THEME.colors.faint,
                  fontSize: 13,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 999, background: THEME.colors.good }} />
                持续更新中
              </span>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>{children?.[0] || null}</div>
        </div>

        <div style={{ display: "flex", alignItems: "stretch" }}>{children?.[1] || null}</div>
      </div>
    </section>
  );
}
