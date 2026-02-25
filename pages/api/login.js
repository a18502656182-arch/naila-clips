// pages/api/login.js
import { createClient } from "@supabase/supabase-js";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

function isEmailLike(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

function normalizeUsername(s) {
  const raw = String(s || "").trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
  if (!cleaned || cleaned.length < 3) return null;
  return cleaned.slice(0, 32);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: "Missing identifier/password" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
    }

    // 把“用户名”映射为内部 email
    let email = null;
    if (isEmailLike(identifier)) {
      email = String(identifier).trim().toLowerCase();
    } else {
      const username = normalizeUsername(identifier);
      if (!username) return res.status(400).json({ error: "Username invalid (min 3 chars; a-z0-9_)" });
      email = `${username}@users.nailaobao.local`;
    }

    // 用 anon 登录拿 session
    const anon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signed, error: signErr } = await anon.auth.signInWithPassword({ email, password });
    if (signErr || !signed?.session) return res.status(400).json({ error: signErr?.message || "Login failed" });

    // ✅ 服务端写 cookie
    const supabaseServer = createPagesServerClient({ req, res });
    const { error: cookieErr } = await supabaseServer.auth.setSession({
      access_token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
    });

    if (cookieErr) return res.status(400).json({ error: cookieErr.message });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
