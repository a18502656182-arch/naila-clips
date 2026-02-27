// app/page.js
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";

import HomeClient from "./components/HomeClient";
import HeroSection from "./components/home/HeroSection";
import HowItWorks from "./components/home/HowItWorks";
import FeaturedExamples from "./components/home/FeaturedExamples";
import SectionTitle from "./components/home/SectionTitle";
import { THEME } from "./components/home/theme";

export const revalidate = 60;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function normRow(r) {
  return {
    id: r.id,
    title: r.title ?? "",
    description: r.description ?? null,
    duration_sec: r.duration_sec ?? null,
    created_at: r.created_at,
    upload_time: r.upload_time ?? null,
    access_tier: r.access_tier,
    cover_url: r.cover_url ?? null,
    video_url: r.video_url ?? null,
    difficulty: typeof r.difficulty_slug === "string" ? r.difficulty_slug : null,
    topics: Array.isArray(r.topic_slugs) ? r.topic_slugs : [],
    channels: Array.isArray(r.channel_slugs) ? r.channel_slugs : [],
  };
}

const fetchInitialClips = unstable_cache(
  async () => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("clips_view")
      .select("id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs")
      .order("created_at", { ascending: false })
      .range(0, 12);
    if (error) throw error;
    const rows = data || [];
    const has_more = rows.length > 12;
    return { items: (has_more ? rows.slice(0, 12) : rows).map(normRow), has_more };
  },
  ["clips_view:initial"],
  { revalidate: 60 }
);

const fetchFeatured = unstable_cache(
  async () => {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("clips_view")
      .select("id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs")
      .eq("access_tier", "free")
      .order("created_at", { ascending: false })
      .limit(1);
    if (Array.isArray(data) && data[0]) return normRow(data[0]);
    return null;
  },
  ["clips_view:featured"],
  { revalidate: 60 }
);

export default async function Page() {
  let items = [];
  let has_more = false;
  try {
    const r = await fetchInitialClips();
    items = r.items;
    has_more = r.has_more;
  } catch (e) {
    return <div style={{ padding: 16 }}><pre style={{ color: "crimson" }}>{e?.message}</pre></div>;
  }

  let featured = null;
  try { featured = await fetchFeatured(); } catch {}
  if (!featured) featured = items[0] || null;

  return (
    <div style={{ background: THEME.colors.bg, minHeight: "100vh" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(246,247,251,0.86)", backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${THEME.colors.border}`,
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 12,
              background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`,
              display: "grid", placeItems: "center", color: "#fff", fontWeight: 900,
            }}>EC</div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 16, fontWeight: 950, color: THEME.colors.ink }}>油管英语场景库</div>
              <div style={{ fontSize: 12, color: THEME.colors.faint }}>精选场景短片 · 双语字幕 · 词汇卡片</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href="/login" style={{ fontSize: 13, padding: "8px 12px", borderRadius: 999, border: `1px solid ${THEME.colors.border2}`, color: THEME.colors.ink, textDecoration: "none" }}>登录</a>
            <a href="/register" style={{ fontSize: 13, padding: "8px 12px", borderRadius: 999, background: THEME.colors.ink, color: "#fff", textDecoration: "none" }}>注册</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px 16px 40px" }}>
        <HeroSection>
          <HowItWorks />
          <FeaturedExamples featured={featured} />
        </HeroSection>

        <div style={{ marginTop: 18 }}>
          <SectionTitle title="全部视频" />
          <Suspense fallback={<div style={{ padding: 20, textAlign: "center", color: THEME.colors.faint }}>加载中...</div>}>
            <div style={{ marginTop: 10 }}>
              <HomeClient initialItems={items} initialHasMore={has_more} />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
