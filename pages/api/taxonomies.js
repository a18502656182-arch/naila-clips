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

function sortByCountThenName(arr) {
  return (arr || []).slice().sort((a, b) => {
    const ca = a.count || 0;
    const cb = b.count || 0;
    if (cb !== ca) return cb - ca; // count desc
    return String(a.slug).localeCompare(String(b.slug)); // slug asc
  });
}

export default async function handler(req, res) {
  try {
    const supabase = createPagesServerClient({ req, res });

    const sort = req.query.sort === "oldest" ? "oldest" : "newest";

    const selectedDifficulty = parseList(req.query.difficulty);
    const selectedAccess = parseList(req.query.access);
    const selectedTopic = parseList(req.query.topic);
    const selectedChannel = parseList(req.query.channel);

    // 1) taxonomies 只取 type+slug（你表里没有 name）
    const { data: taxRows, error: taxErr } = await supabase
      .from("taxonomies")
      .select("type, slug")
      .order("type", { ascending: true })
      .order("slug", { ascending: true });

    if (taxErr) return res.status(500).json({ error: taxErr.message });

    const difficulties = (taxRows || []).filter((t) => t.type === "difficulty");
    const topics = (taxRows || []).filter((t) => t.type === "topic");
    const channels = (taxRows || []).filter((t) => t.type === "channel");

    // 2) 轻量拉 clips（用于 counts）
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

    if (selectedAccess.length) q = q.in("access_tier", selectedAccess);

    const { data: clipRows, error: clipErr } = await q;
    if (clipErr) return res.status(500).json({ error: clipErr.message });

    const normalized = (clipRows || []).map((row) => {
      const all = (row.clip_taxonomies || [])
        .map((ct) => ct.taxonomies)
        .filter(Boolean);

      const diff = all.find((t) => t.type === "difficulty")?.slug || null;
      const tps = all.filter((t) => t.type === "topic").map((t) => t.slug);
      const chs = all.filter((t) => t.type === "channel").map((t) => t.slug);

      return {
        access_tier: row.access_tier,
        difficulty: diff,
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

    // 3) 合并 counts（并排序：count 高的在前）
    const difficultiesWithCount = sortByCountThenName(
      difficulties.map((x) => ({
        slug: x.slug,
        name: x.slug,
        count: counts.difficulty[x.slug] || 0,
      }))
    );

    const topicsWithCount = sortByCountThenName(
      topics.map((x) => ({
        slug: x.slug,
        name: x.slug,
        count: counts.topic[x.slug] || 0,
      }))
    );

    const channelsWithCount = sortByCountThenName(
      channels.map((x) => ({
        slug: x.slug,
        name: x.slug,
        count: counts.channel[x.slug] || 0,
      }))
    );

    return res.status(200).json({
      debug: { mode: "tax_with_counts_sorted" },
      difficulties: difficultiesWithCount,
      topics: topicsWithCount,
      channels: channelsWithCount,
      access_counts: counts.access,
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
