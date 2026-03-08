// app/page.js
import { createClient } from "@supabase/supabase-js";
import { Suspense } from "react";

import HomeClient from "./components/HomeClient";
import UserMenuClient from "./components/UserMenuClient";
import HeroSection from "./components/home/HeroSection";
import HowItWorks from "./components/home/HowItWorks";
import FeaturedExamples from "./components/home/FeaturedExamples";
import SectionTitle from "./components/home/SectionTitle";
import { THEME } from "./components/home/theme";

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

async function fetchAllClips() {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("clips_view")
      .select("id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs")
      .order("created_at", { ascending: false })
      .range(0, 999);
    if (error) throw error;
    return (data || []).map(normRow);
  }

async function fetchTaxonomies() {
    const supabase = getSupabaseAdmin();
    const { data: taxRows, error } = await supabase
      .from("taxonomies")
      .select("type, slug")
      .order("type", { ascending: true })
      .order("slug", { ascending: true });
    if (error) return { difficulties: [], topics: [], channels: [] };
    const rows = taxRows || [];
    return {
      difficulties: rows.filter((t) => t.type === "difficulty").map((t) => ({ slug: t.slug, name: t.slug, count: 0 })),
      topics: rows.filter((t) => t.type === "topic").map((t) => ({ slug: t.slug, name: t.slug, count: 0 })),
      channels: rows.filter((t) => t.type === "channel").map((t) => ({ slug: t.slug, name: t.slug, count: 0 })),
    };
  }

async function fetchFeatured() {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("clips_view")
      .select("id,title,description,duration_sec,created_at,upload_time,access_tier,cover_url,video_url,difficulty_slug,topic_slugs,channel_slugs")
      .eq("access_tier", "free")
      .order("created_at", { ascending: false })
      .limit(1);
    if (Array.isArray(data) && data[0]) return normRow(data[0]);
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
  try {
    featured = await fetchFeatured();
  } catch {}
  if (!featured) featured = allItems[0] || null;

  let taxonomies = { difficulties: [], topics: [], channels: [] };
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
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(246,248,252,0.74)",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${THEME.colors.border}`,
          boxShadow: "0 8px 24px rgba(15,23,42,0.03)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`,
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontWeight: 950,
                fontSize: 14,
                letterSpacing: "-0.03em",
                boxShadow: "0 14px 28px rgba(79,70,229,0.26)",
              }}
            >
              EC
            </div>

            <div style={{ lineHeight: 1.15 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 950,
                  color: THEME.colors.ink,
                  letterSpacing: "-0.02em",
                }}
              >
                油管英语场景库
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: THEME.colors.faint,
                }}
              >
                Real scenes · bilingual subtitles · vocabulary cards
              </div>
            </div>
          </div>

          <UserMenuClient />
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 16px 52px" }}>
        <HeroSection>
          {null}
          <FeaturedExamples featured={featured} />
        </HeroSection>

        <div style={{ marginTop: 22 }}>
          <HowItWorks />
        </div>

        <div style={{ marginTop: 30 }}>
          <SectionTitle title="内容库" />

          <div
            style={{
              marginTop: 14,
              borderRadius: 24,
              padding: 12,
              background: "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.50))",
              border: `1px solid ${THEME.colors.border}`,
              boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Suspense
              fallback={
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: THEME.colors.faint,
                  }}
                >
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
