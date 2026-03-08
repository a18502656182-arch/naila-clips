// app/admin/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "214895399@qq.com";

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function getAccessTokenFromCookies() {
  try {
    const cookieStore = cookies();
    const all = cookieStore.getAll();
    const authCookie = all.find(
      (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );
    if (!authCookie) return null;
    let raw = authCookie.value;
    if (raw.startsWith("base64-")) raw = raw.slice(7);
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const session = Array.isArray(parsed) ? parsed[0] : parsed;
    return session?.access_token || null;
  } catch {
    return null;
  }
}

export default async function AdminPage() {
  // 1. 鉴权
  const token = getAccessTokenFromCookies();
  if (!token) redirect("/login?next=/admin");

  const supabase = getSupabaseAdmin();
  const anonClient = createClient(
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
  const { data: userData } = await anonClient.auth.getUser(token);
  const email = userData?.user?.email;

  if (email !== ADMIN_EMAIL) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>无权限访问</div>
        <div style={{ marginTop: 8, color: "#666" }}>该页面仅限管理员访问</div>
        <a href="/" style={{ display: "inline-block", marginTop: 20, color: "#4f46e5" }}>← 返回首页</a>
      </div>
    );
  }

  // 2. 预加载初始数据
  const [
    { data: clips },
    { data: taxonomies },
    { data: redeemCodes },
    { count: userCount },
    { data: recentUsers },
    { count: memberCount },
  ] = await Promise.all([
    supabase
      .from("clips_view")
      .select("id,title,access_tier,created_at,difficulty_slug,topic_slugs,channel_slugs")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("taxonomies").select("type,slug").order("type").order("slug"),
    supabase
      .from("redeem_codes")
      .select("id,code,plan,days,max_uses,used_count,is_active,created_at,expires_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("user_id,username,created_at,used_code")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString()),
  ]);

  // 3. 拼接会员信息到用户列表
  let usersWithSub = recentUsers || [];
  if (usersWithSub.length > 0) {
    const userIds = usersWithSub.map((u) => u.user_id);
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("user_id,plan,expires_at,status")
      .in("user_id", userIds);
    const subMap = {};
    (subs || []).forEach((s) => { subMap[s.user_id] = s; });

    // 拼邮箱（从 auth.users 拿，需要 service role）
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = {};
    (authUsers?.users || []).forEach((u) => { emailMap[u.id] = u.email; });

    usersWithSub = usersWithSub.map((u) => ({
      ...u,
      email: emailMap[u.user_id] || null,
      subscription: subMap[u.user_id] || null,
    }));
  }

  return (
    <AdminClient
      adminEmail={email}
      initialClips={clips || []}
      initialTaxonomies={taxonomies || []}
      initialRedeemCodes={redeemCodes || []}
      initialUsers={usersWithSub}
      stats={{
        userCount: userCount || 0,
        memberCount: memberCount || 0,
        clipCount: (clips || []).length,
        codeCount: (redeemCodes || []).filter((c) => c.is_active).length,
      }}
    />
  );
}
