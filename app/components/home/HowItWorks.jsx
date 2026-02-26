// app/components/home/HowItWorks.jsx
export default function HowItWorks() {
  return (
    <div
      style={{
        borderRadius: 14,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 6px 22px rgba(0,0,0,0.06)",
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 8 }}>怎么用「油管英语场景库」？</div>

      <ol style={{ margin: 0, paddingLeft: 18, color: "rgba(0,0,0,0.72)", lineHeight: 1.7, fontSize: 13 }}>
        <li>先选一条你感兴趣的场景短片，完整看一遍。</li>
        <li>打开字幕，跟读重点句子；点击不懂的词查看释义。</li>
        <li>反复看 1–2 次，直到能脱稿复述主要内容。</li>
        <li>每天坚持看 1 条，逐步把表达练到自然顺口。</li>
      </ol>
    </div>
  );
}
