"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "../../utils/supabase/client";

// ── 常量 ──────────────────────────────────────────────
const ADMIN_API = "/admin-api";
const T = {
  bg: "#0f1117",
  surface: "#1a1d27",
  surface2: "#22263a",
  surface3: "#2a2f45",
  border: "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.12)",
  ink: "#f1f5f9",
  muted: "rgba(241,245,249,0.55)",
  faint: "rgba(241,245,249,0.32)",
  accent: "#6366f1",
  accent2: "#818cf8",
  good: "#10b981",
  warn: "#f59e0b",
  danger: "#ef4444",
  vip: "#a78bfa",
  radius: { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 },
};

// ── 小工具 ────────────────────────────────────────────
let _adminToken = "";
function setAdminToken(t) { _adminToken = t; }
async function getToken() {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return data.session.access_token;
  } catch {}
  if (_adminToken) return _adminToken;
  try {
    const match = document.cookie.split(";").map(c => c.trim()).find(c => c.includes("-auth-token="));
    if (!match) return "";
    let val = match.split("=").slice(1).join("=");
    if (val.startsWith("base64-")) val = val.slice(7);
    const decoded = atob(val);
    const parsed = JSON.parse(decoded);
    const session = Array.isArray(parsed) ? parsed[0] : parsed;
    return session?.access_token || "";
  } catch { return ""; }
}
async function api(action, extra = {}) {
  const r = await fetch(ADMIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
    body: JSON.stringify({ action, ...extra }),
  });
  return r.json();
}
async function apiGet(type, params = {}) {
  const qs = new URLSearchParams({ type, ...params }).toString();
  const r = await fetch(`${ADMIN_API}?${qs}`, {
    headers: { Authorization: `Bearer ${await getToken()}` },
  });
  return r.json();
}
function fmt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function fmtFull(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function isMemberActive(sub) {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (!sub.expires_at) return true;
  return new Date(sub.expires_at) > new Date();
}
function planLabel(days) {
  if (days === 0 || days === null || days === undefined) return "永久卡";
  if (days >= 365) return "年卡";
  if (days >= 90) return "季卡";
  if (days >= 30) return "月卡";
  return `试用卡(${days}天)`;
}
function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

// ── UI 基础组件 ───────────────────────────────────────
function Chip({ children, color = T.accent, bg }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: T.radius.pill,
      fontSize: 11, fontWeight: 800, letterSpacing: 0.3,
      background: bg || `${color}22`, color,
      border: `1px solid ${color}44`,
    }}>{children}</span>
  );
}
function Btn({ children, onClick, variant = "primary", size = "md", disabled, style = {} }) {
  const base = {
    border: "none", borderRadius: T.radius.pill, cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700, transition: "opacity .15s", opacity: disabled ? 0.5 : 1,
    fontSize: size === "sm" ? 12 : 13, padding: size === "sm" ? "5px 12px" : "8px 18px",
    ...style,
  };
  const variants = {
    primary: { background: T.accent, color: "#fff" },
    success: { background: T.good, color: "#fff" },
    danger: { background: T.danger, color: "#fff" },
    ghost: { background: T.surface3, color: T.ink, border: `1px solid ${T.border2}` },
    warn: { background: T.warn, color: "#000" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
}
function Input({ label, value, onChange, placeholder, type = "text", multiline, rows = 4, style = {} }) {
  const base = {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", borderRadius: T.radius.sm,
    background: T.surface3, border: `1px solid ${T.border2}`,
    color: T.ink, fontSize: 13, outline: "none",
    fontFamily: multiline ? "monospace" : "inherit",
    resize: multiline ? "vertical" : undefined,
    ...style,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{label}</label>}
      {multiline
        ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={base} />
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={base} />}
    </div>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{label}</label>}
      <select value={value} onChange={onChange} style={{
        padding: "9px 12px", borderRadius: T.radius.sm,
        background: T.surface3, border: `1px solid ${T.border2}`,
        color: T.ink, fontSize: 13, outline: "none",
      }}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
function Modal({ open, onClose, title, children, width = 640 }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.7)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.surface, borderRadius: T.radius.xl,
        border: `1px solid ${T.border2}`, width: "100%", maxWidth: width,
        maxHeight: "90vh", overflow: "auto", padding: 28,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: T.ink }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Toast({ msg, type = "success" }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 9999,
      background: type === "error" ? T.danger : T.good,
      color: "#fff", padding: "12px 20px", borderRadius: T.radius.lg,
      fontSize: 13, fontWeight: 700, boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
      animation: "fadeIn .2s ease",
    }}>{msg}</div>
  );
}

// ── 标签编辑操作（rename / delete）────────────────────
async function taxRename(type, oldSlug, newSlug) {
  return api("taxonomy_rename", { type, old_slug: oldSlug, new_slug: newSlug });
}
async function taxDelete(type, slug) {
  return api("taxonomy_delete", { type, slug });
}

// ── 单个标签 pill（含编辑 / 删除）─────────────────────
function TagPill({ slug, selected, accent, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(slug);
  const [busy, setBusy] = useState(false);

  const confirmRename = async () => {
    const s = editVal.trim().toLowerCase().replace(/\s+/g, "-");
    if (!s || s === slug) { setEditing(false); setEditVal(slug); return; }
    setBusy(true);
    const r = await onRename(slug, s);
    setBusy(false);
    if (r?.ok) { setEditing(false); }
    else { alert(r?.error || "重命名失败"); setEditVal(slug); setEditing(false); }
  };

  const confirmDelete = async () => {
    if (!confirm(`确认删除标签「${slug}」？这会同时从所有视频中移除该标签。`)) return;
    setBusy(true);
    const r = await onDelete(slug);
    setBusy(false);
    if (!r?.ok) alert(r?.error || "删除失败");
  };

  if (editing) {
    return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input
          autoFocus value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") { setEditing(false); setEditVal(slug); } }}
          style={{
            padding: "4px 10px", borderRadius: T.radius.pill, fontSize: 12,
            background: T.surface3, border: `1px solid ${T.accent}`, color: T.ink, outline: "none", width: 110,
          }}
        />
        <Btn size="sm" onClick={confirmRename} disabled={busy}>✓</Btn>
        <Btn size="sm" variant="ghost" onClick={() => { setEditing(false); setEditVal(slug); }}>✕</Btn>
      </div>
    );
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 0, borderRadius: T.radius.pill, overflow: "hidden", border: `1px solid ${selected ? accent : T.border2}`, background: selected ? `${accent}22` : T.surface3 }}>
      <button onClick={onSelect} style={{
        padding: "4px 10px", fontSize: 12, fontWeight: 700,
        cursor: "pointer", border: "none", background: "transparent",
        color: selected ? accent : T.muted,
      }}>{slug}</button>
      <button onClick={() => { setEditing(true); setEditVal(slug); }} title="重命名" style={{
        padding: "4px 5px", fontSize: 11, cursor: "pointer",
        border: "none", borderLeft: `1px solid ${selected ? accent : T.border2}`,
        background: "transparent", color: T.faint, lineHeight: 1,
      }}>✏️</button>
      <button onClick={confirmDelete} disabled={busy} title="删除" style={{
        padding: "4px 5px", fontSize: 11, cursor: "pointer",
        border: "none", borderLeft: `1px solid ${selected ? accent : T.border2}`,
        background: "transparent", color: T.faint, lineHeight: 1,
      }}>🗑</button>
    </div>
  );
}

// ── 标签选择器（多选 + 可新增 + 可编辑/删除）────────────────────
// options 必须是字符串数组 string[]
function TagSelector({ label, value = [], onChange, options = [], type, onRefreshOptions, onAddLocalOption }) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const toggle = (slug) => onChange(value.includes(slug) ? value.filter((v) => v !== slug) : [...value, slug]);
  // 确保 localOptions 始终是字符串数组
  const [localOptions, setLocalOptions] = useState(() => options.map(o => typeof o === "string" ? o : o.slug));

  const addNew = () => {
    const s = newVal.trim().toLowerCase().replace(/\s+/g, "-");
    if (!s) return;
    setLocalOptions(prev => prev.includes(s) ? prev : [...prev, s]);
    onAddLocalOption?.(type, s);
    if (!value.includes(s)) onChange([...value, s]);
    setNewVal(""); setAdding(false);
  };
  const handleRename = async (oldSlug, newSlug) => {
    const r = await taxRename(type, oldSlug, newSlug);
    if (r?.ok) {
      setLocalOptions(prev => prev.map(s => s === oldSlug ? newSlug : s));
      if (value.includes(oldSlug)) onChange(value.map((v) => v === oldSlug ? newSlug : v));
      onRefreshOptions?.();
    }
    return r;
  };
  const handleDelete = async (slug) => {
    const r = await taxDelete(type, slug);
    if (r?.ok) {
      setLocalOptions(prev => prev.filter(s => s !== slug));
      onChange(value.filter((v) => v !== slug));
      onRefreshOptions?.();
    }
    return r;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{label}</label>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {[...localOptions, ...value.filter(v => !localOptions.includes(v))].map((slug) => (
          <TagPill key={slug} slug={slug} selected={value.includes(slug)} accent={T.accent2}
            onSelect={() => toggle(slug)}
            onRename={(o, n) => handleRename(o, n)}
            onDelete={(s) => handleDelete(s)}
          />
        ))}
        {adding ? (
          <div style={{ display: "flex", gap: 4 }}>
            <input
              autoFocus value={newVal} onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addNew(); if (e.key === "Escape") setAdding(false); }}
              placeholder="新标签…" style={{
                padding: "4px 10px", borderRadius: T.radius.pill, fontSize: 12,
                background: T.surface3, border: `1px solid ${T.border2}`, color: T.ink, outline: "none", width: 100,
              }}
            />
            <Btn size="sm" onClick={addNew}>✓</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setAdding(false)}>✕</Btn>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{
            padding: "4px 12px", borderRadius: T.radius.pill, fontSize: 12, fontWeight: 700,
            cursor: "pointer", border: `1px dashed ${T.border2}`, background: "transparent", color: T.faint,
          }}>+ 新增</button>
        )}
      </div>
    </div>
  );
}

