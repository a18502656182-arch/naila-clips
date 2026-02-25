import { createClient } from "@supabase/supabase-js";

function parseList(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v.join(",");
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function handler(req, res) {
  try {
    // ✅ 先不动缓存（等你验证提速后我再带你做 Cloudflare HIT）
    // res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 参数
    const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10), 1), 50);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
    const sort = req.query.sort === "oldest" ? "oldest" : "newest";

    const difficulty = parseList(req.query.difficulty);
    const access = parseList(req.query.access);
    const topic = parseList(req.query.topic);
    const channel = parseList(req.query.channel);

    // ✅ 直接查 clips_view（数据库提前聚合好的字段）
    let q = supabase
      .from("clips_view")
      .select(
        "id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs"
      )
      .order("created_at", { ascending: sort === "oldest" })
      .range(offset, offset + limit); // 多拿 1 条判断 has_more

    if (access.length) q = q.in("access_tier", access);
    if (difficulty.length) q = q.in("difficulty_slug", difficulty);

    // 数组筛选：overlaps = 选中的任意一个命中即可（多选通常符合预期）
    if (topic.length) q = q.overlaps("topic_slugs", topic);
    if (channel.length) q = q.overlaps("channel_slugs", channel);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    const rows = data || [];
    const has_more = rows.length > limit;
    const pageItems = has_more ? rows.slice(0, limit) : rows;

    // 返回结构：保持你原来大体结构（topics/channels 先用 slug）
    return res.status(200).json({
      debug: {
        mode: "clips_view_paged",
      },
      items: pageItems.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        duration_sec: r.duration_sec,
        created_at: r.created_at,
        upload_time: r.upload_time,
        access_tier: r.access_tier,
        cover_url: r.cover_url,
        video_url: r.video_url,
        difficulty: r.difficulty_slug,
        topics: r.topic_slugs || [],
        channels: r.channel_slugs || [],
        // 先不在这里判断会员权限（后面用 /api/me 在前端算）
        can_access: true,
      })),
      // total 先不给（避免慢）
      limit,
      offset,
      has_more,
      sort,
      filters: { difficulty, access, topic, channel },
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
