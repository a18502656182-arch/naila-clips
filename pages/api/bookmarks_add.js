// pages/api/bookmarks_add.js
import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

export default async function handler(req, res) {
  try {
    const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

    if (req.method !== "POST") {
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

    const { clip_id } = req.body || {};
    if (!clip_id) {
      flushCookies();
      return res.status(400).json({ error: "Missing clip_id" });
    }

    const { error } = await supabase
      .from("bookmarks")
      .upsert({ user_id: user.id, clip_id: Number(clip_id) }, { onConflict: "user_id,clip_id" });

    if (error) {
      flushCookies();
      return res.status(500).json({ error: error.message });
    }

    flushCookies();
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