// ── 单选标签（难度）────────────────────────────────────
// options 必须是字符串数组 string[]
function SingleTagSelector({ label, value, onChange, options = [], type, onRefreshOptions, onAddLocalOption }) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  // 确保 localOptions 始终是字符串数组
  const [localOptions, setLocalOptions] = useState(() => options.map(o => typeof o === "string" ? o : o.slug));

  const addNew = () => {
    const s = newVal.trim().toLowerCase().replace(/\s+/g, "-");
    if (!s) return;
    setLocalOptions(prev => prev.includes(s) ? prev : [...prev, s]);
    onAddLocalOption?.(type, s);
    onChange(s);
    setNewVal(""); setAdding(false);
  };
  const handleRename = async (oldSlug, newSlug) => {
    const r = await taxRename(type, oldSlug, newSlug);
    if (r?.ok) {
      setLocalOptions(prev => prev.map(s => s === oldSlug ? newSlug : s));
      if (value === oldSlug) onChange(newSlug);
      onRefreshOptions?.();
    }
    return r;
  };
  const handleDelete = async (slug) => {
    const r = await taxDelete(type, slug);
    if (r?.ok) {
      setLocalOptions(prev => prev.filter(s => s !== slug));
      if (value === slug) onChange("");
      onRefreshOptions?.();
    }
    return r;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{label}</label>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {localOptions.map((slug) => (
          <TagPill key={slug} slug={slug} selected={value === slug} accent={T.warn}
            onSelect={() => onChange(value === slug ? "" : slug)}
            onRename={(o, n) => handleRename(o, n)}
            onDelete={(s) => handleDelete(s)}
          />
        ))}
        {adding ? (
          <div style={{ display: "flex", gap: 4 }}>
            <input
              autoFocus value={newVal} onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addNew(); if (e.key === "Escape") setAdding(false); }}
              placeholder="新难度…" style={{
                padding: "4px 10px", borderRadius: T.radius.pill, fontSize: 12,
                background: T.surface3, border: `1px solid ${T.border2}`, color: T.ink, outline: "none", width: 100,
              }}
            />
            <Btn size="sm" onClick={addNew}>✓</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setAdding(false)}>✕</Btn>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{
            padding: "4px 12px", borderRadius: T.radius.pill, fontSize: 12, fontWeight: 700,
            cursor: "pointer", border: `1px dashed ${T.border2}`, background: "transparent", color: T.faint,
          }}>+ 新增</button>
        )}
      </div>
    </div>
  );
}

// ── 视频表单（新增/编辑共用）──────────────────────────
// 把 Date 转成 datetime-local input 所需的本地时间字符串（避免时区偏差）
function toLocalDatetimeInput(date) {
  const d = new Date(date - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

function BatchForm({ taxonomies, onSave, onCancel, loading, onRefreshTaxonomies }) {
  const [form, setForm] = useState({
    access_tier: "",
    difficulty_slug: "",
    topic_slugs: [],
    channel_slugs: [],
    upload_time: toLocalDatetimeInput(new Date()),
  });
  // ✅ 直接用字符串数组，不再 map 成对象
  const [difficulties, setDifficulties] = useState(() => taxonomies.filter((t) => t.type === "difficulty").map((t) => t.slug));
  const [genres, setGenres] = useState(() => taxonomies.filter((t) => t.type === "genre").map((t) => t.slug));
  const [durations, setDurations] = useState(() => taxonomies.filter((t) => t.type === "duration").map((t) => t.slug));
  const [shows, setShows] = useState(() => taxonomies.filter((t) => t.type === "show").map((t) => t.slug));
  const [topics, setTopics] = useState(() => taxonomies.filter((t) => t.type === "topic").map((t) => t.slug));
  const [channels, setChannels] = useState(() => taxonomies.filter((t) => t.type === "channel").map((t) => t.slug));
  const toggleInArr = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const addLocalOption = (type, slug) => {
    if (type === "difficulty") setDifficulties(prev => prev.includes(slug) ? prev : [...prev, slug]);
    else if (type === "genre") setGenres(prev => prev.includes(slug) ? prev : [...prev, slug]);
    else if (type === "duration") setDurations(prev => prev.includes(slug) ? prev : [...prev, slug]);
    else if (type === "show") setShows(prev => prev.includes(slug) ? prev : [...prev, slug]);
  };
  function setF(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  const selectedGenre = form.topic_slugs.find(s => genres.includes(s)) || "";
  const selectedDuration = form.topic_slugs.find(s => durations.includes(s)) || "";

  function setGenre(slug) {
    const without = form.topic_slugs.filter(s => !genres.includes(s));
    setF("topic_slugs", slug ? [...without, slug] : without);
  }
  function setDuration(slug) {
    const without = form.topic_slugs.filter(s => !durations.includes(s));
    setF("topic_slugs", slug ? [...without, slug] : without);
  }

  // 美剧视频：topic_slugs 存 genre/duration，channel_slugs 存 show
  // 油管视频：topic_slugs 存 topic，channel_slugs 存 channel

  function handleSave() {
    const payload = {};
    if (form.access_tier) payload.access_tier = form.access_tier;
    if (form.difficulty_slug) payload.difficulty_slug = form.difficulty_slug;
    if (form.topic_slugs.length > 0) payload.topic_slugs = form.topic_slugs;
    if (form.channel_slugs.length > 0) payload.channel_slugs = form.channel_slugs;
    if (form.upload_time) payload.upload_time = form.upload_time;
    // 传 slug→type 映射，让后端知道每个 slug 的真实 type
    const taxonomyHints = {};
    genres.forEach(s => { taxonomyHints[s] = "topic"; });
    durations.forEach(s => { taxonomyHints[s] = "duration"; });
    shows.forEach(s => { taxonomyHints[s] = "channel"; });
    difficulties.forEach(s => { taxonomyHints[s] = "difficulty"; });
    payload.taxonomy_hints = taxonomyHints;
    onSave(payload);
  }

  const hasAnyValue = form.access_tier || form.difficulty_slug || form.topic_slugs.length > 0 || form.channel_slugs.length > 0 || form.upload_time;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: "10px 14px", background: `${T.warn}18`, borderRadius: T.radius.sm, border: `1px solid ${T.warn}40`, fontSize: 13, color: T.ink }}>
        ⚠️ 只有填写的字段才会被更新，留空的字段保持原值不变。
      </div>

      <Select
        label="访问权限"
        value={form.access_tier}
        onChange={(e) => setF("access_tier", e.target.value)}
        options={[{ value: "", label: "— 不修改 —" }, { value: "free", label: "🆓 免费" }, { value: "vip", label: "✨ 会员" }]}
      />

      <Input
        label="上传日期"
        value={form.upload_time}
        onChange={(e) => setF("upload_time", e.target.value)}
        type="date"
        placeholder="留空则不修改"
      />

      <SingleTagSelector
        label="难度"
        value={form.difficulty_slug}
        onChange={(v) => setF("difficulty_slug", v)}
        options={difficulties}
        type="difficulty"
        onRefreshOptions={onRefreshTaxonomies}
        onAddLocalOption={addLocalOption}
      />
      {/* ✅ 修复：直接传字符串数组，不再 map 成 { slug } 对象 */}
      <SingleTagSelector
        label="内容类型（单选）"
        value={selectedGenre}
        onChange={setGenre}
        options={genres}
        type="genre"
        onRefreshOptions={onRefreshTaxonomies}
        onAddLocalOption={addLocalOption}
      />
      <SingleTagSelector
        label="片段时长（单选）"
        value={selectedDuration}
        onChange={setDuration}
        options={durations}
        type="duration"
        onRefreshOptions={onRefreshTaxonomies}
        onAddLocalOption={addLocalOption}
      />
      <TagSelector
        label="剧名（多选）"
        value={form.channel_slugs}
        onChange={(v) => setF("channel_slugs", v)}
        options={shows}
        type="show"
        onRefreshOptions={onRefreshTaxonomies}
        onAddLocalOption={addLocalOption}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
        <Btn variant="ghost" onClick={onCancel}>取消</Btn>
        <Btn onClick={handleSave} disabled={loading || !hasAnyValue}>
          {loading ? "批量保存中…" : "💾 批量保存"}
        </Btn>
      </div>
    </div>
  );
}


