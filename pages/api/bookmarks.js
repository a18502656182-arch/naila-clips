// api/bookmarks.js (CommonJS for Railway/Node)
// 返回当前用户收藏的视频列表，包含完整视频信息
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: "not_logged_in" });

    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data, error: userErr } = await anon.auth.getUser(token);
    const user = data?.user || null;
    if (userErr || !user?.id) return res.status(401).json({ error: "not_logged_in" });

    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // 第一步：查收藏记录
    const { data: rows, error } = await admin
      .from("bookmarks")
      .select("id, clip_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: "query_failed", detail: error.message });

    // 第二步：用 clip_id 批量查视频信息
    const clipIds = (rows || []).map(r => r.clip_id).filter(Boolean);
    let clipMap = {};
    if (clipIds.length > 0) {
      const { data: clips } = await admin
        .from("clips_view")
        .select("id, title, cover_url, duration_sec, access_tier")
        .in("id", clipIds);
      (clips || []).forEach(c => { clipMap[c.id] = c; });
    }

    const items = (rows || []).map(r => ({
      bookmark_id: r.id,
      clip_id: r.clip_id,
      created_at: r.created_at,
      clip: clipMap[r.clip_id] || null,
    }));

    return res.status(200).json({ ok: true, items });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e?.message || e) });
  }
};
