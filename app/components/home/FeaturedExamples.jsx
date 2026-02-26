// app/components/home/FeaturedExamples.jsx
function formatDuration(sec) {
  const s = Number(sec || 0);
  if (!Number.isFinite(s) || s <= 0) return null;
  const m = Math.floor(s / 60);
  const r = s % 60;
  const mm = String(m);
  const rr = String(r).padStart(2, "0");
  return `${mm}:${rr}`;
}

function pill(text, bg, color) {
  return (
    <span
      key={text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 12,
        border: "1px solid rgba(0,0,0,0.06)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export default function FeaturedExamples({ featured }) {
  // 注意：你说 cover_url 可能是 mp4，这里先“照用”，后续你换封面图/Stream 再优化
  const cover = featured?.cover_url || featured?.video_url || "";
  const duration = formatDuration(featured?.duration_sec);

  const title = featured?.title || "示例视频";
  const desc = featured?.description || "打开一条场景短片，边看边学地道表达。";

  const topicPills = Array.isArray(featured?.topics) ? featured.topics.slice(0, 2) : [];
  const channelPills = Array.isArray(featured?.channels) ? featured.channels.slice(0, 2) : [];

  const accessLabel =
    featured?.access_tier === "vip"
      ? pill("会员专享", "rgba(168,85,247,0.14)", "rgb(126,34,206)")
      : pill("免费", "rgba(34,197,94,0.14)", "rgb(21,128,61)");

  const difficultyLabel = featured?.difficulty
    ? pill(String(featured.difficulty), "rgba(245,158,11,0.14)", "rgb(180,83,9)")
    : null;

  return (
    <div
      style={{
        width: "100%",
        borderRadius: 16,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 封面 */}
      <div style={{ position: "relative", background: "rgba(0,0,0,0.06)" }}>
        {cover ? (
          // 先用 img：你后续换封面图后，再切 next/image（避免现在 cover_url=mp4 导致 next/image 不稳定）
          <img
            src={cover}
            alt={title}
            style={{
              width: "100%",
              height: 210,
              objectFit: "cover",
              display: "block",
            }}
            loading="eager"
          />
        ) : (
          <div style={{ height: 210 }} />
        )}

        {/* 左上角收藏按钮（只做 UI 复刻占位，不接现网逻辑） */}
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            width: 34,
            height: 34,
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontSize: 16,
            userSelect: "none",
          }}
          title="收藏（实验线 UI 占位）"
          aria-label="bookmark"
        >
          ♡
        </div>

        {/* 右下角时长 */}
        {duration ? (
          <div
            style={{
              position: "absolute",
              right: 10,
              bottom: 10,
              background: "rgba(0,0,0,0.7)",
              color: "#fff",
              fontSize: 12,
              padding: "4px 6px",
              borderRadius: 6,
            }}
          >
            {duration}
          </div>
        ) : null}

        {/* 顶部标签（免费/会员） */}
        <div style={{ position: "absolute", left: 52, top: 12 }}>{accessLabel}</div>
      </div>

      {/* 文案区 */}
      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>{title}</div>
        <div style={{ color: "rgba(0,0,0,0.62)", fontSize: 13, lineHeight: 1.55 }}>{desc}</div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {channelPills.map((t) => pill(String(t), "rgba(59,130,246,0.10)", "rgb(29,78,216)"))}
          {topicPills.map((t) => pill(String(t), "rgba(16,185,129,0.12)", "rgb(5,150,105)"))}
        </div>

        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {difficultyLabel}
          </div>

          {/* 仅做结构对齐：日期占位（不引入额外逻辑） */}
          <div style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }}>{featured?.created_at ? String(featured.created_at).slice(0, 10) : ""}</div>
        </div>
      </div>
    </div>
  );
}
