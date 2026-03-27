// app/admin-api/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";

const ADMIN_EMAIL = "214895399@qq.com";

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function getTokenFromRequest(req) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function verifyAdmin(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const anon = createClient(
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
  const { data } = await anon.auth.getUser(token);
  const email = data?.user?.email;
  return email === ADMIN_EMAIL ? data.user : null;
}

function nanoid(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function POST(req) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;
  const db = getSupabaseAdmin();

  // ── 标签：重命名 ──
  if (action === "taxonomy_rename") {
    const { type, old_slug, new_slug } = body;
    if (!type || !old_slug || !new_slug) return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    const s = new_slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!s) return NextResponse.json({ error: "新名称不能为空" }, { status: 400 });
    const { error: taxErr } = await db
      .from("taxonomies").update({ slug: s }).eq("type", type).eq("slug", old_slug);
    if (taxErr) return NextResponse.json({ error: taxErr.message }, { status: 500 });
    if (type === "difficulty") {
      await db.from("clips").update({ difficulty_slug: s }).eq("difficulty_slug", old_slug);
    } else if (type === "topic") {
      const { data: affectedClips } = await db.from("clips").select("id, topic_slugs").contains("topic_slugs", [old_slug]);
      for (const clip of affectedClips || []) {
        const updated = (clip.topic_slugs || []).map((t) => t === old_slug ? s : t);
        await db.from("clips").update({ topic_slugs: updated }).eq("id", clip.id);
      }
    } else if (type === "channel") {
      const { data: affectedClips } = await db.from("clips").select("id, channel_slugs").contains("channel_slugs", [old_slug]);
      for (const clip of affectedClips || []) {
        const updated = (clip.channel_slugs || []).map((c) => c === old_slug ? s : c);
        await db.from("clips").update({ channel_slugs: updated }).eq("id", clip.id);
      }
    }
    await db.rpc("refresh_clips_view");
    revalidateTag("clips_view:all");
    return NextResponse.json({ ok: true });
  }

  // ── 标签：删除 ──
  if (action === "taxonomy_delete") {
    const { type, slug } = body;
    if (!type || !slug) return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    const { data: tax } = await db.from("taxonomies").select("id").eq("type", type).eq("slug", slug).maybeSingle();
    if (tax?.id) { await db.from("clip_taxonomies").delete().eq("taxonomy_id", tax.id); }
    await db.from("taxonomies").delete().eq("type", type).eq("slug", slug);
    if (type === "difficulty") {
      await db.from("clips").update({ difficulty_slug: null }).eq("difficulty_slug", slug);
    } else if (type === "topic") {
      const { data: affectedClips } = await db.from("clips").select("id, topic_slugs").contains("topic_slugs", [slug]);
      for (const clip of affectedClips || []) {
        await db.from("clips").update({ topic_slugs: (clip.topic_slugs || []).filter((t) => t !== slug) }).eq("id", clip.id);
      }
    } else if (type === "channel") {
      const { data: affectedClips } = await db.from("clips").select("id, channel_slugs").contains("channel_slugs", [slug]);
      for (const clip of affectedClips || []) {
        await db.from("clips").update({ channel_slugs: (clip.channel_slugs || []).filter((c) => c !== slug) }).eq("id", clip.id);
      }
    }
    await db.rpc("refresh_clips_view");
    revalidateTag("clips_view:all");
    return NextResponse.json({ ok: true });
  }

  // ── 视频：新增 ──
  if (action === "clip_create") {
    const {
      title, description, video_url, cover_url, duration_sec,
      access_tier, difficulty_slug, topic_slugs, channel_slugs,
      details_json, upload_time, youtube_url,
    } = body;

    const { data: clip, error: clipErr } = await db
      .from("clips")
      .insert({
        title, description, video_url, cover_url,
        duration_sec: duration_sec ? Number(duration_sec) : null,
        access_tier: access_tier || "free",
        upload_time: upload_time || new Date().toISOString(),
        created_at: new Date().toISOString(),
        youtube_url: youtube_url || null,
      })
      .select()
      .single();

    if (clipErr) return NextResponse.json({ error: clipErr.message }, { status: 500 });

    if (details_json) {
      let parsed = details_json;
      if (typeof details_json === "string") {
        try { parsed = JSON.parse(details_json); } catch {
          return NextResponse.json({ error: "details_json 格式错误，请检查 JSON" }, { status: 400 });
        }
      }
      const { error: detErr } = await db
        .from("clip_details")
        .insert({ clip_id: clip.id, details_json: parsed });
      if (detErr) return NextResponse.json({ error: detErr.message }, { status: 500 });
    }

    await syncTaxonomies(db, clip.id, difficulty_slug, topic_slugs, channel_slugs);
    await db.rpc("refresh_clips_view");
    revalidateTag("clips_view:all");
    revalidateTag("clips_view:featured");

    return NextResponse.json({ ok: true, id: clip.id });
  }

  // ── 视频：编辑 ──
  if (action === "clip_update") {
    const {
      id, title, description, video_url, cover_url, duration_sec,
      access_tier, difficulty_slug, topic_slugs, channel_slugs,
      details_json, youtube_url, upload_time,
    } = body;

    const updatePayload = {};
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (video_url !== undefined) updatePayload.video_url = video_url;
    if (cover_url !== undefined) updatePayload.cover_url = cover_url;
    if (duration_sec !== undefined) updatePayload.duration_sec = duration_sec ? Number(duration_sec) : null;
    if (access_tier !== undefined) updatePayload.access_tier = access_tier || "free";
    if (upload_time !== undefined) updatePayload.upload_time = upload_time || undefined;
    if (youtube_url !== undefined) updatePayload.youtube_url = youtube_url || null;

    if (Object.keys(updatePayload).length > 0) {
      const { error: clipErr } = await db.from("clips").update(updatePayload).eq("id", id);
      if (clipErr) return NextResponse.json({ error: clipErr.message }, { status: 500 });
    }

    if (details_json !== undefined) {
      let parsed = details_json;
      if (typeof details_json === "string") {
        try { parsed = JSON.parse(details_json); } catch {
          return NextResponse.json({ error: "details_json 格式错误" }, { status: 400 });
        }
      }
      await db
        .from("clip_details")
        .upsert({ clip_id: id, details_json: parsed }, { onConflict: "clip_id" });
    }

    const hasDifficulty = difficulty_slug !== undefined;
    const hasTopics = topic_slugs !== undefined;
    const hasChannels = channel_slugs !== undefined;

    if (hasDifficulty || hasTopics || hasChannels) {
      const { data: currentTaxRows } = await db
        .from("clip_taxonomies")
        .select("taxonomy_id, taxonomies(type, slug)")
        .eq("clip_id", id);

      const currentDifficulty = currentTaxRows?.find(r => r.taxonomies?.type === "difficulty")?.taxonomies?.slug || null;
      const currentTopics = currentTaxRows?.filter(r => r.taxonomies?.type === "topic").map(r => r.taxonomies.slug) || [];
      const currentChannels = currentTaxRows?.filter(r => r.taxonomies?.type === "channel").map(r => r.taxonomies.slug) || [];

      const finalDifficulty = hasDifficulty ? difficulty_slug : currentDifficulty;
      const finalTopics = hasTopics ? topic_slugs : currentTopics;
      const finalChannels = hasChannels ? channel_slugs : currentChannels;

      await syncTaxonomies(db, id, finalDifficulty, finalTopics, finalChannels);
    }

    await db.rpc("refresh_clips_view");
    revalidateTag("clips_view:all");
    revalidateTag("clips_view:featured");
    return NextResponse.json({ ok: true });
  }

  // ── 视频：删除 ──
  if (action === "clip_delete") {
    const { id } = body;
    await db.from("clip_details").delete().eq("clip_id", id);
    const { error } = await db.from("clips").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await db.rpc("refresh_clips_view");
    revalidateTag("clips_view:all");
    revalidateTag("clips_view:featured");
    return NextResponse.json({ ok: true });
  }

  // ── 视频：获取 details_json ──
  if (action === "clip_get_details") {
    const { id } = body;
    const { data, error } = await db
      .from("clip_details")
      .select("details_json")
      .eq("clip_id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, details_json: data?.details_json ?? null });
  }

  // ── 兑换码：批量生成 ──
  if (action === "codes_generate") {
    const { plan, days, count = 100 } = body;
    const safeCount = Math.min(Math.max(Number(count) || 100, 1), 500);
    const rows = [];
    const existing = new Set();

    const { data: existingCodes } = await db
      .from("redeem_codes")
      .select("code");
    (existingCodes || []).forEach((r) => existing.add(r.code));

    for (let i = 0; i < safeCount; i++) {
      let code;
      do { code = nanoid(10); } while (existing.has(code));
      existing.add(code);
      rows.push({
        code,
        plan: plan || "month",
        days: Number(days) || 30,
        max_uses: 1,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      });
    }

    const { error } = await db.from("redeem_codes").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: rows.length, codes: rows.map((r) => r.code) });
  }

  // ── 兑换码：停用/启用 ──
  if (action === "code_toggle") {
    const { id, is_active } = body;
    const { error } = await db
      .from("redeem_codes")
      .update({ is_active })
      .eq("code", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── 用户：搜索 ──
  if (action === "users_search") {
    const { query } = body;
    const { data: authUsers } = await db.auth.admin.listUsers({ perPage: 1000 });
    const allUsers = authUsers?.users || [];
    const filtered = query
      ? allUsers.filter(
          (u) =>
            u.email?.includes(query) ||
            u.user_metadata?.username?.includes(query)
        )
      : allUsers.slice(0, 100);

    const userIds = filtered.map((u) => u.id);
    const [{ data: subs }, { data: profiles }] = await Promise.all([
      db.from("subscriptions").select("user_id,plan,expires_at,status").in("user_id", userIds),
      db.from("profiles").select("user_id,username,used_code").in("user_id", userIds),
    ]);

    const subMap = {};
    (subs || []).forEach((s) => { subMap[s.user_id] = s; });
    const profMap = {};
    (profiles || []).forEach((p) => { profMap[p.user_id] = p; });

    const result = filtered.map((u) => ({
      id: u.id,
      email: u.email,
      username: profMap[u.id]?.username || u.user_metadata?.username || null,
      used_code: profMap[u.id]?.used_code || null,
      created_at: u.created_at,
      subscription: subMap[u.id] || null,
    }));

    return NextResponse.json({ ok: true, users: result });
  }

  // ── 会员：手动调整 ──
  if (action === "member_set") {
    const { user_id, days } = body;
    const d = Number(days);
    if (!user_id || isNaN(d)) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

    // days=0 表示永久卡，expires_at 设为 null，不在现有有效期上叠加
    let expires_at = null;
    let plan = "lifetime";

    if (d > 0) {
      const { data: existing } = await db
        .from("subscriptions")
        .select("expires_at")
        .eq("user_id", user_id)
        .maybeSingle();

      const now = Date.now();
      const base =
        existing?.expires_at && new Date(existing.expires_at).getTime() > now
          ? new Date(existing.expires_at).getTime()
          : now;
      expires_at = new Date(base + d * 86400000).toISOString();
      plan = d >= 365 ? "year" : d >= 90 ? "quarter" : "month";
    }

    const { error } = await db
      .from("subscriptions")
      .upsert(
        { user_id, status: "active", plan, expires_at },
        { onConflict: "user_id" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, expires_at });
  }

  // ── 会员：立即停用 ──
  if (action === "member_stop") {
    const { user_id } = body;
    if (!user_id) return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    const { error } = await db
      .from("subscriptions")
      .update({ status: "inactive", expires_at: new Date().toISOString() })
      .eq("user_id", user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── 用户详情：学习数据 ──
  if (action === "user_detail") {
    const { user_id } = body;
    if (!user_id) return NextResponse.json({ error: "缺少 user_id" }, { status: 400 });
    const [
      { data: bookmarks }, { data: dictations }, { data: viewLogs },
      { data: vocabFavs }, { data: recordings }, { data: gameScores },
    ] = await Promise.all([
      db.from("bookmarks").select("clip_id, created_at").eq("user_id", user_id),
      db.from("dictation_history").select("clip_id, seg_index, input_text, updated_at").eq("user_id", user_id).order("updated_at", { ascending: false }),
      db.from("view_logs").select("clip_id, viewed_date").eq("user_id", user_id).order("viewed_date", { ascending: false }),
      db.from("vocab_favorites").select("term, clip_id, kind, mastery_level, data").eq("user_id", user_id).order("kind"),
      db.from("recordings").select("clip_id, segment_idx, duration_sec, file_path, created_at").eq("user_id", user_id),
      db.from("game_scores").select("game_id, best_score, play_count").eq("user_id", user_id),
    ]);
    const clipIdSet = new Set([
      ...(bookmarks || []).map(r => r.clip_id),
      ...(dictations || []).map(r => Number(r.clip_id)),
      ...(viewLogs || []).map(r => r.clip_id),
      ...(vocabFavs || []).map(r => r.clip_id),
      ...(recordings || []).map(r => r.clip_id),
    ]);
    const clipIds = [...clipIdSet].filter(Boolean);
    let clipTitleMap = {};
    if (clipIds.length > 0) {
      const { data: clipRows } = await db.from("clips").select("id, title").in("id", clipIds);
      (clipRows || []).forEach(c => { clipTitleMap[c.id] = c.title; });
    }
    return NextResponse.json({
      ok: true,
      bookmarks: (bookmarks || []).map(r => ({ clip_id: r.clip_id, title: clipTitleMap[r.clip_id] || `#${r.clip_id}`, created_at: r.created_at })),
      dictations: (dictations || []).map(r => ({ clip_id: Number(r.clip_id), title: clipTitleMap[Number(r.clip_id)] || `#${r.clip_id}`, seg_index: r.seg_index, input_text: r.input_text, updated_at: r.updated_at })),
      view_logs: (viewLogs || []).map(r => ({ clip_id: r.clip_id, title: clipTitleMap[r.clip_id] || `#${r.clip_id}`, viewed_date: r.viewed_date })),
      vocab_favs: (vocabFavs || []).map(r => ({ term: r.term, clip_id: r.clip_id, title: clipTitleMap[r.clip_id] || `#${r.clip_id}`, kind: r.kind, mastery_level: r.mastery_level })),
      recordings: (recordings || []).map(r => ({ clip_id: r.clip_id, title: clipTitleMap[r.clip_id] || `#${r.clip_id}`, segment_idx: r.segment_idx, duration_sec: r.duration_sec, file_path: r.file_path, created_at: r.created_at })),
      game_scores: gameScores || [],
    });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}

// ── GET：拉取更多数据 ──
export async function GET(req) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "taxonomies") {
    const { data, error } = await db.from("taxonomies").select("type,slug").order("type").order("slug");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, taxonomies: data || [] });
  }

  if (type === "clips") {
    const offset = Number(searchParams.get("offset") || 0);
    const { data } = await db
      .from("clips_view")
      .select("id,title,access_tier,created_at,upload_time,difficulty_slug,topic_slugs,channel_slugs,cover_url,video_url,duration_sec,description,youtube_url")
      .order("created_at", { ascending: false })
      .range(offset, offset + 49);
    return NextResponse.json({ ok: true, clips: data || [] });
  }

  if (type === "stats") {
    const [
      { count: userCount },
      { count: memberCount },
      { count: clipCount },
      { count: codeCount },
      { data: recentActivity },
    ] = await Promise.all([
      db.from("profiles").select("*", { count: "exact", head: true }),
      db
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString()),
      db.from("clips").select("*", { count: "exact", head: true }),
      db
        .from("redeem_codes")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      db
        .from("subscriptions")
        .select("user_id,plan,expires_at,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    return NextResponse.json({
      ok: true,
      stats: { userCount, memberCount, clipCount, codeCount },
      recentActivity: recentActivity || [],
    });
  }

  return NextResponse.json({ error: "unknown_type" }, { status: 400 });
}

