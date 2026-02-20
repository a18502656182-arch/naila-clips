import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return res.status(401).json({ error: "not logged in" });

    const clip_id = Number(req.body?.clip_id);
    if (!clip_id) return res.status(400).json({ error: "missing clip_id" });

    const { error } = await supabase.from("bookmarks").insert({
      user_id: user.id,
      clip_id,
    });

    // 重复收藏（unique 报错）我们当成功
    if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, debug: { mode: "bookmark_add" } });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
