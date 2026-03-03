// pages/api/taxonomies.js
import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

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
  return arr.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return String(a.slug || "").localeCompare(String(b.slug || ""));
  });
}

export default async function handler(req, res) {
  try {
    const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

    const sort = req.query.sort === "oldest" ? "oldest" : "newest";

    const selectedDifficulty = parseList(req.query.difficulty);
    const selectedAccess = parseList(req.query.access);
    const selectedTopic = parseList(req.query.topic);
    const selectedChannel = parseList(req.query.channel);

    let q = supabase
      .from("clips")
      .select(
        `
        id, access_tier, created_at,
        clip_taxonomies (
          taxonomies ( type, slug, name_en, name_zh )
        )
      `
      )
      .order("created_at", { ascending: sort === "oldest" });

    if (selectedAccess.length) q = q.in("access_tier", selectedAccess);

    const { data, error } = await q;

    if (error) {
      flushCookies();
      return res.status(500).json({ error: error.message });
    }

    const normalized = (data || []).map((row) => {
      const all = (row.clip_taxonomies || []).map((ct) => ct.taxonomies).filter(Boolean);

      const difficulty = all.find((t) => t.type === "difficulty") || null;
      const topics = all.filter((t) => t.type === "topic");
      const channels = all.filter((t) => t.type === "channel");

      return { id: row.id, access_tier: row.access_tier, difficulty, topics, channels };
    });

    function matches(clip, f) {
      if (f.access?.length && !f.access.includes(clip.access_tier)) return false;

      if (f.difficulty?.length) {
        const slug = clip.difficulty?.slug || null;
        if (!slug || !f.difficulty.includes(slug)) return false;
      }

      if (f.topic?.length) {
        const slugs = (clip.topics || []).map((t) => t.slug).filter(Boolean);
        if (!slugs.some((s) => f.topic.includes(s))) return false;
      }

      if (f.channel?.length) {
        const slugs = (clip.channels || []).map((t) => t.slug).filter(Boolean);
        if (!slugs.some((s) => f.channel.includes(s))) return false;
      }

      return true;
    }

    const baseFilter = {
      access: selectedAccess,
      difficulty: selectedDifficulty,
      topic: selectedTopic,
      channel: selectedChannel,
    };

    const baseList = normalized.filter((c) => matches(c, baseFilter));
    const total = baseList.length;

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
        .forEach((c) => inc(counts.difficulty, c.difficulty?.slug));
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
        .forEach((c) => (c.topics || []).forEach((t) => inc(counts.topic, t.slug)));
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
        .forEach((c) => (c.channels || []).forEach((t) => inc(counts.channel, t.slug)));
    }

    const toArr = (map) =>
      sortByCountThenName(
        Object.entries(map || {}).map(([slug, count]) => ({ slug, count }))
      );

    flushCookies();
    return res.status(200).json({
      total,
      filters: {
        difficulty: selectedDifficulty,
        access: selectedAccess,
        topic: selectedTopic,
        channel: selectedChannel,
      },
      counts: {
        difficulty: toArr(counts.difficulty),
        access: toArr(counts.access),
        topic: toArr(counts.topic),
        channel: toArr(counts.channel),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
