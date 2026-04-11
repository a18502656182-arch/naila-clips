"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "../../utils/supabase/client";

export default function WelcomeModal() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setShow(true);
    });
  }, [pathname]);

  function close() {
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0, zIndex: 10001,
        background: "rgba(11,18,32,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20,
          border: "1px solid rgba(11,18,32,0.08)",
          boxShadow: "0 24px 60px rgba(11,18,32,0.18)",
          padding: "28px 24px 22px",
          width: "100%", maxWidth: 400,
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 10 }}>👋</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#0b1220", marginBottom: 12, lineHeight: 1.3 }}>
          欢迎来到油管英语场景库！
        </div>
        <div style={{ fontSize: 14, color: "rgba(11,18,32,0.65)", lineHeight: 1.8, marginBottom: 20 }}>
          这里收录了来自 YouTube 的真实场景短片，双语字幕 + 词汇卡，帮你在真实语境里学地道英语。<br /><br />
          想知道怎么用效果最好？点下方按钮查看完整学习指南 👇
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <a
            href="/guide"
            onClick={close}
            style={{
              display: "block", textAlign: "center",
              padding: "12px 0", borderRadius: 999,
              background: "linear-gradient(135deg, #6366f1, #7c3aed)",
              color: "#fff", textDecoration: "none",
              fontSize: 14, fontWeight: 800,
              boxShadow: "0 8px 20px rgba(124,58,237,0.25)",
            }}
          >
            查看学习指南 →
          </a>
          <button
            onClick={close}
            style={{
              border: "1px solid rgba(11,18,32,0.12)",
              background: "transparent", borderRadius: 999,
              padding: "11px 0", cursor: "pointer",
              fontSize: 14, color: "rgba(11,18,32,0.45)", fontWeight: 600,
            }}
          >
            直接开始看视频
          </button>
        </div>
      </div>
    </div>
  );
}
