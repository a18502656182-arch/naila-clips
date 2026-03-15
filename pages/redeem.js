import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

// ⚠️ 替换成你真实的微信二维码图片路径（放在 /public/ 目录下）
const WECHAT_QR_URL = "/cf-img/qvilyoTfnpu3-vu3LTcGwQ/685d26db-152c-4d55-819b-37c447880000/cover";
const WECHAT_ID = "wll74748585"; // ⚠️ 替换成真实微信号

function getToken() {
  try { return localStorage.getItem("sb_access_token") || null; } catch { return null; }
}
function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

const C = {
  bg: "#f6f8fc",
  surface: "#ffffff",
  ink: "#0b1220",
  muted: "rgba(11,18,32,0.66)",
  faint: "rgba(11,18,32,0.46)",
  border: "rgba(11,18,32,0.08)",
  border2: "rgba(11,18,32,0.13)",
  accent: "#6366f1",
  vip: "#7c3aed",
  cyan: "#06b6d4",
  good: "#10b981",
};

const BENEFITS = [
  { icon: "🎬", title: "解锁全站所有视频", desc: "会员专享视频全部解锁，无限次回看" },
  { icon: "📚", title: "150+ 视频持续更新", desc: "精选 YouTube 场景，每周持续新增内容" },
  { icon: "📱", title: "三端互通，随时随地学", desc: "手机 / 电脑 / 平板均可使用，账号数据实时同步" },
];

function WechatModal({ onClose }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    try {
      navigator.clipboard.writeText(WECHAT_ID).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      const el = document.createElement("textarea");
      el.value = WECHAT_ID;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(11,18,32,0.48)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        backdropFilter: "blur(4px)",
        animation: "fadeIn 180ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 24,
          border: "1px solid rgba(11,18,32,0.08)",
          boxShadow: "0 32px 80px rgba(11,18,32,0.18)",
          padding: 28,
          width: "100%",
          maxWidth: 400,
          animation: "slideUp 220ms cubic-bezier(.2,.9,.2,1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>💬</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: C.ink }}>联系购买兑换码</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              border: "1px solid rgba(11,18,32,0.13)",
              background: "rgba(11,18,32,0.04)",
              cursor: "pointer", fontSize: 13, color: C.faint,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{
            flexShrink: 0,
            width: 130, height: 130,
            borderRadius: 16,
            border: "1px solid rgba(11,18,32,0.13)",
            overflow: "hidden",
            background: "#f4f6fb",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src={WECHAT_QR_URL}
              alt="微信二维码"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentNode.innerHTML = '<div style="font-size:12px;color:rgba(11,18,32,0.4);text-align:center;padding:12px;line-height:1.6">二维码<br/>加载失败<br/>请用微信号添加</div>';
              }}
            />
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
              扫描左侧二维码，或搜索微信号添加好友，发送「兑换码」即可购买。
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.14)",
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.ink, flex: 1, wordBreak: "break-all" }}>
                {WECHAT_ID}
              </span>
              <button
                onClick={copy}
                style={{
                  flexShrink: 0,
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: copied ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(99,102,241,0.22)",
                  background: copied ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)",
                  color: copied ? C.good : C.accent,
                  fontSize: 12, fontWeight: 800, cursor: "pointer",
                  transition: "all 180ms ease", whiteSpace: "nowrap",
                }}
              >
                {copied ? "✓ 已复制" : "复制"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: C.faint, textAlign: "center", lineHeight: 1.6 }}>
          添加好友时请备注「兑换码」，方便快速处理
        </div>
      </div>
    </div>
  );
}

