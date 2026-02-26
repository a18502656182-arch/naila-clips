// app/clips/[id]/page.js
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function ClipPage({ params }) {
  const id = Number(params.id);
  const supabase = getSupabaseAdmin();

  const { data: row, error } = await supabase
    .from("clips")
    .select("id, title, description, access_tier, cover_url, video_url, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Link href="/">← Back</Link>
        <h1>Clip #{id}</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
      </div>
    );
  }

  if (!row) {
    return (
      <div style={{ padding: 16 }}>
        <Link href="/">← Back</Link>
        <h1>Not Found</h1>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <Link href="/">← Back</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 12 }}>{row.title || `Clip #${row.id}`}</h1>
      <div style={{ fontSize: 12, opacity: 0.7, margin: "8px 0 12px" }}>
        {row.access_tier === "free" ? "免费" : "会员"} · {row.created_at}
      </div>
      {row.description ? <p style={{ lineHeight: 1.6 }}>{row.description}</p> : null}

      {row.cover_url ? (
        <img src={row.cover_url} alt="" style={{ width: "100%", borderRadius: 12, margin: "12px 0" }} />
      ) : null}

      {row.video_url ? (
        <video controls style={{ width: "100%", borderRadius: 12 }}>
          <source src={row.video_url} />
        </video>
      ) : (
        <div style={{ marginTop: 12, opacity: 0.7 }}>暂无 video_url</div>
      )}
    </div>
  );
}
