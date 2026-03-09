"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · 周${days[now.getDay()]}`;
}

function useIsMobile(bp = 960) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function update() {
      setIsMobile(window.innerWidth <= bp);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [bp]);
  return isMobile;
}

function Card({ children, style = {} }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 24,
        border: `1px solid ${THEME.colors.border}`,
        background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.86) 100%)",
        boxShadow: "0 18px 60px rgba(15,23,42,0.08), 0 2px 10px rgba(15,23,42,0.04)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -100,
          right: -110,
          width: 250,
          height: 250,
          borderRadius: 999,
          background:
            "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.18), rgba(236,72,153,0.10), rgba(6,182,212,0.08), transparent 72%)",
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}

function SectionTitle({ emoji, title, sub, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(236,72,153,0.10), rgba(6,182,212,0.08))",
            border: "1px solid rgba(99,102,241,0.14)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18 }}>{emoji}</span>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 1000, color: THEME.colors.ink }}>{title}</div>
          {sub ? <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 4 }}>{sub}</div> : null}
        </div>
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

// ── 修复1：手机版 MiniStat 不再嵌套卡片，直接平铺 ──
function MiniStat({ label, value, hint, accent, isMobile }) {
  // 手机版：简洁平铺行，无嵌套卡片
  if (isMobile) {
    return (
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 18,
          border: `1px solid ${accent.border}`,
          background: accent.bg,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 1000, color: accent.color, lineHeight: 1, flexShrink: 0 }}>
          {value}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, color: accent.color }}>{label}</div>
          <div style={{ fontSize: 11, color: THEME.colors.muted, marginTop: 3, lineHeight: 1.4 }}>{hint}</div>
        </div>
      </div>
    );
  }
  // 电脑版：保持原样
  return (
    <div
      style={{
        minHeight: 118,
        padding: "16px 16px 14px",
        borderRadius: 22,
        border: `1px solid ${accent.border}`,
        background: accent.bg,
        boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 42, fontWeight: 1000, color: accent.color, lineHeight: 1 }}>{value}</div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: accent.color,
            padding: "6px 9px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.78)",
            border: `1px solid ${accent.border}`,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, color: THEME.colors.muted, fontWeight: 900, lineHeight: 1.5 }}>{hint}</div>
      </div>
    </div>
  );
}

function OverviewPanel({ streakDays, totalViews, activeDays, vocabCount, isMobile }) {
  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle emoji="📊" title="学习总览" sub="每天积累，看到自己成长，距离上一个自己只差一点点" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? 10 : 14 }}>
        <MiniStat
          label="连续学习"
          value={streakDays || 0}
          hint="天不间断中"
          isMobile={isMobile}
          accent={{
            bg: "linear-gradient(135deg, rgba(251,146,60,0.16), rgba(251,146,60,0.05))",
            border: "rgba(251,146,60,0.22)",
            color: "#c2410c",
          }}
        />
        <MiniStat
          label="累计视频"
          value={totalViews || 0}
          hint="场景沉浸体验"
          isMobile={isMobile}
          accent={{
            bg: "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(99,102,241,0.05))",
            border: "rgba(99,102,241,0.22)",
            color: "#3730a3",
          }}
        />
        <MiniStat
          label="活跃天数"
          value={activeDays || 0}
          hint="每天一点积累"
          isMobile={isMobile}
          accent={{
            bg: "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(16,185,129,0.05))",
            border: "rgba(16,185,129,0.22)",
            color: "#065f46",
          }}
        />
        <MiniStat
          label="收藏词汇"
          value={vocabCount || 0}
          hint="你积累下来的表达库"
          isMobile={isMobile}
          accent={{
            bg: "linear-gradient(135deg, rgba(236,72,153,0.14), rgba(236,72,153,0.05))",
            border: "rgba(236,72,153,0.20)",
            color: "#be185d",
          }}
        />
      </div>
    </Card>
  );
}

