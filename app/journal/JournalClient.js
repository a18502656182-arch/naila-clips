"use client";
import { useState, useEffect } from "react";
import { THEME } from "../components/home/theme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

function getToken() {
  try { return localStorage.getItem("sb_access_token") || null; } catch { return null; }
}
function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

// ── 工具函数 ──────────────────────────────────────────────
function formatDate(d) {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
}

function playWord(term) {
  const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(term)}&type=2`);
  audio.onerror = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(term);
    u.lang = "en-US"; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };
  audio.play().catch(() => {});
}

// ── 卡片容器 ──────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: THEME.colors.surface,
      borderRadius: THEME.radii.lg,
      border: `1px solid ${THEME.colors.border}`,
      padding: 20,
      boxShadow: "0 2px 12px rgba(11,18,32,0.06)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ emoji, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ fontSize: 15, fontWeight: 800, color: THEME.colors.ink }}>{title}</span>
    </div>
  );
}

// ── 今日任务 ──────────────────────────────────────────────
function TodayTasks({ tasks }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const allDone = tasks.every(t => t.done);

  useEffect(() => {
    if (allDone) setShowConfetti(true);
  }, [allDone]);

  return (
    <Card>
      <SectionTitle emoji="🎯" title="今日小目标" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tasks.map((task, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px",
            borderRadius: THEME.radii.md,
            background: task.done ? "#f0fdf4" : THEME.colors.bg,
            border: `1px solid ${task.done ? "#bbf7d0" : THEME.colors.border}`,
            transition: "all 0.3s",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: task.done ? "#22c55e" : THEME.colors.surface,
              border: `2px solid ${task.done ? "#22c55e" : THEME.colors.border2}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.3s",
            }}>
              {task.done && <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: task.done ? "#15803d" : THEME.colors.ink }}>
                {task.label}
              </div>
              <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 2 }}>
                {task.done ? task.doneText : task.pendingText}
              </div>
            </div>
            {task.done && <span style={{ fontSize: 16 }}>⭐</span>}
          </div>
        ))}
      </div>
      {allDone && showConfetti && (
        <div style={{
          marginTop: 16, padding: 14, borderRadius: THEME.radii.md,
          background: "linear-gradient(135deg, #fef9c3, #dcfce7)",
          border: "1px solid #fde68a", textAlign: "center",
        }}>
          <div style={{ fontSize: 22 }}>🎉</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#854d0e", marginTop: 4 }}>
            今日目标全部完成！太棒了！
          </div>
        </div>
      )}
    </Card>
  );
}

// ── 热力图 ────────────────────────────────────────────────
function Heatmap({ heatmapData, streakDays, totalVideos }) {
  // 生成过去 12 周 × 7 天的日期格子
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: heatmapData[key] || 0 });
  }

  // 补齐第一周前面的空格（从周一开始）
  const firstDay = new Date(days[0].date);
  const pad = (firstDay.getDay() + 6) % 7; // 0=Mon
  const padded = [...Array(pad).fill(null), ...days];

  function getColor(count) {
    if (count === 0) return "#ebedf0";
    if (count === 1) return "#bbf7d0";
    if (count === 2) return "#4ade80";
    return "#16a34a";
  }

  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return (
    <Card>
      <SectionTitle emoji="🔥" title="学习足迹" />
      <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {week.map((day, di) => (
              <div
                key={di}
                title={day ? `${day.date}：${day.count > 0 ? `学了 ${day.count} 个视频` : "未学习"}` : ""}
                style={{
                  width: 12, height: 12,
                  borderRadius: 3,
                  background: day ? getColor(day.count) : "transparent",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: THEME.colors.accent }}>{streakDays}</div>
          <div style={{ fontSize: 11, color: THEME.colors.faint }}>连续学习天数</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: THEME.colors.accent }}>{totalVideos}</div>
          <div style={{ fontSize: 11, color: THEME.colors.faint }}>累计观看视频</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <span style={{ fontSize: 11, color: THEME.colors.faint }}>少</span>
          {["#ebedf0", "#bbf7d0", "#4ade80", "#16a34a"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
          ))}
          <span style={{ fontSize: 11, color: THEME.colors.faint }}>多</span>
        </div>
      </div>
    </Card>
  );
}

