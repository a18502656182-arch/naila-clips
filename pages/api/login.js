// pages/api/login.js
import { createClient } from "@supabase/supabase-js";
import { serialize } from "cookie";

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
    if (!identifier || !password) return res.status(400).json({ error: "Missing identifier/password" });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return res.status(500).json({ error: "Missing env vars" });

    let email = null;
    if (isEmailLike(identifier)) {
      email = String(identifier).trim().toLowerCase();
    } else {
      const username = normalizeUsername(identifier);
      if (!username) return res.status(400).json({ error: "Username invalid" });
      email = `${username}@users.nailaobao.local`;
    }

    const anon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signed, error: signErr } = await anon.auth.signInWithPassword({ email, password });
    if (signErr || !signed?.session) return res.status(400).json({ error: signErr?.message || "Login failed" });

    const session = signed.session;

    // ✅ 写入 HttpOnly Cookie（服务端安全）
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7天
    };
    res.setHeader("Set-Cookie", [
      serialize("sb_access_token", session.access_token, cookieOptions),
      serialize("sb_refresh_token", session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 }),
    ]);

    // ✅ 同时返回 token（兼容前端现有的 localStorage 逻辑，不影响现有功能）
    return res.status(200).json({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
