// pages/api/register.js
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

    // service role：创建用户、写表、调用 RPC
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

    // 1) 创建用户（直接确认 email）
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: username ? { username } : {},
    });
    if (createErr) return res.status(400).json({ error: createErr.message });

    const userId = created?.user?.id;
    if (!userId) return res.status(500).json({ error: "Create user failed (no user id)" });

    // 2) 写 profiles（用户名模式）
    if (username) {
      const { error: profErr } = await admin.from("profiles").insert({ user_id: userId, username });
      if (profErr) {
        await admin.auth.admin.deleteUser(userId);
        return res.status(400).json({ error: `Username already used: ${profErr.message}` });
      }
    }

    // 3) 兑换码（原子）
    const { data: redeemed, error: redeemErr } = await admin.rpc("redeem_code", {
      p_code: String(code).trim(),
      p_user_id: userId,
    });
    if (redeemErr) {
      await admin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: redeemErr.message });
    }

    // 4) 用 anon 登录，拿 session
    const anon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signed, error: signErr } = await anon.auth.signInWithPassword({ email, password });
    if (signErr || !signed?.session) {
      return res.status(200).json({
        ok: true,
        needs_login: true,
        email_hint: email,
        plan: redeemed?.[0]?.plan ?? null,
        expires_at: redeemed?.[0]?.expires_at ?? null,
      });
    }

    // ✅ 5) 关键：在服务端写入 cookie（让 /api/me 看得到）
    const supabaseServer = createPagesServerClient({ req, res });
    const { error: cookieErr } = await supabaseServer.auth.setSession({
      access_token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
    });

    if (cookieErr) {
      return res.status(200).json({
        ok: true,
        needs_login: true,
        email_hint: email,
        note: "redeem 成功，但写 cookie 失败，请去登录页登录",
        error: cookieErr.message,
        plan: redeemed?.[0]?.plan ?? null,
        expires_at: redeemed?.[0]?.expires_at ?? null,
      });
    }

    // 不把 session 返回给前端（更安全），前端直接跳首页即可
    return res.status(200).json({
      ok: true,
      needs_login: false,
      plan: redeemed?.[0]?.plan ?? null,
      expires_at: redeemed?.[0]?.expires_at ?? null,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
