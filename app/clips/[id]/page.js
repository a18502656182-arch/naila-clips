// app/clips/[id]/page.js  ← Server Component（无 "use client"）
import { createClient } from "@supabase/supabase-js";
import ClipDetailClient from "./ClipDetailClient";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// 视频 m3u8 通过后端反代，解决运营商拦截问题
function proxyVideoUrl(url) {
  if (!url) return null;
  return `/api/proxy_video?url=${encodeURIComponent(url)}`;
}

async function fetchAllData(id) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) return null;

    // 两个查询并行：clip基本信息 + 字幕详情
    // 用户登录状态用 localStorage token，服务端无法读取，交给客户端处理
    const [clipResult, detailResult] = await Promise.all([
      admin
        .from("clips_view")
        .select("id,title,cover_url,video_url,access_tier,duration_sec,description,created_at,difficulty_slug,topic_slugs,channel_slugs")
        .eq("id", id)
        .maybeSingle(),

      admin
        .from("clip_details")
        .select("details_json")
        .eq("clip_id", id)
        .maybeSingle(),
    ]);

    if (clipResult.error || !clipResult.data) return null;
    const clip = clipResult.data;

    // 免费视频服务端直接给 can_access=true
    // 会员视频先给 null，客户端验证 token 后更新
    const can_access = clip.access_tier === "free" ? true : null;

    let details_json = detailResult.data?.details_json ?? null;
    if (typeof details_json === "string") {
      try { details_json = JSON.parse(details_json); } catch { details_json = null; }
    }

    return {
      item: {
        id: clip.id,
        title: clip.title,
        cover_url: clip.cover_url || null,
        video_url: proxyVideoUrl(clip.video_url),
        access_tier: clip.access_tier,
        duration_sec: clip.duration_sec || null,
        description: clip.description || null,
        created_at: clip.created_at,
        difficulty_slug: clip.difficulty_slug || null,
        topic_slugs: clip.topic_slugs || [],
        channel_slugs: clip.channel_slugs || [],
        can_access,
      },
      details_json,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const id = Number(params?.id);
  if (!id) return {};
  const data = await fetchAllData(id);
  if (!data) return { title: "视频详情 - 油管英语场景库" };
  return {
    title: `${data.item.title} - 油管英语场景库`,
    description: data.item.description || "精选 YouTube 场景短片，边看边学地道英语。",
  };
}

export default async function ClipDetailPage({ params }) {
  const id = Number(params?.id);
  const data = id ? await fetchAllData(id) : null;

  return (
    <ClipDetailClient
      clipId={id || null}
      initialItem={data?.item || null}
      initialMe={null}
      initialDetails={data?.details_json || null}
    />
  );
}