function TaskRow({ title, desc, done, buttonText, href, neutral, isMobile }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "30px minmax(0,1fr) auto" : "30px minmax(0,1fr) auto auto",
        alignItems: "center",
        gap: 12,
        padding: "14px 14px",
        borderRadius: 18,
        border: `1px solid ${
          neutral
            ? "rgba(99,102,241,0.16)"
            : done
            ? "rgba(16,185,129,0.24)"
            : "rgba(15,23,42,0.08)"
        }`,
        background: neutral
          ? "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.06))"
          : done
          ? "rgba(16,185,129,0.08)"
          : "rgba(15,23,42,0.03)",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          background: neutral
            ? "linear-gradient(135deg, rgba(79,70,229,0.92), rgba(6,182,212,0.88))"
            : done
            ? "linear-gradient(135deg, rgba(16,185,129,1), rgba(5,150,105,1))"
            : "rgba(255,255,255,0.9)",
          color: neutral || done ? "#fff" : THEME.colors.faint,
          border: `1px solid ${
            neutral
              ? "rgba(79,70,229,0.26)"
              : done
              ? "rgba(16,185,129,0.26)"
              : "rgba(15,23,42,0.10)"
          }`,
          fontWeight: 1000,
          flexShrink: 0,
          boxShadow: neutral || done ? "0 12px 28px rgba(15,23,42,0.10)" : "none",
        }}
      >
        {neutral ? "→" : done ? "✓" : "·"}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 950, color: THEME.colors.ink }}>{title}</div>
        <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
      </div>

      {!isMobile && !neutral ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: done ? "#166534" : THEME.colors.accent,
            padding: "6px 10px",
            borderRadius: 999,
            background: done ? "rgba(16,185,129,0.12)" : "rgba(99,102,241,0.10)",
            border: `1px solid ${done ? "rgba(16,185,129,0.18)" : "rgba(99,102,241,0.16)"}`,
            whiteSpace: "nowrap",
          }}
        >
          {done ? "已完成" : "进行中"}
        </span>
      ) : null}

      <a
        href={href}
        style={{
          textDecoration: "none",
          fontSize: 12,
          fontWeight: 950,
          color: neutral ? "#fff" : THEME.colors.ink,
          padding: "10px 12px",
          borderRadius: 999,
          background: neutral
            ? "linear-gradient(135deg, #0f172a 0%, #4f46e5 100%)"
            : "rgba(255,255,255,0.86)",
          border: neutral ? "none" : "1px solid rgba(15,23,42,0.10)",
          whiteSpace: "nowrap",
          boxShadow: neutral ? "0 14px 30px rgba(79,70,229,0.22)" : "none",
        }}
      >
        {buttonText}
      </a>
    </div>
  );
}

function TodayPlan({ d, isMobile }) {
  const autoTasks = [
    {
      title: "今天看过 1 个场景视频",
      done: (d.today_views || 0) >= 1,
      desc: (d.today_views || 0) >= 1 ? `今天已看 ${d.today_views || 0} 个场景` : "选个感兴趣的话题，沉浸看一遍就行",
      href: "/",
      buttonText: "去看场景",
    },
    {
      title: "今天收藏 3 个词汇/表达",
      done: (d.today_vocab || 0) >= 3,
      desc: (d.today_vocab || 0) >= 3 ? `今天已收藏 ${d.today_vocab || 0} 个词汇` : `还差 ${d.today_vocab || 0} / 3`,
      href: "/bookmarks",
      buttonText: "去词汇本",
    },
  ];
  const doneCount = autoTasks.filter((x) => x.done).length;
  const pct = Math.round((doneCount / autoTasks.length) * 100);

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle
        emoji="🎯"
        title="今天的学习任务"
        sub="每天两个自动任务，系统自动检测完成状态，不需要手动标记"
        right={
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: THEME.colors.accent,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(99,102,241,0.10)",
              border: "1px solid rgba(99,102,241,0.16)",
              whiteSpace: "nowrap",
            }}
          >
            已完成 {doneCount}/2
          </div>
        }
      />
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "rgba(15,23,42,0.06)",
            overflow: "hidden",
            border: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, rgba(16,185,129,0.96), rgba(79,70,229,0.96), rgba(236,72,153,0.90))",
              transition: "width 500ms ease",
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {autoTasks.map((task, idx) => (
          <TaskRow key={idx} {...task} isMobile={isMobile} />
        ))}
        <TaskRow
          title="去练习大厅做一轮词汇闯关"
          desc="一次游戏不用很长，任意选个模式来一轮，在练习中加深记忆、让词汇活起来。"
          done={false}
          neutral
          href="/practice"
          buttonText="去闯关"
          isMobile={isMobile}
        />
      </div>
      {!isMobile && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: 18,
            background: "linear-gradient(135deg, rgba(255,251,235,0.95), rgba(254,242,242,0.70))",
            border: "1px solid rgba(245,158,11,0.18)",
            fontSize: 12,
            fontWeight: 800,
            color: "#9a3412",
          }}
        >
          现在这版手帐页只保留真实有效的学习数据：看视频、收藏词汇、活跃天数、学习偏好和游戏大厅入口，不再沿用旧考试系统的掌握判定。
        </div>
      )}
    </Card>
  );
}

