import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return res.status(200).json({ logged_in: false, is_member: false });

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(200).json({ logged_in: false, is_member: false });
    }

    const userId = userData.user.id;

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("ends_at,status")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (subErr) throw subErr;

    const endsAt = sub?.ends_at || null;
    const status = sub?.status || null;

    const isActiveByTime = endsAt ? new Date(endsAt) > new Date() : false;
    const isActiveByStatus = status ? status === "active" : true; // 你现在默认 active
    const isMember = isActiveByTime && isActiveByStatus;

    return res.status(200).json({
      logged_in: true,
      user_id: userId,
      is_member: isMember,
      ends_at: endsAt,
      status,
    });
  } catch (e) {
    return res.status(500).json({
      error: e?.message || "Unknown server error",
      hint: "Open Vercel → Deployments → Logs, screenshot the first red line + stack trace",
    });
  }
}
