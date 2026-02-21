import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnon = createClient(supabaseUrl, anonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "not_logged_in" });

    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ error: "not_logged_in" });

    const user = userData.user;
    const { clip_id } = req.body || {};
    const cid = parseInt(clip_id, 10);
    if (!cid) return res.status(400).json({ error: "clip_id_required" });

    const { error } = await supabaseAdmin
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("clip_id", cid);

    if (error) return res.status(500).json({ error: "bookmark_delete_failed", detail: error.message });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "bookmark_delete_failed", detail: String(e) });
  }
}
