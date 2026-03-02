// app/clips/[id]/page.js  ← Server Component（无 "use client"）
import { createClient } from "@supabase/supabase-js";
import ClipDetailClient from "./ClipDetailClient";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// 服务端只获取不需要权限的基本信息：title、cover_url、video_url、access_tier
async function fetchClipBasic(id) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) return null;
    const { data, error } = await admin
      .from("clips_view")
      .select("id,title,cover_url,video_url,access_tier,duration_sec,description,created_at,difficulty_slug,topic_slugs,channel_slugs")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      title: data.title,
      cover_url: data.cover_url || null,
      video_url: data.video_url || null,
      access_tier: data.access_tier,
      duration_sec: data.duration_sec || null,
      description: data.description || null,
      created_at: data.created_at,
      difficulty_slug: data.difficulty_slug || null,
      topic_slugs: data.topic_slugs || [],
      channel_slugs: data.channel_slugs || [],
      // can_access 未知（需要用户 token），客户端会用 API 更新
      can_access: data.access_tier === "free" ? true : null,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const id = Number(params?.id);
  if (!id) return {};
  const clip = await fetchClipBasic(id);
  if (!clip) return { title: "视频详情 - 油管英语场景库" };
  return {
    title: `${clip.title} - 油管英语场景库`,
    description: clip.description || "精选 YouTube 场景短片，边看边学地道英语。",
  };
}

export default async function ClipDetailPage({ params }) {
  const id = Number(params?.id);
  const initialClip = id ? await fetchClipBasic(id) : null;

  return (
    <ClipDetailClient
      clipId={id || null}
      initialClip={initialClip}
    />
  );
}
