// lib/token.js
// 前端 token 管理 — 登录后存 token，每次请求带上 Authorization header

const KEY = "sb_access_token";

export function saveToken(token) {
  try { localStorage.setItem(KEY, token); } catch {}
}

export function getToken() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

export function clearToken() {
  try { localStorage.removeItem(KEY); } catch {}
}

// 带 Bearer token 的 fetch，替代普通 fetch 用于需要登录的请求
export function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}
