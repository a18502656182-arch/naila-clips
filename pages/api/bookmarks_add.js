// pages/api/bookmarks_add.js
import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

function getBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function getUserFromReq(req, res) {
  const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);

  const token = getBearer(req);
  const { data, error } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();

  const user = data?.user || null;
  return { supabase, flushCookies, user, mode: token ? "bearer" : "cookie", userErr: error?.message || null };
}

export default async function handler(req, res) {
  try {
    const { supabase, flushCookies, user, mode, userErr } = await getUserFromReq(req, res);

    const send = (status, payload) => {
      flushCookies();
      return res.status(status).json(payload);
    };

    if (req.method !== "POST") {
      return send(405, { error: "method_not_allowed" });
    }

    if (!user) return send(401, { error: "not_logged_in", debug: { mode, userErr } });

    const { clip_id } = req.body || {};
    const cid = Number(clip_id);
    if (!cid) return send(400, { error: "missing_clip_id" });

    // ✅ 需要 bookmarks 表有唯一约束 (user_id, clip_id)
    const { error } = await supabase
      .from("bookmarks")
      .upsert({ user_id: user.id, clip_id: cid }, { onConflict: "user_id,clip_id" });

    if (error) {
      return send(500, { error: "bookmark_insert_failed", detail: error.message });
    }

    return send(200, { ok: true });
  } catch (err) {
    return res.status(500).json({ error: "unknown", detail: String(err?.message || err) });
  }
}
