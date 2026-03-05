"use client";
import { useState, useEffect, useRef } from "react";
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

function formatDate() {
  const now = new Date();
  const days = ["日","一","二","三","四","五","六"];
  return `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 · 周${days[now.getDay()]}`;
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

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: THEME.colors.surface,
      borderRadius: THEME.radii.lg,
      border: `1px solid ${THEME.colors.border}`,
      padding: 20,
      boxShadow: "0 2px 16px rgba(11,18,32,0.07)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ emoji, title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: THEME.colors.ink }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 3, marginLeft: 28 }}>{sub}</div>}
    </div>
  );
}

// ── 今日任务 ──────────────────────────────────────────────
function TodayTasks({ tasks }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const allDone = tasks.every(t => t.done);
  const doneCount = tasks.filter(t => t.done).length;

  useEffect(() => {
    if (allDone) setShowConfetti(true);
  }, [allDone]);

  return (
    <Card>
      <SectionTitle emoji="🎯" title="今日小目标" sub={`已完成 ${doneCount} / ${tasks.length} 项`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tasks.map((task, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "13px 16px",
            borderRadius: THEME.radii.md,
            background: task.done ? "#f0fdf4" : THEME.colors.bg,
            border: `1.5px solid ${task.done ? "#86efac" : THEME.colors.border}`,
            transition: "all 0.3s",
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              background: task.done ? "#22c55e" : THEME.colors.surface,
              border: `2px solid ${task.done ? "#22c55e" : THEME.colors.border2}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.3s",
              boxShadow: task.done ? "0 2px 8px rgba(34,197,94,0.3)" : "none",
            }}>
              {task.done && <span style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: task.done ? "#15803d" : THEME.colors.ink }}>
                {task.label}
              </div>
              <div style={{ fontSize: 12, color: task.done ? "#16a34a" : THEME.colors.faint, marginTop: 2 }}>
                {task.done ? task.doneText : task.pendingText}
              </div>
            </div>
            {task.done && <span style={{ fontSize: 18 }}>⭐</span>}
          </div>
        ))}
      </div>
      {allDone && showConfetti && (
        <div style={{
          marginTop: 16, padding: "14px 16px", borderRadius: THEME.radii.md,
          background: "linear-gradient(135deg, #fef9c3, #dcfce7, #dbeafe)",
          border: "1px solid #fde68a", textAlign: "center",
          animation: "fadeIn 0.5s ease",
        }}>
          <div style={{ fontSize: 28 }}>🎉🎊🎉</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#854d0e", marginTop: 6 }}>
            今日目标全部完成！
          </div>
          <div style={{ fontSize: 12, color: "#b45309", marginTop: 4 }}>
            坚持是最好的天赋，明天继续加油！
          </div>
        </div>
      )}
    </Card>
  );
}

// ── 热力图 ────────────────────────────────────────────────
function Heatmap({ heatmapData, streakDays, totalVideos }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 生成过去16周数据
  const days = [];
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: heatmapData[key] || 0, d });
  }

  const pad = (days[0].d.getDay() + 6) % 7;
  const padded = [...Array(pad).fill(null), ...days];
  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const first = week.find(d => d);
    if (first && new Date(first.date).getDate() <= 7) {
      monthLabels.push({ wi, label: `${new Date(first.date).getMonth()+1}月` });
    }
  });

  function getColor(count) {
    if (count === 0) return "#e8eaf0";
    if (count === 1) return "#bbf7d0";
    if (count === 2) return "#4ade80";
    return "#16a34a";
  }

  const todayKey = today.toISOString().slice(0, 10);
  const activeDays = Object.keys(heatmapData).length;

  return (
    <Card>
      <SectionTitle emoji="🔥" title="学习足迹" sub="每一个绿格子都是你努力的证明" />

      {/* 统计数字 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[
          { num: streakDays, label: "🔥 连续天数", color: "#f97316", bg: "#fff7ed" },
          { num: totalVideos, label: "🎬 累计视频", color: "#6366f1", bg: "#eef2ff" },
          { num: activeDays, label: "📅 活跃天数", color: "#10b981", bg: "#f0fdf4" },
        ].map((s, i) => (
          <div key={i} style={{
            textAlign: "center", padding: "12px 8px",
            borderRadius: THEME.radii.md, background: s.bg,
          }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.num}</div>
            <div style={{ fontSize: 11, color: THEME.colors.muted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 热力图格子 */}
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        {/* 月份标签 */}
        <div style={{ display: "flex", gap: 3, marginBottom: 4, paddingLeft: 0 }}>
          {weeks.map((week, wi) => {
            const ml = monthLabels.find(m => m.wi === wi);
            return (
              <div key={wi} style={{ width: 14, fontSize: 9, color: THEME.colors.faint, textAlign: "center", flexShrink: 0 }}>
                {ml ? ml.label : ""}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  title={day ? `${day.date}：${day.count > 0 ? `${day.count} 个视频` : "未学习"}` : ""}
                  style={{
                    width: 14, height: 14,
                    borderRadius: 4,
                    background: day ? getColor(day.count) : "transparent",
                    flexShrink: 0,
                    outline: day?.date === todayKey ? `2px solid ${THEME.colors.accent}` : "none",
                    outlineOffset: 1,
                    transition: "transform 0.1s",
                    cursor: day ? "default" : "default",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, color: THEME.colors.faint }}>少</span>
        {["#e8eaf0", "#bbf7d0", "#4ade80", "#16a34a"].map((c, i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 3, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: THEME.colors.faint }}>多</span>
      </div>

      {/* 激励文案 */}
      {streakDays >= 3 && (
        <div style={{
          marginTop: 14, padding: "10px 14px",
          borderRadius: THEME.radii.md,
          background: "linear-gradient(135deg, #fff7ed, #fef9c3)",
          border: "1px solid #fed7aa",
          fontSize: 13, color: "#9a3412", fontWeight: 600,
        }}>
          🔥 已连续学习 {streakDays} 天，势头正猛！千万别断！
        </div>
      )}
    </Card>
  );
}

// ── 能力画像 ──────────────────────────────────────────────
function AbilityProfile({ masteryStats, topicStats }) {
  const total = masteryStats.new + masteryStats.learning + masteryStats.mastered;
  const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;

  const levelMessages = [
    { min: 0, max: 0, msg: "还没开始，去收藏第一个词汇吧！", emoji: "🌱" },
    { min: 1, max: 10, msg: "刚刚起步，继续积累～", emoji: "🌿" },
    { min: 11, max: 30, msg: "小有积累，保持节奏！", emoji: "🌳" },
    { min: 31, max: 99, msg: "词汇量不少了，继续冲！", emoji: "🚀" },
    { min: 100, max: Infinity, msg: "词汇达人！你太厉害了！", emoji: "👑" },
  ];
  const lvl = levelMessages.find(l => total >= l.min && total <= l.max) || levelMessages[0];

  return (
    <Card>
      <SectionTitle emoji="📊" title="我的英语宇宙" sub="每一个收藏都是宇宙里的一颗星" />

      {total === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 40 }}>🌌</div>
          <div style={{ fontSize: 14, color: THEME.colors.muted, marginTop: 8 }}>你的宇宙还是空的</div>
          <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 4 }}>去视频页收藏词汇，点亮你的星空吧～</div>
        </div>
      ) : (
        <>
          {/* 等级徽章 */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 18,
            padding: "12px 16px", borderRadius: THEME.radii.md,
            background: "linear-gradient(135deg, #eef2ff, #f0fdf4)",
            border: "1px solid #c7d2fe",
          }}>
            <span style={{ fontSize: 28 }}>{lvl.emoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.colors.ink }}>{lvl.msg}</div>
              <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 2 }}>词汇库共 {total} 个</div>
            </div>
          </div>

          {/* 三段式进度条 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              height: 14, borderRadius: 999, overflow: "hidden",
              display: "flex", gap: 2, background: "#f1f5f9",
            }}>
              {masteryStats.mastered > 0 && (
                <div style={{
                  height: "100%", width: `${pct(masteryStats.mastered)}%`,
                  background: "linear-gradient(90deg, #22c55e, #16a34a)",
                  borderRadius: 999, transition: "width 0.8s ease",
                }} />
              )}
              {masteryStats.learning > 0 && (
                <div style={{
                  height: "100%", width: `${pct(masteryStats.learning)}%`,
                  background: "linear-gradient(90deg, #60a5fa, #3b82f6)",
                  borderRadius: 999, transition: "width 0.8s ease",
                }} />
              )}
              {masteryStats.new > 0 && (
                <div style={{
                  height: "100%", width: `${pct(masteryStats.new)}%`,
                  background: "linear-gradient(90deg, #c084fc, #a855f7)",
                  borderRadius: 999, transition: "width 0.8s ease",
                }} />
              )}
            </div>
          </div>

          {/* 三项数据 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              { label: "✅ 已掌握", count: masteryStats.mastered, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
              { label: "🔄 学习中", count: masteryStats.learning, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
              { label: "⭐ 新收藏", count: masteryStats.new, color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
            ].map((b, i) => (
              <div key={i} style={{
                textAlign: "center", padding: "12px 8px",
                borderRadius: THEME.radii.md,
                background: b.bg, border: `1px solid ${b.border}`,
              }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: b.color }}>{b.count}</div>
                <div style={{ fontSize: 11, color: b.color, marginTop: 3, fontWeight: 600 }}>{b.label}</div>
                <div style={{ fontSize: 10, color: THEME.colors.faint, marginTop: 1 }}>{pct(b.count)}%</div>
              </div>
            ))}
          </div>

          {/* 下一步提示 */}
          {masteryStats.new > 0 && (
            <div style={{
              padding: "10px 14px", borderRadius: THEME.radii.md,
              background: "#fffbeb", border: "1px solid #fde68a",
              fontSize: 12, color: "#92400e",
            }}>
              💡 还有 <strong>{masteryStats.new}</strong> 个词在等你练习，去收藏页开始今日词汇考试吧！
            </div>
          )}

          {/* 话题偏好 */}
          {topicStats.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: THEME.colors.muted, marginBottom: 10 }}>
                🏷️ 你的话题偏好
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {topicStats.map((t, i) => (
                  <span key={i} style={{
                    fontSize: 12, padding: "5px 12px",
                    borderRadius: THEME.radii.pill,
                    background: i === 0 ? "#eef2ff" : i === 1 ? "#f0fdf4" : THEME.colors.bg,
                    color: i === 0 ? THEME.colors.accent : i === 1 ? "#16a34a" : THEME.colors.muted,
                    border: `1px solid ${i === 0 ? "#c7d2fe" : i === 1 ? "#bbf7d0" : THEME.colors.border}`,
                    fontWeight: i < 2 ? 700 : 500,
                  }}>
                    {i === 0 ? "🥇 " : i === 1 ? "🥈 " : ""}{t.label}
                    <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>×{t.count}</span>
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
function MemoryCard({ item, onRefresh, totalVocab }) {
  const [flipped, setFlipped] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => { setFlipped(false); }, [item?.id]);

  function handlePlay() {
    if (!item) return;
    setPlaying(true);
    playWord(item.term);
    setTimeout(() => setPlaying(false), 1500);
  }

  const daysSince = item?.created_at
    ? Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000)
    : 0;

  if (!item) return (
    <Card>
      <SectionTitle emoji="💡" title="记忆碎片" />
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ fontSize: 36 }}>📭</div>
        <div style={{ fontSize: 13, color: THEME.colors.muted, marginTop: 8 }}>还没有收藏词汇</div>
        <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 4 }}>去视频页收藏一些词汇，这里会随机抽一个来复习～</div>
      </div>
    </Card>
  );

  const kindLabel = { words: "单词", phrases: "短语", idioms: "地道表达" }[item.kind] || "词汇";
  const masteryLabel = ["⭐ 新收藏", "🔄 学习中", "✅ 已掌握"][item.mastery_level ?? 0];

  return (
    <Card>
      <SectionTitle
        emoji="💡"
        title="记忆碎片"
        sub={`从你的 ${totalVocab} 个收藏中随机抽取，温故而知新`}
      />

      {/* 便签卡片 */}
      <div style={{
        background: "linear-gradient(145deg, #fefce8 0%, #fef3c7 60%, #fde68a 100%)",
        border: "1px solid #fcd34d",
        borderRadius: THEME.radii.md,
        padding: "20px 20px 16px",
        position: "relative",
        boxShadow: "0 4px 20px rgba(251,191,36,0.2), 0 1px 4px rgba(0,0,0,0.06)",
      }}>
        {/* 便签顶部装饰条 */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 4,
          borderRadius: "18px 18px 0 0",
          background: "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)",
        }} />

        {/* 顶部元信息 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{
            fontSize: 11, padding: "3px 8px", borderRadius: THEME.radii.pill,
            background: "rgba(245,158,11,0.15)", color: "#92400e", fontWeight: 700,
          }}>{kindLabel}</span>
          <span style={{ fontSize: 11, color: "#b45309", fontWeight: 600 }}>{masteryLabel}</span>
        </div>

        {/* 单词主体 */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: THEME.colors.ink, letterSpacing: "-0.5px" }}>
            {item.term}
          </div>
          {item.data?.ipa && (
            <div style={{ fontSize: 14, color: "#b45309", marginTop: 4, fontFamily: "monospace" }}>
              {item.data.ipa}
            </div>
          )}
        </div>

        {/* 按钮区 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 }}>
          <button
            onClick={handlePlay}
            style={{
              padding: "8px 18px", borderRadius: THEME.radii.pill,
              border: "1.5px solid #f59e0b",
              background: playing ? "#f59e0b" : "rgba(255,255,255,0.8)",
              cursor: "pointer", fontSize: 13,
              color: playing ? "#fff" : "#92400e",
              fontWeight: 700, transition: "all 0.2s",
            }}>
            {playing ? "🔊 播放中..." : "🔊 听发音"}
          </button>
          <button
            onClick={() => setFlipped(x => !x)}
            style={{
              padding: "8px 18px", borderRadius: THEME.radii.pill,
              border: "1.5px solid #f59e0b",
              background: flipped ? "#f59e0b" : "rgba(255,255,255,0.8)",
              cursor: "pointer", fontSize: 13,
              color: flipped ? "#fff" : "#92400e",
              fontWeight: 700, transition: "all 0.2s",
            }}>
            {flipped ? "收起 ↑" : "查看释义 ↓"}
          </button>
        </div>

        {/* 释义展开区 */}
        {flipped && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {item.data?.zh && (
              <div style={{
                padding: "10px 14px", borderRadius: THEME.radii.sm,
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#b45309", marginBottom: 4 }}>中文含义</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: THEME.colors.ink }}>{item.data.zh}</div>
              </div>
            )}
            {item.data?.example_en && (
              <div style={{
                padding: "10px 14px", borderRadius: THEME.radii.sm,
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#1d4ed8", marginBottom: 4 }}>例句</div>
                <div style={{ fontSize: 13, color: THEME.colors.ink, fontStyle: "italic", lineHeight: 1.6 }}>
                  "{item.data.example_en}"
                </div>
                {item.data?.example_zh && (
                  <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 4 }}>
                    {item.data.example_zh}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 底部时间标注 */}
        <div style={{ marginTop: 14, fontSize: 11, color: "#b45309", textAlign: "right" }}>
          📌 {daysSince === 0 ? "今天收藏的" : daysSince === 1 ? "昨天收藏的" : `${daysSince} 天前收藏的`}
        </div>
      </div>

      <button
        onClick={onRefresh}
        style={{
          marginTop: 12, width: "100%", padding: "10px 0",
          borderRadius: THEME.radii.md,
          border: `1px solid ${THEME.colors.border2}`,
          background: THEME.colors.bg, cursor: "pointer",
          fontSize: 13, color: THEME.colors.muted, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "all 0.2s",
        }}
        onMouseOver={e => e.currentTarget.style.background = "#eef2ff"}
        onMouseOut={e => e.currentTarget.style.background = THEME.colors.bg}
      >
        🎲 换一个试试
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
      const items = vocab?.items || [];
      if (items.length > 0) setMemoryItem(items[Math.floor(Math.random() * items.length)]);
      setJournalData({ ...journal, vocabItems: items });
    } catch (e) { console.error(e); }
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

  if (!loading && (!me || !me.logged_in)) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ maxWidth: 400, textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📒</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: THEME.colors.ink, marginBottom: 8 }}>我的英语手帐</div>
          <div style={{ fontSize: 14, color: THEME.colors.muted, marginBottom: 20 }}>登录后查看你的学习记录与成就</div>
          <a href="/login" style={{
            display: "inline-block", padding: "11px 32px",
            background: THEME.colors.ink, color: "#fff",
            borderRadius: THEME.radii.pill, textDecoration: "none",
            fontSize: 14, fontWeight: 700,
          }}>去登录</a>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg }}>
        <div style={{ height: 52, background: THEME.colors.surface, borderBottom: `1px solid ${THEME.colors.border}` }} />
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {[200, 280, 220, 240].map((h, i) => (
            <div key={i} style={{
              height: h, background: THEME.colors.surface,
              borderRadius: THEME.radii.lg, border: `1px solid ${THEME.colors.border}`,
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    );
  }

  const d = journalData || {};
  const vocabItems = d.vocabItems || [];

  const tasks = [
    {
      label: "沉浸 1 个场景视频",
      done: (d.today_views || 0) >= 1,
      doneText: `今天已看 ${d.today_views || 0} 个视频 ✨`,
      pendingText: "打开任意视频即可完成",
    },
    {
      label: "收藏 3 个地道表达",
      done: (d.today_vocab || 0) >= 3,
      doneText: `今天收藏了 ${d.today_vocab || 0} 个词汇 ✨`,
      pendingText: `进度 ${d.today_vocab || 0} / 3 个`,
    },
    {
      label: "词汇通关 1 次",
      done: (d.mastered_total || 0) >= 1,
      doneText: `已掌握 ${d.mastered_total || 0} 个词汇 ✨`,
      pendingText: "去收藏页完成一次词汇练习",
    },
  ];

  const masteryStats = {
    new: vocabItems.filter(v => (v.mastery_level ?? 0) === 0).length,
    learning: vocabItems.filter(v => (v.mastery_level ?? 0) === 1).length,
    mastered: vocabItems.filter(v => (v.mastery_level ?? 0) === 2).length,
  };

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

  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg }}>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>

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
          <span style={{ fontSize: 15, fontWeight: 900, color: THEME.colors.ink }}>我的英语手帐</span>
        </div>
        <span style={{ fontSize: 11, color: THEME.colors.faint }}>📅 {formatDate()}</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px 60px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* 欢迎横幅 */}
        <div style={{
          padding: "18px 20px",
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%)",
          borderRadius: THEME.radii.lg,
          color: "#fff",
          boxShadow: "0 8px 32px rgba(79,70,229,0.25)",
        }}>
          <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>
            👋 {me?.email?.split("@")[0] || "同学"}，今天也要加油哦！
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 14 }}>
            累计观看 {d.total_views || 0} 个视频 · 收藏 {vocabItems.length} 个词汇 · 今日已完成 {doneCount}/3 目标
          </div>
          {/* 总进度条 */}
          <div style={{ height: 6, background: "rgba(255,255,255,0.25)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 999,
              background: "#fff",
              width: `${Math.round(doneCount / 3 * 100)}%`,
              transition: "width 0.6s ease",
            }} />
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 6 }}>
            今日进度 {Math.round(doneCount / 3 * 100)}%
          </div>
        </div>

        <TodayTasks tasks={tasks} />
        <Heatmap heatmapData={d.heatmap || {}} streakDays={d.streak_days || 0} totalVideos={d.total_views || 0} />
        <AbilityProfile masteryStats={masteryStats} topicStats={topicStats} />
        <MemoryCard item={memoryItem} onRefresh={refreshMemory} totalVocab={vocabItems.length} />

      </div>
    </div>
  );
}
