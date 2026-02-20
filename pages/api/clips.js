import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

function parseList(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v.join(",");
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function pickFirst(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

export default async function handler(req, res) {
  try {
    const supabase = createPagesServerClient({ req, res });

    const difficulty = parseList(req.query.difficulty);
    const access = parseList(req.query.access); // free,vip
    const topic = parseList(req.query.topic);
    const channel = parseList(req.query.channel);

    const sort = req.query.sort === "oldest" ? "oldest" : "newest";
    const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10), 1), 50);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    // 1) 读登录状态（决定 can_access）
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2) 取会员状态（你之前已有 subscriptions 逻辑，这里只判断 is_member）
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

    // 3) 先把 clips 拉出来（尽量先用 access 做 DB 过滤）
    let q = supabase
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
      .order("created_at", { ascending: sort === "oldest" });

    if (access.length) q = q.in("access_tier", access);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    // 4) normalize + JS 过滤（difficulty/topic/channel）
    const normalized = (data || []).map((row) => {
      const all = (row.clip_taxonomies || [])
        .map((ct) => ct.taxonomies)
        .filter(Boolean);

      const diff = all.find((t) => t.type === "difficulty")?.slug || null;
      const topics = all.filter((t) => t.type === "topic").map((t) => t.slug);
      const channels = all.filter((t) => t.type === "channel").map((t) => t.slug);

      const can_access =
        row.access_tier === "free" ? true : Boolean(is_member);

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
        difficulty: diff,
        topics,
        channels,
        can_access,
      };
    });

    function matches(clip) {
      if (difficulty.length) {
        if (!clip.difficulty || !difficulty.includes(clip.difficulty)) return false;
      }
      if (topic.length) {
        if (!(clip.topics || []).some((t) => topic.includes(t))) return false;
      }
      if (channel.length) {
        if (!(clip.channels || []).some((c) => channel.includes(c))) return false;
      }
      return true;
    }

    const filtered = normalized.filter(matches);

    // 5) 分页
    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);
    const has_more = offset + limit < total;

    return res.status(200).json({
      items,
      total,
      limit,
      offset,
      has_more,
      sort,
      filters: { difficulty, access, topic, channel },
      is_member,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
