"use client";
import { useEffect, useState } from "react";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
export const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

export function getToken() {
  try { return localStorage.getItem("sb_access_token") || null; } catch { return null; }
}

export function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

export function formatDate() {
  const now = new Date();
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · 周${days[now.getDay()]}`;
}

export function useIsMobile(bp = 960) {
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
