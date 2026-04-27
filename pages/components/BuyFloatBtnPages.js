// pages/components/BuyFloatBtnPages.js
// Pages Router 专用版本，用 useRouter 替代 usePathname
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createSupabaseBrowserClient } from "../../utils/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const CACHE_KEY = "buy_btn_is_member";

export default function BuyFloatBtnPages() {
  const router = useRouter();
  const pathname = router.pathname;
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);

  async function checkMember() {
    try {
      const token = localStorage.getItem("sb_access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/me`, { cache: "no-store", headers });
      const data = await res.json();
      const isMember = !!data?.is_member;
      try { sessionStorage.setItem(CACHE_KEY, isMember ? "1" : "0"); } catch {}
      setHidden(isMember);
    } catch {
      setHidden(false);
    }
  }

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached === "1") setHidden(true);
      else setHidden(false);
    } catch {
      setHidden(false);
    }
    setMounted(true);
    checkMember();

    const supabase = createSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        try {
          localStorage.removeItem("sb_access_token");
          sessionStorage.setItem(CACHE_KEY, "0");
        } catch {}
        setHidden(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.access_token) {
          try { localStorage.setItem("sb_access_token", session.access_token); } catch {}
        }
        checkMember();
      }
    });

    function onMemberActivated() {
      try { sessionStorage.setItem(CACHE_KEY, "1"); } catch {}
      setHidden(true);
    }
    window.addEventListener("member_activated", onMemberActivated);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("member_activated", onMemberActivated);
    };
  }, []);

  if (!mounted) return null;
  if (hidden) return null;

  const EXCLUDED_PATHS = ["/journal", "/bookmarks", "/practice", "/clips", "/buy"];
  if (EXCLUDED_PATHS.some(p => pathname?.startsWith(p))) return null;

  return (
    <a
      href="/buy"
      className="buy-float-btn"
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(99,102,241,0.55)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(99,102,241,0.45)"; }}
      style={{
        position: "fixed", right: 20, bottom: 24, zIndex: 999,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 5, borderRadius: 22,
        background: "linear-gradient(135deg, #7c3aed, #6366f1)",
        color: "#fff", textDecoration: "none",
        boxShadow: "0 8px 28px rgba(99,102,241,0.45)",
        cursor: "pointer", textAlign: "center",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      <style>{`
        .buy-float-btn { padding: 14px 24px; min-width: 148px; }
        .buy-float-title { font-size: 15px; font-weight: 900; letter-spacing: 0.02em; }
        .buy-float-sub { font-size: 12px; opacity: 0.88; font-weight: 700; }
        .buy-float-badge {
          margin-top: 5px; font-size: 11px; font-weight: 700;
          background: rgba(255,255,255,0.18); border-radius: 999px;
          padding: 3px 10px; letter-spacing: 0.03em;
        }
        @media (max-width: 768px) {
          .buy-float-btn { padding: 9px 14px; min-width: 0; gap: 3px; border-radius: 16px; right: 14px !important; bottom: 18px !important; }
          .buy-float-title { font-size: 12px; }
          .buy-float-sub { font-size: 11px; }
          .buy-float-badge { display: none; }
        }
      `}</style>
      <div className="buy-float-title">点击这里</div>
      <div className="buy-float-sub">解锁会员全部视频</div>
      <div className="buy-float-badge">购买兑换码</div>
    </a>
  );
}
