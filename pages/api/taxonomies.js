import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from("taxonomies")
      .select("id,type,slug")
      .in("type", ["difficulty", "topic", "channel"])
      .order("type", { ascending: true })
      .order("slug", { ascending: true });

    if (error) throw error;

    const difficulties = (data || []).filter((x) => x.type === "difficulty");
    const topics = (data || []).filter((x) => x.type === "topic");
    const channels = (data || []).filter((x) => x.type === "channel");

    return res.status(200).json({ difficulties, topics, channels });
  } catch (e) {
    return res.status(500).json({
      error: e?.message || "Unknown server error",
      hint: "Open Vercel → Deployments → Logs, screenshot the first red line + stack trace",
    });
  }
}
