// pages/api/progress_toggle.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

    const clip_id = Number(req.body?.clip_id);
    if (!clip_id) return res.status(400).json({ error: "missing_clip_id" });

    const supabase = createPagesServerClient({ req, res });
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    if (!user) return res.status(401).json({ error: "not_logged_in" });

    const { data: row } = await supabase
      .from("clip_progress")
      .select("clip_id,completed_at")
      .eq("user_id", user.id)
      .eq("clip_id", clip_id)
      .maybeSingle();

    if (row?.completed_at) {
      // 取消完成
      const { error: delErr } = await supabase
        .from("clip_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("clip_id", clip_id);

      if (delErr) return res.status(500).json({ error: "delete_failed", detail: delErr.message });
      return res.status(200).json({ ok: true, completed: false });
    }

    // 标记完成
    const { error: upErr } = await supabase.from("clip_progress").upsert({
      user_id: user.id,
      clip_id,
      completed_at: new Date().toISOString(),
    });

    if (upErr) return res.status(500).json({ error: "upsert_failed", detail: upErr.message });

    return res.status(200).json({ ok: true, completed: true });
  } catch (e) {
    return res.status(500).json({ error: "unknown", detail: String(e?.message || e) });
  }
}