function WechatBtn({ onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="微信联系购买"
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 12px", borderRadius: 999,
        border: hover ? "1px solid rgba(16,185,129,0.35)" : "1px solid rgba(16,185,129,0.2)",
        background: hover ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.07)",
        color: "#059669", fontSize: 13, fontWeight: 800,
        cursor: "pointer", transition: "all 160ms ease", whiteSpace: "nowrap",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c-.276-.94-.418-1.92-.418-2.93 0-3.94 3.567-7.12 7.945-7.12.3 0 .596.017.886.05C15.86 4.237 12.557 2.188 8.69 2.188zm-2.72 3.38c.574 0 1.04.46 1.04 1.03 0 .57-.466 1.03-1.04 1.03-.573 0-1.04-.46-1.04-1.03 0-.57.467-1.03 1.04-1.03zm5.44 0c.573 0 1.04.46 1.04 1.03 0 .57-.467 1.03-1.04 1.03-.574 0-1.04-.46-1.04-1.03 0-.57.466-1.03 1.04-1.03z"/>
        <path d="M23.95 14.17c0-3.44-3.373-6.22-7.527-6.22-4.155 0-7.528 2.78-7.528 6.22 0 3.44 3.373 6.22 7.528 6.22.976 0 1.91-.165 2.77-.464a.696.696 0 0 1 .574.08l1.522.89a.261.261 0 0 0 .133.044.236.236 0 0 0 .232-.236c0-.058-.023-.115-.038-.17l-.312-1.184a.472.472 0 0 1 .17-.532c1.468-1.1 2.477-2.748 2.477-4.648zm-10.04-1.048c-.46 0-.833-.368-.833-.823 0-.456.373-.824.834-.824.46 0 .833.368.833.824 0 .455-.373.823-.833.823zm5.025 0c-.46 0-.833-.368-.833-.823 0-.456.373-.824.834-.824.46 0 .833.368.833.824 0 .455-.373.823-.833.823z"/>
      </svg>
      微信购买
    </button>
  );
}

