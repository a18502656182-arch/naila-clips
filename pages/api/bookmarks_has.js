import { createClient } from "@supabase/supabase-js";

function getBearer(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  return h.slice(7);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: "missing_env" });
    }

    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: "not_logged_in" });

    const { clip_id } = req.body || {};
    const cid = parseInt(clip_id, 10);
    if (!cid) return res.status(400).json({ error: "missing_clip_id" });

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // ✅ 直接删（RLS 负责只允许删自己的）
    const { error } = await supabase.from("bookmarks").delete().eq("clip_id", cid);

    if (error) return res.status(500).json({ error: "bookmark_delete_failed", detail: error.message });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "server_error", detail: String(err?.message || err) });
  }
}
