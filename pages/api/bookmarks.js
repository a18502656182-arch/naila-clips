import { createClient } from "@supabase/supabase-js";

function getBearer(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  return h.slice(7);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: "missing_env" });
    }

    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: "not_logged_in" });

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const limit = Math.min(parseInt(req.query.limit || "20", 10) || 20, 50);
    const offset = parseInt(req.query.offset || "0", 10) || 0;

    // ✅ 读收藏表（RLS 负责只给本人）
    const { data: rows, error } = await supabase
      .from("bookmarks")
      .select("id, clip_id, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: "bookmarks_query_failed", detail: error.message });

    const clipIds = (rows || []).map((r) => r.clip_id).filter(Boolean);
    if (!clipIds.length) {
      return res.status(200).json({ items: [], total: 0, limit, offset });
    }

    // ✅ 再把 clips 信息查出来（用你的真实列名）
    const { data: clips, error: e2 } = await supabase
      .from("clips")
      .select("id,title,description,duration_sec,created_at,access_tier,cover_url,video_url")
      .in("id", clipIds);

    if (e2) return res.status(500).json({ error: "clips_query_failed", detail: e2.message });

    // 按收藏顺序输出
    const map = new Map((clips || []).map((c) => [c.id, c]));
    const items = (rows || [])
      .map((r) => {
        const c = map.get(r.clip_id);
        if (!c) return null;
        return {
          ...c,
          bookmarked_at: r.created_at,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ items, total: items.length, limit, offset });
  } catch (err) {
    return res.status(500).json({ error: "server_error", detail: String(err?.message || err) });
  }
}
