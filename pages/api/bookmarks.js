// pages/api/bookmarks.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // ===== 1) 取 token（优先 Authorization，其次尝试 cookie）=====
    const token = getAccessTokenFromReq(req);
    if (!token) return res.status(401).json({ error: "not_logged_in" });

    const { data: u, error: uerr } = await supabase.auth.getUser(token);
    if (uerr || !u?.user) {
      return res.status(401).json({ error: "not_logged_in", detail: uerr?.message || "no_user" });
    }
    const user_id = u.user.id;

    // ===== 2) 分页参数 =====
    const limit = clampInt(req.query.limit, 20, 1, 50);
    const offset = clampInt(req.query.offset, 0, 0, 100000);

    // ===== 3) 查 bookmarks（只拿 clip_id 列表）=====
    const { data: rows, error: berr } = await supabase
      .from("bookmarks")
      .select("clip_id, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (berr) {
      return res.status(500).json({ error: "bookmarks_query_failed", detail: berr.message });
    }

    const clipIds = (rows || []).map((r) => r.clip_id).filter(Boolean);
    if (!clipIds.length) {
      return res.status(200).json({ items: [], total: 0, limit, offset });
    }

    // ===== 4) 用 clips_view 批量查视频信息（重点：不碰 clips.difficulty）=====
    const { data: clips, error: cerr } = await supabase
      .from("clips_view")
      .select(
        "id,title,description,duration_sec,upload_time,access_tier,cover_url,video_url,created_at,difficulty_slugs,topic_slugs,channel_slugs"
      )
      .in("id", clipIds);

    if (cerr) {
      return res.status(500).json({ error: "clips_view_query_failed", detail: cerr.message });
    }

    // ===== 5) 组装返回：保持原 bookmark 顺序 =====
    const byId = new Map((clips || []).map((c) => [c.id, c]));

    const items = (rows || [])
      .map((b) => {
        const c = byId.get(b.clip_id);
        if (!c) return null;

        // 你之前接口用 difficulty: "beginner" 这种单值，这里从 difficulty_slugs[0] 取
        const difficulty = Array.isArray(c.difficulty_slugs) ? (c.difficulty_slugs[0] || null) : null;

        return {
          id: c.id,
          title: c.title,
          description: c.description,
          duration_sec: c.duration_sec,
          upload_time: c.upload_time,
          created_at: c.created_at,
          access_tier: c.access_tier,
          cover_url: c.cover_url,
          video_url: c.video_url,
          difficulty,
          topics: Array.isArray(c.topic_slugs) ? c.topic_slugs : [],
          channels: Array.isArray(c.channel_slugs) ? c.channel_slugs : [],
          bookmarked_at: b.created_at,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      items,
      total: items.length, // 先返回本页数量；你要全量 total 我也可以再加 count 查询
      limit,
      offset,
      debug: { mode: "bookmarks_from_clips_view" },
    });
  } catch (e) {
    return res.status(500).json({ error: "unknown", detail: String(e?.message || e) });
  }
}

function clampInt(v, def, min, max) {
  const n = parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function getAccessTokenFromReq(req) {
  // 1) Authorization: Bearer xxx
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (auth && String(auth).startsWith("Bearer ")) {
    return String(auth).slice("Bearer ".length).trim();
  }

  // 2) Cookie: 尝试找 sb-xxx-auth-token（你截图里就是这种）
  const cookie = req.headers?.cookie || "";
  if (!cookie) return "";

  const kv = cookie.split(";").map((s) => s.trim());
  const tokenCookie = kv.find((x) => x.startsWith("sb-") && x.includes("-auth-token="));
  if (!tokenCookie) return "";

  const raw = tokenCookie.split("=").slice(1).join("=");
  if (!raw) return "";

  try {
    const decoded = decodeURIComponent(raw);

    // 兼容两种：数组 / 对象
    const parsed = JSON.parse(decoded);

    // 有些是 [access, refresh, ...]
    if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0].includes(".")) {
      return parsed[0];
    }

    // 有些是 { access_token: "..." }
    if (parsed && typeof parsed.access_token === "string") {
      return parsed.access_token;
    }
  } catch (e) {
    // ignore
  }

  return "";
}
