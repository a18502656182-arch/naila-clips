"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THEME } from "../components/home/theme";

// 提取与手帐面板UI完全一致的新配色方案
const POSTER_THEMES =[
  {
    name: "流光经典",
    bg: ["#f8fafc", "#f1f5f9", "#e2e8f0"], // 明亮灰白渐变
    orb1: "rgba(99,102,241,0.22)", // Indigo光晕
    orb2: "rgba(236,72,153,0.15)", // Pink光晕
    orb3: "rgba(6,182,212,0.15)",  // Cyan光晕
    textMain: "#0f172a",
    textSub: "#475569",
    textFaint: "#64748b",
    cardBg: "rgba(255,255,255,0.86)",
    cardBorder: "rgba(15,23,42,0.08)",
    accent: "#4f46e5", // Indigo主色
    statColors:["#c2410c", "#3730a3", "#065f46"], // 对应手帐的三种高亮
    statPills:[
      { bg: "rgba(251,146,60,0.16)", border: "rgba(251,146,60,0.22)" },
      { bg: "rgba(99,102,241,0.16)", border: "rgba(99,102,241,0.22)" },
      { bg: "rgba(16,185,129,0.16)", border: "rgba(16,185,129,0.22)" }
    ],
    taskNeutralBg: "rgba(99,102,241,0.06)",
    taskNeutralBorder: "rgba(99,102,241,0.16)",
    taskNeutralIcon: "#4f46e5",
    taskDoneBg: "rgba(16,185,129,0.08)",
    taskDoneBorder: "rgba(16,185,129,0.24)",
    taskDoneIcon: "#10b981",
    taskEmptyBg: "rgba(15,23,42,0.03)",
    taskEmptyBorder: "rgba(15,23,42,0.08)",
    taskEmptyIcon: "#94a3b8",
    cellEmpty: "rgba(248,250,252,0.7)",
    cellEmptyBorder: "rgba(15,23,42,0.05)",
    cellEmptyText: "#94a3b8",
    cellActive:["rgba(220,252,231,0.95)", "rgba(187,247,208,0.98)", "rgba(34,197,94,0.95)"],
    cellActiveText:["#166534", "#166534", "#ffffff"],
    todayOutline: "#4f46e5",
  },
  {
    name: "薄荷轻氧",
    bg:["#f0fdf4", "#ecfdf5", "#d1fae5"], // 清新绿渐变
    orb1: "rgba(16,185,129,0.20)",
    orb2: "rgba(6,182,212,0.15)",
    orb3: "rgba(52,211,153,0.15)",
    textMain: "#064e3b",
    textSub: "#065f46",
    textFaint: "#047857",
    cardBg: "rgba(255,255,255,0.75)",
    cardBorder: "rgba(16,185,129,0.25)",
    accent: "#059669",
    statColors:["#b45309", "#065f46", "#0369a1"],
    statPills:[
      { bg: "rgba(245,158,11,0.2)", border: "rgba(245,158,11,0.3)" },
      { bg: "rgba(16,185,129,0.2)", border: "rgba(16,185,129,0.3)" },
      { bg: "rgba(14,165,233,0.2)", border: "rgba(14,165,233,0.3)" }
    ],
    taskNeutralBg: "rgba(14,165,233,0.08)",
    taskNeutralBorder: "rgba(14,165,233,0.2)",
    taskNeutralIcon: "#0284c7",
    taskDoneBg: "rgba(16,185,129,0.12)",
    taskDoneBorder: "rgba(
