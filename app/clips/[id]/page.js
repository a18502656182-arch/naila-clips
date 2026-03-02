// app/clips/[id]/page.js  ← Server Component（无 "use client"）
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import ClipDetailClient from "./ClipDetailClient";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchAllData(id) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) return null;

    // 从 cookie 读取用户 session
    const cookieStore = cookies();
    const accessToken =
      cookieStore.get("sb-access-token")?.value ||
      cookieStore.get("supabase-auth-token")?.value ||
      null;

    // 三个查询并行
    const [clipResult, detailResult, userResult] = await Promise.all([
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

      accessToken
        ? (async () => {
            try {
              const anon = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
              );
              const { data } = await anon.auth.getUser(accessToken);
              const user = data?.user || null;
              if (!user) return { user: null, sub: null };
              const { data: subs } = await admin
                .from("subscriptions")
                .select("plan,expires_at,status")
                .eq("user_id", user.id)
                .eq("status", "active")
                .gt("expires_at", new Date().toISOString())
                .order("expires_at", { ascending: false })
                .limit(1);
              return { user, sub: subs?.[0] || null };
            } catch {
              return { user: null, sub: null };
            }
          })()
        : Promise.resolve({ user: null, sub: null }),
    ]);

    if (clipResult.error || !clipResult.data) return null;
    const clip = clipResult.data;

    const { user, sub } = userResult;
    const is_member = !!sub;
    const can_access = clip.access_tier === "free" ? true : is_member;

    let details_json = detailResult.data?.details_json ?? null;
    if (typeof details_json === "string") {
      try { details_json = JSON.parse(details_json); } catch { details_json = null; }
    }

    return {
      item: {
        id: clip.id,
        title: clip.title,
        cover_url: clip.cover_url || null,
        video_url: clip.video_url || null,
        access_tier: clip.access_tier,
        duration_sec: clip.duration_sec || null,
        description: clip.description || null,
        created_at: clip.created_at,
        difficulty_slug: clip.difficulty_slug || null,
        topic_slugs: clip.topic_slugs || [],
        channel_slugs: clip.channel_slugs || [],
        can_access,
      },
      me: {
        logged_in: !!user,
        is_member,
        plan: sub?.plan || null,
        ends_at: sub?.expires_at || null,
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
      initialMe={data?.me || null}
      initialDetails={data?.details_json || null}
    />
  );
}
