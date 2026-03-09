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

function MiniStat({ label, value, hint, accent }) {
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
      <SectionTitle emoji="📊" title="学习总览" sub="打开手帐先看结果，再决定下一步学什么" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <MiniStat
          label="连续学习"
          value={streakDays || 0}
          hint="习惯形成中"
          accent={{
            bg: "linear-gradient(135deg, rgba(251,146,60,0.16), rgba(251,146,60,0.05))",
            border: "rgba(251,146,60,0.22)",
            color: "#c2410c",
          }}
        />
        <MiniStat
          label="累计视频"
          value={totalViews || 0}
          hint="场景输入总量"
          accent={{
            bg: "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(99,102,241,0.05))",
            border: "rgba(99,102,241,0.22)",
            color: "#3730a3",
          }}
        />
        <MiniStat
          label="活跃天数"
          value={activeDays || 0}
          hint="打开一次也算赢"
          accent={{
            bg: "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(16,185,129,0.05))",
            border: "rgba(16,185,129,0.22)",
            color: "#065f46",
          }}
        />
        <MiniStat
          label="收藏词汇"
          value={vocabCount || 0}
          hint="你沉淀下来的表达"
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
        {neutral ? "→" : done ? "✓" : "•"}
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
      title: "今天看 1 个场景视频",
      done: (d.today_views || 0) >= 1,
      desc: (d.today_views || 0) >= 1 ? `今天已看 ${d.today_views || 0} 个视频` : "先看一个短片，让英语进入状态",
      href: "/",
      buttonText: "去看视频",
    },
    {
      title: "今天收藏 3 个词/表达",
      done: (d.today_vocab || 0) >= 3,
      desc: (d.today_vocab || 0) >= 3 ? `今天已收藏 ${d.today_vocab || 0} 个词汇` : `当前进度 ${d.today_vocab || 0} / 3`,
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
        title="今天的学习计划"
        sub="前两项自动统计，游戏练习先保留快捷入口，不做错误的假判定"
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
          title="去游戏大厅做一轮练习"
          desc="这一项现在不做自动统计，避免沿用旧考试系统残留逻辑；点击直接进入练习大厅。"
          done={false}
          neutral
          href="/practice"
          buttonText="去练习"
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
          现在这版手帐只展示真实可拿到的数据：视频、收藏、活跃度和练习入口，不再继续沿用“已掌握/学习中”的旧考试判定。
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
        <div
          style={{
            padding: "12px 12px",
            borderRadius: 18,
            background: "rgba(15,23,42,0.03)",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 1000, color: THEME.colors.ink }}>{monthActiveDays}</div>
          <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 900, marginTop: 6 }}>本月活跃天数</div>
        </div>
        <div
          style={{
            padding: "12px 12px",
            borderRadius: 18,
            background: "rgba(15,23,42,0.03)",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 1000, color: THEME.colors.ink }}>{monthTotalViews}</div>
          <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 900, marginTop: 6 }}>本月学习次数</div>
        </div>
        <div
          style={{
            padding: "12px 12px",
            borderRadius: 18,
            background: "rgba(15,23,42,0.03)",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 1000, color: THEME.colors.ink }}>{totalDays}</div>
          <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 900, marginTop: 6 }}>本月总天数</div>
        </div>
        <div
          style={{
            padding: "12px 12px",
            borderRadius: 18,
            background: "rgba(15,23,42,0.03)",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 1000, color: THEME.colors.ink }}>
            {monthActiveDays > 0 ? Math.round((monthActiveDays / totalDays) * 100) : 0}%
          </div>
          <div style={{ fontSize: 12, color: THEME.colors.muted, fontWeight: 900, marginTop: 6 }}>本月活跃率</div>
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
          数字表示当天学习次数，今天会有紫色描边
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: THEME.colors.faint, fontWeight: 800 }}>图例</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#64748b",
              padding: "5px 8px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.05)",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            灰点=未学习
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#166534",
              padding: "5px 8px",
              borderRadius: 999,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.16)",
            }}
          >
            浅绿=少量学习
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#ffffff",
              padding: "5px 8px",
              borderRadius: 999,
              background: "rgba(22,163,74,0.92)",
            }}
          >
            深绿=学习较多
          </span>
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
    <Card style={{ padding: 18, height: "100%" }}>
      <SectionTitle
        emoji="🗓️"
        title="学习日历"
        sub="按月份查看，比一大堆看不懂的小格子更直观"
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
          你已经连续学习 {streakDays} 天了。现在月历能直接看清楚哪天学了、学了多少。
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
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
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

