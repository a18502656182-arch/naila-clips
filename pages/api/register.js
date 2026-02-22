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
      return res
        .status(500)
        .json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" });
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

    // 0) 先检查兑换码是否有效（可选但用户体验更好）
    // 这里不做读表校验，直接交给 RPC redeem_code 原子校验即可

    // 1) 创建用户（不走邮件验证）
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 双保险
      user_metadata: username ? { username } : {},
    });

    if (createErr) return res.status(400).json({ error: createErr.message });

    const userId = created?.user?.id;
    if (!userId) return res.status(500).json({ error: "Create user failed (no user id)" });

    // 2) 写 profiles（只有用户名模式才写）
    if (username) {
      const { error: profErr } = await admin.from("profiles").insert({ user_id: userId, username });
      if (profErr) {
        await admin.auth.admin.deleteUser(userId);
        return res.status(400).json({ error: `Username already used: ${profErr.message}` });
      }
    }

    // 3) 兑换码：调用你刚建的 RPC（原子更新 used_count + 写 redemptions + 写 subscriptions）
    const { data: redeemed, error: redeemErr } = await admin.rpc("redeem_code", {
      p_code: String(code).trim(),
      p_user_id: userId,
    });

    if (redeemErr) {
      await admin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: redeemErr.message });
    }

    // 4) 用 anon key 登录，拿 session 给前端写入
    const anon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signed, error: signErr } = await anon.auth.signInWithPassword({ email, password });

    // 注册+兑换成功，但登录失败：不回滚，让用户去 login 手动登录
    if (signErr || !signed?.session) {
      return res.status(200).json({
        ok: true,
        needs_login: true,
        email_hint: email,
        plan: redeemed?.[0]?.plan ?? null,
        expires_at: redeemed?.[0]?.expires_at ?? null,
      });
    }

    return res.status(200).json({
      ok: true,
      needs_login: false,
      email_hint: email,
      session: signed.session,
      plan: redeemed?.[0]?.plan ?? null,
      expires_at: redeemed?.[0]?.expires_at ?? null,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
