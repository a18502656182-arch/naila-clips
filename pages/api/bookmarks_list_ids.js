// pages/api/bookmarks_list_ids.js
// 一次性返回当前用户所有收藏的 clip_id 列表
// 替代逐张卡片调用 bookmarks_has，大幅减少请求数
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  try {
    const supabase = createServerSupabaseClient({ req, res });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.id) return res.status(401).json({ error: "not_logged_in" });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await admin
      .from("bookmarks")
      .select("clip_id")
      .eq("user_id", user.id);

    if (error) return res.status(500).json({ error: "query_failed", detail: error.message });

    return res.status(200).json({
      ok: true,
      clip_ids: (data || []).map(r => r.clip_id).filter(Boolean),
    });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e?.message || e) });
  }
}