// ── 油管视频标签多选（topic/channel）────────────────────
function MultiSelectDropdownAdmin({ label, options = [], selected = [], onToggle, type, onRefreshOptions, onAddLocalOption }) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [localOptions, setLocalOptions] = useState(() => options);

  const addNew = () => {
    const s = newVal.trim().toLowerCase().replace(/\s+/g, "-");
    if (!s) return;
    setLocalOptions(prev => prev.includes(s) ? prev : [...prev, s]);
    onAddLocalOption?.(type, s);
    if (!selected.includes(s)) onToggle(s);
    setNewVal(""); setAdding(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{label}</label>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {localOptions.map((slug) => (
          <button key={slug} onClick={() => onToggle(slug)} style={{
            padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            borderRadius: T.radius.pill, border: `1px solid ${selected.includes(slug) ? T.accent2 : T.border2}`,
            background: selected.includes(slug) ? `${T.accent2}22` : T.surface3,
            color: selected.includes(slug) ? T.accent2 : T.muted,
          }}>{slug}</button>
        ))}
        {adding ? (
          <div style={{ display: "flex", gap: 4 }}>
            <input autoFocus value={newVal} onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addNew(); if (e.key === "Escape") setAdding(false); }}
              placeholder="新标签…" style={{
                padding: "4px 10px", borderRadius: T.radius.pill, fontSize: 12,
                background: T.surface3, border: `1px solid ${T.border2}`, color: T.ink, outline: "none", width: 100,
              }} />
            <Btn size="sm" onClick={addNew}>✓</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setAdding(false)}>✕</Btn>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{
            padding: "4px 12px", borderRadius: T.radius.pill, fontSize: 12, fontWeight: 700,
            cursor: "pointer", border: `1px dashed ${T.border2}`, background: "transparent", color: T.faint,
          }}>+ 新增</button>
        )}
      </div>
    </div>
  );
}

