// app/page.js
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic"; // 先保持动态，避免缓存误伤；后面可再讨论缓存策略
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function Page() {
  const supabase = getSupabaseAdmin();

  // 最小可用：拉最新 24 条
  const { data: rows, error } = await supabase
    .from("clips")
    .select("id, title, access_tier, cover_url, created_at")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Home (RSC)</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Home (RSC 实验版)</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {(rows || []).map((r) => (
          <Link
            key={r.id}
            href={`/clips/${r.id}`}
            style={{
              display: "block",
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              {r.access_tier === "free" ? "免费" : "会员"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{r.title || `Clip #${r.id}`}</div>
            {r.cover_url ? (
              // 先用普通 img，避免你现在实验线还没做 next/image 的兼容问题；后面再替换成 next/image
              <img src={r.cover_url} alt="" style={{ width: "100%", borderRadius: 10 }} />
            ) : (
              <div style={{ height: 120, background: "#f3f3f3", borderRadius: 10 }} />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