function LearningAnalysis({ d, vocabCount, topicStats, gameSummary, isMobile }) {
  const activeDays = Object.keys(d.heatmap || {}).length;
  const topTopic = topicStats[0]?.label || "还没有明显偏好";
  const secondTopic = topicStats[1]?.label || "继续学习后会出现";
  const playedGameCount = gameSummary.playedGameCount || 0;
  const totalGameScore = gameSummary.totalGameScore || 0;

  return (
    <Card style={{ padding: 18, display: "flex", flexDirection: "column", height: "100%" }}>
      <SectionTitle emoji="🧭" title="学习动态分析" sub="不再显示旧考试残留的掌握等级，改成更真实的行为记录" />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr", gap: 10, flex: 1 }}>
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
            vocabCount > 0 ? "你已经不是单纯在看视频，而是在沉淀自己的表达库。" : "先收藏一些词汇，这里会逐渐长成你的学习记录。",
          ]}
        />
        <AnalysisCard
          title="练习大厅痕迹"
          accent={{
            bg: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(6,182,212,0.04))",
            border: "rgba(99,102,241,0.16)",
            title: "#4338ca",
          }}
          lines={[
            `已留下分数记录的游戏：${playedGameCount} 个`,
            `当前本地总分：${totalGameScore}`,
            playedGameCount > 0
              ? "说明你已经开始把输入转成输出练习了。"
              : "这里暂未检测到游戏分数记录，去练习大厅做一轮就会有痕迹。",
          ]}
        />
        <AnalysisCard
          title="学习偏好"
          accent={{
            bg: "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(16,185,129,0.04))",
            border: "rgba(16,185,129,0.16)",
            title: "#047857",
          }}
          lines={[
            `最近最常见的话题：${topTopic}`,
            `第二偏好方向：${secondTopic}`,
            `目前累计活跃 ${activeDays} 天，偏好会随着你继续收藏而越来越清楚。`,
          ]}
        />
      </div>
    </Card>
  );
}

function ActionCard({ emoji, title, desc, href, dark }) {
  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        display: "block",
        padding: "18px 18px",
        borderRadius: 22,
        background: dark
          ? "linear-gradient(135deg, #0f172a 0%, #312e81 48%, #ec4899 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.80))",
        border: dark ? "none" : "1px solid rgba(15,23,42,0.08)",
        boxShadow: dark ? "0 24px 60px rgba(79,70,229,0.24)" : "0 14px 36px rgba(15,23,42,0.06)",
        color: dark ? "#fff" : THEME.colors.ink,
        minHeight: 138,
      }}
    >
      <div style={{ fontSize: 26 }}>{emoji}</div>
      <div style={{ fontSize: 15, fontWeight: 1000, marginTop: 12 }}>{title}</div>
      <div
        style={{
          fontSize: 12,
          lineHeight: 1.7,
          marginTop: 8,
          color: dark ? "rgba(255,255,255,0.82)" : THEME.colors.faint,
        }}
      >
        {desc}
      </div>
      <div
        style={{
          marginTop: 14,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 950,
          color: dark ? "#fff" : THEME.colors.accent,
        }}
      >
        立即进入 <span>→</span>
      </div>
    </a>
  );
}

