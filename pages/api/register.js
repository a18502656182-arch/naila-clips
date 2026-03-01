// pages/api/register.js
import { createClient } from "@supabase/supabase-js";

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
    const { identifier, password, code } = req.body || {};
    if (!identifier || !password || !code) {
      return res.status(400).json({ error: "Missing identifier/password/code" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let email = null;
    let username = null;

    if (isEmailLike(identifier)) {
      email = String(identifier).trim().toLowerCase();
    } else {
      username = normalizeUsername(identifier);
      if (!username) return res.status(400).json({ error: "Username invalid (min 3 chars; a-z0-9_)" });
      email = `${username}@users.nailaobao.local`;
    }

    // 1) 创建用户
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: username ? { username } : {},
    });
    if (createErr) return res.status(400).json({ error: createErr.message });

    const userId = created?.user?.id;
    if (!userId) return res.status(500).json({ error: "Create user failed (no user id)" });

    // 2) 写 profiles
    if (username) {
      const { error: profErr } = await admin.from("profiles").insert({ user_id: userId, username });
      if (profErr) {
        await admin.auth.admin.deleteUser(userId);
        return res.status(400).json({ error: `Username already used: ${profErr.message}` });
      }
    }

    // 3) 兑换码
    const { data: redeemed, error: redeemErr } = await admin.rpc("redeem_code", {
      p_code: String(code).trim(),
      p_user_id: userId,
    });
    if (redeemErr) {
      await admin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: redeemErr.message });
    }

    // 4) 登录拿 token
    const anon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signed, error: signErr } = await anon.auth.signInWithPassword({ email, password });

    if (signErr || !signed?.session) {
      // 登录失败时引导去登录页（注册本身已成功）
      return res.status(200).json({
        ok: true, needs_login: true, email_hint: email,
        plan: redeemed?.[0]?.plan ?? null,
        expires_at: redeemed?.[0]?.expires_at ?? null,
      });
    }

    // ✅ 返回 token 给前端存储，不再写 cookie
    return res.status(200).json({
      ok: true,
      needs_login: false,
      access_token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
      expires_at: signed.session.expires_at,
      plan: redeemed?.[0]?.plan ?? null,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
