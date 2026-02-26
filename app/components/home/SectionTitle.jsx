// app/components/home/SectionTitle.jsx
export default function SectionTitle({ title }) {
  return (
    <div id="all" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
    </div>
  );
}