function ContinueLearning({ isMobile }) {
  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle emoji="🚀" title="继续学习" sub="手帐页不是终点，看完就继续学" />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
        <ActionCard emoji="🎬" title="去看新视频" desc="继续从场景里输入真实表达，让学习进入状态。" href="/" dark />
        <ActionCard emoji="📚" title="去复习词汇本" desc="看看最近收藏了什么，顺手再整理一下自己的表达库。" href="/bookmarks" />
        <ActionCard emoji="🎮" title="去游戏大厅" desc="把输入转成输出练习，让今天的内容更容易留下来。" href="/practice" />
      </div>
    </Card>
  );
}

const POSTER_THEMES = [
  {
    name: "深夜极光",
    bg: ["#0f172a", "#1e1b4b", "#0f172a"],
    glow1: "rgba(99,102,241,0.38)",
    glow2: "rgba(236,72,153,0.28)",
    accent: "#818cf8",
    line: "#34d399",
    line2: "#818cf8",
    cellActive: ["rgba(34,197,94,0.30)", "rgba(34,197,94,0.65)", "rgba(34,197,94,0.95)"],
    todayOutline: "#818cf8",
  },
  {
    name: "日出橙金",
    bg: ["#1a0a00", "#3b1400", "#1a0800"],
    glow1: "rgba(251,146,60,0.40)",
    glow2: "rgba(234,179,8,0.28)",
    accent: "#fb923c",
    line: "#fbbf24",
    line2: "#f97316",
    cellActive: ["rgba(251,146,60,0.28)", "rgba(251,146,60,0.62)", "rgba(251,146,60,0.95)"],
    todayOutline: "#fbbf24",
  },
  {
    name: "深海青碧",
    bg: ["#001a1a", "#00282e", "#001518"],
    glow1: "rgba(6,182,212,0.38)",
    glow2: "rgba(16,185,129,0.28)",
    accent: "#22d3ee",
    line: "#34d399",
    line2: "#06b6d4",
    cellActive: ["rgba(6,182,212,0.28)", "rgba(6,182,212,0.62)", "rgba(6,182,212,0.95)"],
    todayOutline: "#34d399",
  },
];

