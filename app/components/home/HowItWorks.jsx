// app/components/home/HowItWorks.jsx
import { THEME } from "./theme";

export default function HowItWorks() {
  return (
    <div
      style={{
        borderRadius: THEME.radii.md,
        background: THEME.colors.surface,
        border: `1px solid ${THEME.colors.border}`,
        boxShadow: "0 10px 26px rgba(11,18,32,0.08)",
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 950, marginBottom: 8, color: THEME.colors.ink }}>
        怎么用「油管英语场景库」？
      </div>

      <ol style={{ margin: 0, paddingLeft: 18, color: THEME.colors.muted, lineHeight: 1.75, fontSize: 13 }}>
        <li>选一条你感兴趣的场景短片，先完整看一遍。</li>
        <li>打开字幕，跟读重点句子；不懂的词点开查看释义。</li>
        <li>复看 1–2 次，直到能脱稿复述主要内容。</li>
        <li>每天坚持 1 条，逐步把表达练到自然顺口。</li>
      </ol>
    </div>
  );
}
