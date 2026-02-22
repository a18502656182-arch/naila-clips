// pages/api/bookmarks_delete.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

function getBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

async function getAuthedSupabase(req, res) {
  const supabaseCookie = createPagesServerClient({ req, res });
  const { data: u1 } = await supabaseCookie.auth.getUser();
  if (u1?.user) return { supabase: supabaseCookie, user: u1.user, mode: "cookie" };

  const token = getBearer(req);
  if (!token) return { supabase: null, user: null, mode: "none" };

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const supabaseBearer = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: u2 } = await supabaseBearer.auth.getUser();
  if (u2?.user) return { supabase: supabaseBearer, user: u2.user, mode: "bearer" };

  return { supabase: null, user: null, mode: "invalid" };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const { supabase, user, mode } = await getAuthedSupabase(req, res);
    if (!user) return res.status(401).json({ error: "not_logged_in", debug: { mode } });

    const { clip_id } = req.body || {};
    const cid = Number(clip_id);
    if (!cid) return res.status(400).json({ error: "missing_clip_id" });

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("clip_id", cid);

    if (error) {
      return res.status(500).json({ error: "bookmark_delete_failed", detail: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "unknown", detail: String(err?.message || err) });
  }
}
