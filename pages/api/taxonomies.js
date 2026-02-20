// pages/api/taxonomies.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 期望你的 taxonomies 表至少有：type, slug, name（或 label）
    const { data, error } = await supabase
      .from("taxonomies")
      .select("id,type,slug")
      .in("type", ["topic", "channel"])
      .order("slug", { ascending: true });

    if (error) throw error;

    const topics = (data || []).filter((x) => x.type === "topic");
    const channels = (data || []).filter((x) => x.type === "channel");

    return res.status(200).json({ topics, channels });
  } catch (e) {
    return res.status(500).json({
      error: e?.message || "Unknown error",
      hint: "Open Vercel Logs and screenshot the first red line + stack trace",
    });
  }
}