// ── 能力画像 ──────────────────────────────────────────────
function AbilityProfile({ masteryStats, topicStats }) {
  const total = masteryStats.new + masteryStats.learning + masteryStats.mastered;

  const bars = [
    { label: "已掌握", count: masteryStats.mastered, color: "#22c55e", bg: "#f0fdf4" },
    { label: "学习中", count: masteryStats.learning, color: "#3b82f6", bg: "#eff6ff" },
    { label: "新收藏", count: masteryStats.new, color: "#a855f7", bg: "#faf5ff" },
  ];

  return (
    <Card>
      <SectionTitle emoji="📊" title="我的英语宇宙" />
      {total === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: THEME.colors.faint, fontSize: 13 }}>
          还没有收藏词汇，去视频页收藏一些吧～
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: THEME.colors.muted }}>词汇总量</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.colors.ink }}>{total} 个</span>
            </div>
            {/* 分段进度条 */}
            <div style={{ height: 10, borderRadius: 999, overflow: "hidden", display: "flex", gap: 2 }}>
              {bars.map((b, i) => b.count > 0 && (
                <div key={i} style={{
                  height: "100%",
                  width: `${b.count / total * 100}%`,
                  background: b.color,
                  borderRadius: 999,
                  transition: "width 0.6s ease",
                }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bars.map((b, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: THEME.radii.md,
                background: b.bg,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: THEME.colors.ink, flex: 1 }}>{b.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: b.color }}>{b.count} 个</span>
                <span style={{ fontSize: 12, color: THEME.colors.faint }}>
                  {total > 0 ? Math.round(b.count / total * 100) : 0}%
                </span>
              </div>
            ))}
          </div>

          {topicStats.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.colors.muted, marginBottom: 8 }}>偏好话题</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {topicStats.map((t, i) => (
                  <span key={i} style={{
                    fontSize: 12, padding: "4px 10px",
                    borderRadius: THEME.radii.pill,
                    background: i === 0 ? "#eef2ff" : THEME.colors.bg,
                    color: i === 0 ? THEME.colors.accent : THEME.colors.muted,
                    border: `1px solid ${i === 0 ? "#c7d2fe" : THEME.colors.border}`,
                    fontWeight: i === 0 ? 700 : 500,
                  }}>
                    {i === 0 ? "👑 " : ""}{t.label} ({t.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ── 记忆碎片 ──────────────────────────────────────────────
function MemoryCard({ item, onRefresh }) {
  const [flipped, setFlipped] = useState(false);

  if (!item) return (
    <Card>
      <SectionTitle emoji="💡" title="记忆碎片" />
      <div style={{ textAlign: "center", padding: "20px 0", color: THEME.colors.faint, fontSize: 13 }}>
        还没有收藏词汇，快去视频页收藏一些吧～
      </div>
    </Card>
  );

  return (
    <Card>
      <SectionTitle emoji="💡" title="记忆碎片" />
      <div style={{
        background: "linear-gradient(135deg, #fefce8, #fef9c3)",
        border: "1px solid #fde68a",
        borderRadius: THEME.radii.md,
        padding: 18,
        position: "relative",
      }}>
        {/* 便签装饰 */}
        <div style={{
          position: "absolute", top: -6, left: 20,
          width: 40, height: 12,
          background: "#fbbf24", borderRadius: 3,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }} />
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: THEME.colors.ink, marginBottom: 6 }}>
            {item.term}
          </div>
          {item.data?.ipa && (
            <div style={{ fontSize: 13, color: THEME.colors.faint, marginBottom: 8, fontFamily: "monospace" }}>
              {item.data.ipa}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => playWord(item.term)}
              style={{
                padding: "5px 12px", borderRadius: THEME.radii.pill,
                border: `1px solid ${THEME.colors.border2}`,
                background: THEME.colors.surface, cursor: "pointer",
                fontSize: 12, color: THEME.colors.muted,
              }}>
              🔊 发音
            </button>
            <button
              onClick={() => setFlipped(x => !x)}
              style={{
                padding: "5px 12px", borderRadius: THEME.radii.pill,
                border: `1px solid ${THEME.colors.border2}`,
                background: THEME.colors.surface, cursor: "pointer",
                fontSize: 12, color: THEME.colors.muted,
              }}>
              {flipped ? "收起" : "查看释义"}
            </button>
          </div>
          {flipped && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {item.data?.zh && (
                <div style={{
                  padding: 10, borderRadius: THEME.radii.sm,
                  background: "rgba(255,255,255,0.7)", fontSize: 13, color: THEME.colors.ink,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309" }}>中文含义　</span>
                  {item.data.zh}
                </div>
              )}
              {item.data?.example_en && (
                <div style={{
                  padding: 10, borderRadius: THEME.radii.sm,
                  background: "rgba(255,255,255,0.7)", fontSize: 13, color: THEME.colors.ink,
                  fontStyle: "italic",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", fontStyle: "normal" }}>例句　</span>
                  {item.data.example_en}
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 11, color: "#b45309" }}>
            📌 收藏于 {item.created_at ? new Date(item.created_at).toLocaleDateString("zh-CN") : ""}
          </div>
        </div>
      </div>
      <button
        onClick={onRefresh}
        style={{
          marginTop: 12, width: "100%", padding: "9px 0",
          borderRadius: THEME.radii.md,
          border: `1px solid ${THEME.colors.border2}`,
          background: THEME.colors.bg, cursor: "pointer",
          fontSize: 13, color: THEME.colors.muted, fontWeight: 600,
        }}>
        换一个 🔄
      </button>
    </Card>
  );
}

// ── 主页面 ────────────────────────────────────────────────
export default function JournalClient({ accessToken }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [journalData, setJournalData] = useState(null);
  const [memoryItem, setMemoryItem] = useState(null);

  useEffect(() => {
    authFetch(remote("/api/me"), { cache: "no-store" })
      .then(r => r.json())
      .then(d => setMe(d))
      .catch(() => setMe({ logged_in: false }));
  }, []);

  useEffect(() => {
    if (!me) return;
    if (!me.logged_in) { setLoading(false); return; }
    loadJournalData();
  }, [me]);

  async function loadJournalData() {
    setLoading(true);
    try {
      const [journalRes, vocabRes] = await Promise.all([
        authFetch(remote("/api/journal_stats"), { cache: "no-store" }),
        authFetch(remote("/api/vocab_favorites"), { cache: "no-store" }),
      ]);
      const journal = await journalRes.json();
      const vocab = await vocabRes.json();

      // 记忆碎片：随机取一个
      const items = vocab?.items || [];
      if (items.length > 0) {
        setMemoryItem(items[Math.floor(Math.random() * items.length)]);
      }

      setJournalData({ ...journal, vocabItems: items });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function refreshMemory() {
    const items = journalData?.vocabItems || [];
    if (items.length === 0) return;
    let next;
    do { next = items[Math.floor(Math.random() * items.length)]; }
    while (items.length > 1 && next?.id === memoryItem?.id);
    setMemoryItem(next);
  }

  // ── 未登录 ─────────────────────────────────────────────
  if (!loading && (!me || !me.logged_in)) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ maxWidth: 400, textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📒</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.colors.ink, marginBottom: 8 }}>我的英语手帐</div>
          <div style={{ fontSize: 14, color: THEME.colors.muted, marginBottom: 20 }}>登录后查看你的学习记录</div>
          <a href="/login" style={{
            display: "inline-block", padding: "10px 28px",
            background: THEME.colors.ink, color: "#fff",
            borderRadius: THEME.radii.pill, textDecoration: "none",
            fontSize: 14, fontWeight: 700,
          }}>去登录</a>
        </Card>
      </div>
    );
  }

  // ── 加载中 ─────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg }}>
        {/* 顶栏骨架 */}
        <div style={{ height: 56, background: THEME.colors.surface, borderBottom: `1px solid ${THEME.colors.border}` }} />
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {[180, 160, 200, 180].map((h, i) => (
            <div key={i} style={{ height: h, background: THEME.colors.surface, borderRadius: THEME.radii.lg, border: `1px solid ${THEME.colors.border}` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── 构建数据 ────────────────────────────────────────────
  const d = journalData || {};
  const vocabItems = d.vocabItems || [];

  // 今日任务
  const tasks = [
    {
      label: "沉浸 1 个场景视频",
      done: (d.today_views || 0) >= 1,
      doneText: `今天已看 ${d.today_views || 0} 个视频 ✨`,
      pendingText: "打开任意一个视频即可完成",
    },
    {
      label: "收藏 3 个地道表达",
      done: (d.today_vocab || 0) >= 3,
      doneText: `今天已收藏 ${d.today_vocab || 0} 个词汇 ✨`,
      pendingText: `已收藏 ${d.today_vocab || 0} / 3 个`,
    },
    {
      label: "词汇通关 1 次",
      done: (d.mastered_total || 0) >= 1,
      doneText: `已掌握 ${d.mastered_total || 0} 个词汇 ✨`,
      pendingText: "去收藏页完成一次词汇练习",
    },
  ];

  // 掌握度统计
  const masteryStats = {
    new: vocabItems.filter(v => (v.mastery_level ?? 0) === 0).length,
    learning: vocabItems.filter(v => (v.mastery_level ?? 0) === 1).length,
    mastered: vocabItems.filter(v => (v.mastery_level ?? 0) === 2).length,
  };

  // 话题偏好（从收藏视频的 topic_slugs 统计）
  const topicMap = {};
  const topicLabelMap = {
    "daily-life": "日常生活", "self-improvement": "个人成长",
    "food": "美食探店", "travel": "旅行", "business": "职场商务",
    "culture": "文化", "opinion": "观点表达", "skills": "方法技能",
  };
  (d.bookmarked_topics || []).forEach(slug => {
    const label = topicLabelMap[slug] || slug;
    topicMap[label] = (topicMap[label] || 0) + 1;
  });
  const topicStats = Object.entries(topicMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg }}>
      {/* 顶栏 */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: THEME.colors.surface,
        borderBottom: `1px solid ${THEME.colors.border}`,
        padding: "0 16px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/" style={{
            padding: "6px 12px", borderRadius: THEME.radii.md,
            border: `1px solid ${THEME.colors.border2}`,
            background: THEME.colors.bg, textDecoration: "none",
            fontSize: 13, color: THEME.colors.ink, fontWeight: 600,
          }}>← 返回</a>
          <span style={{ fontSize: 15, fontWeight: 800, color: THEME.colors.ink }}>我的英语手帐</span>
        </div>
        <span style={{ fontSize: 12, color: THEME.colors.faint }}>📅 {formatDate()}</span>
      </div>

      {/* 内容区 */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px 60px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* 欢迎语 */}
        <div style={{ padding: "16px 20px", background: "linear-gradient(135deg, #eef2ff, #f0fdf4)", borderRadius: THEME.radii.lg, border: `1px solid #c7d2fe` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: THEME.colors.accent }}>
            👋 {me?.email?.split("@")[0] || "同学"}，今天也要加油哦！
          </div>
          <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 4 }}>
            累计观看 {d.total_views || 0} 个视频 · 收藏 {vocabItems.length} 个词汇
          </div>
        </div>

        <TodayTasks tasks={tasks} />
        <Heatmap
          heatmapData={d.heatmap || {}}
          streakDays={d.streak_days || 0}
          totalVideos={d.total_views || 0}
        />
        <AbilityProfile masteryStats={masteryStats} topicStats={topicStats} />
        <MemoryCard item={memoryItem} onRefresh={refreshMemory} />

      </div>
    </div>
  );
}
