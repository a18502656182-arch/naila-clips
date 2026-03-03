// pages/api/clips.js
import { proxyCoverUrl } from "../../lib/imageUrl.js";
import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

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
    const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

    const difficulty = parseList(req.query.difficulty);
    const access = parseList(req.query.access);
    const topic = parseList(req.query.topic);
    const channel = parseList(req.query.channel);

    const sort = req.query.sort === "oldest" ? "oldest" : "newest";
    const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10), 1), 50);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // membership（保留原逻辑）
    let is_member = false;
    if (user) {
      const { data: subRow } = await supabase
        .from("subscriptions")
        .select("status, plan, ends_at, expires_at")
        .eq("user_id", user.id)
        .order("ends_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (subRow && subRow.status === "active") {
        const endAt = subRow.ends_at || subRow.expires_at || null;
        if (!endAt) {
          is_member = true;
        } else {
          const endMs = new Date(endAt).getTime();
          if (!Number.isNaN(endMs) && endMs > Date.now()) is_member = true;
        }
      }
    }

    // 轻量查询候选（保留原逻辑）
    let q = supabase
      .from("clips")
      .select(
        `
        id, access_tier, created_at,
        clip_taxonomies(taxonomies(type, slug))
      `
      )
      .order("created_at", { ascending: sort === "oldest" });

    if (access.length) q = q.in("access_tier", access);

    const { data: lightRows, error: lightErr } = await q;
    if (lightErr) {
      flushCookies();
      return res.status(500).json({ error: lightErr.message });
    }

    const normalized = (lightRows || []).map((row) => {
      const all = (row.clip_taxonomies || []).map((ct) => ct.taxonomies).filter(Boolean);
      const diff = all.find((t) => t.type === "difficulty")?.slug || null;
      const topics = all.filter((t) => t.type === "topic").map((t) => t.slug);
      const channels = all.filter((t) => t.type === "channel").map((t) => t.slug);
      return { id: row.id, created_at: row.created_at, access_tier: row.access_tier, difficulty: diff, topics, channels };
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

    const matched = normalized.filter(matches);
    const total = matched.length;
    const page = matched.slice(offset, offset + limit);
    const pageIds = page.map((x) => x.id);
    const has_more = offset + limit < total;

    if (!pageIds.length) {
      flushCookies();
      return res.status(200).json({
        items: [],
        total,
        limit,
        offset,
        has_more,
        sort,
        filters: { difficulty, access, topic, channel },
        is_member,
      });
    }

    const { data: fullRows, error: fullErr } = await supabase
      .from("clips")
      .select(
        `
        id, title, description, duration_sec, created_at, upload_time,
        access_tier, cover_url, video_url,
        clip_taxonomies(taxonomies(type, slug))
      `
      )
      .in("id", pageIds);

    if (fullErr) {
      flushCookies();
      return res.status(500).json({ error: fullErr.message });
    }

    const fullMap = new Map((fullRows || []).map((r) => [r.id, r]));

    const items = pageIds
      .map((id) => {
        const row = fullMap.get(id);
        if (!row) return null;

        const all = (row.clip_taxonomies || []).map((ct) => ct.taxonomies).filter(Boolean);
        const diff = all.find((t) => t.type === "difficulty")?.slug || null;
        const topics = all.filter((t) => t.type === "topic").map((t) => t.slug);
        const channels = all.filter((t) => t.type === "channel").map((t) => t.slug);

        const can_access = row.access_tier === "free" ? true : Boolean(is_member);

        return {
          id: row.id,
          title: row.title,
          description: row.description ?? null,
          duration_sec: row.duration_sec ?? null,
          created_at: row.created_at,
          upload_time: row.upload_time ?? null,
          access_tier: row.access_tier,
          cover_url: proxyCoverUrl(row.cover_url),
          video_url: row.video_url ?? null,
          difficulty: diff,
          topics,
          channels,
          can_access,
        };
      })
      .filter(Boolean);

    flushCookies();
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
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