function MonthCalendar({ monthDate, heatmapData, isMobile }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const todayKey = new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      day: d,
      key,
      count: heatmapData[key] || 0,
      isToday: key === todayKey,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const flatCells = cells;
  const monthActiveDays = flatCells.filter((x) => x && x.count > 0).length;
  const monthTotalViews = flatCells.filter((x) => x).reduce((sum, x) => sum + (x?.count || 0), 0);

  function getLevelStyle(count) {
    if (count <= 0) {
      return {
        bg: "rgba(248,250,252,0.9)",
        text: "#94a3b8",
        badgeBg: "rgba(226,232,240,0.9)",
        badgeText: "#94a3b8",
      };
    }
    if (count === 1) {
      return {
        bg: "rgba(220,252,231,0.95)",
        text: "#166534",
        badgeBg: "rgba(34,197,94,0.14)",
        badgeText: "#166534",
      };
    }
    if (count === 2) {
      return {
        bg: "rgba(187,247,208,0.98)",
        text: "#166534",
        badgeBg: "rgba(34,197,94,0.22)",
        badgeText: "#166534",
      };
    }
    return {
      bg: "rgba(34,197,94,0.95)",
      text: "#ffffff",
      badgeBg: "rgba(255,255,255,0.22)",
      badgeText: "#ffffff",
    };
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0,1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ padding: "12px 12px", borderRadius: 18, background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.08)" }}>
          <div style={{ fontSize: 22, fontWeight: 1000, color: THEME.colors.ink }}>{monthActiveDays}</div>
          <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 900, marginTop: 6 }}>本月活跃天数</div>
        </div>
        <div style={{ padding: "12px 12px", borderRadius: 18, background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.08)" }}>
          <div style={{ fontSize: 22, fontWeight: 1000, color: THEME.colors.ink }}>{monthTotalViews}</div>
          <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 900, marginTop: 6 }}>本月学习次数</div>
        </div>
        <div style={{ padding: "12px 12px", borderRadius: 18, background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.08)" }}>
          <div style={{ fontSize: 22, fontWeight: 1000, color: THEME.colors.ink }}>{totalDays}</div>
          <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 900, marginTop: 6 }}>本月总天数</div>
        </div>
        <div style={{ padding: "12px 12px", borderRadius: 18, background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.08)" }}>
          <div style={{ fontSize: 22, fontWeight: 1000, color: THEME.colors.ink }}>
            {monthActiveDays > 0 ? Math.round((monthActiveDays / totalDays) * 100) : 0}%
          </div>
          <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 900, marginTop: 6 }}>本月出勤率</div>
        </div>
      </div>

      <div
        style={{
          borderRadius: 22,
          border: "1px solid rgba(15,23,42,0.08)",
          background: "rgba(255,255,255,0.88)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "1px solid rgba(15,23,42,0.08)",
            background: "linear-gradient(180deg, rgba(248,250,252,1), rgba(241,245,249,0.92))",
          }}
        >
          {["日", "一", "二", "三", "四", "五", "六"].map((w) => (
            <div
              key={w}
              style={{
                padding: isMobile ? "9px 0" : "11px 0",
                textAlign: "center",
                fontSize: 12,
                fontWeight: 1000,
                color: THEME.colors.faint,
                letterSpacing: "0.5px",
              }}
            >
              {w}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {flatCells.map((cell, idx) => {
            const isLastCol = idx % 7 === 6;
            const isLastRow = idx >= flatCells.length - 7;

            if (!cell) {
              return (
                <div
                  key={idx}
                  style={{
                    minHeight: isMobile ? 54 : 76,
                    borderRight: isLastCol ? "none" : "1px solid rgba(15,23,42,0.05)",
                    borderBottom: isLastRow ? "none" : "1px solid rgba(15,23,42,0.05)",
                    background: "rgba(248,250,252,0.55)",
                  }}
                />
              );
            }

            const style = getLevelStyle(cell.count);

            return (
              <div
                key={idx}
                title={`${cell.key}：${cell.count > 0 ? `学习 ${cell.count} 次` : "未学习"}`}
                style={{
                  minHeight: isMobile ? 54 : 76,
                  padding: isMobile ? "6px 5px" : "9px 8px",
                  borderRight: isLastCol ? "none" : "1px solid rgba(15,23,42,0.05)",
                  borderBottom: isLastRow ? "none" : "1px solid rgba(15,23,42,0.05)",
                  background: cell.isToday
                    ? "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(255,255,255,0.96))"
                    : style.bg,
                  boxShadow: cell.isToday ? "inset 0 0 0 2px rgba(79,70,229,0.78)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 1000,
                    color: cell.isToday ? "#4338ca" : style.text,
                    lineHeight: 1,
                  }}
                >
                  {cell.day}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                  {cell.count > 0 ? (
                    <span
                      style={{
                        minWidth: isMobile ? 20 : 24,
                        height: isMobile ? 18 : 22,
                        padding: isMobile ? "0 5px" : "0 7px",
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: style.badgeBg,
                        color: style.badgeText,
                        fontSize: isMobile ? 10 : 11,
                        fontWeight: 1000,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cell.count}
                    </span>
                  ) : (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: "rgba(148,163,184,0.55)",
                        display: "inline-block",
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 12, color: THEME.colors.faint, fontWeight: 800 }}>
          颜色深浅代表当天学习次数，今天有记录就算打卡
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: THEME.colors.faint, fontWeight: 800 }}>图例：</span>
          <span style={{ fontSize: 11, fontWeight: 900, color: "#64748b", padding: "5px 8px", borderRadius: 999, background: "rgba(15,23,42,0.05)", border: "1px solid rgba(15,23,42,0.08)" }}>空心=未学习</span>
          <span style={{ fontSize: 11, fontWeight: 900, color: "#166534", padding: "5px 8px", borderRadius: 999, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.16)" }}>浅绿=学习中</span>
          <span style={{ fontSize: 11, fontWeight: 900, color: "#ffffff", padding: "5px 8px", borderRadius: 999, background: "rgba(22,163,74,0.92)" }}>深绿=活跃打卡</span>
        </div>
      </div>
    </div>
  );
}

function Heatmap({ heatmapData, streakDays, totalViews, isMobile }) {
  const monthOptions = useMemo(() => {
    const now = new Date();
    const arr = [];
    for (let i = 0; i < 4; i++) {
      arr.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
    return arr;
  }, []);

  const [monthIdx, setMonthIdx] = useState(0);
  const currentMonth = monthOptions[monthIdx];

  function prevMonth() {
    setMonthIdx((v) => Math.min(v + 1, monthOptions.length - 1));
  }

  function nextMonth() {
    setMonthIdx((v) => Math.max(v - 1, 0));
  }

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle
        emoji="🗓️"
        title="学习日历"
        sub="每天记录，一眼看出，哪些天没偷懒、哪些天需要追"
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "6px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.04)",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <button
            onClick={prevMonth}
            disabled={monthIdx >= monthOptions.length - 1}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "none",
              cursor: monthIdx >= monthOptions.length - 1 ? "not-allowed" : "pointer",
              background: monthIdx >= monthOptions.length - 1 ? "rgba(148,163,184,0.20)" : "rgba(255,255,255,0.95)",
              color: THEME.colors.ink,
              fontSize: 16,
              fontWeight: 1000,
            }}
          >
            ‹
          </button>

          <div
            style={{
              minWidth: isMobile ? 120 : 160,
              textAlign: "center",
              fontSize: 14,
              fontWeight: 1000,
              color: THEME.colors.ink,
            }}
          >
            {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
          </div>

          <button
            onClick={nextMonth}
            disabled={monthIdx <= 0}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "none",
              cursor: monthIdx <= 0 ? "not-allowed" : "pointer",
              background: monthIdx <= 0 ? "rgba(148,163,184,0.20)" : "rgba(255,255,255,0.95)",
              color: THEME.colors.ink,
              fontSize: 16,
              fontWeight: 1000,
            }}
          >
            ›
          </button>
        </div>

        <div style={{ fontSize: 12, color: THEME.colors.faint, fontWeight: 800 }}>
          可查看最近 {monthOptions.length} 个月
        </div>
      </div>

      <MonthCalendar monthDate={currentMonth} heatmapData={heatmapData} isMobile={isMobile} />

      {streakDays >= 3 ? (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: 18,
            background: "linear-gradient(135deg, rgba(255,247,237,0.95), rgba(254,249,195,0.95))",
            border: "1px solid rgba(251,146,60,0.24)",
            fontSize: 12,
            color: "#9a3412",
            fontWeight: 900,
          }}
        >
          你已经连续学习 {streakDays} 天了。现在每天打开看一眼，已经变成习惯了、继续保持！
        </div>
      ) : null}
    </Card>
  );
}

