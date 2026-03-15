import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

const WECHAT_QR_URL = "/cf-img/qvilyoTfnpu3-vu3LTcGwQ/5c491370-2fe2-430e-f155-5b96d3fbdf00/qr";
const WECHAT_ID = "wll74748585";

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
  ink: "#0b1220",
  muted: "rgba(11,18,32,0.62)",
  faint: "rgba(11,18,32,0.42)",
  border: "rgba(11,18,32,0.08)",
  accent: "#6366f1",
  vip: "#7c3aed",
  cyan: "#06b6d4",
  good: "#10b981",
};

const BENEFITS = [
  { icon: "🔓", title: "解锁全站所有视频", desc: "会员专享内容全部开放，无限次回看" },
  { icon: "📚", title: "150+ 场景持续更新", desc: "精选 YouTube 真实场景，每周持续新增" },
  { icon: "📱", title: "手机 · 电脑 · 平板三端互通", desc: "任意设备登录，数据实时同步" },
];

function WechatModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    try {
      navigator.clipboard.writeText(WECHAT_ID).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); });
    } catch {
      const el = document.createElement("textarea");
      el.value = WECHAT_ID; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
      setCopied(true); setTimeout(() => setCopied(false), 2200);
    }
  }
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(11,18,32,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, backdropFilter: "blur(6px)",
      animation: "fadeIn 160ms ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 24,
        border: "1px solid rgba(11,18,32,0.08)",
        boxShadow: "0 40px 100px rgba(11,18,32,0.20)",
        padding: "24px 24px 20px",
        width: "100%", maxWidth: 380,
        animation: "slideUp 200ms cubic-bezier(.2,.9,.2,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(5,150,105,0.10)", border: "1px solid rgba(5,150,105,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <WechatIcon size={15} color="#059669" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 900, color: C.ink }}>联系客服</span>
          </div>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(11,18,32,0.10)", background: "rgba(11,18,32,0.04)", cursor: "pointer", color: C.faint, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(11,18,32,0.08)", marginBottom: 12 }}>
          <div style={{ background: "#fff", padding: 12 }}>
            <img src={WECHAT_QR_URL} alt="微信二维码"
              style={{ width: "100%", display: "block", borderRadius: 8 }}
              onError={e => { e.target.style.display = "none"; e.target.parentNode.innerHTML = '<div style="font-size:13px;color:rgba(11,18,32,0.38);text-align:center;padding:40px 16px;line-height:1.8">图片加载失败<br/>请直接搜索下方微信号</div>'; }}
            />
          </div>
          <div style={{ padding: "9px 14px", background: "rgba(99,102,241,0.04)", borderTop: "1px solid rgba(11,18,32,0.06)", fontSize: 12, color: C.muted, lineHeight: 1.6, textAlign: "center" }}>
            截图后用微信扫码识别 · 或在微信搜索下方账号
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.14)", marginBottom: 12 }}>
          <WechatIcon size={14} color="#059669" />
          <span style={{ fontSize: 14, fontWeight: 800, color: C.ink, flex: 1 }}>{WECHAT_ID}</span>
          <button onClick={copy} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 800, border: copied ? "1px solid rgba(16,185,129,0.30)" : "1px solid rgba(99,102,241,0.22)", background: copied ? "rgba(16,185,129,0.09)" : "rgba(99,102,241,0.09)", color: copied ? C.good : C.accent, cursor: "pointer", transition: "all 180ms ease", whiteSpace: "nowrap" }}>
            {copied ? "✓ 已复制" : "复制"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: C.faint, textAlign: "center" }}>添加时备注「兑换码」，购买咨询均可</div>
      </div>
    </div>
  );
}

