// pages/api/clip.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

    const idRaw = req.query.id;
    const id = parseInt(Array.isArray(idRaw) ? idRaw[0] : idRaw, 10);
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: "bad_id" });

    const supabase = createPagesServerClient({ req, res });

    // ✅ 你现在首页用的是 clips_view（带 can_access 等）
    // 如果你某个项目没有 clips_view，就把 from("clips_view") 改成 from("clips")
    const { data, error } = await supabase
      .from("clips_view")
      .select(
        "id,title,access_tier,cover_url,video_url,duration_sec,created_at,difficulty_slugs,topic_slugs,channel_slugs,can_access"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: "query_failed", detail: error.message });
    if (!data) return res.status(404).json({ error: "not_found", id });

    return res.status(200).json({ ok: true, item: data });
  } catch (e) {
    return res.status(500).json({ error: "unknown", detail: String(e?.message || e) });
  }
}
