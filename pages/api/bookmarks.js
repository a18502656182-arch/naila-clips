import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnon = createClient(supabaseUrl, anonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export default async function handler(req, res) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "not_logged_in" });

    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: "not_logged_in" });
    }
    const user = userData.user;

    // GET /api/bookmarks?limit=20&offset=0
    if (req.method === "GET") {
      const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || "20", 10)));
      const offset = Math.max(0, parseInt(req.query.offset || "0", 10));

      // 先取 bookmarks，再取 clips（简单可靠）
      const { data: rows, error } = await supabaseAdmin
        .from("bookmarks")
        .select("clip_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return res.status(500).json({ error: "bookmark_query_failed", detail: error.message });

      const clipIds = (rows || []).map(r => r.clip_id);
      if (clipIds.length === 0) return res.json({ items: [], total: 0, limit, offset });

      const { data: clips, error: clipsErr } = await supabaseAdmin
        .from("clips")
        .select("id, title, description, duration_sec, created_at, upload_time, access_tier, cover_url, video_url, difficulty")
        .in("id", clipIds);

      if (clipsErr) return res.status(500).json({ error: "clips_query_failed", detail: clipsErr.message });

      // 按 bookmarks 的顺序排回去
      const map = new Map((clips || []).map(c => [c.id, c]));
      const items = clipIds.map(id => map.get(id)).filter(Boolean);

      return res.json({ items, total: clipIds.length, limit, offset });
    }

    // POST /api/bookmarks { clip_id: 1 }
    if (req.method === "POST") {
      const { clip_id } = req.body || {};
      const cid = parseInt(clip_id, 10);
      if (!cid) return res.status(400).json({ error: "clip_id_required" });

      const { error } = await supabaseAdmin
        .from("bookmarks")
        .upsert(
          { user_id: user.id, clip_id: cid },
          { onConflict: "user_id,clip_id" }
        );

      if (error) return res.status(500).json({ error: "bookmark_upsert_failed", detail: error.message });

      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    return res.status(500).json({ error: "bookmarks_failed", detail: String(e) });
  }
}
