import { createClient } from "@supabase/supabase-js";

function parseCSVParam(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v[0];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseIntSafe(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function intersectSets(a, b) {
  const out = new Set();
  for (const x of a) if (b.has(x)) out.add(x);
  return out;
}

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const limit = Math.max(1, Math.min(50, parseIntSafe(req.query.limit, 12)));
    const offset = Math.max(0, parseIntSafe(req.query.offset, 0));

    const sortRaw = Array.isArray(req.query.sort) ? req.query.sort[0] : req.query.sort;
    const sort = sortRaw === "oldest" ? "oldest" : "newest";

    const difficulty = parseCSVParam(req.query.difficulty);
    const access = parseCSVParam(req.query.access);
    const topic = parseCSVParam(req.query.topic);
    const channel = parseCSVParam(req.query.channel);

    // 临时会员逻辑：free 永远可访问；member 需要 ?demo_member=1
    const demoMember = String(req.query.demo_member || "") === "1";

    // ===== topic/channel: slug -> taxonomy_id -> clip_id（交集）=====
    let filteredClipIds = null; // Set or null

    async function slugsToTaxonomyIds(type, slugs) {
      if (!slugs || slugs.length === 0) return [];
      const { data, error } = await supabase
        .from("taxonomies")
        .select("id")
        .eq("type", type)
        .in("slug", slugs);
      if (error) throw error;
      return (data || []).map((x) => x.id);
    }

    async function taxonomyIdsToClipIds(taxonomyIds) {
      if (!taxonomyIds || taxonomyIds.length === 0) return new Set();
      const { data, error } = await supabase
        .from("clip_taxonomies")
        .select("clip_id")
        .in("taxonomy_id", taxonomyIds);
      if (error) throw error;
      return new Set((data || []).map((x) => x.clip_id).filter(Boolean));
    }

    if (topic.length > 0) {
      const taxIds = await slugsToTaxonomyIds("topic", topic);
      const ids = await taxonomyIdsToClipIds(taxIds);
      filteredClipIds = filteredClipIds ? intersectSets(filteredClipIds, ids) : ids;
    }

    if (channel.length > 0) {
      const taxIds = await slugsToTaxonomyIds("channel", channel);
      const ids = await taxonomyIdsToClipIds(taxIds);
      filteredClipIds = filteredClipIds ? intersectSets(filteredClipIds, ids) : ids;
    }

    if (filteredClipIds && filteredClipIds.size === 0) {
      return res.status(200).json({ items: [], total: 0, limit, offset });
    }

    // ===== 主查询 clips =====
    let q = supabase
      .from("clips")
      .select("id,title,cover_url,video_url,duration_sec,created_at,difficulty_level,access_tier", { count: "exact" });

    if (difficulty.length > 0) q = q.in("difficulty_level", difficulty);
    if (access.length > 0) q = q.in("access_tier", access);
    if (filteredClipIds) q = q.in("id", Array.from(filteredClipIds));

    q = q.order("created_at", { ascending: sort === "oldest" });
    q = q.range(offset, offset + limit - 1);

    const { data: clips, error: clipsErr, count } = await q;
    if (clipsErr) throw clipsErr;

    const items = (clips || []).map((c) => {
      const isFree = c.access_tier === "free";
      const canAccess = isFree ? true : demoMember ? true : false;
      return { ...c, can_access: canAccess };
    });

    return res.status(200).json({ items, total: count || 0, limit, offset });
  } catch (e) {
    return res.status(500).json({
      error: e?.message || "Unknown server error",
      hint: "Open Vercel → Deployments → Logs, screenshot the first red line + stack trace",
    });
  }
}