function ClipForm({ initial = {}, taxonomies, onSave, onCancel, loading, onRefreshTaxonomies, isBatch = false }) {
  const [form, setForm] = useState({
    title: initial.title || "",
    description: initial.description || "",
    video_url: initial.video_url || "",
    cover_url: initial.cover_url || "",
    duration_sec: initial.duration_sec || "",
    access_tier: initial.access_tier || "free",
    site: initial.site || "yt",
    difficulty_slug: initial.difficulty_slug || "",
    topic_slugs: [
      ...(initial.topic_slugs || []),
      ...(initial.genre_slugs || []),
      ...(initial.duration_slugs || []),
    ],
    channel_slugs: [
      ...(initial.channel_slugs || []),
      ...(initial.show_slugs || []),
    ],
    details_json: initial.details_json || "",
    youtube_url: initial.youtube_url || "",
    upload_time: initial.upload_time
      ? toLocalDatetimeInput(new Date(initial.upload_time))
      : toLocalDatetimeInput(new Date()),
  });
  const [jsonStatus, setJsonStatus] = useState(null);
  // ✅ 直接用字符串数组
  const [difficulties, setDifficulties] = useState(() => taxonomies.filter((t) => t.type === "difficulty").map((t) => t.slug));
  const [genres, setGenres] = useState(() => taxonomies.filter((t) => t.type === "genre").map((t) => t.slug));
  const [durations, setDurations] = useState(() => taxonomies.filter((t) => t.type === "duration").map((t) => t.slug));
  const [shows, setShows] = useState(() => taxonomies.filter((t) => t.type === "show").map((t) => t.slug));
  const [topics, setTopics] = useState(() => taxonomies.filter((t) => t.type === "topic").map((t) => t.slug));
  const [channels, setChannels] = useState(() => taxonomies.filter((t) => t.type === "channel").map((t) => t.slug));
  const toggleInArr = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const handleRefreshTaxonomies = async () => { await onRefreshTaxonomies?.(); };
  const addLocalOption = (type, slug) => {
    if (type === "difficulty") setDifficulties(prev => prev.includes(slug) ? prev : [...prev, slug]);
    else if (type === "genre") setGenres(prev => prev.includes(slug) ? prev : [...prev, slug]);
    else if (type === "duration") setDurations(prev => prev.includes(slug) ? prev : [...prev, slug]);
    else if (type === "show") setShows(prev => prev.includes(slug) ? prev : [...prev, slug]);
    else if (type === "topic") setTopics(prev => prev.includes(slug) ? prev : [...prev, slug]);
    else if (type === "channel") setChannels(prev => prev.includes(slug) ? prev : [...prev, slug]);
  };

  function setF(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  const selectedGenre = form.topic_slugs.find(s => genres.includes(s)) || "";
  const selectedDuration = form.topic_slugs.find(s => durations.includes(s)) || "";

  function setGenre(slug) {
    const without = form.topic_slugs.filter(s => !genres.includes(s));
    setF("topic_slugs", slug ? [...without, slug] : without);
  }
  function setDuration(slug) {
    const without = form.topic_slugs.filter(s => !durations.includes(s));
    setF("topic_slugs", slug ? [...without, slug] : without);
  }

  // 美剧视频：topic_slugs 存 genre/duration，channel_slugs 存 show
  // 油管视频：topic_slugs 存 topic，channel_slugs 存 channel

  function validateJson(val) {
    if (!val.trim()) { setJsonStatus(null); return; }
    try { JSON.parse(val); setJsonStatus("ok"); }
    catch { setJsonStatus("error"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <Input label="标题 *" value={form.title} onChange={(e) => setF("title", e.target.value)} placeholder="视频标题" />
        </div>
        <Input label="视频 URL（HLS m3u8）*" value={form.video_url} onChange={(e) => setF("video_url", e.target.value)} placeholder="https://..." />
        <Input label="封面图 URL" value={form.cover_url} onChange={(e) => setF("cover_url", e.target.value)} placeholder="https://imagedelivery.net/..." />
        <Input label="时长（秒）" value={form.duration_sec} onChange={(e) => setF("duration_sec", e.target.value)} type="number" placeholder="如 342" />
        <Select label="访问权限" value={form.access_tier} onChange={(e) => setF("access_tier", e.target.value)}
          options={[{ value: "free", label: "🆓 免费" }, { value: "vip", label: "✨ 会员" }]} />
        <Select label="站点 *" value={form.site} onChange={(e) => setF("site", e.target.value)}
          options={[{ value: "yt", label: "🎥 油管博主" }, { value: "drama", label: "🎬 影视美剧" }]} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Input label="发布时间（定时发布）" value={form.upload_time} onChange={(e) => setF("upload_time", e.target.value)} type="datetime-local" />
          {form.upload_time && new Date(form.upload_time) > new Date() && (
            <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>⏰ 定时发布：将在设定时间后自动出现在前台</span>
          )}
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <Input label="描述" value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="视频描述（可选）" />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <Input label="原视频链接" value={form.youtube_url} onChange={(e) => setF("youtube_url", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        </div>
      </div>

      <SingleTagSelector
        label="难度"
        value={form.difficulty_slug}
        onChange={(v) => setF("difficulty_slug", v)}
        options={difficulties}
        type="difficulty"
        onRefreshOptions={handleRefreshTaxonomies}
        onAddLocalOption={addLocalOption}
      />

      {/* 美剧站标签 */}
      {form.site === "drama" ? (
        <>
          <SingleTagSelector
            label="内容类型（单选）"
            value={selectedGenre}
            onChange={setGenre}
            options={genres}
            type="genre"
            onRefreshOptions={handleRefreshTaxonomies}
            onAddLocalOption={addLocalOption}
          />
          <SingleTagSelector
            label="来源（单选）"
            value={selectedDuration}
            onChange={setDuration}
            options={durations}
            type="duration"
            onRefreshOptions={handleRefreshTaxonomies}
            onAddLocalOption={addLocalOption}
          />
          <TagSelector
            label="剧名（多选，可新增）"
            value={form.channel_slugs}
            onChange={(v) => setF("channel_slugs", v)}
            options={shows}
            type="show"
            onRefreshOptions={handleRefreshTaxonomies}
            onAddLocalOption={addLocalOption}
          />
        </>
      ) : (
        <>
          <MultiSelectDropdownAdmin
            label="视频话题"
            options={topics}
            selected={form.topic_slugs}
            onToggle={(slug) => setF("topic_slugs", toggleInArr(form.topic_slugs, slug))}
            type="topic"
            onRefreshOptions={handleRefreshTaxonomies}
            onAddLocalOption={addLocalOption}
          />
          <MultiSelectDropdownAdmin
            label="视频频道"
            options={channels}
            selected={form.channel_slugs}
            onToggle={(slug) => setF("channel_slugs", toggleInArr(form.channel_slugs, slug))}
            type="channel"
            onRefreshOptions={handleRefreshTaxonomies}
            onAddLocalOption={addLocalOption}
          />
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>
            details_json（字幕 + 词汇，粘贴 AI 返回的 JSON）
          </label>
          {jsonStatus === "ok" && <Chip color={T.good}>✓ JSON 有效</Chip>}
          {jsonStatus === "error" && <Chip color={T.danger}>✕ JSON 格式错误</Chip>}
        </div>
        <textarea
          value={form.details_json}
          onChange={(e) => { setF("details_json", e.target.value); validateJson(e.target.value); }}
          placeholder={initial.id ? "留空则不修改 details_json" : "粘贴 AI 返回的完整 JSON..."}
          rows={8}
          style={{
            width: "100%", boxSizing: "border-box", padding: "9px 12px",
            borderRadius: T.radius.sm, fontFamily: "monospace", fontSize: 12,
            background: T.surface3,
            border: `1px solid ${jsonStatus === "error" ? T.danger : jsonStatus === "ok" ? T.good : T.border2}`,
            color: T.ink, outline: "none", resize: "vertical",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
        <Btn variant="ghost" onClick={onCancel}>取消</Btn>
        <Btn
          onClick={() => {
            // 构建 slug→type 提示，让后端知道每个 slug 的真实 type
            const taxonomyHints = {};
            genres.forEach(s => { taxonomyHints[s] = "genre"; });
            durations.forEach(s => { taxonomyHints[s] = "duration"; });
            shows.forEach(s => { taxonomyHints[s] = "show"; });
            difficulties.forEach(s => { taxonomyHints[s] = "difficulty"; });
            topics.forEach(s => { taxonomyHints[s] = "topic"; });
            channels.forEach(s => { taxonomyHints[s] = "channel"; });
            onSave({ ...form, taxonomy_hints: taxonomyHints, site: form.site || "yt" });
          }}
          disabled={loading || (!isBatch && (!form.title || !form.video_url)) || jsonStatus === "error"}
        >{loading ? (isBatch ? "批量保存中…" : "保存中…") : (isBatch ? "💾 批量保存" : "💾 保存视频")}</Btn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 模块一：数据概览
// ══════════════════════════════════════════════════════

function SettingsPanel() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
  const [buyMode, setBuyMode] = useState("subscription");
  const [lifetimePrice, setLifetimePrice] = useState("38.80");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/site_config?key=buy_mode`)
      .then(r => r.json()).then(d => { if (d?.value) setBuyMode(d.value); }).catch(() => {});
    fetch(`${API_BASE}/api/site_config?key=lifetime_price`)
      .then(r => r.json()).then(d => { if (d?.value) setLifetimePrice(d.value); }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const token = localStorage.getItem("sb_access_token");
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      await fetch(`${API_BASE}/api/site_config`, {
        method: "POST", headers,
        body: JSON.stringify({ key: "buy_mode", value: buyMode }),
      });
      await fetch(`${API_BASE}/api/site_config`, {
        method: "POST", headers,
        body: JSON.stringify({ key: "lifetime_price", value: lifetimePrice }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 24 }}>⚙️ 购买页设置</div>
      <div style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>购买页模式</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { value: "subscription", label: "套餐订阅页", desc: "月卡/季卡/年卡选择" },
            { value: "lifetime", label: "永久卡页", desc: "一次性永久买断" },
          ].map(opt => (
            <div key={opt.value} onClick={() => setBuyMode(opt.value)} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${buyMode === opt.value ? "#4f46e5" : "rgba(15,23,42,0.08)"}`,
              background: buyMode === opt.value ? "rgba(79,70,229,0.04)" : "#fff",
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${buyMode === opt.value ? "#4f46e5" : "rgba(15,23,42,0.3)"}`,
                background: buyMode === opt.value ? "#4f46e5" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {buyMode === opt.value && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "rgba(11,18,32,0.5)", marginTop: 2 }}>{opt.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "#fff", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>永久卡定价（元）</div>
        <input type="number" value={lifetimePrice} onChange={e => setLifetimePrice(e.target.value)} step="0.01"
          style={{ width: "100%", padding: "10px 14px", fontSize: 16, fontWeight: 700, border: "1px solid rgba(15,23,42,0.15)", borderRadius: 10, outline: "none", boxSizing: "border-box" }} />
      </div>
      <button onClick={handleSave} disabled={saving} style={{
        width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
        background: saving ? "rgba(79,70,229,0.5)" : "#4f46e5",
        color: "#fff", fontSize: 15, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer",
      }}>
        {saved ? "✅ 已保存" : saving ? "保存中..." : "保存设置"}
      </button>
    </div>
  );
}

function OverviewPanel({ stats }) {
  const [live, setLive] = useState(stats);
  const refresh = useCallback(async () => {
    const res = await apiGet("stats");
    if (res.ok) setLive(res.stats);
  }, []);

  const cards = [
    { label: "注册用户", value: live.userCount, emoji: "👤", color: T.accent },
    { label: "活跃会员", value: live.memberCount, emoji: "✨", color: T.vip },
    { label: "视频总数", value: live.clipCount, emoji: "🎬", color: T.good },
    { label: "有效兑换码", value: live.codeCount, emoji: "🎫", color: T.warn },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: T.ink, margin: 0 }}>📊 数据概览</h2>
        <Btn size="sm" variant="ghost" onClick={refresh}>刷新</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
        {cards.map((c) => (
          <div key={c.label} style={{
            background: T.surface2, borderRadius: T.radius.lg,
            border: `1px solid ${T.border}`, padding: "20px 18px",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{c.emoji}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: c.color, lineHeight: 1 }}>{live[c.label.includes("注册") ? "userCount" : c.label.includes("会员") ? "memberCount" : c.label.includes("视频") ? "clipCount" : "codeCount"]}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: T.surface2, borderRadius: T.radius.lg, border: `1px solid ${T.border}`, padding: "16px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.muted, marginBottom: 12 }}>💡 快捷操作</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <a href="/admin#clips" style={{ padding: "7px 16px", borderRadius: T.radius.pill, background: `${T.accent}22`, color: T.accent2, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>+ 上传新视频</a>
          <a href="/admin#codes" style={{ padding: "7px 16px", borderRadius: T.radius.pill, background: `${T.warn}22`, color: T.warn, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>+ 生成兑换码</a>
          <a href="/admin#users" style={{ padding: "7px 16px", borderRadius: T.radius.pill, background: `${T.good}22`, color: T.good, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>查看用户</a>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 模块二：视频管理
// ══════════════════════════════════════════════════════
function ClipsPanel({ initialClips, taxonomies: initialTaxonomiesFromProps, onToast }) {
  const [clips, setClips] = useState(initialClips);
  const [taxonomies, setTaxonomies] = useState(initialTaxonomiesFromProps);
  const [showForm, setShowForm] = useState(false);
  const [editClip, setEditClip] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [duplicating, setDuplicating] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(null);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [loadingMore, setLoadingMore] = useState(false);

  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState(new Set());
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);

  const refreshTaxonomies = async () => {
    try {
      const r = await fetch("/admin-api?type=taxonomies", { headers: { Authorization: `Bearer ${await getToken()}` } });
      const d = await r.json();
      if (d?.ok && d.taxonomies) setTaxonomies(d.taxonomies);
    } catch {}
  };

  const filtered = clips.filter((c) => {
    if (siteFilter !== "all" && c.site !== siteFilter) return false;
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageClips = filtered.slice(pageStart, pageStart + pageSize);

  const prevSearch = useState(search)[0];
  if (prevSearch !== search && currentPage !== 1) setCurrentPage(1);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (pageClips.every((c) => selected.has(c.id))) {
      setSelected((prev) => { const next = new Set(prev); pageClips.forEach((c) => next.delete(c.id)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); pageClips.forEach((c) => next.add(c.id)); return next; });
    }
  }
  const allPageSelected = pageClips.length > 0 && pageClips.every((c) => selected.has(c.id));

  async function handleSave(form) {
    setSaving(true);
    const action = editClip ? "clip_update" : "clip_create";
    const payload = editClip ? { ...form, id: editClip.id } : form;
    const res = await api(action, payload);
    setSaving(false);
    if (!res.ok) { onToast(res.error || "保存失败", "error"); return; }
    onToast(editClip ? "视频已更新 ✓" : "视频已添加 ✓");
    setShowForm(false); setEditClip(null);
    const r = await apiGet("clips", { offset: 0 });
    if (r.ok) setClips(r.clips);
  }

  async function handleBatchSave(form) {
    if (selected.size === 0) return;
    if (!confirm(`确认批量更新 ${selected.size} 个视频？`)) return;
    setBatchSaving(true);
    let successCount = 0;
    for (const id of selected) {
      const res = await api("clip_update", { ...form, id });
      if (res.ok) successCount++;
    }
    setBatchSaving(false);
    onToast(`批量更新完成：${successCount}/${selected.size} 个成功 ✓`);
    setShowBatchForm(false);
    setSelected(new Set());
    const r = await apiGet("clips", { offset: 0 });
    if (r.ok) setClips(r.clips);
  }

  async function handleEdit(clip) {
    const clipCopy = { ...clip };
    const [r] = await Promise.all([
      api("clip_get_details", { id: clipCopy.id }),
      refreshTaxonomies(),
    ]);
    if (r.ok && r.details_json) {
      clipCopy._details_json = JSON.stringify(r.details_json, null, 2);
    }
    setEditClip(clipCopy);
    setShowForm(true);
  }

  async function handleDelete(clip) {
    if (!confirm(`确认删除「${clip.title}」？此操作不可恢复`)) return;
    setDeleting(clip.id);
    const res = await api("clip_delete", { id: clip.id });
    setDeleting(null);
    if (!res.ok) { onToast(res.error || "删除失败", "error"); return; }
    onToast("已删除");
    setClips((prev) => prev.filter((c) => c.id !== clip.id));
  }

  async function loadMore() {
    setLoadingMore(true);
    const r = await apiGet("clips", { offset: clips.length });
    setLoadingMore(false);
    if (r.ok) setClips((prev) => [...prev, ...r.clips]);
  }

  async function handleDuplicate(clip) {
    if (!confirm(`确认复制「${clip.title}」？将新增一条完全相同的视频。`)) return;
    setDuplicating(clip.id);
    const dr = await api("clip_get_details", { id: clip.id });
    const taxonomyHints = {};
    (clip.topic_slugs || []).forEach(s => { taxonomyHints[s] = "genre"; });
    (clip.channel_slugs || []).forEach(s => { taxonomyHints[s] = "show"; });
    if (clip.difficulty_slug) taxonomyHints[clip.difficulty_slug] = "difficulty";
    const res = await api("clip_create", {
      title: clip.title,
      description: clip.description || "",
      video_url: clip.video_url || "",
      cover_url: clip.cover_url || "",
      duration_sec: clip.duration_sec || "",
      access_tier: clip.access_tier || "free",
      difficulty_slug: clip.difficulty_slug || "",
      topic_slugs: clip.topic_slugs || [],
      channel_slugs: clip.channel_slugs || [],
      upload_time: clip.upload_time
        ? toLocalDatetimeInput(new Date(clip.upload_time))
        : new Date().toISOString().slice(0, 10),
      youtube_url: clip.youtube_url || "",
      details_json: dr.ok && dr.details_json ? JSON.stringify(dr.details_json) : "",
      taxonomy_hints: taxonomyHints,
    });
    setDuplicating(null);
    if (!res.ok) { onToast(res.error || "复制失败", "error"); return; }
    onToast(`已复制「${clip.title}」✓`);
    const r = await apiGet("clips", { offset: 0 });
    if (r.ok) setClips(r.clips);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: T.ink, margin: 0, flex: 1 }}>🎬 视频管理</h2>
        <div style={{ display: "flex", gap: 4 }}>
          {[["all","全部"], ["yt","🎥 油管"], ["drama","🎬 美剧"]].map(([v,l]) => (
            <button key={v} onClick={() => { setSiteFilter(v); setCurrentPage(1); }} style={{
              padding: "6px 14px", borderRadius: T.radius.pill, fontSize: 12, fontWeight: 700,
              cursor: "pointer", border: `1px solid ${siteFilter === v ? T.accent : T.border2}`,
              background: siteFilter === v ? `${T.accent}22` : "transparent",
              color: siteFilter === v ? T.accent2 : T.muted,
            }}>{l}</button>
          ))}
        </div>
        <input
          value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          placeholder="搜索标题…"
          style={{
            padding: "7px 14px", borderRadius: T.radius.pill, fontSize: 13,
            background: T.surface2, border: `1px solid ${T.border2}`, color: T.ink, outline: "none", width: 200,
          }}
        />
        {selected.size > 0 && (
          <Btn variant="ghost" onClick={() => { refreshTaxonomies(); setShowBatchForm(true); }}>
            ✏️ 批量编辑 ({selected.size})
          </Btn>
        )}
        <Btn onClick={() => { setEditClip(null); setShowForm(true); }}>+ 上传新视频</Btn>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: T.faint }}>
          共 {filtered.length} 个视频，第 {safePage}/{totalPages} 页
          {selected.size > 0 && `，已选 ${selected.size} 个`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <span style={{ fontSize: 12, color: T.muted }}>每页</span>
          {[10, 20, 50, 100].map((n) => (
            <button key={n} onClick={() => { setPageSize(n); setCurrentPage(1); }} style={{
              padding: "3px 10px", borderRadius: T.radius.pill, fontSize: 12, cursor: "pointer",
              background: pageSize === n ? T.accent : T.surface2,
              color: pageSize === n ? "#fff" : T.muted,
              border: `1px solid ${pageSize === n ? T.accent : T.border2}`,
              fontWeight: pageSize === n ? 700 : 400,
            }}>{n}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} style={{
            padding: "3px 8px", borderRadius: T.radius.sm, fontSize: 12, cursor: safePage === 1 ? "default" : "pointer",
            background: T.surface2, border: `1px solid ${T.border2}`, color: safePage === 1 ? T.faint : T.ink,
          }}>«</button>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} style={{
            padding: "3px 10px", borderRadius: T.radius.sm, fontSize: 12, cursor: safePage === 1 ? "default" : "pointer",
            background: T.surface2, border: `1px solid ${T.border2}`, color: safePage === 1 ? T.faint : T.ink,
          }}>‹ 上一页</button>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{
            padding: "3px 10px", borderRadius: T.radius.sm, fontSize: 12, cursor: safePage === totalPages ? "default" : "pointer",
            background: T.surface2, border: `1px solid ${T.border2}`, color: safePage === totalPages ? T.faint : T.ink,
          }}>下一页 ›</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} style={{
            padding: "3px 8px", borderRadius: T.radius.sm, fontSize: 12, cursor: safePage === totalPages ? "default" : "pointer",
            background: T.surface2, border: `1px solid ${T.border2}`, color: safePage === totalPages ? T.faint : T.ink,
          }}>»</button>
        </div>
      </div>

      {pageClips.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
          <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll}
            style={{ width: 16, height: 16, cursor: "pointer" }} />
          <span style={{ fontSize: 12, color: T.muted, cursor: "pointer" }} onClick={toggleSelectAll}>
            {allPageSelected ? "取消全选当前页" : `全选当前页（${pageClips.length} 个）`}
          </span>
          {selected.size > 0 && (
            <span style={{ fontSize: 12, color: T.faint, marginLeft: 8 }}>
              · 已选 {selected.size} 个（跨页保留）
            </span>
          )}
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())} style={{
              fontSize: 11, color: T.danger, background: "none", border: "none", cursor: "pointer", padding: "0 4px",
            }}>清空选择</button>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pageClips.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: T.faint }}>暂无视频</div>
        )}
        {pageClips.map((clip) => (
          <div key={clip.id} style={{
            background: selected.has(clip.id) ? `${T.accent}12` : T.surface2,
            borderRadius: T.radius.md,
            border: `1px solid ${selected.has(clip.id) ? T.accent : T.border}`,
            padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 12,
            transition: "all 100ms",
          }}>
            <input type="checkbox" checked={selected.has(clip.id)} onChange={() => toggleSelect(clip.id)}
              style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
            {clip.cover_url && (
              <img src={clip.cover_url} alt="" style={{ width: 56, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {clip.title}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <Chip color={clip.site === "drama" ? "#f472b6" : T.accent}>
                  {clip.site === "drama" ? "🎬 美剧" : "🎥 油管"}
                </Chip>
                <Chip color={clip.access_tier === "vip" ? T.vip : T.good}>
                  {clip.access_tier === "vip" ? "✨ 会员" : "🆓 免费"}
                </Chip>
                {clip.difficulty_slug && <Chip color={T.warn}>{clip.difficulty_slug}</Chip>}
                {clip.site === "drama" ? (
                  <>
                    {(clip.duration_slugs || []).map((s) => <Chip key={s} color={T.accent}>{s}</Chip>)}
                    {(clip.genre_slugs || []).map((s) => <Chip key={s} color="#f59e0b">{s}</Chip>)}
                    {(clip.show_slugs || []).map((s) => <Chip key={s} color={T.muted}>{s}</Chip>)}
                  </>
                ) : (
                  <>
                    {(clip.topic_slugs || []).map((s) => <Chip key={s} color={T.accent}>{s}</Chip>)}
                    {(clip.channel_slugs || []).map((s) => <Chip key={s} color={T.muted}>{s}</Chip>)}
                  </>
                )}
                <span style={{ fontSize: 11, color: clip.upload_time && new Date(clip.upload_time) > new Date() ? "#f59e0b" : T.faint }}>
                  {clip.upload_time && new Date(clip.upload_time) > new Date() ? "⏰ 定时 " : ""}{fmt(clip.upload_time || clip.created_at)}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Btn size="sm" variant="ghost" onClick={() => handleEdit(clip)} disabled={loadingEdit === clip.id}>{loadingEdit === clip.id ? "加载中…" : "编辑"}</Btn>
              <Btn size="sm" variant="ghost" onClick={() => handleDuplicate(clip)} disabled={duplicating === clip.id} style={{ color: T.accent2 }}>{duplicating === clip.id ? "复制中…" : "复制"}</Btn>
              <Btn size="sm" variant="danger" onClick={() => handleDelete(clip)} disabled={deleting === clip.id}>
                {deleting === clip.id ? "…" : "删除"}
              </Btn>
            </div>
          </div>
        ))}
      </div>

      {clips.length % 50 === 0 && clips.length > 0 && (
        <div style={{ textAlign: "center" }}>
          <Btn variant="ghost" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "加载中…" : "加载更多视频（后台共" + clips.length + "条，点击加载更多）"}
          </Btn>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditClip(null); }}
        title={editClip ? `✏️ 编辑视频 · ${editClip.title}` : "📤 上传新视频"}
        width={700}
      >
        <ClipForm
          initial={editClip ? {
            ...editClip,
            details_json: editClip._details_json || "",
          } : {}}
          taxonomies={taxonomies}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditClip(null); }}
          loading={saving}
          onRefreshTaxonomies={refreshTaxonomies}
        />
      </Modal>

      <Modal
        open={showBatchForm}
        onClose={() => setShowBatchForm(false)}
        title={`✏️ 批量编辑 · 已选 ${selected.size} 个视频`}
        width={560}
      >
        <BatchForm
          taxonomies={taxonomies}
          onSave={handleBatchSave}
          onCancel={() => setShowBatchForm(false)}
          loading={batchSaving}
          onRefreshTaxonomies={refreshTaxonomies}
        />
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 模块三：兑换码管理
// ══════════════════════════════════════════════════════
function CodesPanel({ initialCodes, onToast }) {
  const [codes, setCodes] = useState(initialCodes);
  const [showGen, setShowGen] = useState(false);
  const [genOpts, setGenOpts] = useState({ plan: "month", days: "30", count: "100", site: "yt" });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [filter, setFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [search, setSearch] = useState("");

  const planOptions = [
    { value: "trial", label: "试用卡 (自定义天数)", days: "3" },
    { value: "month", label: "月卡 (30天)", days: "30" },
    { value: "quarter", label: "季卡 (90天)", days: "90" },
    { value: "year", label: "年卡 (365天)", days: "365" },
    { value: "lifetime", label: "永久卡 (0天)", days: "0" },
  ];

  const filtered = codes.filter((c) => {
    const used = c.used_count >= (c.max_uses || 1);
    if (filter === "active" && !(c.is_active && !used)) return false;
    if (filter === "used" && !used) return false;
    if (filter === "inactive" && c.is_active) return false;
    if (planFilter === "trial" && !(c.days > 0 && c.days < 30)) return false;
    if (planFilter === "month" && !(c.days >= 30 && c.days < 90)) return false;
    if (planFilter === "quarter" && !(c.days >= 90 && c.days < 365)) return false;
    if (planFilter === "year" && !(c.days >= 365)) return false;
    if (planFilter === "lifetime" && c.days !== 0) return false;
    if (search && !c.code.includes(search.toUpperCase())) return false;
    return true;
  });

  async function handleGenerate() {
    const days = Number(genOpts.days);
    // 试用卡：1天到29天
    if (genOpts.plan === "trial") {
      if (!days || days < 1 || days >= 30) {
        onToast("试用卡天数需在 1~29 天之间", "error"); return;
      }
    }
    setGenerating(true);
    const res = await api("codes_generate", {
      plan: genOpts.plan,
      days: days,
      count: Number(genOpts.count),
      site: genOpts.site || "yt",
    });
    setGenerating(false);
    if (!res.ok) { onToast(res.error || "生成失败", "error"); return; }
    setGenerated(res.codes);
    onToast(`已生成 ${res.count} 个兑换码 ✓`);
    setCodes((prev) => {
      const newRows = res.codes.map((code) => ({
        code, plan: genOpts.plan, days: Number(genOpts.days),
        max_uses: 1, used_count: 0, is_active: true,
        created_at: new Date().toISOString(),
        site: genOpts.site || "yt",
      }));
      return [...newRows, ...prev];
    });
  }

  async function handleToggle(c) {
    const res = await api("code_toggle", { id: c.code, is_active: !c.is_active });
    if (!res.ok) { onToast(res.error || "操作失败", "error"); return; }
    setCodes((prev) => prev.map((x) => x.code === c.code ? { ...x, is_active: !x.is_active } : x));
    onToast(c.is_active ? "已停用" : "已启用");
  }

  function handleCopyAll() {
    if (!generated) return;
    copyText(generated.join("\n"));
    onToast("已复制到剪贴板 ✓");
  }

  function handleCopyFiltered() {
    const visibleCodes = filtered.slice(0, 100).map((c) => c.code);
    if (!visibleCodes.length) return;
    copyText(visibleCodes.join("\n"));
    onToast(`已复制 ${visibleCodes.length} 个兑换码 ✓`);
  }

  const usedCount = codes.filter((c) => c.used_count >= (c.max_uses || 1)).length;
  const activeCount = codes.filter((c) => c.is_active && c.used_count < (c.max_uses || 1)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: T.ink, margin: 0, flex: 1 }}>🎫 兑换码管理</h2>
        <div style={{ display: "flex", gap: 8, fontSize: 12, color: T.muted }}>
          <span>可用 <b style={{ color: T.good }}>{activeCount}</b></span>
          <span>已用 <b style={{ color: T.warn }}>{usedCount}</b></span>
          <span>总计 <b style={{ color: T.ink }}>{codes.length}</b></span>
        </div>
        <Btn onClick={() => setShowGen(true)}>+ 批量生成</Btn>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {[["all","全部"], ["active","可用"], ["used","已用完"], ["inactive","已停用"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding: "5px 14px", borderRadius: T.radius.pill, fontSize: 12, fontWeight: 700,
            cursor: "pointer", border: `1px solid ${filter === v ? T.accent : T.border2}`,
            background: filter === v ? `${T.accent}22` : "transparent",
            color: filter === v ? T.accent2 : T.muted,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {[["all","全部卡种"], ["trial","试用卡"], ["month","月卡"], ["quarter","季卡"], ["year","年卡"], ["lifetime","永久卡"]].map(([v,l]) => (
          <button key={v} onClick={() => setPlanFilter(v)} style={{
            padding: "5px 14px", borderRadius: T.radius.pill, fontSize: 12, fontWeight: 700,
            cursor: "pointer", border: `1px solid ${planFilter === v ? T.vip : T.border2}`,
            background: planFilter === v ? `${T.vip}22` : "transparent",
            color: planFilter === v ? T.vip : T.muted,
          }}>{l}</button>
        ))}
        <input
          className="codes-search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索码…"
          style={{
            padding: "5px 12px", borderRadius: T.radius.pill, fontSize: 12,
            background: T.surface2, border: `1px solid ${T.border2}`, color: T.ink, outline: "none", width: 140,
          }}
        />
        <Btn size="sm" variant="ghost" onClick={handleCopyFiltered}>
          📋 复制当前列表（{Math.min(filtered.length, 100)}个）
        </Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.slice(0, 100).map((c, i) => {
          const used = c.used_count >= (c.max_uses || 1);
          const chipColor = c.days === 0 ? T.vip : c.days >= 365 ? T.vip : c.days >= 90 ? T.warn : T.accent;
          return (
            <div key={c.code || i} className="code-row" style={{
              background: T.surface2, borderRadius: T.radius.sm,
              border: `1px solid ${T.border}`, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 12, opacity: !c.is_active ? 0.5 : 1,
            }}>
              <code style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: T.ink, flex: 1 }}>
                {c.code}
              </code>
              <Chip color={chipColor}>{planLabel(c.days)}</Chip>
              {used
                ? <Chip color={T.muted}>已用完</Chip>
                : c.is_active
                  ? <Chip color={T.good}>可用</Chip>
                  : <Chip color={T.danger}>已停用</Chip>
              }
              <span className="code-date" style={{ fontSize: 11, color: T.faint }}>{fmt(c.created_at)}</span>
              <Btn size="sm" variant="ghost" onClick={() => { copyText(c.code); onToast("已复制 ✓"); }}>复制</Btn>
              {c.code && !used && (
                <Btn size="sm" variant={c.is_active ? "danger" : "success"} onClick={() => handleToggle(c)}>
                  {c.is_active ? "停用" : "启用"}
                </Btn>
              )}
            </div>
          );
        })}
        {filtered.length > 100 && (
          <div style={{ textAlign: "center", fontSize: 12, color: T.faint, padding: 8 }}>
            仅显示前100条，请使用搜索筛选
          </div>
        )}
      </div>

      <Modal open={showGen} onClose={() => { setShowGen(false); setGenerated(null); }} title="🎫 批量生成兑换码" width={520}>
        {generated ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "12px 16px", background: `${T.good}15`, borderRadius: T.radius.md, border: `1px solid ${T.good}33` }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: T.good }}>✓ 已生成 {generated.length} 个兑换码</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>已自动添加到数据库，点击下方按钮复制全部</div>
            </div>
            <textarea
              readOnly value={generated.join("\n")} rows={10}
              style={{ width: "100%", boxSizing: "border-box", padding: 10, fontFamily: "monospace", fontSize: 12, background: T.surface3, border: `1px solid ${T.border2}`, borderRadius: T.radius.sm, color: T.ink, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => { setShowGen(false); setGenerated(null); }}>关闭</Btn>
              <Btn onClick={handleCopyAll}>📋 复制全部</Btn>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Select label="站点（兑换码适用哪个站的会员）"
              value={genOpts.site}
              onChange={(e) => setGenOpts((g) => ({ ...g, site: e.target.value }))}
              options={[{ value: "yt", label: "🎥 油管博主会员" }, { value: "drama", label: "🎬 影视美剧会员" }]}
            />
            <Select label="套餐类型"
              value={genOpts.plan}
              onChange={(e) => {
                const opt = planOptions.find((o) => o.value === e.target.value);
                setGenOpts((g) => ({ ...g, plan: e.target.value, days: opt?.days || "30" }));
              }}
              options={planOptions}
            />
            <Input label="天数（自动根据套餐填入，可修改；永久卡为0）" value={genOpts.days} onChange={(e) => setGenOpts((g) => ({ ...g, days: e.target.value }))} type="number" placeholder="30" />
            <Input label="生成数量（最多500）" value={genOpts.count} onChange={(e) => setGenOpts((g) => ({ ...g, count: e.target.value }))} type="number" placeholder="100" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Btn variant="ghost" onClick={() => setShowGen(false)}>取消</Btn>
              <Btn onClick={handleGenerate} disabled={generating}>
                {generating ? "生成中…" : `🎲 生成 ${genOpts.count} 个`}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 模块四：用户管理
// ══════════════════════════════════════════════════════
function UsersPanel({ initialUsers, onToast }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [memberModal, setMemberModal] = useState(null);
  const [memberDays, setMemberDays] = useState("30");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [detailModal, setDetailModal] = useState(null); // { user, data, loading }

  async function openDetail(u) {
    setDetailModal({ user: u, data: null, loading: true });
    const res = await api("user_detail", { user_id: u.id });
    if (res.ok) {
      setDetailModal({ user: u, data: res, loading: false });
    } else {
      setDetailModal({ user: u, data: null, loading: false });
      onToast("加载失败", "error");
    }
  }

  async function handleSearch(q) {
    setSearch(q);
    if (!q.trim()) { setUsers(initialUsers); return; }
    setSearching(true);
    const res = await api("users_search", { query: q });
    setSearching(false);
    if (res.ok) setUsers(res.users);
  }

  async function handleMemberSave() {
    setSaving(true);
    const res = await api("member_set", { user_id: memberModal.id, days: Number(memberDays) });
    setSaving(false);
    if (!res.ok) { onToast(res.error || "操作失败", "error"); return; }
    const d = Number(memberDays);
    const inferredPlan = d === 0 ? "lifetime" : d >= 365 ? "year" : d >= 90 ? "quarter" : "month";
    const expiryText = res.expires_at ? fmt(res.expires_at) : "永久";
    onToast(`会员已更新，到期：${expiryText} ✓`);
    setUsers((prev) => prev.map((u) =>
      u.id === memberModal.id
        ? { ...u, subscription: { status: "active", expires_at: res.expires_at, plan: inferredPlan } }
        : u
    ));
    setMemberModal(null);
  }

  async function handleMemberStop() {
    if (!confirm(`确认立即停用「${memberModal.username || memberModal.email}」的会员？`)) return;
    setSaving(true);
    const res = await api("member_stop", { user_id: memberModal.id });
    setSaving(false);
    if (!res.ok) { onToast(res.error || "操作失败", "error"); return; }
    onToast("会员已停用 ✓");
    setUsers((prev) => prev.map((u) =>
      u.id === memberModal.id
        ? { ...u, subscription: { ...u.subscription, status: "inactive", expires_at: new Date().toISOString() } }
        : u
    ));
    setMemberModal(null);
  }

  const filtered = users.filter((u) => {
    if (filter === "member" && !isMemberActive(u.subscription)) return false;
    if (filter === "expired" && isMemberActive(u.subscription)) return false;
    if (planFilter !== "all") {
      const days = u.used_plan?.days;
      if (planFilter === "trial" && !(days > 0 && days < 30)) return false;
      if (planFilter === "month" && !(days >= 30 && days < 90)) return false;
      if (planFilter === "quarter" && !(days >= 90 && days < 365)) return false;
      if (planFilter === "year" && !(days >= 365)) return false;
      if (planFilter === "lifetime" && days !== 0) return false;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: T.ink, margin: 0, flex: 1 }}>👤 用户管理</h2>
        <input
          className="users-search" value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="搜索邮箱 / 用户名…"
          style={{
            padding: "7px 14px", borderRadius: T.radius.pill, fontSize: 13,
            background: T.surface2, border: `1px solid ${T.border2}`, color: T.ink, outline: "none", width: 220,
          }}
        />
        {searching && <span style={{ fontSize: 12, color: T.muted }}>搜索中…</span>}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[["all","全部"], ["member","会员中"], ["expired","已过期"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding: "5px 14px", borderRadius: T.radius.pill, fontSize: 12, fontWeight: 700,
            cursor: "pointer", border: `1px solid ${filter === v ? T.accent : T.border2}`,
            background: filter === v ? `${T.accent}22` : "transparent",
            color: filter === v ? T.accent2 : T.muted,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[["all","全部卡种"], ["trial","试用卡"], ["month","月卡"], ["quarter","季卡"], ["year","年卡"], ["lifetime","永久卡"]].map(([v,l]) => (
          <button key={v} onClick={() => setPlanFilter(v)} style={{
            padding: "5px 14px", borderRadius: T.radius.pill, fontSize: 12, fontWeight: 700,
            cursor: "pointer", border: `1px solid ${planFilter === v ? T.vip : T.border2}`,
            background: planFilter === v ? `${T.vip}22` : "transparent",
            color: planFilter === v ? T.vip : T.muted,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: T.faint }}>暂无用户</div>
        )}
        {filtered.map((u) => {
          const active = isMemberActive(u.subscription);
          const expired = u.subscription && !active;
          return (
            <div key={u.id} className="user-row" style={{
              background: T.surface2, borderRadius: T.radius.md,
              border: `1px solid ${T.border}`, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${T.accent}, ${T.vip})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 900, color: "#fff",
              }}>
                {(u.username || u.email || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>
                    {u.username || u.email?.split("@")[0] || "匿名"}
                  </span>
                  {u.email && (
                    <span style={{ fontSize: 12, color: T.faint }}>{u.email}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  {active && <Chip color={T.vip}>✨ 会员中</Chip>}
                  {expired && <Chip color={T.danger}>已过期</Chip>}
                  {!u.subscription && <Chip color={T.muted}>普通用户</Chip>}
                  {u.subscription && (
                    <span style={{ fontSize: 11, color: T.faint }}>
                      到期：{u.subscription.expires_at ? fmt(u.subscription.expires_at) : "永久"}
                    </span>
                  )}
                  {u.used_code && (
                    <span style={{ fontSize: 11, color: T.faint }}>
                      注册码：<code style={{ fontFamily: "monospace", color: T.muted }}>{u.used_code}</code>
                    </span>
                  )}
                  {u.used_plan && (() => {
                    const { plan, days } = u.used_plan;
                    const label = days === 0 ? "永久卡" : days >= 365 ? "年卡" : days >= 90 ? "季卡" : days >= 30 ? "月卡" : `试用卡(${days}天)`;
                    const color = days === 0 ? T.vip : days >= 365 ? T.vip : days >= 90 ? T.warn : days >= 30 ? T.accent : T.good;
                    return <Chip color={color}>{label}</Chip>;
                  })()}
                  <span style={{ fontSize: 11, color: T.faint }}>注册：{fmtFull(u.created_at)}</span>
                </div>
              </div>
              <div className="user-row-actions" style={{ display: "flex", gap: 6 }}>
                <Btn size="sm" variant="ghost" onClick={() => openDetail(u)}>
                  查看详情
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => { setMemberModal(u); setMemberDays("30"); }}>
                  调整会员
                </Btn>
              </div>
            </div>
          );
        })}
      </div>

      {/* 用户详情弹窗 */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title="👤 用户详情" width={560}>
        {detailModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ padding: "10px 14px", background: T.surface3, borderRadius: T.radius.md }}>
              <div style={{ fontWeight: 800, color: T.ink }}>{detailModal.user.username || detailModal.user.email}</div>
              <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>ID: {detailModal.user.id?.slice(0, 16)}...</div>
            </div>
            {detailModal.loading && <div style={{ textAlign: "center", padding: 24, color: T.faint }}>加载中...</div>}
            {!detailModal.loading && !detailModal.data && <div style={{ color: T.warn, fontSize: 13 }}>加载失败</div>}
            {detailModal.data && (() => {
              const d = detailModal.data;
              const GAME_NAMES = { matchMadness: "配对狂热", fillBlank: "填词挑战", listenWrite: "听写练习" };
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* 游戏分数 */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.accent2, marginBottom: 8 }}>🎮 游戏分数</div>
                    {(!d.game_scores || d.game_scores.length === 0) ? (
                      <div style={{ fontSize: 12, color: T.faint }}>暂无游戏记录</div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {d.game_scores.map(g => (
                          <div key={g.game_id} style={{ padding: "8px 14px", background: T.surface3, borderRadius: T.radius.md, minWidth: 120 }}>
                            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>{GAME_NAMES[g.game_id] || g.game_id}</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: T.ink }}>最高 {g.best_score}</div>
                            <div style={{ fontSize: 11, color: T.faint }}>共玩 {g.play_count} 次</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 收藏词汇 */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.accent2, marginBottom: 8 }}>
                      📚 收藏词汇（{d.vocab?.length || 0} 个）
                    </div>
                    {(!d.vocab || d.vocab.length === 0) ? (
                      <div style={{ fontSize: 12, color: T.faint }}>暂无收藏词汇</div>
                    ) : (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 120, overflowY: "auto" }}>
                        {d.vocab.map((v, i) => (
                          <span key={i} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: T.surface3, color: T.ink, border: `1px solid ${T.border}` }}>
                            {v.term}
                            {v.mastery_level > 0 && <span style={{ color: T.good, marginLeft: 4 }}>{"★".repeat(Math.min(v.mastery_level, 3))}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 书签 */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.accent2, marginBottom: 8 }}>
                      🔖 书签（{d.bookmarks?.length || 0} 个）
                    </div>
                    {(!d.bookmarks || d.bookmarks.length === 0) ? (
                      <div style={{ fontSize: 12, color: T.faint }}>暂无书签</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto" }}>
                        {d.bookmarks.map((b, i) => (
                          <div key={i} style={{ fontSize: 12, color: T.muted, padding: "4px 8px", background: T.surface3, borderRadius: 6 }}>
                            {b.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 观看记录 */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.accent2, marginBottom: 8 }}>
                      👁 观看记录（{d.view_logs?.length || 0} 条）
                    </div>
                    {(!d.view_logs || d.view_logs.length === 0) ? (
                      <div style={{ fontSize: 12, color: T.faint }}>暂无观看记录</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto" }}>
                        {d.view_logs.slice(0, 10).map((v, i) => (
                          <div key={i} style={{ fontSize: 12, color: T.muted, padding: "4px 8px", background: T.surface3, borderRadius: 6, display: "flex", justifyContent: "space-between" }}>
                            <span>{v.title}</span>
                            <span style={{ color: T.faint }}>{v.viewed_date}</span>
                          </div>
                        ))}
                        {d.view_logs.length > 10 && <div style={{ fontSize: 11, color: T.faint }}>...共 {d.view_logs.length} 条</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      <Modal open={!!memberModal} onClose={() => setMemberModal(null)} title="✨ 调整会员时长" width={400}>
        {memberModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ padding: "12px 16px", background: T.surface3, borderRadius: T.radius.md }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{memberModal.username || memberModal.email}</div>
              {memberModal.subscription && (
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                  当前到期：{memberModal.subscription.expires_at ? fmt(memberModal.subscription.expires_at) : "永久"}
                  {isMemberActive(memberModal.subscription) ? " (有效)" : " (已过期)"}
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, display: "block", marginBottom: 8 }}>
                延长天数（在现有有效期基础上叠加；永久卡直接覆盖）
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["30","月卡"], ["90","季卡"], ["365","年卡"], ["0","永久卡"]].map(([d, l]) => (
                  <button key={d} onClick={() => setMemberDays(d)} style={{
                    padding: "7px 18px", borderRadius: T.radius.pill, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", border: `1px solid ${memberDays === d ? T.vip : T.border2}`,
                    background: memberDays === d ? `${T.vip}22` : "transparent",
                    color: memberDays === d ? T.vip : T.muted,
                  }}>{l} ({d}天)</button>
                ))}
              </div>
              <Input
                style={{ marginTop: 10 }}
                value={memberDays}
                onChange={(e) => setMemberDays(e.target.value)}
                type="number" placeholder="或手动输入天数（0=永久）"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Btn variant="danger" onClick={handleMemberStop} disabled={saving}>
                🚫 立即停用会员
              </Btn>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn variant="ghost" onClick={() => setMemberModal(null)}>取消</Btn>
                <Btn variant="success" onClick={handleMemberSave} disabled={saving}>
                  {saving ? "保存中…" : Number(memberDays) === 0 ? "✓ 设为永久会员" : `✓ 延长 ${memberDays} 天`}
                </Btn>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 模块五：订单管理
// ══════════════════════════════════════════════════════
function OrdersPanel({ initialOrders, onToast }) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");

  const PLAN_LABELS = {
    month: "月卡", quarter: "季卡", year: "年卡", lifetime: "永久卡", trial: "试用卡",
  };

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      o.out_trade_no?.includes(q) ||
      o.redeem_code?.toLowerCase().includes(q)
    );
  });

  function copyText(text) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: T.ink, margin: 0, flex: 1 }}>📦 订单管理</h2>
        <div style={{ display: "flex", gap: 8, fontSize: 12, color: T.muted }}>
          <span>总计 <b style={{ color: T.ink }}>{orders.length}</b></span>
          <span>已支付 <b style={{ color: T.good }}>{orders.filter(o => o.status === "paid").length}</b></span>
          <span>待支付 <b style={{ color: T.warn }}>{orders.filter(o => o.status === "pending").length}</b></span>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索订单号或兑换码…"
          style={{
            padding: "7px 14px", borderRadius: T.radius.pill, fontSize: 13,
            background: T.surface2, border: `1px solid ${T.border2}`, color: T.ink, outline: "none", width: 240,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: T.faint }}>暂无订单</div>
        )}
        {filtered.map((o) => {
          const isPaid = o.status === "paid";
          return (
            <div key={o.id} style={{
              background: T.surface2, borderRadius: T.radius.md,
              border: `1px solid ${isPaid ? "rgba(16,185,129,0.20)" : T.border}`,
              padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: T.radius.pill,
                    background: isPaid ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                    color: isPaid ? T.good : T.warn,
                    border: `1px solid ${isPaid ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
                  }}>{isPaid ? "已支付" : "待支付"}</span>
                  <span style={{ fontSize: 12, color: T.muted }}>{PLAN_LABELS[o.plan] || o.plan}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: T.ink }}>¥{o.amount}</span>
                  <span style={{ fontSize: 11, color: T.faint }}>
                    {new Date(o.created_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: T.faint }}>
                    订单号：<code style={{ fontFamily: "monospace", color: T.muted, fontSize: 12 }}>{o.out_trade_no}</code>
                    <button onClick={() => { copyText(o.out_trade_no); onToast("已复制 ✓"); }} style={{ marginLeft: 6, fontSize: 11, padding: "1px 6px", borderRadius: 4, border: `1px solid ${T.border2}`, background: T.surface3, color: T.faint, cursor: "pointer" }}>复制</button>
                  </div>
                  <div style={{ fontSize: 12, color: T.faint }}>
                    兑换码：
                    <code style={{ fontFamily: "monospace", color: isPaid ? T.good : T.faint, fontWeight: isPaid ? 800 : 400, fontSize: 13, letterSpacing: 1 }}>
                      {isPaid ? o.redeem_code : "（未支付）"}
                    </code>
                    {isPaid && (
                      <button onClick={() => { copyText(o.redeem_code); onToast("已复制 ✓"); }} style={{ marginLeft: 6, fontSize: 11, padding: "1px 6px", borderRadius: 4, border: `1px solid ${T.border2}`, background: T.surface3, color: T.faint, cursor: "pointer" }}>复制</button>
                    )}
                    {isPaid && (
                      <span style={{ marginLeft: 10, fontSize: 11, color: o.redeemed_by ? T.good : T.warn, fontWeight: 700 }}>
                        {o.redeemed_by ? `已兑换 · ${o.redeemed_by}` : "未兑换"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 主入口
// ══════════════════════════════════════════════════════
export default function AdminClient({
  adminEmail, initialClips, initialTaxonomies,
  initialRedeemCodes, initialUsers, initialOrders, stats, token,
}) {
  useEffect(() => { if (token) setAdminToken(token); }, [token]);

  const [tab, setTab] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (["overview","clips","codes","users"].includes(hash)) return hash;
    }
    return "overview";
  });
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (["overview","clips","codes","users"].includes(hash)) setTab(hash);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const [toast, setToast] = useState({ msg: "", type: "success" });

  function onToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 2800);
  }

  const tabs = [
    { id: "overview", label: "📊 概览" },
    { id: "clips", label: "🎬 视频" },
    { id: "codes", label: "🎫 兑换码" },
    { id: "orders", label: "📦 订单" },
    { id: "users", label: "👤 用户" },
    { id: "settings", label: "⚙️ 设置" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        input:focus, textarea:focus, select:focus { border-color: ${T.accent} !important; box-shadow: 0 0 0 2px ${T.accent}33; }

        @media (max-width: 640px) {
          .admin-nav-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; flex: 1; }
          .admin-nav-tabs::-webkit-scrollbar { display: none; }
          .admin-nav-tabs button { flex-shrink: 0; }
          .admin-nav-email { display: none !important; }
          .admin-body { padding: 16px 12px 40px !important; }

          .code-row { flex-wrap: wrap !important; }
          .code-row code { width: 100%; margin-bottom: 2px; }
          .code-date { display: none !important; }
          .code-row-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; width: 100%; }
          .codes-search { width: 100% !important; }

          .user-row { flex-wrap: wrap !important; }
          .user-row-actions { width: 100%; display: flex; gap: 6px; margin-top: 6px; }
          .user-row-actions button { flex: 1; justify-content: center; }
          .users-search { width: 100% !important; }

          .admin-modal-inner {
            max-width: 100% !important;
            border-radius: 16px 16px 0 0 !important;
            position: fixed !important;
            bottom: 0 !important; left: 0 !important; right: 0 !important;
            max-height: 88vh !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${T.surface}ee`, backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", gap: 16,
        padding: "0 24px", height: 56,
      }}>
        <div style={{ fontWeight: 900, fontSize: 15, color: T.ink, flexShrink: 0 }}>
          🛠 后台管理
        </div>
        <div style={{ height: 20, width: 1, background: T.border }} />
        <div className="admin-nav-tabs" style={{ display: "flex", gap: 4, flex: 1 }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); window.location.hash = t.id; }} style={{
              padding: "6px 16px", borderRadius: T.radius.pill, fontSize: 13, fontWeight: 700,
              cursor: "pointer", border: "none",
              background: tab === t.id ? `${T.accent}22` : "transparent",
              color: tab === t.id ? T.accent2 : T.muted,
              transition: "all .15s",
            }}>{t.label}</button>
          ))}
        </div>
        <div className="admin-nav-email" style={{ fontSize: 12, color: T.faint, flexShrink: 0 }}>{adminEmail}</div>
        <a href="/" style={{ fontSize: 12, color: T.faint, textDecoration: "none", flexShrink: 0 }}>← 返回网站</a>
      </div>

      <div className="admin-body" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 60px" }}>
        {tab === "overview" && <OverviewPanel stats={stats} />}
        {tab === "clips" && (
          <ClipsPanel
            initialClips={initialClips}
            taxonomies={initialTaxonomies}
            onToast={onToast}
          />
        )}
        {tab === "codes" && (
          <CodesPanel
            initialCodes={initialRedeemCodes}
            onToast={onToast}
          />
        )}
        {tab === "orders" && (
          <OrdersPanel
            initialOrders={initialOrders || []}
            onToast={onToast}
          />
        )}
        {tab === "settings" && <SettingsPanel />}
        {tab === "users" && (
          <UsersPanel
            initialUsers={initialUsers}
            onToast={onToast}
          />
        )}
      </div>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
