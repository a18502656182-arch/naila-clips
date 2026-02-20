import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) return res.status(200).json({ logged_in: false, items: [] });

    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);

    const { data, error } = await supabase
      .from("bookmarks")
      .select(
        `
        created_at,
        clips (
          id, title, description, duration_sec, created_at, upload_time,
          access_tier, cover_url, video_url,
          clip_taxonomies( taxonomies(type, slug) )
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });

    const items = (data || [])
      .map((r) => r.clips)
      .filter(Boolean)
      .map((row) => {
        const all = (row.clip_taxonomies || []).map((ct) => ct.taxonomies).filter(Boolean);
        const difficulty = all.find((t) => t.type === "difficulty")?.slug || null;
        const topics = all.filter((t) => t.type === "topic").map((t) => t.slug);
        const channels = all.filter((t) => t.type === "channel").map((t) => t.slug);

        return {
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
        };
      });

    return res.status(200).json({
      debug: { mode: "bookmarks_list" },
      logged_in: true,
      items,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
