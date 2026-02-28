// pages/api/clip_full.js
// 合并 /api/clip 和 /api/clip_details 为一个请求
// 内部用 Promise.all 并行查询，减少详情页等待时间
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const id = Number(req.query.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: "missing_id" });

  try {
    // 用户身份（cookie/session）
    const supabase = createServerSupabaseClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();

    // admin client 用于查 clips_view 和 clip_details（绕过 RLS）
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // ✅ 三个查询并行执行，不再串行等待
    const [clipResult, detailResult, subResult] = await Promise.all([
      // 1. 查视频基本信息
      admin
        .from("clips_view")
        .select("id,title,description,duration_sec,access_tier,cover_url,video_url,created_at,difficulty_slug,topic_slugs,channel_slugs")
        .eq("id", id)
        .maybeSingle(),

      // 2. 查字幕和词汇详情
      admin
        .from("clip_details")
        .select("details_json")
        .eq("clip_id", id)
        .maybeSingle(),

      // 3. 查用户会员状态（未登录时跳过）
      user?.id
        ? admin
            .from("subscriptions")
            .select("plan, expires_at, status")
            .eq("user_id", user.id)
            .eq("status", "active")
            .gt("expires_at", new Date().toISOString())
            .order("expires_at", { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // 处理视频信息
    if (clipResult.error) return res.status(500).json({ error: "clip_query_failed", detail: clipResult.error.message });
    const clip = clipResult.data;
    if (!clip) return res.status(404).json({ error: "not_found" });

    // 处理会员状态
    const subRow = subResult.data?.[0] || null;
    const is_member = !!subRow;
    const can_access = clip.access_tier === "free" ? true : is_member;

    // 处理详情 JSON
    let details_json = detailResult.data?.details_json ?? null;
    if (typeof details_json === "string") {
      try { details_json = JSON.parse(details_json); } catch { details_json = null; }
    }

    return res.status(200).json({
      ok: true,
      item: {
        id: clip.id,
        title: clip.title,
        description: clip.description,
        duration_sec: clip.duration_sec,
        access_tier: clip.access_tier,
        cover_url: clip.cover_url,
        video_url: clip.video_url,
        created_at: clip.created_at,
        difficulty_slug: clip.difficulty_slug || null,
        topic_slugs: clip.topic_slugs || [],
        channel_slugs: clip.channel_slugs || [],
        can_access,
      },
      me: {
        logged_in: !!user,
        is_member,
        plan: subRow?.plan || null,
        ends_at: subRow?.expires_at || null,
      },
      details_json,
    });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e?.message || e) });
  }
}
