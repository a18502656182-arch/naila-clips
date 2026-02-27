"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { THEME } from "./home/theme";

function formatDate(d) {
  if (!d) return "";
  return String(d).slice(0, 10);
}

function formatDuration(sec) {
  const s = Number(sec || 0);
  if (!Number.isFinite(s) || s <= 0) return "";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function ClipsGridClient({ initialItems, initialHasMore }) {
  const sp = useSearchParams();
  const clientQueryKey = useMemo(() => sp.toString(), [sp]);
  
  // ✅ 核心逻辑：如果 URL 带有筛选参数，说明这是筛选页，直接抛弃服务端的默认 initialItems，防止“先闪一下全部”
  const hasFilters = clientQueryKey.length > 0;

  const [items, setItems] = useState(hasFilters ? [] : (initialItems || []));
  const [hasMore, setHasMore] = useState(hasFilters ? false : !!initialHasMore);
  
  // 如果带有筛选参数，立刻进入 loading 状态
  const [loading, setLoading] = useState(hasFilters);
  const [err, setErr] = useState("");

  const inFlightRef = useRef(false);
  const reqVersionRef = useRef(0);

  // 1️⃣ 监听筛选参数变化（只要 URL 参数变了，就去拉取对应的筛选数据）
  useEffect(() => {
    if (!hasFilters) {
      // 如果回到了“全部”（清空了筛选），直接使用服务端的默认数据即可
      setItems(initialItems ||[]);
      setHasMore(!!initialHasMore);
      setLoading(false);
      return;
    }

    let aborted = false;
    const myVersion = ++reqVersionRef.current;

    async function fetchFilteredData() {
      setLoading(true);
      inFlightRef.current = true;
      setErr("");

      try {
        const url = `/rsc-api/clips?${clientQueryKey}&offset=0`;
        const r = await fetch(url, { cache: "no-store" });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Load failed");

        if (aborted || myVersion !== reqVersionRef.current) return;

        setItems(data.items ||[]);
        setHasMore(!!data.has_more);
      } catch (e) {
        if (!aborted && myVersion === reqVersionRef.current) setErr(e?.message || "Load failed");
      } finally {
        if (!aborted && myVersion === reqVersionRef.current) {
          setLoading(false);
          inFlightRef.current = false;
        }
      }
    }

    fetchFilteredData();
    return () => { aborted = true; };
  }, [clientQueryKey, initialItems, initialHasMore, hasFilters]);

  // 2️⃣ 无限滚动加载更多 (与之前逻辑一致)
  async function loadMore() {
    if (!hasMore || loading || inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setErr("");
    const myVersion = ++reqVersionRef.current;

    try {
      const offset = items.length;
      const url = `/rsc-api/clips?${clientQueryKey}${clientQueryKey ? "&" : ""}offset=${offset}`;

      const r = await fetch(url, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Load more failed");
      if (myVersion !== reqVersionRef.current) return;

      setItems((prev) => prev.concat(data.items ||
