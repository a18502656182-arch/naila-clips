// pages/api/bookmarks_add.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

function getBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function getUserFromReq(req, res) {
  const supabase = createPagesServerClient({ req, res });

  const token = getBearer(req);
  const { data, error } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();

  const user = data?.user || null;
  return { supabase, user, mode: token ? "bearer" : "cookie", userErr: error?.message || null };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const { supabase, user, mode, userErr } = await getUserFromReq(req, res);
    if (!user) return res.status(401).json({ error: "not_logged_in", debug: { mode, userErr } });

    const { clip_id } = req.body || {};
    const cid = Number(clip_id);
    if (!cid) return res.status(400).json({ error: "missing_clip_id" });

    // ✅ 需要 bookmarks 表有唯一约束 (user_id, clip_id)
    const { error } = await supabase
      .from("bookmarks")
      .upsert({ user_id: user.id, clip_id: cid }, { onConflict: "user_id,clip_id" });

    if (error) {
      return res.status(500).json({ error: "bookmark_insert_failed", detail: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "unknown", detail: String(err?.message || err) });
  }
}
