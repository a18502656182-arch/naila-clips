// pages/api/clip.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

async function getUser(req, res) {
  const supabase = createPagesServerClient({ req, res });
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data?.user || null };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ error: "missing_id" });

    const { supabase, user } = await getUser(req, res);

    // 会员状态：查 subscriptions（你现有逻辑）
    let is_member = false;
    if (user) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status,expires_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub?.expires_at && new Date(sub.expires_at).getTime() > Date.now()) is_member = true;
    }

    // clip：用 clips_view 取 tags（你已有 view）
    const { data: c, error } = await supabase
      .from("clips_view")
      .select("id,title,description,duration_sec,access_tier,cover_url,video_url,created_at,difficulty_slugs,topic_slugs,channel_slugs")
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: "clip_query_failed", detail: error.message });
    if (!c) return res.status(404).json({ error: "not_found" });

    const difficulty = (c.difficulty_slugs && c.difficulty_slugs[0]) || null;
    const topics = c.topic_slugs || [];
    const channels = c.channel_slugs || [];

    const can_access = c.access_tier === "free" ? true : !!is_member;

    return res.status(200).json({
      ok: true,
      me: { logged_in: !!user, is_member },
      clip: {
        id: c.id,
        title: c.title,
        description: c.description,
        duration_sec: c.duration_sec,
        access_tier: c.access_tier,
        cover_url: c.cover_url,
        video_url: c.video_url,
        created_at: c.created_at,
        difficulty,
        topics,
        channels,
        can_access,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: "unknown", detail: String(e?.message || e) });
  }
}