function PosterGenerator({ me, streakDays, totalVideos, vocabCount, masteredCount, heatmapData, tasks, activeDays, topTopic }) {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [themeIdx, setThemeIdx] = useState(0);

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  async function generate(forceTheme) {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 80));

    const nextTheme = forceTheme !== undefined ? forceTheme : (themeIdx + 1) % POSTER_THEMES.length;
    setThemeIdx(nextTheme);
    const T = POSTER_THEMES[nextTheme];

    const canvas = canvasRef.current;
    const W = 750;
    const H = 1200;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, T.bg[0]);
    bg.addColorStop(0.45, T.bg[1]);
    bg.addColorStop(1, T.bg[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const g1 = ctx.createRadialGradient(140, 200, 0, 140, 200, 320);
    g1.addColorStop(0, T.glow1);
    g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(620, 420, 0, 620, 420, 280);
    g2.addColorStop(0, T.glow2);
    g2.addColorStop(1, "transparent");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText("📒 我的英语手帐", 48, 70);

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    ctx.font = "500 22px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.50)";
    ctx.textAlign = "right";
    ctx.fillText(dateStr, W - 48, 70);
    ctx.textAlign = "left";

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, 92);
    ctx.lineTo(W - 48, 92);
    ctx.stroke();

    ctx.font = "500 18px sans-serif";
    ctx.fillStyle = T.accent;
    ctx.textAlign = "right";
    ctx.fillText(`✦ ${T.name}`, W - 48, 118);
    ctx.textAlign = "left";

    const userName = me?.email?.split("@")[0] || "学习者";
    ctx.font = "bold 42px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(`👋 ${userName}`, 48, 176);
    ctx.font = "500 24px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.64)";
    ctx.fillText("今日学习成果卡", 48, 214);

    const stats = [
      { num: streakDays || 0, label: "连续天数", color: "#fb923c" },
      { num: totalVideos || 0, label: "累计视频", color: T.accent },
      { num: vocabCount || 0, label: "收藏词汇", color: "#34d399" },
    ];
    const cW = 196;
    const cH = 110;
    const cGap = 21;
    const cY = 252;
    stats.forEach((item, i) => {
      const x = 48 + i * (cW + cGap);
      roundRect(ctx, x, cY, cW, cH, 18);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "bold 46px sans-serif";
      ctx.fillStyle = item.color;
      ctx.fillText(String(item.num), x + 18, cY + 62);

      ctx.font = "500 20px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.62)";
      ctx.fillText(item.label, x + 18, cY + 92);
    });

    const trackedDoneCount = tasks.filter((t) => t.done).length;

    const taskY = 408;
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(`🎯 今日自动统计 ${trackedDoneCount}/2`, 48, taskY);

    [
      { label: "今天看 1 个场景视频", done: tasks[0]?.done },
      { label: "今天收藏 3 个词/表达", done: tasks[1]?.done },
      { label: "去游戏大厅做一轮练习", done: false, neutral: true },
    ].forEach((item, idx) => {
      const y = taskY + 28 + idx * 44;
      roundRect(ctx, 48, y, W - 96, 36, 10);
      ctx.fillStyle = item.neutral
        ? "rgba(99,102,241,0.10)"
        : item.done
        ? "rgba(34,197,94,0.12)"
        : "rgba(255,255,255,0.05)";
      ctx.fill();
      ctx.strokeStyle = item.neutral
        ? "rgba(99,102,241,0.18)"
        : item.done
        ? "rgba(34,197,94,0.28)"
        : "rgba(255,255,255,0.08)";
      ctx.stroke();

      ctx.font = "500 20px sans-serif";
      ctx.fillStyle = item.neutral ? "#a5b4fc" : item.done ? "#4ade80" : "rgba(255,255,255,0.42)";
      ctx.fillText(item.neutral ? "→" : item.done ? "✓" : "○", 70, y + 24);

      ctx.fillStyle = item.neutral || item.done ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.42)";
      ctx.fillText(item.label, 104, y + 24);
    });

    const hmY = 598;
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText("🗓️ 最近学习日历", 48, hmY);

    const calendarMonth = new Date();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const calendarCells = [];
    for (let i = 0; i < startWeekday; i++) calendarCells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      calendarCells.push({ day: d, key, count: heatmapData[key] || 0 });
    }
    while (calendarCells.length % 7 !== 0) calendarCells.push(null);

    const weekNames = ["日", "一", "二", "三", "四", "五", "六"];
    weekNames.forEach((w, i) => {
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(w, 48 + i * 92 + 34, hmY + 28);
    });

    const cellW = 86;
    const cellH = 58;
    const startX = 48;
    const startY = hmY + 42;
    const todayKey = new Date().toISOString().slice(0, 10);

    calendarCells.forEach((cell, idx) => {
      const row = Math.floor(idx / 7);
      const col = idx % 7;
      const x = startX + col * 92;
      const y = startY + row * 66;

      roundRect(ctx, x, y, cellW, cellH, 12);
      if (!cell) {
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fill();
        return;
      }

      if (cell.count <= 0) {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
      } else if (cell.count === 1) {
        ctx.fillStyle = T.cellActive[0];
      } else if (cell.count === 2) {
        ctx.fillStyle = T.cellActive[1];
      } else {
        ctx.fillStyle = T.cellActive[2];
      }
      ctx.fill();

      if (cell.key === todayKey) {
        ctx.strokeStyle = T.todayOutline;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = cell.count >= 3 ? "#ffffff" : "rgba(255,255,255,0.92)";
      ctx.fillText(String(cell.day), x + 10, y + 20);

      if (cell.count > 0) {
        roundRect(ctx, x + cellW - 34, y + cellH - 24, 24, 16, 8);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fill();
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(String(cell.count), x + cellW - 22, y + cellH - 12);
        ctx.textAlign = "left";
      }
    });

    const infoY = 1010;
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText("🧭 最近学习状态", 48, infoY);

    ctx.font = "500 22px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.76)";
    ctx.fillText(`累计活跃天数：${activeDays || 0} 天`, 48, infoY + 42);
    ctx.fillText(`最近偏好方向：${topTopic || "继续学习后会出现"}`, 48, infoY + 76);
    ctx.fillText(`收藏词汇总量：${vocabCount || 0} 个`, 48, infoY + 110);

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, H - 100);
    ctx.lineTo(W - 48, H - 100);
    ctx.stroke();

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textAlign = "center";
    ctx.fillText("🌐 nailaobao.top", W / 2, H - 60);
    ctx.font = "500 20px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.fillText("油管英语场景库 · 场景输入 · 收藏沉淀 · 游戏练习", W / 2, H - 30);
    ctx.textAlign = "left";

    const url = canvas.toDataURL("image/png");
    setPosterUrl(url);
    setGenerating(false);
    setTimeout(() => setShowModal(true), 0);
  }

  async function handleSwitchTheme() {
    const nextTheme = (themeIdx + 1) % POSTER_THEMES.length;
    await generate(nextTheme);
  }

  function handleDownload() {
    if (!posterUrl) return;
    const a = document.createElement("a");
    a.href = posterUrl;
    a.download = `英语手帐_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div
        style={{
          padding: "18px 18px 16px",
          borderRadius: 22,
          background:
            "radial-gradient(circle at 10% 15%, rgba(236,72,153,0.18), transparent 32%), radial-gradient(circle at 90% 20%, rgba(99,102,241,0.22), transparent 34%), linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(79,70,229,0.96) 46%, rgba(236,72,153,0.88) 100%)",
          color: "#fff",
          boxShadow: "0 24px 60px rgba(79,70,229,0.22)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 1000 }}>打开海报生成器</div>
        <div style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.88, marginTop: 8 }}>
          把连续学习、累计视频、收藏词汇和学习日历缩略一起生成一张打卡海报。
        </div>
        <button
          onClick={() => generate()}
          disabled={generating}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "14px 0",
            borderRadius: 18,
            border: "none",
            background: generating ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.96)",
            color: generating ? "rgba(255,255,255,0.85)" : "#111827",
            fontSize: 14,
            fontWeight: 1000,
            cursor: generating ? "not-allowed" : "pointer",
            boxShadow: generating ? "none" : "0 16px 34px rgba(2,6,23,0.18)",
          }}
        >
          {generating ? "⏳ 生成中..." : "📸 打开海报生成器"}
        </button>
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.82 }}>共 {POSTER_THEMES.length} 种风格，每次可切换主题</div>
      </div>

      {showModal && posterUrl && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(2,6,23,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 28,
              padding: 20,
              width: "100%",
              maxWidth: 460,
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 1000, color: "#0f172a" }}>📸 今日打卡海报</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, fontWeight: 800 }}>
                  当前主题：{POSTER_THEMES[themeIdx].name}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: "1px solid rgba(15,23,42,0.12)",
                  background: "rgba(15,23,42,0.06)",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#64748b",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <img
              src={posterUrl}
              alt="打卡海报"
              style={{
                width: "100%",
                borderRadius: 18,
                display: "block",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              }}
            />

            <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", fontWeight: 800 }}>
              📱 手机长按保存 · 电脑点下方按钮下载
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={handleDownload}
                style={{
                  padding: "14px 0",
                  borderRadius: 16,
                  border: "none",
                  background: "linear-gradient(135deg,#0f172a,#4f46e5)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                ⬇️ 保存图片
              </button>
              <button
                onClick={handleSwitchTheme}
                style={{
                  padding: "14px 0",
                  borderRadius: 16,
                  border: "1.5px solid rgba(15,23,42,0.12)",
                  background: "rgba(15,23,42,0.04)",
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                🎨 换个风格
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              {POSTER_THEMES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === themeIdx ? 22 : 8,
                    height: 8,
                    borderRadius: 999,
                    background: i === themeIdx ? "#4f46e5" : "rgba(15,23,42,0.15)",
                    transition: "all 300ms ease",
                  }}
                />
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function JournalClient({ accessToken }) {
  const isMobile = useIsMobile(960);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [journalData, setJournalData] = useState(null);
  const [gameSummary, setGameSummary] = useState({
    totalGameScore: 0,
    playedGameCount: 0,
  });

  useEffect(() => {
    authFetch(remote("/api/me"), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d))
      .catch(() => setMe({ logged_in: false }));
  }, []);

  useEffect(() => {
    if (!me) return;
    if (!me.logged_in) {
      setLoading(false);
      return;
    }
    loadJournalData();
  }, [me]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("naila_game_scores");
      if (!raw) {
        setGameSummary({ totalGameScore: 0, playedGameCount: 0 });
        return;
      }
      const parsed = JSON.parse(raw);
      const values = Object.values(parsed || {}).map((x) => Number(x) || 0);
      const totalGameScore = values.reduce((a, b) => a + b, 0);
      const playedGameCount = values.filter((x) => x > 0).length;
      setGameSummary({ totalGameScore, playedGameCount });
    } catch {
      setGameSummary({ totalGameScore: 0, playedGameCount: 0 });
    }
  }, [loading]);

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
      setJournalData({ ...journal, vocabItems: items });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  if (!loading && (!me || !me.logged_in)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: THEME.colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Card style={{ maxWidth: 420, textAlign: "center", padding: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>📒</div>
          <div style={{ fontSize: 18, fontWeight: 1000, color: THEME.colors.ink, marginBottom: 8 }}>我的英语手帐</div>
          <div style={{ fontSize: 13, color: THEME.colors.muted, marginBottom: 18, lineHeight: 1.7 }}>
            登录后查看你的学习总览、学习日历、收藏积累和海报生成器。
          </div>
          <a
            href="/login"
            style={{
              display: "inline-block",
              padding: "12px 34px",
              background: "linear-gradient(135deg, rgba(15,23,42,1), rgba(99,102,241,0.95))",
              color: "#fff",
              borderRadius: 999,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 1000,
              boxShadow: "0 18px 40px rgba(2,6,23,0.18)",
            }}
          >
            去登录
          </a>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg }}>
        <div style={{ height: 56, background: THEME.colors.surface, borderBottom: `1px solid ${THEME.colors.border}` }} />
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "22px 16px 60px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 14,
          }}
        >
          {[220, 260, 320, 260, 220, 220].map((h, i) => (
            <div
              key={i}
              style={{
                height: h,
                borderRadius: 24,
                border: `1px solid ${THEME.colors.border}`,
                background: "linear-gradient(90deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.92) 30%, rgba(255,255,255,0.65) 60%)",
                backgroundSize: "200% 100%",
                animation: "shine 1.3s ease-in-out infinite",
              }}
            />
          ))}
        </div>
        <style>{`@keyframes shine { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      </div>
    );
  }

  const d = journalData || {};
  const vocabItems = d.vocabItems || [];
  const activeDays = Object.keys(d.heatmap || {}).length;

  const topicLabelMap = {
    "daily-life": "日常生活",
    "self-improvement": "个人成长",
    "food": "美食探店",
    "travel": "旅行",
    "business": "职场商务",
    "culture": "文化",
    "opinion": "观点表达",
    "skills": "方法技能",
  };

  const topicMap = {};
  (d.bookmarked_topics || []).forEach((slug) => {
    const label = topicLabelMap[slug] || slug;
    topicMap[label] = (topicMap[label] || 0) + 1;
  });
  const topicStats = Object.entries(topicMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const tasks = [
    { label: "今天看 1 个场景视频", done: (d.today_views || 0) >= 1 },
    { label: "今天收藏 3 个词/表达", done: (d.today_vocab || 0) >= 3 },
  ];

  const desktopHeroGrid = isMobile ? "1fr" : "1.08fr 0.92fr";
  const desktopMiddleGrid = isMobile ? "1fr" : "1.08fr 0.92fr";
  const desktopBottomGrid = isMobile ? "1fr" : "1.1fr 0.9fr";

  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg }}>
      <style>{`
        @keyframes floatIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.82))",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
          padding: "0 16px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a
            href="/"
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(15,23,42,0.10)",
              background: "rgba(15,23,42,0.04)",
              textDecoration: "none",
              fontSize: 13,
              color: THEME.colors.ink,
              fontWeight: 900,
            }}
          >
            ← 返回
          </a>
          <span style={{ fontSize: 15, fontWeight: 1000, color: THEME.colors.ink }}>我的英语手帐</span>
        </div>
        {!isMobile ? (
          <span style={{ fontSize: 11, color: THEME.colors.faint, fontWeight: 800 }}>📅 {formatDate()}</span>
        ) : null}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px 16px 60px" }}>
        <div
          style={{
            borderRadius: 28,
            padding: isMobile ? "18px 16px" : "22px 22px",
            color: "#fff",
            background:
              "radial-gradient(circle at 10% 10%, rgba(236,72,153,0.55), transparent 45%), radial-gradient(circle at 90% 20%, rgba(99,102,241,0.65), transparent 40%), radial-gradient(circle at 40% 120%, rgba(14,165,233,0.55), transparent 50%), linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(79,70,229,0.95) 40%, rgba(236,72,153,0.85) 100%)",
            boxShadow: "0 24px 70px rgba(2,6,23,0.18)",
            position: "relative",
            overflow: "hidden",
            animation: "floatIn 420ms ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: isMobile ? "flex-start" : "center",
              justifyContent: "space-between",
              flexDirection: isMobile ? "column" : "row",
              gap: 14,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 1000 }}>
                👋 {me?.email?.split("@")[0] || "同学"}，今天也来留下一点学习痕迹
              </div>
              <div style={{ fontSize: 13, opacity: 0.92, lineHeight: 1.8, marginTop: 8 }}>
                现在这版手帐页只保留真实有效的学习数据：看视频、收藏词汇、活跃天数、学习偏好和游戏大厅入口，不再沿用旧考试系统的掌握判定。
              </div>
            </div>
            <div
              style={{
                minWidth: isMobile ? "100%" : 180,
                padding: "14px 14px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                textAlign: isMobile ? "left" : "right",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.86, fontWeight: 900 }}>当前状态</div>
              <div style={{ fontSize: 28, fontWeight: 1000, marginTop: 4 }}>{d.streak_days || 0} 天</div>
              <div style={{ fontSize: 12, opacity: 0.88, marginTop: 4 }}>连续学习中</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: desktopHeroGrid, gap: 14, marginTop: 14, alignItems: "start" }}>
          <OverviewPanel
            streakDays={d.streak_days || 0}
            totalViews={d.total_views || 0}
            activeDays={activeDays}
            vocabCount={vocabItems.length}
            isMobile={isMobile}
          />
          <TodayPlan d={d} isMobile={isMobile} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: desktopMiddleGrid, gap: 14, marginTop: 14, alignItems: "stretch" }}>
          <Heatmap
            heatmapData={d.heatmap || {}}
            streakDays={d.streak_days || 0}
            totalViews={d.total_views || 0}
            isMobile={isMobile}
          />
          <LearningAnalysis
            d={d}
            vocabCount={vocabItems.length}
            topicStats={topicStats}
            gameSummary={gameSummary}
            isMobile={isMobile}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: desktopBottomGrid, gap: 14, marginTop: 14 }}>
          <ContinueLearning isMobile={isMobile} />
          <Card style={{ padding: 18 }}>
            <SectionTitle
              emoji="📸"
              title="海报生成器"
              sub="作为模块6保留，并且固定成这个页面的成果展示出口"
            />
            <PosterGenerator
              me={me}
              streakDays={d.streak_days || 0}
              totalVideos={d.total_views || 0}
              vocabCount={vocabItems.length}
              masteredCount={0}
              heatmapData={d.heatmap || {}}
              tasks={tasks}
              activeDays={activeDays}
              topTopic={topicStats[0]?.label || "继续学习后会出现"}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
