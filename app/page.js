// app/page.js
import { createClient } from "@supabase/supabase-js";
import { Suspense } from "react";

import HomeClient from "./components/HomeClient";
import UserMenuClient from "./components/UserMenuClient";
import SiteTabs from "./components/SiteTabs";
import HeroSection from "./components/home/HeroSection";
import HowItWorks from "./components/home/HowItWorks";
import SectionTitle from "./components/home/SectionTitle";
import { THEME } from "./components/home/theme";
import { proxyCoverUrl } from "../lib/imageUrl.js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (u, o = {}) => fetch(u, { ...o, cache: "no-store" }) },
  });
}

async function fetchAllClips() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("clips")
    .select(`
      id, title, description, duration_sec, created_at, upload_time,
      access_tier, cover_url, video_url, site,
      clip_taxonomies (
        taxonomies ( type, slug )
      )
    `)
    .order("upload_time", { ascending: false });

  if (error) throw error;

  return (data || []).map(row => {
    const all = (row.clip_taxonomies || []).map(ct => ct.taxonomies).filter(Boolean);
    return {
      id: row.id,
      title: row.title ?? "",
      description: row.description ?? null,
      duration_sec: row.duration_sec ?? null,
      created_at: row.created_at,
      upload_time: row.upload_time ?? null,
      access_tier: row.access_tier,
      cover_url: proxyCoverUrl(row.cover_url),
      video_url: row.video_url ?? null,
      site: row.site || "yt",
      difficulty: all.find(t => t.type === "difficulty")?.slug || null,
      topics: all.filter(t => t.type === "topic").map(t => t.slug),
      channels: all.filter(t => t.type === "channel").map(t => t.slug),
      genres: all.filter(t => t.type === "genre").map(t => t.slug),
      durations: all.filter(t => t.type === "duration").map(t => t.slug),
      shows: all.filter(t => t.type === "show").map(t => t.slug),
    };
  });
}

async function fetchTaxonomies() {
  const supabase = getSupabaseAdmin();
  const { data: taxRows, error } = await supabase
    .from("taxonomies")
    .select("type, slug")
    .order("type", { ascending: true })
    .order("slug", { ascending: true });

  if (error) return { difficulties: [], topics: [], channels: [], genres: [], durations: [], shows: [] };

  const rows = taxRows || [];
  return {
    difficulties: rows.filter(t => t.type === "difficulty").map(t => ({ slug: t.slug, name: t.slug, count: 0 })),
    topics: rows.filter(t => t.type === "topic").map(t => ({ slug: t.slug, name: t.slug, count: 0 })),
    channels: rows.filter(t => t.type === "channel").map(t => ({ slug: t.slug, name: t.slug, count: 0 })),
    genres: rows.filter(t => t.type === "genre").map(t => ({ slug: t.slug, name: t.slug, count: 0 })),
    durations: rows.filter(t => t.type === "duration").map(t => ({ slug: t.slug, name: t.slug, count: 0 })),
    shows: rows.filter(t => t.type === "show").map(t => ({ slug: t.slug, name: t.slug, count: 0 })),
  };
}

async function fetchFeatured(site) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("clips")
    .select(`
      id, title, description, duration_sec, created_at, upload_time,
      access_tier, cover_url, video_url, site,
      clip_taxonomies ( taxonomies ( type, slug ) )
    `)
    .eq("access_tier", "free")
    .eq("site", site)
    .order("upload_time", { ascending: false })
    .limit(1);

  if (Array.isArray(data) && data[0]) {
    const row = data[0];
    const all = (row.clip_taxonomies || []).map(ct => ct.taxonomies).filter(Boolean);
    return {
      id: row.id,
      title: row.title ?? "",
      description: row.description ?? null,
      duration_sec: row.duration_sec ?? null,
      created_at: row.created_at,
      upload_time: row.upload_time ?? null,
      access_tier: row.access_tier,
      cover_url: proxyCoverUrl(row.cover_url),
      video_url: row.video_url ?? null,
      site: row.site || site,
      difficulty: all.find(t => t.type === "difficulty")?.slug || null,
      topics: all.filter(t => t.type === "topic").map(t => t.slug),
      channels: all.filter(t => t.type === "channel").map(t => t.slug),
      genres: all.filter(t => t.type === "genre").map(t => t.slug),
      durations: all.filter(t => t.type === "duration").map(t => t.slug),
      shows: all.filter(t => t.type === "show").map(t => t.slug),
    };
  }
  return null;
}

export default async function Page() {
  let allItems = [];
  try {
    allItems = await fetchAllClips();
  } catch (e) {
    return (
      <div style={{ padding: 16 }}>
        <pre style={{ color: "crimson" }}>{e?.message}</pre>
      </div>
    );
  }

  let featured = null;
  let featuredDrama = null;
  try {
    [featured, featuredDrama] = await Promise.all([
      fetchFeatured("yt"),
      fetchFeatured("drama"),
    ]);
  } catch {}

  if (!featured) featured = allItems.find(r => r.site === "yt" && r.access_tier === "free") || allItems[0] || null;
  if (!featuredDrama) featuredDrama = allItems.find(r => r.site === "drama" && r.access_tier === "free") || null;

  let taxonomies = { difficulties: [], topics: [], channels: [], genres: [], durations: [], shows: [] };
  try {
    taxonomies = await fetchTaxonomies();
  } catch {}

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 560px at 10% -10%, rgba(79,70,229,0.08), transparent 50%), radial-gradient(1000px 420px at 100% 0%, rgba(6,182,212,0.08), transparent 45%), linear-gradient(180deg, #f6f8fc 0%, #f4f6fb 100%)",
      }}
    >
      {/* 顶部导航栏 */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(246,248,252,0.74)",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${THEME.colors.border}`,
          boxShadow: "0 8px 24px rgba(15,23,42,0.03)",
        }}
      >
        <div
          style={{
            maxWidth: 1200, margin: "0 auto", padding: "10px 16px",
            display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 12,
          }}
        >
          {/* 左：Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 14,
                background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`,
                display: "grid", placeItems: "center",
                color: "#fff", fontWeight: 950, fontSize: 14,
                letterSpacing: "-0.03em",
                boxShadow: "0 14px 28px rgba(79,70,229,0.26)",
              }}
            >
              EC
            </div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 16, fontWeight: 950, color: THEME.colors.ink, letterSpacing: "-0.02em" }}>
                <span className="title-desktop">英语场景库</span>
                <span className="title-mobile">英语场景库</span>
                <style>{`
                  .title-desktop { display: inline; }
                  .title-mobile { display: none; }
                  @media (max-width: 480px) {
                    .title-desktop { display: none; }
                    .title-mobile { display: inline; }
                  }
                `}</style>
              </div>
            </div>
          </div>

          {/* 中：Tab切换（客户端组件） */}
          <SiteTabs />

          {/* 右：用户菜单 */}
          <UserMenuClient />
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 16px 52px" }}>
        <HeroSection featured={featured} featuredDrama={featuredDrama} />

        <div style={{ marginTop: 22 }}>
          <HowItWorks />
        </div>

        <div style={{ marginTop: 30 }}>
          <SectionTitle title="内容库" />
          <div style={{ marginTop: 14 }}>
            <Suspense
              fallback={
                <div style={{ padding: 24, textAlign: "center", color: THEME.colors.faint }}>
                  加载中...
                </div>
              }
            >
              <HomeClient allItems={allItems} initialTaxonomies={taxonomies} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
