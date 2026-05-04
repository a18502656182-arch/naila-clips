// app/clips/[id]/page.js
import { cookies, headers } from "next/headers";
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

function proxyVideoUrl(url) {
  if (!url) return null;
  return `/api/proxy_video?url=${encodeURIComponent(url)}`;
}

function proxyCoverUrl(url) {
  if (!url) return null;
  if (url.startsWith("https://imagedelivery.net")) {
    const base = url.slice("https://imagedelivery.net".length).replace(/\/[^\/]+$/, "");
    return "/cf-img" + base + "/w=400,quality=80,format=webp";
  }
  return url;
}

export default async function ClipPage({ params }) {
  const id = Number(params?.id);
  if (!id || isNaN(id)) notFound();

  const ua = headers().get("user-agent") || "";
  const initialIsMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  const token = getAccessTokenFromCookies();
  const admin = getSupabaseAdmin();

  const [clipResult, detailResult, subResult, bookmarkResult] = await Promise.all([
    admin
      .from("clips_view")
      .select(
        "id,title,description,duration_sec,access_tier,cover_url,video_url,created_at,upload_time,difficulty_slug,topic_slugs,channel_slugs,site"
      )
      .eq("id", id)
      .lte("upload_time", new Date().toISOString())
      .maybeSingle(),
    admin
      .from("clips")
      .select("details_json")
      .eq("id", id)
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
            .select("plan, expires_at, status, site")
            .eq("user_id", user.id)
            .eq("status", "active")
            // 永久卡 expires_at 为 null，有效期卡 expires_at > now()，两种都算有效会员
            .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
            .order("expires_at", { ascending: false, nullsFirst: true })
            .limit(1);
          return { user, sub: subData?.[0] || null };
        })()
      : Promise.resolve({ user: null, sub: null }),
    token
      ? (async () => {
          const anon = createClient(
            process.env.SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { auth: { persistSession: false } }
          );
          const { data: userData } = await anon.auth.getUser(token);
          const user = userData?.user || null;
          if (!user) return { data: null };
          return await admin.from("bookmarks").select("id").eq("user_id", user.id).eq("clip_id", id).maybeSingle();
        })()
      : Promise.resolve({ data: null }),
  ]);

  if (clipResult.error || !clipResult.data) notFound();

  const clip = clipResult.data;
  const { user, sub } = subResult;
  const is_member = !!sub;
  const can_access = clip.access_tier === "free" ? true : is_member;
  const initialBookmarked = !!bookmarkResult.data;

  let details_json = detailResult.data?.details_json ?? null;
  // 如果 clips 表里没有，尝试从 clip_details 表读取（兼容旧数据）
  if (!details_json) {
    const { data: legacyDetail } = await admin
      .from("clip_details")
      .select("details_json")
      .eq("clip_id", id)
      .maybeSingle();
    details_json = legacyDetail?.details_json ?? null;
  }
  if (typeof details_json === "string") {
    try { details_json = JSON.parse(details_json); } catch { details_json = null; }
  }

  const initialItem = {
    id: clip.id,
    title: clip.title,
    description: clip.description,
    duration_sec: clip.duration_sec,
    access_tier: clip.access_tier,
    cover_url: proxyCoverUrl(clip.cover_url),
    video_url: can_access ? proxyVideoUrl(clip.video_url) : null,
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
      initialDetails={can_access ? details_json : null}
      initialBookmarked={initialBookmarked}
      initialIsMobile={initialIsMobile}
    />
  );
}