function AnalysisCard({ title, lines, accent }) {
  return (
    <div
      style={{
        padding: "16px 16px 14px",
        borderRadius: 20,
        border: `1px solid ${accent.border}`,
        background: accent.bg,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 1000, color: accent.title }}>{title}</div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {lines.map((line, idx) => (
          <div key={idx} style={{ fontSize: 12, color: THEME.colors.muted, lineHeight: 1.6 }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 修复2：游戏分数从 localStorage 正确读取 ──
function getGameSummaryFromLocalStorage() {
  try {
    const raw = localStorage.getItem("naila_game_scores");
    if (!raw) return { playedGameCount: 0, totalGameScore: 0 };
    const scores = JSON.parse(raw);
    // scores 结构: { gameName: { best: number, ... }, ... }
    let totalGameScore = 0;
    let playedGameCount = 0;
    Object.values(scores).forEach((entry) => {
      if (entry && typeof entry.best === "number" && entry.best > 0) {
        playedGameCount++;
        totalGameScore += entry.best;
      }
    });
    return { playedGameCount, totalGameScore };
  } catch {
    return { playedGameCount: 0, totalGameScore: 0 };
  }
}

function LearningAnalysis({ d, vocabCount, topicStats, isMobile }) {
  const activeDays = Object.keys(d.heatmap || {}).length;

  const topTopic = topicStats[0]?.label || "还没有偏好方向";
  const secondTopic = topicStats[1]?.label || "继续学习后会分析";

  // 从 localStorage 读取游戏分数
  const [gameSummary, setGameSummary] = useState({ playedGameCount: 0, totalGameScore: 0 });
  useEffect(() => {
    setGameSummary(getGameSummaryFromLocalStorage());
  }, []);

  const { playedGameCount, totalGameScore } = gameSummary;

  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const monthActiveDays = Object.keys(d.heatmap || {}).filter((k) => k.startsWith(ym)).length;

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle
        emoji="🧭"
        title="学习综合分析"
        sub="不只是数字追踪，看到自己的学习轨迹、偏好和积累的变化趋势"
      />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr", gap: 10 }}>
        <AnalysisCard
          title="词汇积累"
          accent={{
            bg: "linear-gradient(135deg, rgba(236,72,153,0.10), rgba(236,72,153,0.04))",
            border: "rgba(236,72,153,0.16)",
            title: "#be185d",
          }}
          lines={[
            `累计收藏词汇：${vocabCount} 个`,
            `今日新增收藏：${d.today_vocab || 0} 个`,
            "你已经不是单纯在看视频，而是在沉淀自己的表达库。",
          ]}
        />

        {/* 修复2：练习大厅痕迹，正确从 localStorage 读取 */}
        <AnalysisCard
          title="练习大厅痕迹"
          accent={{
            bg: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(99,102,241,0.04))",
            border: "rgba(99,102,241,0.16)",
            title: "#3730a3",
          }}
          lines={[
            `已留下分数记录的游戏：${playedGameCount} 个`,
            `当前本地总分：${totalGameScore}`,
            playedGameCount === 0
              ? "这里暂未检测到游戏分数记录，去练习大厅做一轮就会有痕迹。"
              : `你在 ${playedGameCount} 种游戏中留下了最高分记录，总积分 ${totalGameScore} 分。`,
          ]}
        />

        <AnalysisCard
          title="学习偏好"
          accent={{
            bg: "linear-gradient(135deg, rgba(6,182,212,0.10), rgba(6,182,212,0.04))",
            border: "rgba(6,182,212,0.16)",
            title: "#0e7490",
          }}
          lines={[
            `最近最常见的话题：${topTopic}`,
            `第二偏好方向：${secondTopic}`,
            `目前累计活跃 ${activeDays} 天，偏好会随着继续学习逐渐清晰。`,
          ]}
        />
      </div>
    </Card>
  );
}

// ── 修复3：海报生成器完全重写，匹配现在的手帐内容 ──
function PosterGenerator({ d, streakDays, totalViews, vocabCount, topicStats, isMobile }) {
  const canvasRef = useRef(null);
  const [theme, setTheme] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const themes = [
    {
      name: "深夜极光",
      bg: ["#0f172a", "#1e1b4b", "#312e81"],
      accent: "#818cf8",
      sub: "#a5b4fc",
      text: "#f8fafc",
      muted: "#94a3b8",
      card: "rgba(255,255,255,0.06)",
      cardBorder: "rgba(255,255,255,0.12)",
      tagBg: "rgba(129,140,248,0.20)",
      tagText: "#a5b4fc",
    },
    {
      name: "日出橙金",
      bg: ["#fff7ed", "#fef3c7", "#fde68a"],
      accent: "#d97706",
      sub: "#b45309",
      text: "#1c1917",
      muted: "#78716c",
      card: "rgba(255,255,255,0.70)",
      cardBorder: "rgba(217,119,6,0.20)",
      tagBg: "rgba(217,119,6,0.12)",
      tagText: "#b45309",
    },
    {
      name: "深海青碧",
      bg: ["#0c4a6e", "#164e63", "#0f766e"],
      accent: "#22d3ee",
      sub: "#67e8f9",
      text: "#f0fdfa",
      muted: "#99f6e4",
      card: "rgba(255,255,255,0.07)",
      cardBorder: "rgba(34,211,238,0.20)",
      tagBg: "rgba(34,211,238,0.15)",
      tagText: "#67e8f9",
    },
  ];

  const t = themes[theme % themes.length];

  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const monthActiveDays = Object.keys(d.heatmap || {}).filter((k) => k.startsWith(ym)).length;
  const topTopic = topicStats[0]?.label || "多元话题";

  // 从 localStorage 读取游戏分数
  const [gameSummary, setGameSummary] = useState({ playedGameCount: 0, totalGameScore: 0 });
  useEffect(() => {
    setGameSummary(getGameSummaryFromLocalStorage());
  }, []);

  function drawPoster() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 750;
    const H = 1200;
    canvas.width = W;
    canvas.height = H;

    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, W, H);
    t.bg.forEach((color, i) => grad.addColorStop(i / (t.bg.length - 1), color));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 装饰光晕
    const radial = ctx.createRadialGradient(W * 0.8, H * 0.1, 0, W * 0.8, H * 0.1, 300);
    radial.addColorStop(0, t.accent + "33");
    radial.addColorStop(1, "transparent");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);

    // 顶部 logo 区
    ctx.fillStyle = t.accent + "22";
    roundRect(ctx, 40, 40, 120, 44, 22);
    ctx.fill();
    ctx.fillStyle = t.accent;
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("nailaobao.top", 100, 68);

    // 日期
    ctx.fillStyle = t.muted;
    ctx.font = "14px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(formatDate(), W - 40, 65);

    // 标题
    ctx.fillStyle = t.text;
    ctx.font = `bold 42px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("我的学习手帐", 40, 140);

    ctx.fillStyle = t.sub;
    ctx.font = "18px sans-serif";
    ctx.fillText("英语沉浸学习 · 今日打卡", 40, 172);

    // 分隔线
    ctx.strokeStyle = t.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 192);
    ctx.lineTo(W - 40, 192);
    ctx.stroke();

    // 连续学习 大数字
    const streakY = 230;
    ctx.fillStyle = t.card;
    roundRect(ctx, 40, streakY, W - 80, 120, 20);
    ctx.fill();
    ctx.strokeStyle = t.cardBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, 40, streakY, W - 80, 120, 20);
    ctx.stroke();

    ctx.fillStyle = t.accent;
    ctx.font = `bold 70px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(String(streakDays || 0), 60, streakY + 80);

    ctx.fillStyle = t.text;
    ctx.font = `bold 18px sans-serif`;
    ctx.fillText("天", 60 + ctx.measureText(String(streakDays || 0)).width + 8, streakY + 75);

    ctx.fillStyle = t.muted;
    ctx.font = "15px sans-serif";
    ctx.fillText("连续学习中 · 不间断打卡", 60 + ctx.measureText(String(streakDays || 0)).width + 50, streakY + 60);
    ctx.fillStyle = t.sub;
    ctx.font = "13px sans-serif";
    ctx.fillText("当前状态", 60 + ctx.measureText(String(streakDays || 0)).width + 50, streakY + 82);

    // 四格统计
    const statsY = streakY + 140;
    const stats = [
      { label: "累计视频", value: totalViews || 0, unit: "场" },
      { label: "本月活跃", value: monthActiveDays, unit: "天" },
      { label: "收藏词汇", value: vocabCount || 0, unit: "个" },
      { label: "游戏积分", value: gameSummary.totalGameScore || 0, unit: "分" },
    ];
    const colW = (W - 80 - 30) / 4;
    stats.forEach((s, i) => {
      const x = 40 + i * (colW + 10);
      ctx.fillStyle = t.card;
      roundRect(ctx, x, statsY, colW, 100, 16);
      ctx.fill();
      ctx.strokeStyle = t.cardBorder;
      roundRect(ctx, x, statsY, colW, 100, 16);
      ctx.stroke();

      ctx.fillStyle = t.accent;
      ctx.font = `bold 28px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(String(s.value), x + colW / 2, statsY + 48);

      ctx.fillStyle = t.muted;
      ctx.font = "11px sans-serif";
      ctx.fillText(s.unit, x + colW / 2, statsY + 66);

      ctx.fillStyle = t.sub;
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(s.label, x + colW / 2, statsY + 88);
    });

    // 今日任务
    const taskY = statsY + 120;
    ctx.fillStyle = t.text;
    ctx.font = `bold 20px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("今日任务", 40, taskY);

    const tasks = [
      { label: "沉浸 1 个场景视频", done: (d.today_views || 0) >= 1 },
      { label: "收藏 3 个地道表达", done: (d.today_vocab || 0) >= 3 },
    ];
    tasks.forEach((task, i) => {
      const ty = taskY + 20 + i * 56;
      ctx.fillStyle = task.done ? "rgba(16,185,129,0.15)" : t.card;
      roundRect(ctx, 40, ty, W - 80, 46, 14);
      ctx.fill();
      ctx.strokeStyle = task.done ? "rgba(16,185,129,0.30)" : t.cardBorder;
      roundRect(ctx, 40, ty, W - 80, 46, 14);
      ctx.stroke();

      // 勾/点
      ctx.fillStyle = task.done ? "#10b981" : t.muted;
      ctx.beginPath();
      ctx.arc(68, ty + 23, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = `bold 13px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(task.done ? "✓" : "·", 68, ty + 28);

      ctx.fillStyle = t.text;
      ctx.font = `${task.done ? "bold " : ""}15px sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(task.label, 90, ty + 27);

      if (task.done) {
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("完成 ✓", W - 56, ty + 27);
      }
    });

    // 学习偏好 tag
    const tagY = taskY + 20 + tasks.length * 56 + 20;
    ctx.fillStyle = t.text;
    ctx.font = `bold 20px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("最爱话题", 40, tagY);

    ctx.fillStyle = t.tagBg;
    const tagText = `# ${topTopic}`;
    const tagW = ctx.measureText(tagText).width + 32;
    roundRect(ctx, 40, tagY + 12, tagW, 36, 999);
    ctx.fill();
    ctx.fillStyle = t.tagText;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(tagText, 56, tagY + 36);

    // 热力图迷你版（近30天）
    const heatY = tagY + 72;
    ctx.fillStyle = t.text;
    ctx.font = `bold 20px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("最近打卡", 40, heatY);

    const cellSize = 22;
    const cellGap = 4;
    const cols = 30;
    const heatStartX = 40;
    const heatStartY = heatY + 14;

    for (let i = cols - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const count = (d.heatmap || {})[key] || 0;
      const col = cols - 1 - i;
      const x = heatStartX + col * (cellSize + cellGap);

      let color;
      if (count === 0) color = t.card;
      else if (count === 1) color = "rgba(34,197,94,0.45)";
      else if (count === 2) color = "rgba(34,197,94,0.72)";
      else color = "rgba(34,197,94,0.95)";

      ctx.fillStyle = color;
      roundRect(ctx, x, heatStartY, cellSize, cellSize, 5);
      ctx.fill();
      ctx.strokeStyle = t.cardBorder;
      roundRect(ctx, x, heatStartY, cellSize, cellSize, 5);
      ctx.stroke();
    }

    // 底部签名
    const footerY = H - 60;
    ctx.strokeStyle = t.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, footerY - 16);
    ctx.lineTo(W - 40, footerY - 16);
    ctx.stroke();

    ctx.fillStyle = t.muted;
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("每天进步一点点 · 油管英语场景库", 40, footerY + 10);

    ctx.fillStyle = t.accent;
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("nailaobao.top", W - 40, footerY + 10);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  useEffect(() => {
    drawPoster();
  }, [theme, d, streakDays, totalViews, vocabCount, topicStats, gameSummary]);

  function handleDownload() {
    setDownloading(true);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `学习手帐_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setDownloading(false);
    }, 100);
  }

  function handleNextTheme() {
    setTheme((v) => (v + 1) % themes.length);
  }

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle
        emoji="🖼️"
        title="打卡海报生成器"
        sub="把今天的学习数据生成一张海报，分享给朋友或者留作纪念"
      />

      {/* 主题选择 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {themes.map((th, i) => (
          <button
            key={i}
            onClick={() => setTheme(i)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: theme === i ? `2px solid ${THEME.colors.accent}` : "1px solid rgba(15,23,42,0.12)",
              background: theme === i ? "rgba(99,102,241,0.10)" : "rgba(255,255,255,0.80)",
              color: theme === i ? THEME.colors.accent : THEME.colors.ink,
              fontSize: 12,
              fontWeight: theme === i ? 900 : 700,
              cursor: "pointer",
            }}
          >
            {th.name}
          </button>
        ))}
      </div>

      {/* Canvas 海报预览 */}
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(15,23,42,0.10)",
          boxShadow: "0 8px 32px rgba(15,23,42,0.10)",
          marginBottom: 14,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            display: "block",
          }}
        />
      </div>

      {/* 操作按钮 */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            flex: 1,
            padding: "12px 20px",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg, #0f172a 0%, #4f46e5 100%)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 900,
            cursor: downloading ? "not-allowed" : "pointer",
            boxShadow: "0 14px 30px rgba(79,70,229,0.22)",
            opacity: downloading ? 0.7 : 1,
          }}
        >
          {downloading ? "生成中…" : "⬇ 下载海报 PNG"}
        </button>
        <button
          onClick={handleNextTheme}
          style={{
            padding: "12px 18px",
            borderRadius: 999,
            border: "1px solid rgba(15,23,42,0.10)",
            background: "rgba(255,255,255,0.86)",
            color: THEME.colors.ink,
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          换个风格
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: THEME.colors.faint, textAlign: "center" }}>
        海报在本地生成，不上传任何数据 · 手机可截图保存
      </div>
    </Card>
  );
}