// ── 工具函数：同步 taxonomies ──
async function syncTaxonomies(db, clip_id, difficulty_slug, topic_slugs, channel_slugs) {
  const toUpsert = [];
  if (difficulty_slug) toUpsert.push({ type: "difficulty", slug: difficulty_slug });
  (topic_slugs || []).forEach((s) => toUpsert.push({ type: "topic", slug: s }));
  (channel_slugs || []).forEach((s) => toUpsert.push({ type: "channel", slug: s }));
  if (toUpsert.length > 0) {
    await db.from("taxonomies").upsert(toUpsert, { onConflict: "type,slug", ignoreDuplicates: true });
  }

  if (toUpsert.length === 0) {
    await db.from("clip_taxonomies").delete().eq("clip_id", clip_id);
    return;
  }

  const taxIds = [];
  for (const item of toUpsert) {
    const { data: row } = await db
      .from("taxonomies")
      .select("id")
      .eq("type", item.type)
      .eq("slug", item.slug)
      .maybeSingle();
    if (row?.id) taxIds.push(row.id);
  }

  const { error: delErr } = await db.from("clip_taxonomies").delete().eq("clip_id", clip_id);
  let insertErr = null;
  if (taxIds.length > 0) {
    const { error: ctErr } = await db.from("clip_taxonomies").insert(
      taxIds.map((tid) => ({ clip_id, taxonomy_id: tid }))
    );
    insertErr = ctErr?.message || null;
  }
  return { clip_id, toUpsert, taxIds, delErr: delErr?.message || null, insertErr };
}
