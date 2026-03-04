// pages/api/logout.js
import { createSupabaseForPagesApi } from "../../utils/supabase/pagesApiClient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { supabase, flushCookies } = createSupabaseForPagesApi(req, res);
    await supabase.auth.signOut();
    flushCookies();
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: true });
  }
}
