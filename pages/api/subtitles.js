// pages/api/subtitles.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

    const clip_id = Number(req.query.clip_id);
    if (!clip_id) return res.status(400).json({ error: "missing_clip_id" });

    const supabase = createPagesServerClient({ req, res });

    // 如果你还没建 subtitles 表，这里会报错：我们下面 C.3 会教你一键建表
    const { data, error } = await supabase
      .from("subtitles")
      .select("start_sec,end_sec,en,zh,repeat")
      .eq("clip_id", clip_id)
      .order("start_sec", { ascending: true });

    // 没建表时：返回空，不阻断页面
    if (error) {
      return res.status(200).json({ ok: true, items: [], debug: { no_table_or_rls: error.message } });
    }

    return res.status(200).json({ ok: true, items: data || [] });
  } catch (e) {
    return res.status(500).json({ error: "unknown", detail: String(e?.message || e) });
  }
}
