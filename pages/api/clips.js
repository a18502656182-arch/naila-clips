import { createClient } from "@supabase/supabase-js";

function parseIntSafe(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function parseCSVParam(v) {
  if (!v) return [];
  if (Array.isArray(v)) v = v[0];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

    // ====== 0) 读取登录态（可选）→ isMember ======
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    let isMember = false;

    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      const user = userData?.user;
      if (user?.id) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        const endsAt = sub?.expires_at || null;
        isMember = endsAt ? new Date(endsAt).getTime() > Date.now() : false;
      }
    }

    // ====== 1) 解析参数 ======
    const limit = Math.max(1, Math.min(50, parseIntSafe(req.query.limit, 12)));
    const offset = Math.max(0, parseIntSafe(req.query.offset, 0));
    const sort = String(req.query.sort || "newest"); // newest | oldest

    const difficulty = parseCSVParam(req.query.difficulty); // 这里保留，先不强依赖列
    const access = parseCSVParam(req.query.access); // free,member
    const topic = parseCSVParam(req.query.topic);
    const channel = parseCSVParam(req.query.channel);

    // ====== 2) topic/channel 通过 taxonomies/clip_taxonomies 过滤 clip_id ======
    let filteredClipIds = null;

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
      return res.status(200).json({ version: "clips-api-v5", items: [], total: 0, limit, offset });
    }

    // ====== 3) 查询 clips ======
    let q = supabase.from("clips").select("*", { count: "exact" });

    // access 过滤（按你表里已有 access_tier）
    if (access.length > 0) q = q.in("access_tier", access);

    // 如果你 clips 表里没有 difficulty 列，我们先不强过滤（避免报错）
    // 你后面要做难度多选，我们会改成走 taxonomies/clip_taxonomies（更统一）
    // if (difficulty.length > 0) q = q.in("difficulty_level", difficulty);

    if (filteredClipIds) q = q.in("id", Array.from(filteredClipIds));

    q = q.order("created_at", { ascending: sort === "oldest" }).range(offset, offset + limit - 1);

    const { data: clips, error: clipsErr, count } = await q;
    if (clipsErr) throw clipsErr;

    // ====== 4) 补充 topics/channels/difficulty（从中间表拉回 slug） ======
    const clipIds = (clips || []).map((c) => c.id);
    let map = {}; // clip_id -> {topics:Set, channels:Set, difficulty:Set}
    clipIds.forEach((id) => (map[id] = { topics: new Set(), channels: new Set(), difficulty: new Set() }));

    if (clipIds.length > 0) {
      const { data: rels, error: relErr } = await supabase
        .from("clip_taxonomies")
        .select("clip_id,taxonomy_id")
        .in("clip_id", clipIds);
      if (relErr) throw relErr;

      const taxIds = Array.from(new Set((rels || []).map((r) => r.taxonomy_id).filter(Boolean)));
      if (taxIds.length > 0) {
        const { data: taxes, error: taxErr } = await supabase
          .from("taxonomies")
          .select("id,type,slug")
          .in("id", taxIds);
        if (taxErr) throw taxErr;

        const taxMap = {};
        (taxes || []).forEach((t) => (taxMap[t.id] = t));

        (rels || []).forEach((r) => {
          const t = taxMap[r.taxonomy_id];
          if (!t) return;
          const slot = map[r.clip_id];
          if (!slot) return;
          if (t.type === "topic") slot.topics.add(t.slug);
          if (t.type === "channel") slot.channels.add(t.slug);
          if (t.type === "difficulty") slot.difficulty.add(t.slug);
        });
      }
    }

    const items = (clips || []).map((c) => {
      const accessTier = c.access_tier || "free";
      const canAccess = accessTier === "free" ? true : isMember;

      return {
        ...c,
        can_access: canAccess,
        topics: Array.from(map[c.id]?.topics || []),
        channels: Array.from(map[c.id]?.channels || []),
        difficulty: Array.from(map[c.id]?.difficulty || []),
      };
    });

    return res.status(200).json({
      version: "clips-api-v5",
      items,
      total: count || 0,
      limit,
      offset,
      is_member: isMember,
    });
  } catch (e) {
    return res.status(500).json({
      error: e?.message || "Unknown server error",
      hint: "Open Vercel → Deployments → Logs, screenshot the first red line + stack trace",
    });
  }
}
