import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    const supabase = createPagesServerClient({ req, res });

    const id = req.query.id ? Number(req.query.id) : null;
    if (!id) return res.status(400).json({ error: "missing id" });

    // 登录态 -> is_member
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let is_member = false;
    if (user?.id) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, ends_at")
        .eq("user_id", user.id)
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub?.status === "active" && sub?.ends_at) {
        const ends = new Date(sub.ends_at);
        if (!isNaN(ends.getTime()) && ends.getTime() > Date.now()) {
          is_member = true;
        }
      }
    }

    const { data: row, error } = await supabase
      .from("clips")
      .select(
        `
        id, title, description, duration_sec, created_at, upload_time,
        access_tier, cover_url, video_url,
        clip_taxonomies(
          taxonomies(type, slug)
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!row) return res.status(404).json({ error: "not found" });

    const all = (row.clip_taxonomies || [])
      .map((ct) => ct.taxonomies)
      .filter(Boolean);

    const difficulty = all.find((t) => t.type === "difficulty")?.slug || null;
    const topics = all.filter((t) => t.type === "topic").map((t) => t.slug);
    const channels = all.filter((t) => t.type === "channel").map((t) => t.slug);

    const can_access = row.access_tier === "free" ? true : Boolean(is_member);

    return res.status(200).json({
      debug: { mode: "clip_by_id" },
      item: {
        id: row.id,
        title: row.title,
        description: row.description ?? null,
        duration_sec: row.duration_sec ?? null,
        created_at: row.created_at,
        upload_time: row.upload_time ?? null,
        access_tier: row.access_tier,
        cover_url: row.cover_url ?? null,
        video_url: row.video_url ?? null,
        difficulty,
        topics,
        channels,
        can_access,
      },
      is_member,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
