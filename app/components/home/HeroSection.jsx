// app/components/home/HeroSection.jsx
export default function HeroSection({ children }) {
  return (
    <section
      style={{
        borderRadius: 20,
        background: "linear-gradient(90deg, rgba(219,234,254,0.85), rgba(209,250,229,0.85))",
        border: "1px solid rgba(0,0,0,0.06)",
        padding: 18,
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
            borderRadius: 16,
            background: "rgba(255,255,255,0.65)",
            border: "1px solid rgba(0,0,0,0.06)",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 260,
          }}
        >
          <div>
            <div style={{ fontSize: 34, fontWeight: 950, letterSpacing: "-0.02em" }}>
              看油管短片，把口语练到敢开口
            </div>
            <div style={{ marginTop: 10, color: "rgba(0,0,0,0.65)", fontSize: 14, lineHeight: 1.6 }}>
              精选 YouTube 场景短片，配合双语字幕和词汇卡片，让你每天 5 分钟沉浸式练听力和表达。
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href="#all"
                style={{
                  background: "#111827",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                立即观看示例视频
              </a>

              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(0,0,0,0.55)", fontSize: 13 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "#22c55e" }} />
                <span>持续更新中</span>
              </div>
            </div>
          </div>

          {/* 左下“怎么用”卡片插槽 */}
          <div style={{ marginTop: 14 }}>{children?.[0] || null}</div>
        </div>

        {/* 右侧示例卡插槽 */}
        <div style={{ display: "flex", alignItems: "stretch" }}>{children?.[1] || null}</div>
      </div>
    </section>
  );
}
