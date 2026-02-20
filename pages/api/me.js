import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1) 读 Bearer token
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        ends_at: null,
        status: null,
      });
    }

    // 2) 用 token 获取当前用户
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(200).json({
        logged_in: false,
        is_member: false,
        ends_at: null,
        status: null,
      });
    }

    const user = userData.user;

    // 3) 查 subscriptions
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr) throw subErr;

    const endsAt = sub?.expires_at || null;
    const isMember = endsAt ? new Date(endsAt).getTime() > Date.now() : false;

    return res.status(200).json({
      logged_in: true,
      user_id: user.id,
      is_member: isMember,
      ends_at: endsAt,
      status: isMember ? "active" : "expired",
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown server error" });
  }
}
