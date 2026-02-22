// pages/api/progress_status.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

    const clip_id = Number(req.query.clip_id);
    if (!clip_id) return res.status(400).json({ error: "missing_clip_id" });

    const supabase = createPagesServerClient({ req, res });
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    if (!user) return res.status(401).json({ error: "not_logged_in" });

    const { data: row, error } = await supabase
      .from("clip_progress")
      .select("clip_id,completed_at")
      .eq("user_id", user.id)
      .eq("clip_id", clip_id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: "query_failed", detail: error.message });

    return res.status(200).json({ ok: true, completed: !!row?.completed_at });
  } catch (e) {
    return res.status(500).json({ error: "unknown", detail: String(e?.message || e) });
  }
}
