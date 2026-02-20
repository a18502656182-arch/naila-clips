import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

function parseList(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v.join(",");
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function inc(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

export default async function handler(req, res) {
  try {
    const supabase = createPagesServerClient({ req, res });

    const sort = req.query.sort === "oldest" ? "oldest" : "newest";

    // 当前已选（用来算“动态 counts”）
    const selectedDifficulty = parseList(req.query.difficulty);
    const selectedAccess = parseList(req.query.access);
    const selectedTopic = parseList(req.query.topic);
    const selectedChannel = parseList(req.query.channel);

    // 1) 先拉所有 taxonomies（用于 options 列表）
    const { data: taxRows, error: taxErr } = await supabase
      .from("taxonomies")
      .select("id, type, slug, name")
      .order("type", { ascending: true })
      .order("slug", { ascending: true });

    if (taxErr) return res.status(500).json({ error: taxErr.message });

    const difficulties = (taxRows || []).filter((t) => t.type === "difficulty");
    const topics = (taxRows || []).filter((t) => t.type === "topic");
    const channels = (taxRows || []).filter((t) => t.type === "channel");

    // 2) 拉 clips + taxonomies（用于算 counts）
    let q = supabase
      .from("clips")
      .select(
        `
        id, access_tier, created_at,
        clip_taxonomies (
          taxonomies ( type, slug )
        )
      `
      )
      .order("created_at", { ascending: sort === "oldest" });

    // access 直接先过滤（减少数据）
    if (selectedAccess.length) q = q.in("access_tier", selectedAccess);

    const { data: clipRows, error: clipErr } = await q;
    if (clipErr) return res.status(500).json({ error: clipErr.message });

    const normalized = (clipRows || []).map((row) => {
      const all = (row.clip_taxonomies || [])
        .map((ct) => ct.taxonomies)
        .filter(Boolean);

      const difficulty = all.find((t) => t.type === "difficulty")?.slug || null;
      const tps = all.filter((t) => t.type === "topic").map((t) => t.slug);
      const chs = all.filter((t) => t.type === "channel").map((t) => t.slug);

      return {
        access_tier: row.access_tier,
        difficulty,
        topics: tps,
        channels: chs,
      };
    });

    function matches(clip, f) {
      if (f.access?.length && !f.access.includes(clip.access_tier)) return false;
      if (f.difficulty?.length) {
        if (!clip.difficulty || !f.difficulty.includes(clip.difficulty))
          return false;
      }
      if (f.topic?.length) {
        if (!(clip.topics || []).some((t) => f.topic.includes(t))) return false;
      }
      if (f.channel?.length) {
        if (!(clip.channels || []).some((c) => f.channel.includes(c)))
          return false;
      }
      return true;
    }

    const counts = {
      difficulty: {},
      access: {},
      topic: {},
      channel: {},
    };

    // difficulty counts（放开 difficulty）
    {
      const f = {
        access: selectedAccess,
        difficulty: [],
        topic: selectedTopic,
        channel: selectedChannel,
      };
      normalized
        .filter((c) => matches(c, f))
        .forEach((c) => inc(counts.difficulty, c.difficulty));
    }

    // access counts（放开 access）
    {
      const f = {
        access: [],
        difficulty: selectedDifficulty,
        topic: selectedTopic,
        channel: selectedChannel,
      };
      normalized
        .filter((c) => matches(c, f))
        .forEach((c) => inc(counts.access, c.access_tier));
    }

    // topic counts（放开 topic）
    {
      const f = {
        access: selectedAccess,
        difficulty: selectedDifficulty,
        topic: [],
        channel: selectedChannel,
      };
      normalized
        .filter((c) => matches(c, f))
        .forEach((c) => (c.topics || []).forEach((t) => inc(counts.topic, t)));
    }

    // channel counts（放开 channel）
    {
      const f = {
        access: selectedAccess,
        difficulty: selectedDifficulty,
        topic: selectedTopic,
        channel: [],
      };
      normalized
        .filter((c) => matches(c, f))
        .forEach((c) =>
          (c.channels || []).forEach((ch) => inc(counts.channel, ch))
        );
    }

    // 3) 把 counts 合并到 options 里（前端直接用）
    const difficultiesWithCount = difficulties.map((x) => ({
      slug: x.slug,
      name: x.name || x.slug,
      count: counts.difficulty[x.slug] || 0,
    }));

    const topicsWithCount = topics.map((x) => ({
      slug: x.slug,
      name: x.name || x.slug,
      count: counts.topic[x.slug] || 0,
    }));

    const channelsWithCount = channels.map((x) => ({
      slug: x.slug,
      name: x.name || x.slug,
      count: counts.channel[x.slug] || 0,
    }));

    return res.status(200).json({
      difficulties: difficultiesWithCount,
      topics: topicsWithCount,
      channels: channelsWithCount,
      access_counts: counts.access, // free/vip 的数量
      filters: {
        difficulty: selectedDifficulty,
        access: selectedAccess,
        topic: selectedTopic,
        channel: selectedChannel,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