// ── 主组件 ──
export default function JournalClient({ initialData, initialVocabCount, initialTopicStats, email }) {
  const isMobile = useIsMobile(960);
  const [d, setD] = useState(initialData || {});
  const [vocabCount, setVocabCount] = useState(initialVocabCount || 0);
  const [topicStats, setTopicStats] = useState(initialTopicStats || []);
  const [loading, setLoading] = useState(!initialData);

  const streakDays = d.streak_days || 0;
  const totalViews = d.total_views || 0;
  const activeDays = Object.keys(d.heatmap || {}).length;

  useEffect(() => {
    if (initialData) return;
    async function load() {
      try {
        const res = await authFetch(remote("/api/journal_stats"));
        if (res.ok) {
          const json = await res.json();
          setD(json.stats || {});
          setVocabCount(json.vocab_count || 0);
          setTopicStats(json.topic_stats || []);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [initialData]);

  const displayName = email ? email.split("@")[0] : "同学";

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 14, color: THEME.colors.faint }}>加载中…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #f8faff 0%, #f0f4ff 40%, #faf5ff 100%)",
        padding: isMobile ? "16px 14px 40px" : "32px 0 60px",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: isMobile ? 0 : "0 20px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* 顶部欢迎语 */}
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 28 }}>👋</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 1000, color: THEME.colors.ink }}>
                {displayName}，今天也来留下一点学习痕迹
              </div>
              <div style={{ fontSize: 13, color: THEME.colors.faint, marginTop: 6, lineHeight: 1.6 }}>
                现在这版手帐页只保留真实有效的学习数据：看视频、收藏词汇、活跃天数、学习偏好和游戏大厅入口，不再沿用旧考试系统的掌握判定。
              </div>
            </div>
          </div>

          {/* 手机版：连续天数直接内嵌，无嵌套卡片 */}
          {isMobile && (
            <div
              style={{
                marginTop: 16,
                padding: "16px 0 4px",
                borderTop: "1px solid rgba(15,23,42,0.07)",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: THEME.colors.faint, fontWeight: 800, marginBottom: 4 }}>当前状态</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 48, fontWeight: 1000, color: "#4f46e5", lineHeight: 1 }}>{streakDays}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#4f46e5" }}>天</span>
                </div>
                <div style={{ fontSize: 12, color: THEME.colors.faint, marginTop: 4 }}>连续学习中</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: THEME.colors.faint }}>累计视频</span>
                  <span style={{ fontWeight: 900, color: THEME.colors.ink }}>{totalViews} 场</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: THEME.colors.faint }}>活跃天数</span>
                  <span style={{ fontWeight: 900, color: THEME.colors.ink }}>{activeDays} 天</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: THEME.colors.faint }}>收藏词汇</span>
                  <span style={{ fontWeight: 900, color: THEME.colors.ink }}>{vocabCount} 个</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 电脑版：完整 OverviewPanel */}
        {!isMobile && (
          <OverviewPanel
            streakDays={streakDays}
            totalViews={totalViews}
            activeDays={activeDays}
            vocabCount={vocabCount}
            isMobile={isMobile}
          />
        )}

        <TodayPlan d={d} isMobile={isMobile} />
        <Heatmap heatmapData={d.heatmap || {}} streakDays={streakDays} totalViews={totalViews} isMobile={isMobile} />
        <LearningAnalysis d={d} vocabCount={vocabCount} topicStats={topicStats} isMobile={isMobile} />
        <PosterGenerator
          d={d}
          streakDays={streakDays}
          totalViews={totalViews}
          vocabCount={vocabCount}
          topicStats={topicStats}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}
