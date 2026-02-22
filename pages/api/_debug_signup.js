import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing email/password" });

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });

  const supabase = createClient(url, anon);

  const { data, error } = await supabase.auth.signUp({ email, password });

  return res.status(200).json({
    error: error?.message || null,
    has_session: !!data?.session,
    user_id: data?.user?.id || null,
  });
}
