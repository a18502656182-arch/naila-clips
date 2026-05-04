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
    shows: rows.filter(t => t.type === "show").map(t => {
      const sourceMap = {"冰河世纪": "动画", "唐顿庄园": "美剧", "复仇者联盟3": "电影", "复仇者联盟终局之战": "电影", "暮光之城": "美剧", "汉尼拔": "美剧", "生活大爆炸": "美剧", "破产姐妹": "美剧", "神探夏洛克": "英剧", "绝命毒师": "美剧", "绝望主妇": "美剧", "老友记": "美剧", "蚁人": "电影", "超人特工队": "动画", "越狱": "美剧"};
      return { slug: t.slug, name: t.slug, count: 0, source: sourceMap[t.slug] || "美剧" };
    }),
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`,
                display: "grid", placeItems: "center",
                color: "#fff", fontWeight: 950, fontSize: 13,
                letterSpacing: "-0.03em",
                boxShadow: "0 10px 22px rgba(79,70,229,0.26)",
                flexShrink: 0,
              }}
            >
              EC
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ fontSize: 15, fontWeight: 950, color: "#0b1220", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>奶酪包</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(11,18,32,0.45)", whiteSpace: "nowrap" }}>英语场景库</span>
            </div>
          </div>

          {/* 中：Tab切换（客户端组件），用占位保持布局稳定 */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <SiteTabs />
          </div>

          {/* 右：用户菜单 */}
          <UserMenuClient />
        </div>
        {/* 手机端：导航栏下方全宽Tab行 */}
        <SiteTabs mobile />
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
