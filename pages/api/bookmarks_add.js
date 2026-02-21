import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "missing_supabase_env" });
    }

    // 1) 从请求头拿 Bearer token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return res.status(401).json({ error: "not_logged_in" });

    // 2) 用 token 创建“带用户身份”的 supabase client（关键！）
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 3) 取用户（确保 auth.uid() 有值）
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) {
      return res.status(401).json({ error: "get_user_failed", detail: userErr?.message });
    }

    const { clip_id } = req.body || {};
    const clipIdNum = Number(clip_id);
    if (!clipIdNum) return res.status(400).json({ error: "missing_clip_id" });

    // 4) 插入（RLS 要求 user_id = auth.uid()，所以这里必须写 user.id）
    const { error: insErr } = await supabase.from("bookmarks").insert({
      user_id: user.id,
      clip_id: clipIdNum,
    });

    // 唯一约束冲突：说明已收藏过，直接当成功即可（幂等）
    if (insErr && String(insErr.message || "").toLowerCase().includes("duplicate")) {
      return res.status(200).json({ ok: true, already: true });
    }
    if (insErr) {
      return res.status(500).json({ error: "bookmark_insert_failed", detail: insErr.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "server_error", detail: String(e?.message || e) });
  }
}
