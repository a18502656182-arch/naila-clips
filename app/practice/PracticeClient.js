"use client";
import { useEffect, useState } from "react";
import ExamSystem from "../bookmarks/ExamSystem";
import { THEME } from "../components/home/theme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

function makeAuthFetch(token) {
  return function authFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    const t = token || (() => { try { return localStorage.getItem("sb_access_token"); } catch { return null; } })();
    if (t) headers["Authorization"] = `Bearer ${t}`;
    return fetch(url, { ...options, headers, credentials: "include" });
  };
}

export default function PracticeClient({ accessToken = null }) {
  const authFetch = makeAuthFetch(accessToken);
  const [me, setMe] = useState(null);
  const [vocabItems, setVocabItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examOpen, setExamOpen] = useState(false);
  const [examActive, setExamActive] = useState(false);

  useEffect(() => {
    authFetch(remote("/api/me"), { cache: "no-store" })
      .then(r => r.json())
      .then(d => setMe(d))
      .catch(() => setMe({ logged_in: false }));

    setLoading(true);
    authFetch(remote("/api/vocab_favorites"), { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setVocabItems(d?.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [accessToken]);

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
        <div style={{ fontWeight: 900, fontSize: 17, color: THEME.colors.ink }}>🎮 考试游戏</div>
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
            <div style={{ fontSize: 13, color: THEME.colors.muted, marginBottom: 20 }}>登录后即可用收藏的词汇来练习</div>
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
    <div style={{ background: THEME.colors.bg, minHeight: "100vh" }}>
      {navBar}

      {/* ExamSystem 全局挂载，考试时全屏接管，平时显示入口 */}
      <ExamSystem
        vocabItems={vocabItems}
        isSetupOpen={examOpen}
        onSetupClose={() => setExamOpen(false)}
        onMasteryUpdated={() => {
          authFetch(remote("/api/vocab_favorites"), { cache: "no-store" })
            .then(r => r.json())
            .then(d => setVocabItems(d?.items || []));
        }}
        onExamActiveChange={setExamActive}
      />

      {/* 非考试状态显示入口页 */}
      {!examActive && (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px 60px" }}>

          {loading ? (
            <div style={{ textAlign: "center", color: THEME.colors.muted, padding: 60, fontSize: 14 }}>加载词汇中…</div>
          ) : vocabItems.length === 0 ? (
            <div style={{ border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, background: THEME.colors.surface, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: THEME.colors.ink, marginBottom: 8 }}>还没有收藏词汇</div>
              <div style={{ fontSize: 13, color: THEME.colors.muted, marginBottom: 20 }}>去看视频，点击词汇卡的 🤍 按钮收藏后就可以在这里练习了</div>
              <a href="/" style={{ padding: "10px 24px", borderRadius: THEME.radii.pill, background: THEME.colors.ink, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>去看视频</a>
            </div>
          ) : (
            <>
              {/* 词汇统计 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
                {[
                  { label: "词汇总数", value: vocabItems.length, emoji: "📚", color: "#4f46e5" },
                  { label: "学习中", value: vocabItems.filter(v => (v.mastery_level ?? 0) === 1).length, emoji: "🔄", color: "#2563eb" },
                  { label: "已掌握", value: vocabItems.filter(v => (v.mastery_level ?? 0) === 2).length, emoji: "✅", color: "#16a34a" },
                ].map(({ label, value, emoji, color }) => (
                  <div key={label} style={{ background: THEME.colors.surface, borderRadius: THEME.radii.lg, border: `1px solid ${THEME.colors.border}`, padding: "16px 12px", textAlign: "center", boxShadow: "0 2px 8px rgba(11,18,32,0.05)" }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
                    <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* 游戏模式介绍 */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: THEME.colors.ink, marginBottom: 12 }}>选择模式开始练习</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { emoji: "🎮", title: "气泡拼写", desc: "点击字母气泡，按顺序拼出单词，考验拼写记忆", color: "#4f46e5", bg: "#eef2ff" },
                    { emoji: "⚡", title: "极速连连看", desc: "30秒内快速配对英文与中文，连击越多分越高", color: "#d97706", bg: "#fffbeb" },
                    { emoji: "📝", title: "选择题", desc: "看中文提示和例句，从4个选项中选出正确单词", color: "#059669", bg: "#f0fdf4" },
                    { emoji: "🔀", title: "混合模式", desc: "随机穿插气泡拼写和选择题，保持大脑活跃", color: "#7c3aed", bg: "#f5f3ff" },
                  ].map(({ emoji, title, desc, color, bg }) => (
                    <div key={title} style={{ background: bg, border: `1px solid ${color}22`, borderRadius: THEME.radii.md, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: 28, flexShrink: 0 }}>{emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color }}>{title}</div>
                        <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 2 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 开始按钮 */}
              <button
                type="button"
                onClick={() => setExamOpen(true)}
                style={{
                  width: "100%", padding: "16px 0",
                  borderRadius: THEME.radii.lg,
                  background: `linear-gradient(135deg, ${THEME.colors.ink}, #4f46e5)`,
                  color: "#fff", border: "none",
                  fontSize: 16, fontWeight: 900, cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(79,70,229,0.30)",
                  letterSpacing: "0.02em",
                }}
              >
                🚀 开始练习（{vocabItems.length} 个词汇）
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
