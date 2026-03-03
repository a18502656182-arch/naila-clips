// utils/supabase/pagesApiClient.js
import { createServerClient } from "@supabase/ssr";

// 一个很轻量的 cookie 序列化（够 Supabase 用）
function serializeCookie(name, value, options = {}) {
  const enc = encodeURIComponent;
  let str = `${name}=${enc(value)}`;

  if (options.maxAge != null) str += `; Max-Age=${options.maxAge}`;
  if (options.domain) str += `; Domain=${options.domain}`;
  str += `; Path=${options.path || "/"}`;

  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly) str += `; HttpOnly`;
  if (options.secure) str += `; Secure`;

  // sameSite: 'lax' | 'strict' | 'none'
  if (options.sameSite) {
    const v = typeof options.sameSite === "string" ? options.sameSite : String(options.sameSite);
    str += `; SameSite=${v[0].toUpperCase()}${v.slice(1).toLowerCase()}`;
  }

  return str;
}

function parseCookieHeader(cookieHeader) {
  const header = cookieHeader || "";
  return header
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf("=");
      const name = eq >= 0 ? pair.slice(0, eq) : pair;
      const value = eq >= 0 ? decodeURIComponent(pair.slice(eq + 1)) : "";
      return { name, value };
    });
}

export function createSupabaseForPagesApi(req, res) {
  let setCookies = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(req.headers.cookie);
        },
        setAll(cookiesToSet) {
          // 累积 cookie，最后一次性写回
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookies.push(serializeCookie(name, value, options));
          });
        },
      },
    }
  );

  // 确保写回 cookie
  const flushCookies = () => {
    if (setCookies.length) {
      // 如果已经有 Set-Cookie，就合并
      const prev = res.getHeader("Set-Cookie");
      const merged = []
        .concat(prev || [])
        .concat(setCookies)
        .filter(Boolean);
      res.setHeader("Set-Cookie", merged);
      setCookies = [];
    }
  };

  return { supabase, flushCookies };
}
