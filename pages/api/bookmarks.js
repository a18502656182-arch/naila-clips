// pages/api/bookmarks.js
import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

export default async function handler(req, res) {
  try {
    const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

    if (req.method !== "GET") {
      flushCookies();
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      flushCookies();
      return res.status(401).json({ error: "Not logged in" });
    }

    const limit = Math.min(parseInt(req.query.limit || "30", 10), 200);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    const { data, error, count } = await supabase
      .from("bookmarks")
      .select("id, user_id, clip_id, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      flushCookies();
      return res.status(500).json({ error: error.message });
    }

    flushCookies();
    return res.status(200).json({
      items: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
