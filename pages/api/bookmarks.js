// pages/api/bookmarks.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

function getBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function getUserFromReq(req, res) {
  const supabase = createPagesServerClient({ req, res });

  const token = getBearer(req);
  const { data, error } = token
    ? await supabase.auth.getUser(token) // ✅ Bearer
    : await supabase.auth.getUser(); // ✅ Cookie

  const user = data?.user || null;
  return { supabase, user, mode: token ? "bearer" : "cookie", userErr: error?.message || null };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 200);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    const { supabase, user, mode, userErr } = await getUserFromReq(req, res);
    if (!user) {
      return res.status(401).json({ error: "not_logged_in", debug: { mode, userErr } });
    }

    // 1) 先取 bookmarks（只取当前用户）
    const { data: rows, error: e1, count } = await supabase
      .from("bookmarks")
      .select("id, clip_id, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (e1) {
      return res.status(500).json({
        error: "bookmarks_query_failed",
        detail: e1.message,
        debug: { mode },
      });
    }

    const clipIds = (rows || []).map((r) => r.clip_id).filter(Boolean);

    // 2) 批量取 clips_view（如果你没有 clips_view，可以改成 clips）
    let clipMap = new Map();
    if (clipIds.length) {
      const { data: clips, error: e2 } = await supabase
        .from("clips_view")
        .select(
          "id,title,access_tier,cover_url,video_url,duration_sec,created_at,difficulty_slugs,topic_slugs,channel_slugs"
        )
        .in("id", clipIds);

      if (e2) {
        return res.status(500).json({
          error: "clips_query_failed",
          detail: e2.message,
          debug: { mode },
        });
      }
      clipMap = new Map((clips || []).map((c) => [c.id, c]));
    }

    const items = (rows || []).map((b) => {
      const c = clipMap.get(b.clip_id);
      return {
        bookmark_id: b.id,
        clip_id: b.clip_id,
        bookmarked_at: b.created_at,
        clip: c
          ? {
              id: c.id,
              title: c.title,
              access_tier: c.access_tier,
              cover_url: c.cover_url,
              video_url: c.video_url,
              duration_sec: c.duration_sec,
              created_at: c.created_at,
              difficulty_slugs: c.difficulty_slugs || [],
              topic_slugs: c.topic_slugs || [],
              channel_slugs: c.channel_slugs || [],
            }
          : null,
      };
    });

    return res.status(200).json({
      ok: true,
      total: count || 0,
      limit,
      offset,
      items,
      debug: { mode },
    });
  } catch (err) {
    return res.status(500).json({ error: "unknown", detail: String(err?.message || err) });
  }
}
