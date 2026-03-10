import { createClient } from "@supabase/supabase-js";

function getBearer(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  return h.slice(7);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: "missing_env" });

  const token = getBearer(req);
  if (!token) return res.status(401).json({ error: "not_logged_in" });

  const { updates } = req.body || {};
  // updates: [{ id, mastery_level }]
  if (!Array.isArray(updates) || updates.length === 0) return res.status(400).json({ error: "missing_updates" });

  const supabase = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    for (const { id, mastery_level } of updates) {
      const level = Math.max(0, Math.min(2, parseInt(mastery_level, 10)));
      const { error } = await supabase
        .from("vocab_favorites")
        .update({ mastery_level: level })
        .eq("id", id);
      if (error) throw error;
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "update_failed", detail: String(err?.message || err) });
  }
}
