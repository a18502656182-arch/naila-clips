import { createClient } from "@supabase/supabase-js";

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : "";
}

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "missing_supabase_env" });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1) 取登录用户（从 Authorization: Bearer xxx）
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "not_logged_in" });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ error: "not_logged_in", detail: userErr?.message });
    }
    const userId = userData.user.id;

    // 2) 取 clip_id
    const clip_id = Number(req.body?.clip_id);
    if (!clip_id || Number.isNaN(clip_id)) {
      return res.status(400).json({ error: "invalid_clip_id" });
    }

    // 3) 写入 bookmarks
    // 你已加了 unique(user_id, clip_id)，所以重复收藏会报错 23505，我们当成 ok
    const { error: insErr } = await supabase
      .from("bookmarks")
      .insert({ user_id: userId, clip_id });

    if (insErr) {
      // Postgres unique violation
      if (insErr.code === "23505") {
        return res.status(200).json({ ok: true, duplicated: true });
      }
      return res.status(500).json({ error: "bookmark_insert_failed", detail: insErr.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e?.message || e) });
  }
}
