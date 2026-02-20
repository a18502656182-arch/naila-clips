import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

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
    const supabase = createPagesServerClient({ req, res });

    const limit = Math.min(parseInt(req.query.limit || "10", 10) || 10, 100);
    const offset = Math.max(parseInt(req.query.offset || "0", 10) || 0, 0);
    const sort = req.query.sort === "oldest" ? "oldest" : "newest";

    const difficulty = parseList(req.query.difficulty); // beginner,advanced
    const access = parseList(req.query.access); // free,vip
    const topic = parseList(req.query.topic); // daily,business
    const channel = parseList(req.query.channel); // channel-a,channel-b

    // 1) 当前用户是否会员（用于 can_access）
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let isMember = false;
    if (user) {
      const nowIso = new Date().toISOString();
      const sub = await supabase
        .from("subscriptions")
        .select("status, ends_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("ends_at", nowIso)
        .maybeSingle();

      isMember = !!sub?.data;
    }

    // 2) 拉 clips + taxonomies（嵌套 select）
    // clips -> clip_taxonomies -> taxonomies(type, slug)
    let q = supabase
      .from("clips")
      .select(
        `
        id, title, video_url, cover_url, duration_sec, created_at, access_tier,
        clip_taxonomies (
          taxonomies ( type, slug )
        )
      `,
        { count: "exact" }
      );

    // access_tier 先在 DB 层过滤（最省）
    if (access.length) q = q.in("access_tier", access);

    // 排序
    q = q.order("created_at", { ascending: sort === "oldest" });

    const { data, error } = await q;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // 3) 组装每条 clip 的 difficulty/topics/channels
    const normalized = (data || []).map((row) => {
      const taxRows = row.clip_taxonomies || [];
      const all = taxRows.map((ct) => ct.taxonomies).filter(Boolean);

      const diff = all.find((t) => t.type === "difficulty")?.slug || null;
      const topics = all.filter((t) => t.type === "topic").map((t) => t.slug);
      const channels = all
        .filter((t) => t.type === "channel")
        .map((t) => t.slug);

      const can_access = row.access_tier === "free" ? true : Boolean(isMember);

      return {
        id: row.id,
        title: row.title,
        video_url: row.video_url,
        cover_url: row.cover_url,
        duration_sec: row.duration_sec,
        created_at: row.created_at,
        access_tier: row.access_tier,
        difficulty: diff,
        topics,
        channels,
        can_access,
      };
    });

    // 4) JS 层做多选过滤（difficulty/topic/channel），再分页
    let filtered = normalized;

    if (difficulty.length) {
      filtered = filtered.filter(
        (x) => x.difficulty && difficulty.includes(x.difficulty)
      );
    }
    if (topic.length) {
      filtered = filtered.filter((x) =>
        (x.topics || []).some((t) => topic.includes(t))
      );
    }
    if (channel.length) {
      filtered = filtered.filter((x) =>
        (x.channels || []).some((c) => channel.includes(c))
      );
    }

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);

    return res.status(200).json({
      items,
      total,
      limit,
      offset,
      sort,
      filters: { difficulty, access, topic, channel },
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