export default function RedeemPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(null);
  const [showWechat, setShowWechat] = useState(false);

  const redirectTo = router.query.redirectTo || "/";

  useEffect(() => {
    authFetch(remote("/api/me"), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d))
      .catch(() => setMe({ logged_in: false }));
  }, []);

  async function onSubmit(e) {
    if (e?.preventDefault) e.preventDefault();
    setMsg(""); setSuccess(null);
    if (!code.trim()) { setMsg("请输入兑换码"); return; }
    setLoading(true);
    try {
      const r = await authFetch(remote("/api/redeem"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        const errMap = {
          invalid_code: "兑换码无效 / 已过期 / 已用完",
          code_expired: "该兑换码已过期",
          code_used_up: "该兑换码已达使用上限",
          not_logged_in: "请先登录",
        };
        setMsg(errMap[j.error] || j.error || "兑换失败");
        return;
      }
      setSuccess({ plan: j.plan, expires_at: j.expires_at });
      setTimeout(() => router.push(redirectTo), 2200);
    } catch (err) {
      setMsg(err.message || "网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(1000px 420px at 0% 0%, rgba(99,102,241,0.12), transparent 50%), radial-gradient(900px 360px at 100% 0%, rgba(139,92,246,0.10), transparent 46%), linear-gradient(180deg, #f7f8fd 0%, #f4f6fb 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .benefit-card { transition: transform 160ms ease, box-shadow 160ms ease; }
        .benefit-card:hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(99,102,241,0.10); }
      `}</style>

      {showWechat && <WechatModal onClose={() => setShowWechat(false)} />}

      {/* Logo */}
      <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 14,
          background: `linear-gradient(135deg, ${C.accent}, ${C.cyan})`,
          display: "grid", placeItems: "center",
          color: "#fff", fontWeight: 900, fontSize: 14,
          boxShadow: "0 14px 28px rgba(99,102,241,0.22)",
        }}>EC</div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 17, fontWeight: 950, color: C.ink }}>油管英语场景库</div>
          <div style={{ fontSize: 12, color: C.faint }}>Real scenes · bilingual subtitles · vocabulary cards</div>
        </div>
      </a>

      {/* 会员权益卡片 */}
      <div style={{
        width: "100%", maxWidth: 430, marginBottom: 14,
        borderRadius: 20,
        border: "1px solid rgba(99,102,241,0.14)",
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        boxShadow: "0 10px 32px rgba(99,102,241,0.08)",
      }}>
        <div style={{
          padding: "14px 20px",
          background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(124,58,237,0.06))",
          borderBottom: "1px solid rgba(99,102,241,0.10)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>✨</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: C.vip }}>会员解锁全部内容</span>
          </div>
          <WechatBtn onClick={() => setShowWechat(true)} />
        </div>

        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {BENEFITS.map((b, i) => (
            <div key={i} className="benefit-card" style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "11px 14px", borderRadius: 14,
              border: "1px solid rgba(11,18,32,0.08)", background: "#fff",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(124,58,237,0.08))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>{b.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 2 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: C.faint, lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 主卡片 */}
      <div style={{
        width: "100%", maxWidth: 430,
        background: "rgba(255,255,255,0.92)",
        borderRadius: 28, border: "1px solid rgba(11,18,32,0.08)",
        boxShadow: "0 22px 60px rgba(11,18,32,0.10)",
        padding: 28, backdropFilter: "blur(14px)",
      }}>

        {me === null && (
          <div style={{ textAlign: "center", padding: "20px 0", color: C.faint, fontSize: 13 }}>加载中...</div>
        )}

        {me !== null && !me.logged_in && (
          <>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 999,
              background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.12)",
              color: C.vip, fontSize: 12, fontWeight: 900, marginBottom: 16,
            }}>会员激活</div>
            <div style={{ fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.04em", fontWeight: 980, color: C.ink, marginBottom: 8 }}>
              激活会员
            </div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 22 }}>
              请先登录账号，再使用兑换码开通或续期会员。
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href={`/login?next=${encodeURIComponent(router.asPath)}`} style={{
                textAlign: "center", minHeight: 46, borderRadius: 999,
                border: "1px solid rgba(99,102,241,0.22)", color: C.accent,
                background: "rgba(255,255,255,0.82)", textDecoration: "none",
                fontSize: 14, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>去登录</a>
              <a href={`/register?next=${encodeURIComponent(router.asPath)}`} style={{
                textAlign: "center", minHeight: 48, borderRadius: 999, border: "none",
                background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 16px 30px rgba(124,58,237,0.24)",
              }}>注册并开通会员 ✨</a>
            </div>
          </>
        )}

        {me !== null && me.logged_in && success && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 22, lineHeight: 1.2, fontWeight: 980, color: C.ink, marginBottom: 8 }}>兑换成功</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
              会员类型：{success.plan === "year" ? "年卡" : success.plan === "month" ? "月卡" : success.plan}
              {success.expires_at && (<><br />到期时间：{new Date(success.expires_at).toLocaleDateString("zh-CN")}</>)}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: C.faint }}>
              正在跳转{redirectTo === "/" ? "首页" : "视频"}...
            </div>
          </div>
        )}

        {me !== null && me.logged_in && !success && (
          <>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 999,
              background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.12)",
              color: C.vip, fontSize: 12, fontWeight: 900, marginBottom: 16,
            }}>会员兑换</div>
            <div style={{ fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.04em", fontWeight: 980, color: C.ink, marginBottom: 8 }}>
              输入兑换码
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, color: C.muted }}>当前账号：{me.email || me.username || "—"}</div>
              {me.is_member && (
                <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 999, background: "rgba(124,58,237,0.12)", color: C.vip, fontWeight: 800 }}>✨ 会员</span>
              )}
            </div>
            {me.is_member && (
              <div style={{
                marginBottom: 16, padding: "10px 14px",
                background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)",
                borderRadius: 14, fontSize: 13, color: C.vip, lineHeight: 1.6,
              }}>你已经是会员，继续兑换可以延长到期时间。</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 6 }}>兑换码</div>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") onSubmit(e); }}
                  placeholder="输入你的月卡 / 年卡兑换码"
                  autoFocus
                  style={{
                    width: "100%", padding: "12px 14px", boxSizing: "border-box",
                    border: "1px solid rgba(124,58,237,0.24)", borderRadius: 14,
                    fontSize: 14, background: "rgba(124,58,237,0.04)", outline: "none",
                    color: C.ink, letterSpacing: "0.04em",
                  }}
                />
              </div>
              {msg && (
                <div style={{
                  padding: "11px 14px", background: "#fff1f1",
                  border: "1px solid #ffd4d4", borderRadius: 14,
                  fontSize: 13, color: "#b00000", lineHeight: 1.6,
                }}>{msg}</div>
              )}
              <button
                type="button" onClick={onSubmit} disabled={loading}
                style={{
                  minHeight: 48, borderRadius: 999, border: "none",
                  background: loading ? "rgba(124,58,237,0.42)" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                  color: "#fff", fontSize: 14, fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 16px 30px rgba(124,58,237,0.24)",
                  transition: "all 180ms ease",
                }}
              >{loading ? "兑换中..." : "立即兑换 ✨"}</button>
            </div>
            <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: C.muted }}>
              <a href="/" style={{ color: C.accent, fontWeight: 800, textDecoration: "none" }}>← 返回首页</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
