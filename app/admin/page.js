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
        <a href="/" style={{ display: "inline-block", marginTop: 20, color: "#4f46e5" }}>返回首页</a>
      </div>
    );
  }

  const [
    { data: clips },
    { data: taxonomies },
    { data: redeemCodes },
    { count: memberCount },
    { data: authUsersData },
    { data: orders },
  ] = await Promise.all([
    supabase
      .from("clips_view")
      .select("id,title,access_tier,created_at,upload_time,difficulty_slug,topic_slugs,channel_slugs,genre_slugs,duration_slugs,show_slugs,cover_url,video_url,duration_sec,description,youtube_url,site")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("taxonomies").select("type,slug").order("type").order("slug"),
    supabase
      .from("redeem_codes")
      .select("code,plan,days,max_uses,used_count,is_active,created_at,expires_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString()),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase
      .from("orders")
      .select("id,out_trade_no,plan,days,amount,redeem_code,status,created_at,paid_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const allAuthUsers = authUsersData?.users || [];
  const userCount = allAuthUsers.length;

  const recentAuthUsers = [...allAuthUsers]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 100);

  const userIds = recentAuthUsers.map((u) => u.id);

  const [{ data: subs }, { data: profiles }, { data: allProfiles }] = await Promise.all([
    supabase.from("subscriptions").select("user_id,plan,expires_at,status").in("user_id", userIds),
    supabase.from("profiles").select("user_id,username,used_code").in("user_id", userIds),
    supabase.from("profiles").select("user_id,username,used_code"),
  ]);

  const subMap = {};
  (subs || []).forEach((s) => { subMap[s.user_id] = s; });
  const profileMap = {};
  (profiles || []).forEach((p) => { profileMap[p.user_id] = p; });

  const codeToUserMap = {};
  (allProfiles || []).forEach((p) => {
    if (p.used_code) {
      codeToUserMap[p.used_code] = p.username || p.user_id?.slice(0, 8) || "未知用户";
    }
  });

  const codeToPlanMap = {};
  (redeemCodes || []).forEach((c) => {
    codeToPlanMap[c.code] = { plan: c.plan, days: c.days };
  });

  const ordersWithUser = (orders || []).map((o) => ({
    ...o,
    redeemed_by: o.status === "paid" ? (codeToUserMap[o.redeem_code] || null) : null,
  }));

  const usersWithSub = recentAuthUsers.map((u) => ({
    id: u.id,
    email: u.email,
    username: profileMap[u.id]?.username || u.user_metadata?.username || null,
    created_at: u.created_at,
    used_code: profileMap[u.id]?.used_code || null,
    used_plan: profileMap[u.id]?.used_code ? codeToPlanMap[profileMap[u.id].used_code] || null : null,
    subscription: subMap[u.id] || null,
  }));

  return (
    <AdminClient
      adminEmail={email}
      initialClips={clips || []}
      initialTaxonomies={taxonomies || []}
      initialRedeemCodes={redeemCodes || []}
      initialUsers={usersWithSub}
      initialOrders={ordersWithUser}
      token={token}
      stats={{
        userCount,
        memberCount: memberCount || 0,
        clipCount: (clips || []).length,
        codeCount: (redeemCodes || []).filter((c) => c.is_active).length,
      }}
    />
  );
}
