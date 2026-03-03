// pages/api/subtitles.js
import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

export default async function handler(req, res) {
  try {
    const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

    if (req.method !== "GET") {
      flushCookies();
      return res.status(405).json({ error: "Method not allowed" });
    }

    const clip_id = Number(req.query.clip_id || req.query.id);
    if (!clip_id) {
      flushCookies();
      return res.status(400).json({ error: "Missing clip_id" });
    }

    const { data, error } = await supabase
      .from("subtitles")
      .select("clip_id, subtitles_json")
      .eq("clip_id", clip_id)
      .maybeSingle();

    if (error) {
      flushCookies();
      return res.status(500).json({ error: error.message });
    }

    flushCookies();
    return res.status(200).json({ ok: true, row: data || null });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
