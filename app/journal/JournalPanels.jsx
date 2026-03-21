"use client";
import { useState, useMemo } from "react";
import { THEME } from "../components/home/theme";
import { Card, SectionTitle, MiniStat } from "./JournalUI";

function OverviewPanel({ streakDays, totalViews, activeDays, vocabCount, isMobile }) {
  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle emoji="📊" title="学习总览" sub="你的学习轨迹都在这里，一眼看清楚" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <MiniStat
          label="连续学习"
          value={streakDays || 0}
          hint="天没断"
          accent={{
            bg: "linear-gradient(135deg, rgba(251,146,60,0.16), rgba(251,146,60,0.05))",
            border: "rgba(251,146,60,0.22)",
            color: "#c2410c",
          }}
        />
        <MiniStat
          label="累计视频"
          value={totalViews || 0}
          hint="个真实场景"
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
        sub="完成了几项就算几项，别给自己太大压力"
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
          desc="做几轮游戏，把今天看到的表达练一练"
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
          坚持每天打卡，积少成多才是王道 💪
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
                    minHeight: isMobile ? 54 : 52,
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
                  minHeight: isMobile ? 54 : 52,
                  padding: isMobile ? "6px 5px" : "6px 8px",
                  borderRight: isLastCol ? "none" : "1px solid rgba(15,23,42,0.05)",
                  borderBottom: isLastRow ? "none" : "1px solid rgba(15,23,42,0.05)",
                  background: cell.isToday
                    ? "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(255,255,255,0.96))"
                    : style.bg,
                  boxShadow: cell.isToday ? "inset 0 0 0 2px rgba(79,70,229,0.78)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  flexDirection: "column", alignItems: "center",
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
          flexDirection: "column", alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 12, color: THEME.colors.faint, fontWeight: 800 }}>
          数字是当天看视频的次数，今天有紫色标记
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "nowrap" }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: "#64748b", padding: "4px 7px", borderRadius: 999, background: "rgba(15,23,42,0.05)", border: "1px solid rgba(15,23,42,0.08)", whiteSpace: "nowrap" }}>灰=未学习</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: "#166534", padding: "4px 7px", borderRadius: 999, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.16)", whiteSpace: "nowrap" }}>浅绿=少量</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: "#ffffff", padding: "4px 7px", borderRadius: 999, background: "rgba(22,163,74,0.92)", whiteSpace: "nowrap" }}>深绿=较多</span>
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
        sub="看看哪天学了，哪天没动，一目了然"
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: "column", alignItems: "center",
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
          已连续学习 {streakDays} 天，继续保持！别让记录断掉 🔥
        </div>
      ) : null}
    </Card>
  );
}

function AnalysisCard({ title, lines, accent }) {
  return (
    <div
      style={{
        padding: "18px 18px 16px",
        borderRadius: 22,
        border: `1px solid ${accent.border}`,
        background: accent.bg,
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        flexDirection: "column", alignItems: "center",
        transition: "all 180ms ease",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 1000,
          color: accent.title,
          letterSpacing: "0.3px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
          justifyContent: "center",
        }}
      >
        {lines.map((line, idx) => (
          <div
            key={idx}
            style={{
              fontSize: 12,
              color: THEME.colors.muted,
              lineHeight: 1.7,
            }}
          >
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

  const now = new Date();
  const ym = now.toISOString().slice(0,7);

  const monthActiveDays =
    Object.keys(d.heatmap || {})
      .filter(k => k.startsWith(ym)).length;

  const summaryText =
    `本月活跃 ${monthActiveDays} 天，累计收藏 ${vocabCount} 个词汇，持续学习中。`;

  const cards = [
    {
      title: "词汇积累",
      accent: {
        bg: "linear-gradient(135deg, rgba(236,72,153,0.10), rgba(236,72,153,0.04))",
        border: "rgba(236,72,153,0.16)",
        title: "#be185d",
      },
      lines: [
        `累计收藏词汇：${vocabCount} 个`,
        `今日新增收藏：${d.today_vocab || 0} 个`,
        vocabCount > 0
          ? "你已经不是单纯在看视频，而是在沉淀自己的表达库。"
          : "去看视频的时候多点几下❤️，这里就会越来越丰富",
      ],
    },
    {
      title: "游戏练习",
      accent: {
        bg: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(6,182,212,0.04))",
        border: "rgba(99,102,241,0.16)",
        title: "#4338ca",
      },
      lines: [
        `玩过的游戏类型：${playedGameCount} 个`,
        `游戏累计总分：${totalGameScore} 分`,
        playedGameCount > 0
          ? "很好，输入和练习都没落下！"
          : "还没有游戏记录，去练习大厅玩一轮试试~",
      ],
    },
    {
      title: "学习偏好",
      accent: {
        bg: "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(16,185,129,0.04))",
        border: "rgba(16,185,129,0.16)",
        title: "#047857",
      },
      lines: [
        `最近最常见的话题：${topTopic}`,
        `第二偏好方向：${secondTopic}`,
        `累计活跃 ${activeDays} 天，继续学偏好会越来越清晰`,
      ],
    },
    {
      title: "本月小结",
      accent: {
        bg: "linear-gradient(135deg, rgba(251,146,60,0.12), rgba(251,146,60,0.04))",
        border: "rgba(251,146,60,0.18)",
        title: "#c2410c",
      },
      lines: [
        summaryText,
        "保持节奏，慢慢来，表达库会越来越丰富的",
      ],
    }
  ];

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle
        emoji="🧭"
        title="学习动态分析"
        sub="看看你最近都在学什么、学了多少"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          alignItems: "stretch",
        }}
      >
        {cards.map((c, i) => (
          <AnalysisCard
            key={i}
            title={c.title}
            lines={c.lines}
            accent={c.accent}
          />
        ))}
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
      <SectionTitle emoji="🚀" title="继续学习" sub="翻完记录，继续出发" />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
        <ActionCard emoji="🎬" title="去看新视频" desc="继续从场景里输入真实表达，让学习进入状态。" href="/" dark />
        <ActionCard emoji="📚" title="去复习词汇本" desc="看看最近收藏了什么，顺手再整理一下自己的表达库。" href="/bookmarks" />
        <ActionCard emoji="🎮" title="去游戏大厅" desc="把输入转成输出练习，让今天的内容更容易留下来。" href="/practice" />
      </div>
    </Card>
  );
}

export { OverviewPanel, TodayPlan, MonthCalendar, Heatmap, LearningAnalysis, ContinueLearning };
