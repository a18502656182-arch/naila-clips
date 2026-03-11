// app/clips/[id]/page.js
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import ClipDetailClient from "./ClipDetailClient";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function getAccessTokenFromCookies() {
  try {
    const cookieStore = cookies();
    const all = cookieStore.getAll();
    const authCookie = all.find(
      (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );
    if (!authCookie) return null;
    let raw = authCookie.value;
    if (raw.startsWith("base64-")) raw = raw.slice(7);
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const session = Array.isArray(parsed) ? parsed[0] : parsed;
    return session?.access_token || null;
  } catch {
    return null;
  }
}

// 与 Railway clip_full.js 保持一致：把原始 video_url 转成反代路径
function proxyVideoUrl(url) {
  if (!url) return null;
  return `/api/proxy_video?url=${encodeURIComponent(url)}`;
}

export default async function ClipPage({ params }) {
  const id = Number(params?.id);
  if (!id || isNaN(id)) notFound();

  const token = getAccessTokenFromCookies();
  const admin = getSupabaseAdmin();

  // 并行查询：clip 基础信息 + 详情 + 用户订阅
  const [clipResult, detailResult, subResult] = await Promise.all([
    admin
      .from("clips_view")
      .select(
        "id,title,description,duration_sec,access_tier,cover_url,video_url,created_at,difficulty_slug,topic_slugs,channel_slugs"
      )
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("clip_details")
      .select("details_json")
      .eq("clip_id", id)
      .maybeSingle(),
    token
      ? (async () => {
          const anon = createClient(
            process.env.SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { auth: { persistSession: false } }
          );
          const { data: userData } = await anon.auth.getUser(token);
          const user = userData?.user || null;
          if (!user) return { user: null, sub: null };
          const { data: subData } = await admin
            .from("subscriptions")
            .select("plan, expires_at, status")
            .eq("user_id", user.id)
            .eq("status", "active")
            .gt("expires_at", new Date().toISOString())
            .order("expires_at", { ascending: false })
            .limit(1);
          return { user, sub: subData?.[0] || null };
        })()
      : Promise.resolve({ user: null, sub: null }),
  ]);

  if (clipResult.error || !clipResult.data) notFound();

  const clip = clipResult.data;
  const { user, sub } = subResult;
  const is_member = !!sub;
  const can_access = clip.access_tier === "free" ? true : is_member;

  let details_json = detailResult.data?.details_json ?? null;
  if (typeof details_json === "string") {
    try { details_json = JSON.parse(details_json); } catch { details_json = null; }
  }

  const initialItem = {
    id: clip.id,
    title: clip.title,
    description: clip.description,
    duration_sec: clip.duration_sec,
    access_tier: clip.access_tier,
    cover_url: clip.cover_url,
    // ✅ SSR 阶段就用反代 URL，确保视频不走原始 Cloudflare 地址
    video_url: proxyVideoUrl(clip.video_url),
    created_at: clip.created_at,
    difficulty_slug: clip.difficulty_slug || null,
    topic_slugs: clip.topic_slugs || [],
    channel_slugs: clip.channel_slugs || [],
    can_access,
  };

  const initialMe = {
    logged_in: !!user,
    is_member,
    plan: sub?.plan || null,
    ends_at: sub?.expires_at || null,
  };

  return (
    <ClipDetailClient
      clipId={id}
      initialItem={initialItem}
      initialMe={initialMe}
      initialDetails={details_json}
    />
  );
}
