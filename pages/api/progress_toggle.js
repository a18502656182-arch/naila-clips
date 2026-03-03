import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

function getBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);
  const send = (status, payload) => {
    flushCookies();
    return res.status(status).json(payload);
  };

  try {
    if (req.method !== "POST") return send(405, { error: "method_not_allowed" });

    const token = getBearer(req);
    const { data, error } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
    const user = data?.user || null;

    if (!user) return send(401, { error: "not_logged_in", detail: error?.message || null });

    const { clip_id, is_done } = req.body || {};
    const cid = Number(clip_id);
    if (!cid) return send(400, { error: "missing_clip_id" });

    const done = Boolean(is_done);

    // ✅ 最常见写法：upsert 进度
    const { error: e1 } = await supabase
      .from("progress")
      .upsert(
        { user_id: user.id, clip_id: cid, is_done: done, updated_at: new Date().toISOString() },
        { onConflict: "user_id,clip_id" }
      );

    if (e1) return send(500, { error: "progress_upsert_failed", detail: e1.message });

    return send(200, { ok: true, clip_id: cid, is_done: done });
  } catch (e) {
    return send(500, { error: e?.message || "Unknown error" });
  }
}
