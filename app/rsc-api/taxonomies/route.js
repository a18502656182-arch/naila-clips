// app/rsc-api/taxonomies/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function parseList(v) {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v
      .flatMap((x) => String(x).split(","))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function inc(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function sortByCountThenName(arr) {
  return (arr || []).slice().sort((a, b) => {
    const ca = a.count || 0;
    const cb = b.count || 0;
    if (cb !== ca) return cb - ca;
    return String(a.slug).localeCompare(String(b.slug));
  });
}

function matches(clip, f) {
  if (f.access?.length && !f.access.includes(clip.access_tier)) return false;

  if (f.difficulty?.length) {
    if (!clip.difficulty || !f.difficulty.includes(clip.difficulty)) return false;
  }

  if (f.topic?.length) {
    if (!(clip.topics || []).some((t) => f.topic.includes(t))) return false;
  }

  if (f.channel?.length) {
    if (!(clip.channels || []).some((c) => f.channel.includes(c))) return false;
  }

  return true;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const sort = searchParams.get("sort") === "oldest" ? "oldest" : "newest";

    const selectedDifficulty = parseList(searchParams.get("difficulty"));
    const selectedAccess = parseList(searchParams.get("access"));
    const selectedTopic = parseList(searchParams.get("topic"));
    const selectedChannel = parseList(searchParams.get("channel"));

    const supabase = getSupabaseAdmin();

    // 1) 取 taxonomies（type+slug）
    const { data: taxRows, error: taxErr } = await supabase
      .from("taxonomies")
      .select("type, slug")
      .order("type", { ascending: true })
      .order("slug", { ascending: true });

    if (taxErr) {
      return NextResponse.json({ error: taxErr.message }, { status: 500 });
    }

    const difficulties = (taxRows || []).filter((t) => t.type === "difficulty");
    const topics = (taxRows || []).filter((t) => t.type === "topic");
    const channels = (taxRows || []).filter((t) => t.type === "channel");

    // 2) 轻量拉 clips_view 用于 counts（只取必要列）
    let q = supabase
      .from("clips_view")
      .select("access_tier,created_at,difficulty_slug,topic_slugs,channel_slugs")
      .order("created_at", { ascending: sort === "oldest" });

    if (selectedAccess.length) {
  const expanded = [];
  for (const a of selectedAccess) {
    if (a === "member") expanded.push("member", "vip");
    else expanded.push(a);
  }
  q = q.in("access_tier", Array.from(new Set(expanded)));
}

    const { data: rows, error: rowsErr } = await q;
    if (rowsErr) {
      return NextResponse.json({ error: rowsErr.message }, { status: 500 });
    }

    const normalized = (rows || []).map((r) => ({
      access_tier: r.access_tier,
      difficulty: typeof r.difficulty_slug === "string" ? r.difficulty_slug : null,
      topics: Array.isArray(r.topic_slugs) ? r.topic_slugs : [],
      channels: Array.isArray(r.channel_slugs) ? r.channel_slugs : [],
    }));

    const counts = {
      difficulty: {},
      access: {},
      topic: {},
      channel: {},
    };

    // difficulty counts（放开 difficulty）
    {
      const f = {
        access: selectedAccess,
        difficulty: [],
        topic: selectedTopic,
        channel: selectedChannel,
      };
      normalized
        .filter((c) => matches(c, f))
        .forEach((c) => inc(counts.difficulty, c.difficulty));
    }

    // access counts（放开 access）
    {
      const f = {
        access: [],
        difficulty: selectedDifficulty,
        topic: selectedTopic,
        channel: selectedChannel,
      };
      normalized
        .filter((c) => matches(c, f))
        .forEach((c) => inc(counts.access, c.access_tier));
    }

    // topic counts（放开 topic）
    {
      const f = {
        access: selectedAccess,
        difficulty: selectedDifficulty,
        topic: [],
        channel: selectedChannel,
      };
      normalized
        .filter((c) => matches(c, f))
        .forEach((c) => (c.topics || []).forEach((t) => inc(counts.topic, t)));
    }

    // channel counts（放开 channel）
    {
      const f = {
        access: selectedAccess,
        difficulty: selectedDifficulty,
        topic: selectedTopic,
        channel: [],
      };
      normalized
        .filter((c) => matches(c, f))
        .forEach((c) => (c.channels || []).forEach((ch) => inc(counts.channel, ch)));
    }

    const difficultiesWithCount = sortByCountThenName(
      difficulties.map((x) => ({
        slug: x.slug,
        name: x.slug,
        count: counts.difficulty[x.slug] || 0,
      }))
    );

    const topicsWithCount = sortByCountThenName(
      topics.map((x) => ({
        slug: x.slug,
        name: x.slug,
        count: counts.topic[x.slug] || 0,
      }))
    );

    const channelsWithCount = sortByCountThenName(
      channels.map((x) => ({
        slug: x.slug,
        name: x.slug,
        count: counts.channel[x.slug] || 0,
      }))
    );

    const res = NextResponse.json({
      difficulties: difficultiesWithCount,
      topics: topicsWithCount,
      channels: channelsWithCount,
      access_counts: counts.access,
      filters: {
        difficulty: selectedDifficulty,
        access: selectedAccess,
        topic: selectedTopic,
        channel: selectedChannel,
        sort,
      },
      debug: { mode: "tax_with_counts_sorted_rsc_api" },
    });

    res.headers.set("Cache-Control", "private, no-store, max-age=0");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
