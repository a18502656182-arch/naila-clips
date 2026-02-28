// app/bookmarks/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { THEME } from "../components/home/theme";

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function formatDuration(sec) {
  const s = Number(sec || 0);
  if (!Number.isFinite(s) || s <= 0) return "";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function BookmarksPage() {
  const [me, setMe] = useState({ loading: true, logged_in: false, email: null, is_member: false });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");

  async function loadMe() {
    try {
      const d = await fetchJson("/api/me", { cache: "no-store" });
      setMe({ loading: false, logged_in: !!d?.logged_in, email: d?.email || null, is_member: !!d?.is_member });
      return d;
    } catch {
      setMe({ loading: false, logged_in: false, email: null, is_member: false });
      return null;
    }
  }

  async function loadBookmarks() {
    setLoading(true);
    setMsg("");
    try {
      const d = await fetchJson("/api/bookmarks?limit=500&offset=0");
      setItems(d?.items || []);
    } catch (e) {
      setMsg(e.message || "加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMe(); }, []);
  useEffect(() => {
    if (me.loading) return;
    if (!me.logged_in) { setLoading(false); setItems([]); return; }
    loadBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.loading, me.logged_in]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(x => String(x?.clip?.title || "").toLowerCase().includes(s));
  }, [items, q]);

  async function removeBookmark(clipId) {
    try {
      await fetchJson("/api/bookmarks_delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: clipId }),
      });
      setItems(prev => prev.filter(x => x.clip_id !== clipId));
    } catch (e) {
      alert("取消收藏失败：" + e.message);
    }
  }

  return (
    <div style={{ background: THEME.colors.bg, minHeight: "100vh" }}>
      {/* 导航栏 */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(246,247,251,0.86)", backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${THEME.colors.border}`,
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 12,
                background: `linear-gradient(135deg, ${THEME.colors.accent}, ${THEME.colors.accent2})`,
                display: "grid", placeItems: "center", color: "#fff", fontWeight: 900,
              }}>EC</div>
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: 16, fontWeight: 950, color: THEME.colors.ink }}>油管英语场景库</div>
                <div style={{ fontSize: 12, color: THEME.colors.faint }}>精选场景短片 · 双语字幕 · 词汇卡片</div>
              </div>
            </Link>
          </div>
          <Link href="/" style={{
            fontSize: 13, padding: "8px 14px", borderRadius: THEME.radii.pill,
            border: `1px solid ${THEME.colors.border2}`, color: THEME.colors.ink,
            textDecoration: "none", fontWeight: 600,
          }}>← 返回首页</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* 标题行 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 950, color: THEME.colors.ink }}>❤️ 我的收藏</div>
          {me.logged_in && (
            <button onClick={loadBookmarks} disabled={loading} style={{
              marginLeft: "auto", border: `1px solid ${THEME.colors.border2}`,
              background: THEME.colors.surface, borderRadius: THEME.radii.pill,
              padding: "7px 14px", cursor: "pointer", fontSize: 13, color: THEME.colors.ink,
            }}>刷新</button>
          )}
        </div>

        {/* 未登录提示 */}
        {!me.loading && !me.logged_in && (
          <div style={{
            padding: 24, border: `1px solid ${THEME.colors.border}`,
            borderRadius: THEME.radii.lg, background: THEME.colors.surface,
            boxShadow: THEME.colors.shadow, maxWidth: 400,
          }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: THEME.colors.ink, marginBottom: 8 }}>你还没登录</div>
            <div style={{ fontSize: 13, color: THEME.colors.muted, marginBottom: 18 }}>登录后才能查看你的收藏列表。</div>
            <div style={{ display: "flex", gap: 10 }}>
              <a href="/login" style={{
                flex: 1, textAlign: "center", padding: "10px 0",
                borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border2}`,
                color: THEME.colors.ink, textDecoration: "none", fontSize: 13, fontWeight: 600,
              }}>去登录</a>
              <a href="/register" style={{
                flex: 1, textAlign: "center", padding: "10px 0",
                borderRadius: THEME.radii.pill, background: THEME.colors.ink,
                color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700,
              }}>去注册</a>
            </div>
          </div>
        )}

        {/* 搜索框 */}
        {me.logged_in && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="搜索收藏的视频标题..."
              style={{
                flex: 1, padding: "10px 14px",
                border: `1px solid ${THEME.colors.border2}`,
                borderRadius: THEME.radii.pill, fontSize: 13,
                background: THEME.colors.surface, outline: "none",
                color: THEME.colors.ink,
              }}
            />
            <div style={{ fontSize: 13, color: THEME.colors.faint, whiteSpace: "nowrap" }}>
              {loading ? "加载中..." : `共 ${filtered.length} 条`}
            </div>
          </div>
        )}

        {msg && <div style={{ color: "crimson", fontSize: 13, marginBottom: 14 }}>{msg}</div>}

        {/* 收藏列表 */}
        {me.logged_in && (
          loading ? (
            <div style={{ padding: 40, textAlign: "center", color: THEME.colors.faint }}>加载中...</div>
          ) : filtered.length === 0 ? (
            <div style={{
              padding: 40, textAlign: "center", color: THEME.colors.faint,
              border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg,
              background: THEME.colors.surface,
            }}>
              {q ? "没有找到匹配的收藏" : "还没有收藏任何视频，去首页挑一个吧～"}
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
            }}>
              {filtered.map(x => {
                const c = x.clip;
                const isVip = c?.access_tier === "vip";
                const duration = formatDuration(c?.duration_sec);
                return (
                  <div key={x.clip_id} style={{
                    border: `1px solid ${THEME.colors.border}`,
                    borderRadius: THEME.radii.lg,
                    background: THEME.colors.surface,
                    boxShadow: THEME.colors.shadow,
                    overflow: "hidden",
                  }}>
                    {/* 封面 */}
                    <Link href={`/clips/${x.clip_id}`} style={{ display: "block", position: "relative", height: 150, background: "rgba(11,18,32,0.06)" }}>
                      {c?.cover_url && (
                        <img src={c.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      )}
                      {/* 标签 */}
                      <div style={{ position: "absolute", left: 10, top: 10, display: "flex", gap: 6 }}>
                        <span style={{
                          padding: "4px 8px", borderRadius: 999, fontSize: 12,
                          border: isVip ? "1px solid rgba(124,58,237,0.22)" : "1px solid rgba(16,185,129,0.22)",
                          background: isVip ? "rgba(124,58,237,0.12)" : "rgba(16,185,129,0.12)",
                          color: isVip ? "#5b21b6" : "#065f46",
                        }}>{isVip ? "会员" : "免费"}</span>
                      </div>
                      {duration && (
                        <div style={{
                          position: "absolute", right: 10, bottom: 10,
                          background: "rgba(11,18,32,0.78)", color: "#fff",
                          fontSize: 12, padding: "4px 6px", borderRadius: 8,
                        }}>{duration}</div>
                      )}
                    </Link>

                    {/* 内容 */}
                    <div style={{ padding: 12 }}>
                      <Link href={`/clips/${x.clip_id}`} style={{ textDecoration: "none" }}>
                        <div style={{
                          fontWeight: 950, fontSize: 15, color: THEME.colors.ink,
                          lineHeight: 1.25, marginBottom: 10,
                          display: "-webkit-box", WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical", overflow: "hidden",
                        }}>{c?.title || `Clip #${x.clip_id}`}</div>
                      </Link>
                      <button
                        onClick={() => removeBookmark(x.clip_id)}
                        style={{
                          width: "100%", padding: "8px 0",
                          borderRadius: THEME.radii.pill,
                          border: "1px solid #ffd5d5", background: "#fff5f5",
                          color: "#b00000", fontSize: 13, fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >取消收藏</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
