import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return res.status(401).json({ error: "not logged in" });

    const clip_id = Number(req.body?.clip_id);
    if (!clip_id) return res.status(400).json({ error: "missing clip_id" });

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("clip_id", clip_id);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true, debug: { mode: "bookmark_remove" } });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
