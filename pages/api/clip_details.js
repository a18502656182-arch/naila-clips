// pages/api/clip_details.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

async function getMembership(supabase, userId) {
  const now = Date.now();

  const tryQuery = async (dateCol) => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(`status, plan, ${dateCol}`)
      .eq("user_id", userId)
      .order(dateCol, { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    return { data, error, dateCol };
  };

  let r = await tryQuery("ends_at");
  if (r.error && String(r.error.message || "").toLowerCase().includes("column") && String(r.error.message || "").includes("ends_at")) {
    r = await tryQuery("expires_at");
  }

  if (r.error) return { is_member: false };
  const sub = r.data;
  if (!sub) return { is_member: false };

  const status = sub.status ?? null;
  const end_at = sub[r.dateCol] ?? null;

  if (status !== "active") return { is_member: false };
  if (!end_at) return { is_member: true }; // 长期有效
  const endMs = new Date(end_at).getTime();
  if (!Number.isNaN(endMs) && endMs > now) return { is_member: true };
  return { is_member: false };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    const supabase = createPagesServerClient({ req, res });

    // ✅ 兼容 id / clip_id 两种参数名
    const raw = req.query.id ?? req.query.clip_id ?? req.query.clipId ?? null;
    const id = raw ? Number(raw) : NaN;
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: "Missing id" });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let is_member = false;
    if (user?.id) {
      const m = await getMembership(supabase, user.id);
      is_member = !!m.is_member;
    }

    const { data: clip, error } = await supabase
      .from("clips")
      .select(
        `
        id, title, description, duration_sec, created_at, upload_time,
        access_tier, cover_url, video_url,
        clip_taxonomies(taxonomies(type, slug))
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!clip) return res.status(404).json({ error: "Clip not found", id });

    const can_access = clip.access_tier === "free" ? true : Boolean(is_member);

    return res.status(200).json({
      clip: {
        ...clip,
        can_access,
      },
      is_member,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
