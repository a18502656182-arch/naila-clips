// pages/api/clips_public.js
import { createClient } from "@supabase/supabase-js";

function parseList(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v.join(",");
  return String(v).split(",").map(s => s.trim()).filter(Boolean);
}

// 用 service role 或 anon 都行：这里只读公开字段
function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key);
}

export default async function handler(req, res) {
  // ✅ 允许 CDN 缓存（重点！）
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300"
  );

  try {
    const supabase = getSupabase();

    const difficulty = parseList(req.query.difficulty);
    const access = parseList(req.query.access);
    const topic = parseList(req.query.topic);
    const channel = parseList(req.query.channel);

    const sort = req.query.sort === "oldest" ? "oldest" : "newest";
    const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10), 1), 50);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    // ✅ 先只查 clips 的基础字段 + created_at 分页（不要全表）
    // 这里先用简单版：仅用 access_tier + created_at 做分页
    let q = supabase
      .from("clips")
      .select("id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url")
      .order("created_at", { ascending: sort === "oldest" })
      .range(offset, offset + limit - 1);

    if (access.length) q = q.in("access_tier", access);

    const { data: rows, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    // ✅ 如果你要在列表里显示 topic/channel/difficulty：
    // 建议改成“冗余字段/视图”再取（见下面第4部分），先别 join 全量 taxonomies。

    return res.status(200).json({
      items: (rows || []).map(r => ({
        ...r,
        // 先不返回 can_access（前端用 is_member 算）
        can_access: undefined,
      })),
      limit,
      offset,
      has_more: (rows || []).length === limit,
      sort,
      filters: { difficulty, access, topic, channel },
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
