// pages/api/clips.js
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

    const difficulty = parseList(req.query.difficulty);
    const access = parseList(req.query.access); // free,vip
    const topic = parseList(req.query.topic);
    const channel = parseList(req.query.channel);

    const sort = req.query.sort === "oldest" ? "oldest" : "newest";
    const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10), 1), 50);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    // 1) 登录态 -> is_member（统一用 subscriptions.expires_at）
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    let is_member = false;
    let sub_debug = { ok: false, status: null, expires_at: null, plan: null };

    if (user?.id && !userErr) {
      const { data: sub, error: subErr } = await supabase
        .from("subscriptions")
        .select("status, expires_at, plan")
        .eq("user_id", user.id)
        .not("expires_at", "is", null)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!subErr && sub) {
        sub_debug = { ok: true, status: sub.status || null, expires_at: sub.expires_at || null, plan: sub.plan || null };

        const exp = sub.expires_at ? new Date(sub.expires_at).getTime() : null;
        if (sub.status === "active" && exp && !Number.isNaN(exp) && exp > Date.now()) {
          is_member = true;
        }
      } else {
        sub_debug = { ok: false, status: null, expires_at: null, plan: null };
      }
    }

    // 2) 先拿轻量候选集合
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

    if (access.length) q = q.in("access_tier", access);

    const { data: lightRows, error: lightErr } = await q;
    if (lightErr) return res.status(500).json({ error: lightErr.message });

    // 3) 后端匹配 difficulty/topic/channel
    const normalized = (lightRows || []).map((row) => {
      const all = (row.clip_taxonomies || [])
        .map((ct) => ct.taxonomies)
        .filter(Boolean);

      const diff = all.find((t) => t.type === "difficulty")?.slug || null;
      const topics = all.filter((t) => t.type === "topic").map((t) => t.slug);
      const channels = all.filter((t) => t.type === "channel").map((t) => t.slug);

      return {
        id: row.id,
        created_at: row.created_at,
        access_tier: row.access_tier,
        difficulty: diff,
        topics,
        channels,
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

    const matched = normalized.filter(matches);

    // 4) 分页
    const total = matched.length;
    const page = matched.slice(offset, offset + limit);
    const pageIds = page.map((x) => x.id);
    const has_more = offset + limit < total;

    if (!pageIds.length) {
      return res.status(200).json({
        debug: { mode: "db_paged", has_cookie: true, has_user: !!user?.id, user_id: user?.id || null, userErr: userErr?.message || null, sub_debug },
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

    // 5) 查这一页详情
    const { data: fullRows, error: fullErr } = await supabase
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
      .in("id", pageIds);

    if (fullErr) return res.status(500).json({ error: fullErr.message });

    const fullMap = new Map((fullRows || []).map((r) => [r.id, r]));

    const items = pageIds
      .map((id) => {
        const row = fullMap.get(id);
        if (!row) return null;

        const all = (row.clip_taxonomies || [])
          .map((ct) => ct.taxonomies)
          .filter(Boolean);

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
          cover_url: row.cover_url ?? null,
          video_url: row.video_url ?? null,
          difficulty: diff,
          topics,
          channels,
          can_access,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      debug: { mode: "db_paged", has_cookie: true, has_user: !!user?.id, user_id: user?.id || null, userErr: userErr?.message || null, sub_debug },
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
