"use client";
import ExamSystem from "./ExamSystem";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

// accessToken 从服务端传入（和参考站一样），降级用 localStorage
let _serverToken = null;
function setServerToken(t) { _serverToken = t; }
function getToken() {
  if (_serverToken) return _serverToken;
  try { return localStorage.getItem("sb_access_token") || null; } catch { return null; }
}
function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers, credentials: "include" });
}

// app/bookmarks/page.js
import { useEffect, useState } from "react";
import { THEME } from "../components/home/theme";

function fmtSec(s) {
  const n = Number(s || 0);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  return `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
}

function speakEn(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {}
}

// ─── 视频收藏卡片 ─────────────────────────────────────────
function VideoCard({ item, onRemove }) {
  const clip = item.clip;
  if (!clip) return null;
  const isVip = clip.access_tier === "vip";

  return (
    <div style={{
      border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg,
      background: THEME.colors.surface, overflow: "hidden",
      boxShadow: "0 2px 8px rgba(11,18,32,0.06)",
    }}>
      <a href={`/clips/${clip.id}`} style={{ textDecoration: "none", display: "block" }}>
        <div style={{ position: "relative", aspectRatio: "16/9", background: "#e8eaf0" }}>
          {clip.cover_url
            ? <img src={clip.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: THEME.colors.faint, fontSize: 28 }}>🎬</div>
          }
          {clip.duration_sec > 0 && (
            <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(11,18,32,0.72)", color: "#fff", borderRadius: 6, padding: "2px 6px", fontSize: 11, fontWeight: 700 }}>
              {fmtSec(clip.duration_sec)}
            </div>
          )}
          <div style={{ position: "absolute", top: 8, left: 8, background: isVip ? "rgba(124,58,237,0.88)" : "rgba(16,185,129,0.88)", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
            {isVip ? "会员" : "免费"}
          </div>
        </div>
        <div style={{ padding: "10px 12px 4px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: THEME.colors.ink, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {clip.title || `视频 #${clip.id}`}
          </div>
        </div>
      </a>
      <div style={{ padding: "6px 12px 12px", display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => onRemove(item.bookmark_id, item.clip_id)} style={{
          border: `1px solid #ffd5d5`, background: "#fff5f5", color: "#b00000",
          borderRadius: THEME.radii.md, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>取消收藏</button>
      </div>
    </div>
  );
}

// ─── 词汇卡片（和详情页体验一致）────────────────────────────
function VocabFavCard({ item, onRemove, showZh }) {
  const { term, kind, data, clip_id } = item;
  const [collapsed, setCollapsed] = useState(false);

  const kindLabel = kind === "phrases" ? "短语" : kind === "expressions" ? "地道表达" : "单词";
  const kindColor = kind === "phrases" ? "#0b5aa6" : kind === "expressions" ? "#3c3ccf" : "#b86b00";
  const kindBg = kind === "phrases" ? "#f3fbff" : kind === "expressions" ? "#f6f6ff" : "#fff8e8";
  const kindBorder = kind === "phrases" ? "#cfe6ff" : kind === "expressions" ? "#e7e7ff" : "#ffe3a3";

  const exampleEn = data?.example_en || "";
  const exampleZh = data?.example_zh || "";

  return (
    <div style={{
      border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg,
      background: THEME.colors.surface, padding: 14,
      boxShadow: "0 2px 8px rgba(11,18,32,0.06)",
    }}>
      {/* 头部：词条 + 操作按钮 */}
      <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: THEME.colors.ink }}>{term}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: kindBg, border: `1px solid ${kindBorder}`, color: kindColor, fontWeight: 700 }}>
              {kindLabel}
            </span>
          </div>
          {data?.ipa && <div style={{ marginTop: 4, fontSize: 12, color: THEME.colors.faint }}>/ {data.ipa} /</div>}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button type="button" title="听发音"
            onClick={() => data?.audio_url ? new Audio(data.audio_url).play() : speakEn(term)}
            style={{ width: 32, height: 32, borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontSize: 15, display: "grid", placeItems: "center" }}>🔊</button>
          <a href={`/clips/${clip_id}`} title="回到原视频"
            style={{ width: 32, height: 32, borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontSize: 15, display: "grid", placeItems: "center", textDecoration: "none" }}>🎬</a>
          <button type="button" title={collapsed ? "展开" : "收起"} onClick={() => setCollapsed(x => !x)}
            style={{ width: 32, height: 32, borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontSize: 15, display: "grid", placeItems: "center" }}>
            {collapsed ? "▾" : "▴"}
          </button>
          <button type="button" title="取消收藏" onClick={() => onRemove(item.id, term, clip_id)}
            style={{ width: 32, height: 32, borderRadius: THEME.radii.pill, border: "1px solid #ffd5d5", background: "#fff5f5", cursor: "pointer", fontSize: 15, display: "grid", placeItems: "center" }}>🗑️</button>
        </div>
      </div>

      {/* 展开内容 */}
      {!collapsed && (
        <>
          {showZh && data?.meaning_zh && (
            <div style={{ marginTop: 10, border: "1px solid #ffe3a3", background: "#fff8e8", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#b86b00" }}>中文含义</div>
              <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.55 }}>{data.meaning_zh}</div>
            </div>
          )}
          {(exampleEn || exampleZh) && (
            <div style={{ marginTop: 10, border: "1px solid #cfe6ff", background: "#f3fbff", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#0b5aa6" }}>{kind === "expressions" ? "字幕原句" : "例句"}</div>
              {exampleEn && <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.55 }}>{exampleEn}</div>}
              {showZh && exampleZh && <div style={{ marginTop: 4, fontSize: 13, color: THEME.colors.muted, lineHeight: 1.55 }}>{exampleZh}</div>}
            </div>
          )}
          {kind === "expressions" && showZh && data?.use_case_zh && (
            <div style={{ marginTop: 10, border: "1px solid #e7e7ff", background: "#f6f6ff", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#3c3ccf" }}>详细解析</div>
              <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{data.use_case_zh}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────
export default function BookmarksClient({ accessToken = null }) {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("videos"); // "videos" | "vocab"
  const [showZh, setShowZh] = useState(true); // 词汇本中文开关

  // 视频收藏
  const [videoItems, setVideoItems] = useState([]);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoSearch, setVideoSearch] = useState("");

  // 词汇收藏
  const [vocabItems, setVocabItems] = useState([]);
  const [vocabLoading, setVocabLoading] = useState(true);
  const [examOpen, setExamOpen] = useState(false);
  const [examActive, setExamActive] = useState(false);
  const [vocabSearch, setVocabSearch] = useState("");
  const [vocabKind, setVocabKind] = useState("all");

  useEffect(() => {
    // 和参考站一样：accessToken 从服务端传入，直接用
    if (accessToken) setServerToken(accessToken);
    authFetch(remote("/api/me"), { cache: "no-store" })
      .then(r => r.json())
      .then(d => setMe(d))
      .catch(() => setMe({ logged_in: false }));
    loadVideos();
    loadVocab();
  }, [accessToken]);

  async function loadVideos() {
    setVideoLoading(true);
    try {
      const r = await authFetch(remote("/api/bookmarks?limit=100"), { cache: "no-store" });
      const d = await r.json();
      setVideoItems(d?.items || []);
    } catch {}
    setVideoLoading(false);
  }

  async function loadVocab() {
    setVocabLoading(true);
    try {
      const r = await authFetch(remote("/api/vocab_favorites"), { cache: "no-store" });
      const d = await r.json();
      setVocabItems(d?.items || []);
    } catch {}
    setVocabLoading(false);
  }

  async function removeVideo(bookmarkId, clipId) {
    try {
      await authFetch(remote("/api/bookmarks_delete"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: clipId }),
      });
      setVideoItems(prev => prev.filter(x => x.bookmark_id !== bookmarkId));
    } catch {}
  }

  async function removeVocab(id, term, clipId) {
    try {
      await authFetch(remote("/api/vocab_fav_delete"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, clip_id: clipId }),
      });
      setVocabItems(prev => prev.filter(x => x.id !== id));
    } catch {}
  }

  const filteredVideos = videoItems.filter(item =>
    !videoSearch || (item.clip?.title || "").toLowerCase().includes(videoSearch.toLowerCase())
  );

  const filteredVocab = vocabItems.filter(item => {
    const matchSearch = !vocabSearch || item.term.toLowerCase().includes(vocabSearch.toLowerCase()) ||
      (item.data?.meaning_zh || "").includes(vocabSearch);
    const matchKind = vocabKind === "all" || item.kind === vocabKind;
    return matchSearch && matchKind;
  });

  const navBar = (
    <div style={{
      position: "sticky", top: 0, zIndex: 20,
      background: "rgba(246,247,251,0.92)", backdropFilter: "blur(10px)",
      borderBottom: `1px solid ${THEME.colors.border}`,
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <a href="/" style={{
          border: `1px solid ${THEME.colors.border2}`, background: THEME.colors.surface,
          borderRadius: THEME.radii.md, padding: "8px 14px", textDecoration: "none",
          color: THEME.colors.ink, fontWeight: 700, fontSize: 13,
        }}>← 返回首页</a>
        <div style={{ fontWeight: 900, fontSize: 17, color: THEME.colors.ink }}>我的收藏</div>
      </div>
    </div>
  );

  // 未登录
  if (me !== null && !me.logged_in) {
    return (
      <div style={{ background: THEME.colors.bg, minHeight: "100vh" }}>
        {navBar}
        <div style={{ maxWidth: 480, margin: "60px auto", padding: 16 }}>
          <div style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, background: THEME.colors.surface, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: THEME.colors.ink, marginBottom: 8 }}>请先登录</div>
            <div style={{ fontSize: 13, color: THEME.colors.muted, marginBottom: 20 }}>登录后即可查看收藏的视频和词汇</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <a href="/login" style={{ padding: "10px 20px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border2}`, color: THEME.colors.ink, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>去登录</a>
              <a href="/register" style={{ padding: "10px 20px", borderRadius: THEME.radii.pill, background: THEME.colors.ink, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>去注册</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ background: THEME.colors.bg, minHeight: "100vh" }}>
      {navBar}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* 标签切换 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button type="button" onClick={() => setTab("videos")} style={{
            padding: "10px 20px", borderRadius: THEME.radii.pill, fontWeight: 700, fontSize: 14, cursor: "pointer",
            border: `1px solid ${tab === "videos" ? THEME.colors.ink : THEME.colors.border2}`,
            background: tab === "videos" ? THEME.colors.ink : THEME.colors.surface,
            color: tab === "videos" ? "#fff" : THEME.colors.ink,
          }}>❤️ 收藏视频 {videoItems.length > 0 ? `(${videoItems.length})` : ""}</button>
          <button type="button" onClick={() => setTab("vocab")} style={{
            padding: "10px 20px", borderRadius: THEME.radii.pill, fontWeight: 700, fontSize: 14, cursor: "pointer",
            border: `1px solid ${tab === "vocab" ? THEME.colors.ink : THEME.colors.border2}`,
            background: tab === "vocab" ? THEME.colors.ink : THEME.colors.surface,
            color: tab === "vocab" ? "#fff" : THEME.colors.ink,
          }}>📖 我的词汇本 {vocabItems.length > 0 ? `(${vocabItems.length})` : ""}</button>

        </div>

        {/* ── 视频收藏 tab ── */}
        {tab === "videos" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <input
                value={videoSearch} onChange={e => setVideoSearch(e.target.value)}
                placeholder="搜索收藏的视频标题..."
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${THEME.colors.border2}`, borderRadius: THEME.radii.md, fontSize: 13, background: THEME.colors.surface, outline: "none" }}
              />
              <span style={{ fontSize: 13, color: THEME.colors.faint, whiteSpace: "nowrap" }}>共 {filteredVideos.length} 条</span>
              <button type="button" onClick={loadVideos} style={{ border: `1px solid ${THEME.colors.border2}`, background: THEME.colors.surface, borderRadius: THEME.radii.md, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>刷新</button>
            </div>

            {videoLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ borderRadius: THEME.radii.lg, overflow: "hidden", background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}` }}>
                    <div style={{ width: "100%", paddingTop: "56.25%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                    <div style={{ padding: 12 }}>
                      <div style={{ height: 14, borderRadius: 6, background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", marginBottom: 8 }} />
                      <div style={{ height: 12, width: "60%", borderRadius: 6, background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <div style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, background: THEME.colors.surface, padding: 40, textAlign: "center", color: THEME.colors.muted, fontSize: 14 }}>
                还没有收藏任何视频，去首页挑一个吧 ~
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                {filteredVideos.map(item => (
                  <VideoCard key={item.bookmark_id} item={item} onRemove={removeVideo} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── 词汇本 tab ── */}
        {tab === "vocab" && (
          <>
            <ExamSystem
              vocabItems={vocabItems}
              isSetupOpen={examOpen}
              onSetupClose={() => setExamOpen(false)}
              onMasteryUpdated={loadVocab}
              onExamActiveChange={setExamActive}
            />
          {!examActive && <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <input
                value={vocabSearch} onChange={e => setVocabSearch(e.target.value)}
                placeholder="搜索单词或中文含义..."
                style={{ flex: 1, minWidth: 200, padding: "10px 14px", border: `1px solid ${THEME.colors.border2}`, borderRadius: THEME.radii.md, fontSize: 13, background: THEME.colors.surface, outline: "none" }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                {[["all", "全部"], ["words", "单词"], ["phrases", "短语"], ["expressions", "地道表达"]].map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setVocabKind(k)} style={{
                    padding: "8px 12px", borderRadius: THEME.radii.pill, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${vocabKind === k ? THEME.colors.ink : THEME.colors.border2}`,
                    background: vocabKind === k ? THEME.colors.ink : THEME.colors.surface,
                    color: vocabKind === k ? "#fff" : THEME.colors.ink,
                  }}>{label}</button>
                ))}
              </div>
              <span style={{ fontSize: 13, color: THEME.colors.faint, whiteSpace: "nowrap" }}>共 {filteredVocab.length} 条</span>
              <button type="button" onClick={() => setShowZh(x => !x)} style={{
                border: `1px solid ${showZh ? THEME.colors.accent : THEME.colors.border2}`,
                background: showZh ? THEME.colors.accent : THEME.colors.surface,
                color: showZh ? "#fff" : THEME.colors.ink,
                borderRadius: THEME.radii.pill, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>{showZh ? "中文 ON" : "中文 OFF"}</button>
              <button type="button" onClick={loadVocab} style={{ border: `1px solid ${THEME.colors.border2}`, background: THEME.colors.surface, borderRadius: THEME.radii.md, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>刷新</button>
              {vocabItems.length >= 2 && <button type="button" onClick={() => setExamOpen(true)} style={{ padding: "8px 16px", borderRadius: THEME.radii.pill, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "none", background: THEME.colors.ink, color: "#fff", whiteSpace: "nowrap" }}>🎯 开始练习</button>}
            </div>}

            {!examActive && (vocabLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, padding: 16 }}>
                    <div style={{ height: 16, width: "30%", borderRadius: 6, background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", marginBottom: 10 }} />
                    <div style={{ height: 12, width: "80%", borderRadius: 6, background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", marginBottom: 6 }} />
                    <div style={{ height: 12, width: "50%", borderRadius: 6, background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                  </div>
                ))}
              </div>
            ) : filteredVocab.length === 0 ? (
              <div style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, background: THEME.colors.surface, padding: 40, textAlign: "center", color: THEME.colors.muted, fontSize: 14 }}>
                还没有收藏任何词汇，去看视频时点击词汇卡的 🤍 按钮收藏吧 ~
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredVocab.map(item => (
                  <VocabFavCard key={item.id} item={item} onRemove={removeVocab} showZh={showZh} />
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  
    </>
  );
}