function WechatIcon({ size = 18, color = "#059669" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c-.276-.94-.418-1.92-.418-2.93 0-3.94 3.567-7.12 7.945-7.12.3 0 .596.017.886.05C15.86 4.237 12.557 2.188 8.69 2.188zm-2.72 3.38c.574 0 1.04.46 1.04 1.03 0 .57-.466 1.03-1.04 1.03-.573 0-1.04-.46-1.04-1.03 0-.57.467-1.03 1.04-1.03zm5.44 0c.573 0 1.04.46 1.04 1.03 0 .57-.467 1.03-1.04 1.03-.574 0-1.04-.46-1.04-1.03 0-.57.466-1.03 1.04-1.03z"/>
      <path d="M23.95 14.17c0-3.44-3.373-6.22-7.527-6.22-4.155 0-7.528 2.78-7.528 6.22 0 3.44 3.373 6.22 7.528 6.22.976 0 1.91-.165 2.77-.464a.696.696 0 0 1 .574.08l1.522.89a.261.261 0 0 0 .133.044.236.236 0 0 0 .232-.236c0-.058-.023-.115-.038-.17l-.312-1.184a.472.472 0 0 1 .17-.532c1.468-1.1 2.477-2.748 2.477-4.648zm-10.04-1.048c-.46 0-.833-.368-.833-.823 0-.456.373-.824.834-.824.46 0 .833.368.833.824 0 .455-.373.823-.833.823zm5.025 0c-.46 0-.833-.368-.833-.823 0-.456.373-.824.834-.824.46 0 .833.368.833.824 0 .455-.373.823-.833.823z"/>
    </svg>
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
      .then(r => r.json()).then(d => setMe(d))
      .catch(() => setMe({ logged_in: false }));
  }, []);

  async function onSubmit(e) {
    if (e?.preventDefault) e.preventDefault();
    setMsg(""); setSuccess(null);
    if (!code.trim()) { setMsg("请输入兑换码"); return; }
    setLoading(true);
    try {
      const r = await authFetch(remote("/api/redeem"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        const errMap = { invalid_code: "兑换码无效 / 已过期 / 已用完", code_expired: "该兑换码已过期", code_used_up: "该兑换码已达使用上限", not_logged_in: "请先登录后再兑换" };
        setMsg(errMap[j.error] || j.error || "兑换失败"); return;
      }
      setSuccess({ plan: j.plan, expires_at: j.expires_at });
      setTimeout(() => router.push(redirectTo), 2200);
    } catch (err) {
      setMsg(err.message || "网络错误，请重试");
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(900px 400px at 5% 0%, rgba(99,102,241,0.11), transparent 52%), radial-gradient(800px 350px at 95% 0%, rgba(139,92,246,0.09), transparent 48%), linear-gradient(180deg, #f7f8fd 0%, #f3f5fb 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 16px 36px", boxSizing: "border-box",
    }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .redeem-card { animation: cardIn 320ms cubic-bezier(.2,.9,.2,1) both; width:100%; }
        .benefit-row:hover { background: rgba(99,102,241,0.05) !important; }
        .wechat-btn:hover { background: rgba(5,150,105,0.12) !important; border-color: rgba(5,150,105,0.32) !important; }
        .main-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 20px 40px rgba(124,58,237,0.30) !important; }
        .auth-btn-login:hover { background: rgba(99,102,241,0.07) !important; }
        .auth-btn-register:hover { transform: translateY(-1px); box-shadow: 0 20px 40px rgba(124,58,237,0.30) !important; }

        /* ── 手机版：单列 ── */
        .card-inner { display: flex; flex-direction: column; }
        .card-left { border-bottom: 1px solid rgba(99,102,241,0.10); }
        .card-right { }

        /* ── 电脑版：双列，撑满黄框 ── */
        @media (min-width: 700px) {
          .redeem-card { max-width: 900px; }
          .card-inner { flex-direction: row; align-items: stretch; }
          .card-left { flex: 1.1; border-bottom: none; border-right: 1px solid rgba(99,102,241,0.10); }
          .card-right { flex: 0.9; }
        }

        /* ── 手机版：客服行横排紧凑 ── */
        .wechat-row { display: flex; align-items: center; justify-content: space-between; gap: 12; }
        .wechat-row-text { display: flex; flex-direction: column; gap: 1px; }
      `}</style>

      {showWechat && <WechatModal onClose={() => setShowWechat(false)} />}

      {/* Logo */}
      <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.cyan})`, display: "grid", placeItems: "center", color: "#fff", fontWeight: 900, fontSize: 13, boxShadow: "0 10px 24px rgba(99,102,241,0.24)" }}>EC</div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 15, fontWeight: 950, color: C.ink }}>油管英语场景库</div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>Real scenes · bilingual subtitles · vocabulary cards</div>
        </div>
      </a>

      {/* 主卡片 */}
      <div className="redeem-card" style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: 24,
        border: "1px solid rgba(11,18,32,0.07)",
        boxShadow: "0 24px 70px rgba(11,18,32,0.09)",
        overflow: "hidden",
        backdropFilter: "blur(16px)",
      }}>
        <div className="card-inner">

          {/* ── 左/上：权益区 ── */}
          <div className="card-left" style={{
            padding: "20px 22px 16px",
            background: "linear-gradient(160deg, rgba(99,102,241,0.06) 0%, rgba(124,58,237,0.04) 100%)",
          }}>
            {/* 标题 */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: 999, background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.18)", color: C.vip, fontSize: 11, fontWeight: 900, marginBottom: 8, letterSpacing: "0.04em" }}>✨ 会员专属</span>
              <div style={{ fontSize: 20, fontWeight: 950, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.2 }}>加入会员，解锁全站内容</div>
            </div>

            {/* 权益列表 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {BENEFITS.map((b, i) => (
                <div key={i} className="benefit-row" style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 11px", borderRadius: 11,
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(255,255,255,0.9)",
                  transition: "background 150ms ease",
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(124,58,237,0.08))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{b.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: C.faint, marginTop: 1, lineHeight: 1.4 }}>{b.desc}</div>
                  </div>
                  <div style={{ width: 17, height: 17, borderRadius: "50%", flexShrink: 0, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: C.good, fontWeight: 900 }}>✓</div>
                </div>
              ))}
            </div>

            {/* 客服行：手机版重新排版 */}
            <div className="wechat-row" style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 11,
              background: "rgba(255,255,255,0.60)",
              border: "1px solid rgba(11,18,32,0.07)",
            }}>
              <div className="wechat-row-text">
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>购买兑换码 · 售后 · 建议</div>
                <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>微信联系客服，即时响应</div>
              </div>
              <button className="wechat-btn" onClick={() => setShowWechat(true)} style={{
                flexShrink: 0,
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 12px", borderRadius: 9,
                border: "1px solid rgba(5,150,105,0.22)",
                background: "rgba(5,150,105,0.06)",
                color: "#059669", fontSize: 12, fontWeight: 800,
                cursor: "pointer", transition: "all 160ms ease", whiteSpace: "nowrap",
              }}>
                <WechatIcon size={13} color="#059669" />
                联系客服
              </button>
            </div>
          </div>

          {/* ── 右/下：操作区 ── */}
          <div className="card-right" style={{ padding: "20px 22px 22px" }}>

            {me === null && (
              <div style={{ textAlign: "center", padding: "20px 0", color: C.faint, fontSize: 13 }}>加载中...</div>
            )}

            {/* 兑换成功 */}
            {me !== null && me.logged_in && success && (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
                <div style={{ fontSize: 20, fontWeight: 980, color: C.ink, marginBottom: 8 }}>兑换成功！</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
                  会员类型：{success.plan === "year" ? "年卡" : success.plan === "month" ? "月卡" : success.plan}
                  {success.expires_at && (<><br />到期：{new Date(success.expires_at).toLocaleDateString("zh-CN")}</>)}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: C.faint }}>正在跳转{redirectTo === "/" ? "首页" : "视频"}...</div>
              </div>
            )}

            {/* 未登录 */}
            {me !== null && !me.logged_in && (
              <>
                <div style={{ fontSize: 17, fontWeight: 900, color: C.ink, marginBottom: 16 }}>登录后即可激活会员</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <a href={`/login?next=${encodeURIComponent(router.asPath)}`} className="auth-btn-login" style={{
                    textAlign: "center", minHeight: 44, borderRadius: 999,
                    border: "1px solid rgba(99,102,241,0.22)", color: C.accent,
                    background: "rgba(99,102,241,0.04)", textDecoration: "none",
                    fontSize: 14, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 160ms ease",
                  }}>登录已有账号</a>
                  <a href={`/register?next=${encodeURIComponent(router.asPath)}`} className="auth-btn-register" style={{
                    textAlign: "center", minHeight: 46, borderRadius: 999, border: "none",
                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 14px 28px rgba(124,58,237,0.22)",
                    transition: "all 160ms ease",
                  }}>注册并开通会员 ✨</a>
                </div>
              </>
            )}

            {/* 已登录，填兑换码 */}
            {me !== null && me.logged_in && !success && (
              <>
                {/* 账号状态 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 11px", borderRadius: 10, marginBottom: 14, background: "rgba(11,18,32,0.03)", border: "1px solid rgba(11,18,32,0.07)" }}>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    当前账号：<span style={{ fontWeight: 700, color: C.ink }}>{me.email || me.username || "—"}</span>
                  </div>
                  {me.is_member
                    ? <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 999, background: "rgba(124,58,237,0.10)", color: C.vip, fontWeight: 800 }}>✨ 会员</span>
                    : <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 999, background: "rgba(11,18,32,0.06)", color: C.faint, fontWeight: 700 }}>普通用户</span>
                  }
                </div>

                {me.is_member && (
                  <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.16)", borderRadius: 10, fontSize: 12, color: C.vip, lineHeight: 1.6 }}>
                    你已是会员，输入新兑换码可延长到期时间 →
                  </div>
                )}

                <div style={{ marginBottom: 5, fontSize: 13, fontWeight: 700, color: C.ink }}>兑换码</div>
                <input
                  value={code} onChange={e => setCode(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") onSubmit(e); }}
                  placeholder="输入月卡 / 年卡兑换码"
                  autoFocus
                  style={{ width: "100%", padding: "11px 13px", boxSizing: "border-box", border: "1px solid rgba(124,58,237,0.22)", borderRadius: 11, fontSize: 14, background: "rgba(124,58,237,0.03)", outline: "none", color: C.ink, letterSpacing: "0.04em", marginBottom: 11, transition: "border-color 160ms ease" }}
                  onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(124,58,237,0.22)"}
                />

                {msg && (
                  <div style={{ padding: "9px 12px", background: "#fff2f2", border: "1px solid #ffd5d5", borderRadius: 10, fontSize: 13, color: "#b00000", lineHeight: 1.6, marginBottom: 11 }}>{msg}</div>
                )}

                <button type="button" onClick={onSubmit} disabled={loading} className="main-btn" style={{
                  width: "100%", minHeight: 46, borderRadius: 999, border: "none",
                  background: loading ? "rgba(124,58,237,0.40)" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                  color: "#fff", fontSize: 14, fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 14px 28px rgba(124,58,237,0.22)",
                  transition: "all 180ms ease",
                }}>{loading ? "兑换中..." : "立即兑换 ✨"}</button>

                <div style={{ marginTop: 14, textAlign: "center" }}>
                  <a href="/" style={{ fontSize: 13, color: C.faint, fontWeight: 700, textDecoration: "none" }}>← 返回首页</a>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
