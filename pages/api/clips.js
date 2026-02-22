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

    // ✅ DEBUG：看服务端是否拿到 cookie
    const cookieHeader = req.headers.cookie || "";
    const has_cookie = cookieHeader.length > 0;

    // 1) 登录态 -> user
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    const has_user = !!user?.id;

    // 1.1) is_member
    let is_member = false;
    let sub_debug = null;

    if (user?.id) {
      const { data: sub } = await supabase
  .from("subscriptions")
  .select("status, ends_at, plan")
  .eq("user_id", user.id)
  .not("ends_at", "is", null)              // ✅ 关键：过滤掉 ends_at=null
  .order("ends_at", { ascending: false })  // ✅ 再按 ends_at 取最新
  .limit(1)
  .maybeSingle();

      if (subErr) {
        sub_debug = { ok: false, error: subErr.message };
      } else {
        sub_debug = { ok: true, status: sub?.status || null, ends_at: sub?.ends_at || null, plan: sub?.plan || null };
      }

      if (sub?.status === "active" && sub?.ends_at) {
        const ends = new Date(sub.ends_at);
        if (!isNaN(ends.getTime()) && ends.getTime() > Date.now()) {
          is_member = true;
        }
      }
    }

    // 2) 轻量候选集合
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
    if (lightErr) {
      return res.status(500).json({
        error: lightErr.message,
        debug: { mode: "db_paged", step: "light_query_failed", has_cookie, has_user, userErr: userErr?.message || null },
      });
    }

    // 3) 匹配筛选
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
        debug: {
          mode: "db_paged",
          has_cookie,
          has_user,
          user_id: user?.id || null,
          userErr: userErr?.message || null,
          sub_debug,
        },
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

    // 5) 查这一页详细 clips
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

    if (fullErr) {
      return res.status(500).json({
        error: fullErr.message,
        debug: { mode: "db_paged", step: "full_query_failed", has_cookie, has_user, user_id: user?.id || null },
      });
    }

    // 6) 组装 items（保持顺序）
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
      debug: {
        mode: "db_paged",
        has_cookie,
        has_user,
        user_id: user?.id || null,
        userErr: userErr?.message || null,
        sub_debug,
      },
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
