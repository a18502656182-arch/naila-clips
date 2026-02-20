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

    // 当前已选（用于“在其它筛选不变时，每个选项会有多少条”）
    const selectedDifficulty = parseList(req.query.difficulty);
    const selectedAccess = parseList(req.query.access);
    const selectedTopic = parseList(req.query.topic);
    const selectedChannel = parseList(req.query.channel);

    // 1) 拉 clips + taxonomies
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

    // access 直接在 clips 上过滤（减少数据）
    if (selectedAccess.length) q = q.in("access_tier", selectedAccess);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    // 2) normalize（把每条 clip 的 difficulty/topics/channels 摘出来）
    const normalized = (data || []).map((row) => {
      const all = (row.clip_taxonomies || [])
        .map((ct) => ct.taxonomies)
        .filter(Boolean);

      const difficulty = all.find((t) => t.type === "difficulty")?.slug || null;
      const topics = all.filter((t) => t.type === "topic").map((t) => t.slug);
      const channels = all
        .filter((t) => t.type === "channel")
        .map((t) => t.slug);

      return {
        id: row.id,
        access_tier: row.access_tier,
        difficulty,
        topics,
        channels,
      };
    });

    // 3) 一个通用匹配函数：判断某条 clip 是否满足筛选
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

    // 4) “基准筛选”：就是当前选中的筛选（用于整体 total）
    const baseFilter = {
      access: selectedAccess,
      difficulty: selectedDifficulty,
      topic: selectedTopic,
      channel: selectedChannel,
    };

    const baseList = normalized.filter((c) => matches(c, baseFilter));
    const total = baseList.length;

    // 5) counts：每个维度都要“其它筛选保持不变，只放开这个维度”来计算
    // 例如算 difficulty counts 时：access/topic/channel 仍按当前选中，difficulty 放开
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
        difficulty: [], // 放开
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
        access: [], // 放开
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
        topic: [], // 放开
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
        channel: [], // 放开
      };
      normalized
        .filter((c) => matches(c, f))
        .forEach((c) =>
          (c.channels || []).forEach((ch) => inc(counts.channel, ch))
        );
    }

    return res.status(200).json({
      total,
      filters: {
        difficulty: selectedDifficulty,
        access: selectedAccess,
        topic: selectedTopic,
        channel: selectedChannel,
      },
      counts,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
