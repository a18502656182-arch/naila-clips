"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { THEME } from "../components/home/theme";
import ExamSystem from "../bookmarks/ExamSystem";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

function makeAuthFetch(token) {
  return function authFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    const t =
      token ||
      (() => {
        try {
          return localStorage.getItem("sb_access_token");
        } catch {
          return null;
        }
      })();
    if (t) headers["Authorization"] = `Bearer ${t}`;
    return fetch(url, { ...options, headers, credentials: "include" });
  };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickOne(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[(Math.random() * arr.length) | 0];
}

function normalizeSentence(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/[^a-z0-9'\s]/gi, "") // drop punctuation
    .replace(/\s+/g, " ")
    .trim();
}

async function playWord(term) {
  const t = (term || "").trim();
  if (!t) return;

  // 1) Youdao voice first
  try {
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
      t
    )}&type=2`;
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    await audio.play();
    return;
  } catch (_) {
    // ignore
  }

  // 2) speechSynthesis fallback
  try {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  } catch (_) {
    // ignore
  }
}

/* ----------------------------- Game 1: Swipe ----------------------------- */

function SwipeGame({ vocabItems, onExit }) {
  const items = useMemo(() => shuffle(vocabItems || []), [vocabItems]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const pointerIdRef = useRef(null);

  const total = items.length;
  const current = items[idx] || null;

  const [cardMeaning, setCardMeaning] = useState("");
  const [isMeaningCorrect, setIsMeaningCorrect] = useState(true);

  useEffect(() => {
    // setup current card meaning (50/50 correct)
    if (!current) return;

    const correctMeaning = current?.data?.zh || "";
    const shouldBeCorrect = Math.random() < 0.5;

    if (shouldBeCorrect || items.length < 2) {
      setCardMeaning(correctMeaning);
      setIsMeaningCorrect(true);
      return;
    }

    // pick wrong meaning from other items
    const others = items.filter((x) => x?.id !== current?.id);
    const other = pickOne(others) || pickOne(items);
    const wrongMeaning = other?.data?.zh || "";
    if (!wrongMeaning || wrongMeaning === correctMeaning) {
      setCardMeaning(correctMeaning);
      setIsMeaningCorrect(true);
      return;
    }
    setCardMeaning(wrongMeaning);
    setIsMeaningCorrect(false);
  }, [idx, current, items]);

  const threshold = useMemo(() => {
    if (typeof window === "undefined") return 120;
    return Math.max(120, window.innerWidth / 4);
  }, []);

  function judge(dir) {
    if (!current || animating) return;
    const choseRight = dir === "right";
    const shouldRight = isMeaningCorrect; // correct meaning => right
    const ok = choseRight === shouldRight;

    if (ok) setCorrect((c) => c + 1);

    // play audio only when correct
    if (ok) playWord(current?.term);

    // fly out
    setAnimating(true);
    const flyX = choseRight
      ? typeof window !== "undefined"
        ? window.innerWidth
        : 1200
      : typeof window !== "undefined"
      ? -window.innerWidth
      : -1200;
    setDx(flyX);
    setDy(dy * 0.2);

    setTimeout(() => {
      setAnimating(false);
      setDragging(false);
      setDx(0);
      setDy(0);

      if (idx + 1 >= total) {
        setDone(true);
      } else {
        setIdx((i) => i + 1);
      }
    }, 320);
  }

  function onPointerDown(e) {
    if (done || animating) return;
    pointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }

  function onPointerMove(e) {
    if (!dragging || animating) return;
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current)
      return;
    const nx = e.clientX - startRef.current.x;
    const ny = e.clientY - startRef.current.y;
    setDx(nx);
    setDy(ny);
  }

  function onPointerUp(e) {
    if (!dragging || animating) return;
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current)
      return;
    pointerIdRef.current = null;

    if (Math.abs(dx) >= threshold) {
      judge(dx > 0 ? "right" : "left");
      return;
    }

    // snap back
    setAnimating(true);
    setDx(0);
    setDy(0);
    setTimeout(() => setAnimating(false), 220);
    setDragging(false);
  }

  useEffect(() => {
    function onKey(e) {
      if (done) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        judge("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        judge("right");
      }
    }
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, animating, idx, isMeaningCorrect]);

  const rotate = clamp(dx / 20, -15, 15);
  const showLeft = dx < -30;
  const showRight = dx > 30;

  const shellStyle = {
    minHeight: "100vh",
    background: THEME.colors.bg,
    color: THEME.colors.ink,
    padding: 14,
    boxSizing: "border-box",
  };

  const topBarStyle = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
    padding: "8px 6px 14px",
    maxWidth: 980,
    margin: "0 auto",
  };

  const cardWrap = {
    position: "relative",
    maxWidth: 560,
    margin: "0 auto",
    paddingTop: 6,
  };

  const cardStyle = {
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.lg,
    boxShadow: "0 10px 30px rgba(15,23,42,0.10)",
    padding: "22px 18px",
    userSelect: "none",
    touchAction: "none",
    transform: `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`,
    transition: animating
      ? "transform 0.3s ease"
      : dragging
      ? "none"
      : "transform 0.2s ease",
  };

  const btnRow = {
    maxWidth: 560,
    margin: "14px auto 0",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: 10,
    alignItems: "center",
  };

  const bigBtnBase = {
    height: 52,
    borderRadius: THEME.radii.pill,
    border: `1px solid ${THEME.colors.border}`,
    background: THEME.colors.surface,
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
  };

  if (done) {
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <button
            onClick={onExit}
            style={{
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.pill,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ← 返回大厅
          </button>
          <div style={{ fontWeight: 900 }}>🃏 单词探探</div>
          <div style={{ opacity: 0.7, fontWeight: 800 }}>完成</div>
        </div>

        <div
          style={{
            maxWidth: 560,
            margin: "22px auto 0",
            background: THEME.colors.surface,
            border: `1px solid ${THEME.colors.border}`,
            borderRadius: THEME.radii.lg,
            padding: 18,
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 1000, marginBottom: 8 }}>
            本轮结果
          </div>
          <div style={{ fontSize: 16, opacity: 0.85 }}>
            正确：<b>{correct}</b> / <b>{total}</b>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setIdx(0);
                setCorrect(0);
                setDone(false);
                setDx(0);
                setDy(0);
              }}
              style={{
                ...bigBtnBase,
                padding: "0 16px",
                borderColor: THEME.colors.accent,
                color: THEME.colors.accent,
              }}
            >
              再来一轮
            </button>
            <button
              onClick={onExit}
              style={{
                ...bigBtnBase,
                padding: "0 16px",
              }}
            >
              返回大厅
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={topBarStyle}>
        <button
          onClick={onExit}
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          ← 返回大厅
        </button>
        <div style={{ fontWeight: 1000 }}>🃏 单词探探</div>
        <div style={{ opacity: 0.75, fontWeight: 800 }}>
          {Math.min(idx + 1, total)} / {total}
        </div>
      </div>

      <div style={cardWrap}>
        {/* glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 140,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 6,
              width: 140,
              height: 90,
              borderRadius: 999,
              background: "rgba(239,68,68,0.15)",
              filter: "blur(18px)",
              opacity: showLeft ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 4,
              right: 6,
              width: 140,
              height: 90,
              borderRadius: 999,
              background: "rgba(34,197,94,0.15)",
              filter: "blur(18px)",
              opacity: showRight ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              fontSize: 34,
              opacity: showLeft ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          >
            ❌
          </div>
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              fontSize: 34,
              opacity: showRight ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          >
            ✅
          </div>
        </div>

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={cardStyle}
        >
          <div style={{ fontSize: 14, opacity: 0.6, fontWeight: 800 }}>英文</div>
          <div style={{ fontSize: 34, fontWeight: 1000, marginTop: 6, wordBreak: "break-word" }}>
            {current?.term || "-"}
          </div>

          <div style={{ height: 14 }} />

          <div style={{ fontSize: 14, opacity: 0.6, fontWeight: 800 }}>中文释义</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8, lineHeight: 1.35 }}>
            {cardMeaning || "（无释义）"}
          </div>

          <div style={{ marginTop: 16, fontSize: 12, opacity: 0.55 }}>
            左滑❌：不认识 / 右滑✅：认识（也可用键盘 ← →）
          </div>
        </div>

        <div style={btnRow}>
          <button
            onClick={() => judge("left")}
            style={{
              ...bigBtnBase,
              background: "rgba(239,68,68,0.08)",
              borderColor: "rgba(239,68,68,0.25)",
            }}
          >
            ❌ 不认识
          </button>

          <div style={{ textAlign: "center", opacity: 0.75, fontWeight: 900 }}>
            剩余 {Math.max(0, total - idx)}
          </div>

          <button
            onClick={() => judge("right")}
            style={{
              ...bigBtnBase,
              background: "rgba(34,197,94,0.08)",
              borderColor: "rgba(34,197,94,0.25)",
            }}
          >
            ✅ 认识
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Game 2: Rebuild ---------------------------- */

function RebuildGame({ vocabItems, onExit }) {
  const pool = useMemo(() => {
    const eligible = (vocabItems || [])
      .filter((x) => {
        const ex = (x?.data?.example_en || "").trim();
        if (!ex) return false;
        const words = ex.split(/\s+/).filter(Boolean);
        return words.length >= 4;
      })
      .map((x) => ({
        ...x,
        __exampleWords: (x?.data?.example_en || "").trim().split(/\s+/).filter(Boolean),
      }));
    return shuffle(eligible);
  }, [vocabItems]);

  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [selected, setSelected] = useState([]);
  const [available, setAvailable] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | correct | wrong
  const [showAnswer, setShowAnswer] = useState(false);

  const current = pool[i] || null;
  const total = pool.length;

  useEffect(() => {
    if (!current) return;
    const words = current.__exampleWords || [];
    setSelected([]);
    setAvailable(shuffle(words.map((w, idx) => ({ id: `${current.id}-${idx}-${w}`, text: w }))));
    setStatus("idle");
    setShowAnswer(false);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = useMemo(() => {
    const ex = current?.data?.example_en || "";
    return ex.trim();
  }, [current]);

  const normalizedAnswer = useMemo(() => normalizeSentence(answer), [answer]);

  function selectedText() {
    return selected.map((x) => x.text).join(" ");
  }

  function checkAuto() {
    const now = normalizeSentence(selectedText());
    if (!now) return;
    if (now === normalizedAnswer) {
      setStatus("correct");
      setScore((s) => s + 1);
      setTimeout(() => {
        if (i + 1 >= total) return;
        setI((v) => v + 1);
      }, 950);
    }
  }

  function submit() {
    if (!current) return;
    const now = normalizeSentence(selectedText());
    if (now === normalizedAnswer) {
      setStatus("correct");
      setScore((s) => s + 1);
      setTimeout(() => {
        if (i + 1 >= total) return;
        setI((v) => v + 1);
      }, 950);
    } else {
      setStatus("wrong");
      setWrongCount((w) => w + 1);
      setShowAnswer(true);
      setTimeout(() => {
        setStatus("idle");
        setShowAnswer(false);
        setSelected([]);
        const words = current.__exampleWords || [];
        setAvailable(shuffle(words.map((w, idx) => ({ id: `${current.id}-${idx}-${w}`, text: w }))));
      }, 2000);
    }
  }

  function moveToSelected(token) {
    if (status !== "idle") return;
    setAvailable((a) => a.filter((x) => x.id !== token.id));
    setSelected((s) => {
      const next = [...s, token];
      setTimeout(checkAuto, 0);
      return next;
    });
  }

  function moveToAvailable(token) {
    if (status !== "idle") return;
    setSelected((s) => s.filter((x) => x.id !== token.id));
    setAvailable((a) => shuffle([...a, token]));
  }

  const shellStyle = {
    minHeight: "100vh",
    background: THEME.colors.bg,
    color: THEME.colors.ink,
    padding: 14,
    boxSizing: "border-box",
  };

  const topBarStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 6px 10px",
    maxWidth: 980,
    margin: "0 auto",
  };

  const contentWrap = { maxWidth: 920, margin: "0 auto" };

  const card = {
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.lg,
    boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
    padding: 14,
  };

  const tokenBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 14,
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    boxShadow: "0 6px 14px rgba(15,23,42,0.06)",
    cursor: "pointer",
    fontWeight: 800,
    transition: "transform 0.12s ease, background 0.12s ease",
    userSelect: "none",
  };

  const answerTokenBorder =
    status === "correct"
      ? "rgba(34,197,94,0.7)"
      : status === "wrong"
      ? "rgba(239,68,68,0.75)"
      : THEME.colors.accent;

  if (!pool || pool.length === 0) {
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <button
            onClick={onExit}
            style={{
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.pill,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ← 返回大厅
          </button>
          <div style={{ fontWeight: 1000 }}>🧩 台词磁力贴</div>
          <div />
        </div>

        <div style={{ maxWidth: 720, margin: "16px auto 0" }}>
          <div style={{ ...card, textAlign: "center", padding: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 1000 }}>没有可用例句</div>
            <div style={{ opacity: 0.7, marginTop: 8 }}>
              需要收藏带英文例句的词汇（example_en 不为空，且至少 4 个单词）。
            </div>
            <button
              onClick={onExit}
              style={{
                marginTop: 14,
                height: 44,
                padding: "0 16px",
                borderRadius: THEME.radii.pill,
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              返回大厅
            </button>
          </div>
        </div>
      </div>
    );
  }

  const finished = i >= total;

  if (finished) {
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <button
            onClick={onExit}
            style={{
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.pill,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ← 返回大厅
          </button>
          <div style={{ fontWeight: 1000 }}>🧩 台词磁力贴</div>
          <div style={{ opacity: 0.7, fontWeight: 800 }}>完成</div>
        </div>

        <div style={{ maxWidth: 720, margin: "18px auto 0" }}>
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 22, fontWeight: 1000 }}>本轮结算</div>
            <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 800 }}>
              得分：<b>{score}</b> / <b>{total}</b>　·　错误次数：<b>{wrongCount}</b>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setI(0);
                  setScore(0);
                  setWrongCount(0);
                }}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                再来一轮
              </button>
              <button
                onClick={onExit}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                返回大厅
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = total ? (i / total) * 100 : 0;

  return (
    <div style={shellStyle}>
      <div style={topBarStyle}>
        <button
          onClick={onExit}
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          ← 返回大厅
        </button>
        <div style={{ fontWeight: 1000 }}>🧩 台词磁力贴</div>
        <div style={{ opacity: 0.75, fontWeight: 900 }}>
          {Math.min(i + 1, total)} / {total}
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto 10px" }}>
        <div
          style={{
            height: 8,
            background: THEME.colors.faint,
            borderRadius: 999,
            overflow: "hidden",
            border: `1px solid ${THEME.colors.border}`,
          }}
        >
          <div style={{ width: `${progress}%`, height: "100%", background: THEME.colors.accent }} />
        </div>
      </div>

      <div style={contentWrap}>
        <div style={{ ...card }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>当前词汇</div>
              <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 4, wordBreak: "break-word" }}>
                {current?.term || "-"}{" "}
                <span style={{ fontSize: 14, opacity: 0.7, fontWeight: 900 }}>
                  {current?.data?.ipa ? `/${current.data.ipa}/` : ""}
                </span>
              </div>
              <div style={{ marginTop: 6, opacity: 0.85, fontWeight: 800 }}>
                {current?.data?.zh || "（无释义）"}
              </div>
              {current?.data?.example_zh ? (
                <div style={{ marginTop: 10, opacity: 0.55, fontWeight: 800, lineHeight: 1.35 }}>
                  提示：{current.data.example_zh}
                </div>
              ) : null}
            </div>

            <button
              onClick={() => playWord(current?.term)}
              title="播放发音"
              style={{
                width: 44,
                height: 44,
                borderRadius: THEME.radii.pill,
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface,
                cursor: "pointer",
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              🔊
            </button>
          </div>

          <div style={{ height: 14 }} />

          {/* Answer area */}
          <div
            style={{
              border: `1px dashed ${THEME.colors.border}`,
              borderRadius: THEME.radii.lg,
              padding: 12,
              minHeight: 86,
              background: "rgba(79,70,229,0.04)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>答题区</div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              {selected.length === 0 ? (
                <div style={{ opacity: 0.55, fontWeight: 800 }}>点击下方方块，把句子拼回来…</div>
              ) : null}

              {selected.map((t) => (
                <div
                  key={t.id}
                  onClick={() => moveToAvailable(t)}
                  style={{
                    ...tokenBase,
                    borderColor: answerTokenBorder,
                    background:
                      status === "correct"
                        ? "rgba(34,197,94,0.10)"
                        : status === "wrong"
                        ? "rgba(239,68,68,0.10)"
                        : THEME.colors.surface,
                    transform: status === "wrong" ? "translateX(0)" : undefined,
                    animation: status === "wrong" ? "shakeX 0.28s ease-in-out 0s 2" : "none",
                  }}
                >
                  {t.text}
                </div>
              ))}
            </div>

            {showAnswer ? (
              <div style={{ marginTop: 10, opacity: 0.8 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.65 }}>正确答案</div>
                <div style={{ fontWeight: 900, marginTop: 4 }}>{answer}</div>
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button
                onClick={submit}
                disabled={status !== "idle"}
                style={{
                  height: 40,
                  padding: "0 14px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: status === "idle" ? "pointer" : "not-allowed",
                  fontWeight: 1000,
                  opacity: status === "idle" ? 1 : 0.6,
                }}
              >
                提交
              </button>
            </div>
          </div>

          <div style={{ height: 14 }} />

          {/* Available area */}
          <div style={{ padding: 2 }}>
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900, marginBottom: 8 }}>待选区</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {available.map((t) => (
                <div
                  key={t.id}
                  onClick={() => moveToSelected(t)}
                  style={{
                    ...tokenBase,
                    background: "rgba(79,70,229,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(79,70,229,0.08)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(79,70,229,0.04)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {t.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shakeX {
          0% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------- Game 3: Balloon ---------------------------- */

function BalloonGame({ vocabItems, onExit }) {
  const items = useMemo(() => shuffle(vocabItems || []), [vocabItems]);
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [roundWord, setRoundWord] = useState(null);
  const [balloons, setBalloons] = useState([]);
  const [exploding, setExploding] = useState(null); // balloon id
  const roundRef = useRef(0);

  const colors = ["#fb7185", "#60a5fa", "#34d399", "#fb923c", "#a78bfa", "#facc15"];

  function makeRound() {
    if (!items || items.length < 2) return;
    const rid = (roundRef.current += 1);

    const word = pickOne(items);
    const correctMeaning = word?.data?.zh || "";
    const otherMeanings = items
      .filter((x) => x?.id !== word?.id)
      .map((x) => x?.data?.zh || "")
      .filter(Boolean);

    const wrongs = shuffle(otherMeanings).slice(0, 5);
    const texts = shuffle([correctMeaning, ...wrongs]).slice(0, 6);

    const newBalloons = texts.map((txt, idx) => {
      const size = 80 + ((Math.random() * 31) | 0); // 80-110
      const duration = 5.4 + Math.random() * 2.4; // 5.4-7.8
      const left = Math.random() * 80 + 5; // 5-85
      const c = colors[(Math.random() * colors.length) | 0];
      return {
        id: `${rid}-${idx}-${Math.random().toString(16).slice(2)}`,
        text: txt,
        correct: txt === correctMeaning,
        size,
        duration,
        left,
        color: c,
      };
    });

    setRoundWord(word);
    setExploding(null);
    setBalloons(newBalloons);

    setTimeout(() => playWord(word?.term), 50);
  }

  useEffect(() => {
    makeRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loseHeart() {
    setHearts((h) => {
      const next = h - 1;
      if (next <= 0) {
        setGameOver(true);
        return 0;
      }
      return next;
    });
  }

  function clickBalloon(b) {
    if (gameOver) return;

    if (b.correct) {
      setExploding(b.id);
      setScore((s) => s + 10);
      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });

      try {
        if (navigator.vibrate) navigator.vibrate(20);
      } catch {}

      setTimeout(() => {
        makeRound();
      }, 420);
    } else {
      setExploding(b.id);
      setCombo(0);
      loseHeart();
      setTimeout(() => {
        makeRound();
      }, 520);
    }
  }

  function onMissBalloon(b) {
    if (gameOver) return;
    setCombo(0);
    loseHeart();
  }

  const shellStyle = {
    minHeight: "100vh",
    background: THEME.colors.bg,
    color: THEME.colors.ink,
    padding: 14,
    boxSizing: "border-box",
    overflow: "hidden",
  };

  const topBarStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 6px 10px",
    maxWidth: 980,
    margin: "0 auto",
  };

  const hud = {
    maxWidth: 980,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
    alignItems: "center",
    padding: "0 6px",
  };

  const hudPill = {
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.pill,
    padding: "8px 12px",
    fontWeight: 900,
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };

  if (gameOver) {
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <button
            onClick={onExit}
            style={{
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.surface,
              borderRadius: THEME.radii.pill,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ← 返回大厅
          </button>
          <div style={{ fontWeight: 1000 }}>🎧 盲听气球</div>
          <div />
        </div>

        <div style={{ maxWidth: 720, margin: "18px auto 0" }}>
          <div
            style={{
              background: THEME.colors.surface,
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: THEME.radii.lg,
              padding: 18,
              boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 1000 }}>游戏结束</div>
            <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 900 }}>
              最终得分：<b>{score}</b>　·　最高连击：<b>{maxCombo}</b>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setHearts(3);
                  setScore(0);
                  setCombo(0);
                  setMaxCombo(0);
                  setGameOver(false);
                  makeRound();
                }}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                再来一局
              </button>
              <button
                onClick={onExit}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                返回大厅
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const heartsText = Array.from({ length: 3 })
    .map((_, idx) => (idx < hearts ? "❤️" : "🤍"))
    .join("");

  return (
    <div style={shellStyle}>
      <div style={topBarStyle}>
        <button
          onClick={onExit}
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          ← 返回大厅
        </button>
        <div style={{ fontWeight: 1000 }}>🎧 盲听气球</div>
        <button
          onClick={() => playWord(roundWord?.term)}
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          再听一遍 🔁
        </button>
      </div>

      <div style={hud}>
        <div style={{ ...hudPill, justifySelf: "start" }}>{heartsText}</div>
        <div style={{ ...hudPill, justifySelf: "center" }}>分数：{score}</div>
        <div style={{ ...hudPill, justifySelf: "end" }}>
          {combo >= 3 ? (
            <>
              🔥 combo x <span style={{ fontSize: 18 }}>{combo}</span>
            </>
          ) : (
            <>连击：{combo}</>
          )}
        </div>
      </div>

      <div
        style={{
          maxWidth: 980,
          margin: "14px auto 0",
          padding: "0 6px",
          opacity: 0.65,
          fontWeight: 900,
        }}
      >
        听发音，点击正确释义的气球
      </div>

      {/* balloons layer */}
      <div style={{ position: "relative", width: "100%", height: "78vh", marginTop: 6 }}>
        {balloons.map((b) => {
          const fontSize = clamp((b.size / 110) * 14, 12, 16);
          const isExploding = exploding === b.id;
          return (
            <div
              key={b.id}
              onClick={() => clickBalloon(b)}
              onAnimationEnd={() => {
                if (!isExploding) onMissBalloon(b);
              }}
              style={{
                position: "absolute",
                left: `${b.left}%`,
                bottom: "-140px",
                width: b.size,
                height: b.size,
                borderRadius: 999,
                background: b.color,
                boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 10,
                textAlign: "center",
                fontWeight: 900,
                color: "#0b1220",
                cursor: "pointer",
                userSelect: "none",
                transform: "translateZ(0)",
                animation: `floatUp ${b.duration}s linear forwards`,
                opacity: isExploding ? 0 : 1,
                pointerEvents: isExploding ? "none" : "auto",
              }}
              title="点击"
            >
              <div
                style={{
                  fontSize,
                  lineHeight: 1.15,
                  filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.35))",
                }}
              >
                {b.text || "（无释义）"}
              </div>

              {/* balloon string */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "100%",
                  width: 2,
                  height: 62,
                  background: "rgba(15,23,42,0.25)",
                  transform: "translateX(-50%)",
                  borderRadius: 2,
                }}
              />

              {/* explosion */}
              {isExploding ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 42,
                    animation: "pop 0.35s ease-out forwards",
                  }}
                >
                  💥
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes floatUp {
          from { transform: translateY(0); }
          to { transform: translateY(-110vh); }
        }
        @keyframes pop {
          from { transform: scale(0.6); opacity: 0.3; }
          to { transform: scale(1.25); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------- Game 4: Speed ----------------------------- */

function SpeedGame({ vocabItems, onExit }) {
  const items = useMemo(() => shuffle(vocabItems || []), [vocabItems]);

  const [round, setRound] = useState(0);
  const [word, setWord] = useState(null);
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [correctSide, setCorrectSide] = useState("left"); // left | right
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [cracked, setCracked] = useState(false);

  const limitMs = useMemo(() => clamp(3000 - combo * 120, 1500, 3000), [combo]);
  const startTsRef = useRef(0);
  const rafRef = useRef(null);
  const [tRatio, setTRatio] = useState(1);

  function pickQuestion() {
    if (!items || items.length < 2) return;

    const w = pickOne(items);
    const correctMeaning = w?.data?.zh || "";
    const others = items.filter((x) => x?.id !== w?.id);
    const wrong = pickOne(others);
    const wrongMeaning = wrong?.data?.zh || "";

    const correctIsLeft = Math.random() < 0.5;

    setWord(w);
    setCorrectSide(correctIsLeft ? "left" : "right");
    setLeftText(correctIsLeft ? correctMeaning : wrongMeaning);
    setRightText(correctIsLeft ? wrongMeaning : correctMeaning);
    setCracked(false);

    setTimeout(() => playWord(w?.term), 40);
  }

  function stopTimer() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  function startTimer() {
    stopTimer();
    startTsRef.current = performance.now();
    setTRatio(1);

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTsRef.current;
      const ratio = clamp(1 - elapsed / limitMs, 0, 1);
      setTRatio(ratio);

      if (ratio <= 0) {
        endGame();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function endGame() {
    stopTimer();
    setCracked(true);
    setGameOver(true);
    setCombo((c) => {
      setMaxCombo((m) => Math.max(m, c));
      return c;
    });
  }

  function answer(side) {
    if (gameOver) return;

    const ok = side === correctSide;
    stopTimer();

    if (ok) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      setScore((s) => s + 10 * nextCombo);
      setAnswered((n) => n + 1);

      try {
        if (navigator.vibrate) navigator.vibrate(30);
      } catch {}

      setRound((r) => r + 1);
    } else {
      setAnswered((n) => n + 1);
      setCombo(0);
      endGame();
    }
  }

  useEffect(() => {
    if (!items || items.length < 2) return;
    if (gameOver) return;
    pickQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, items]);

  useEffect(() => {
    if (!word || gameOver) return;
    startTimer();
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id, limitMs, gameOver]);

  useEffect(() => {
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shellStyle = {
    minHeight: "100vh",
    background: THEME.colors.bg,
    color: THEME.colors.ink,
    boxSizing: "border-box",
  };

  const topHud = {
    position: "sticky",
    top: 0,
    zIndex: 5,
    padding: 12,
    background: "rgba(246,247,251,0.88)",
    backdropFilter: "blur(10px)",
    borderBottom: `1px solid ${THEME.colors.border}`,
  };

  const hudRow = {
    maxWidth: 980,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  };

  const pill = {
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.pill,
    padding: "8px 12px",
    fontWeight: 900,
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  const wordArea = {
    maxWidth: 980,
    margin: "14px auto 0",
    padding: "0 14px",
  };

  const wordStyle = {
    fontSize: "clamp(28px, 6vw, 52px)",
    fontWeight: 1000,
    textAlign: "center",
    padding: "18px 12px",
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.lg,
    boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
    position: "relative",
    overflow: "hidden",
    textShadow: "0 1px 0 rgba(255,255,255,0.35)",
  };

  const flash = combo >= 5;
  const halo = combo >= 10;

  const barColor =
    tRatio > 0.66
      ? "rgba(34,197,94,0.95)"
      : tRatio > 0.33
      ? "rgba(234,179,8,0.95)"
      : "rgba(239,68,68,0.95)";

  const halves = {
    maxWidth: 980,
    margin: "14px auto 0",
    padding: "0 14px 18px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    minHeight: "45vh",
  };

  const halfBase = (bg) => ({
    borderRadius: THEME.radii.lg,
    border: `1px solid ${THEME.colors.border}`,
    boxShadow: "0 16px 34px rgba(15,23,42,0.10)",
    background: bg,
    color: "#0b1220",
    cursor: "pointer",
    userSelect: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 18,
    fontSize: 20,
    fontWeight: 1000,
  });

  if (gameOver) {
    return (
      <div style={shellStyle}>
        <div style={topHud}>
          <div style={hudRow}>
            <button onClick={onExit} style={{ ...pill, cursor: "pointer" }}>
              ← 返回大厅
            </button>
            <div style={{ fontWeight: 1000 }}>⚡ 极速二选一</div>
            <div style={{ opacity: 0.7, fontWeight: 900 }}>结算</div>
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: "18px auto 0", padding: "0 14px" }}>
          <div
            style={{
              background: THEME.colors.surface,
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: THEME.radii.lg,
              padding: 18,
              boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 1000 }}>本局结束</div>
            <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 900 }}>
              最终得分：<b>{score}</b>
            </div>
            <div style={{ marginTop: 6, opacity: 0.8, fontWeight: 900 }}>
              最高连击：<b>{maxCombo}</b>　·　答对题数：<b>{answered - 1 >= 0 ? answered - 1 : 0}</b> /{" "}
              <b>{answered}</b>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setRound(0);
                  setCombo(0);
                  setMaxCombo(0);
                  setScore(0);
                  setAnswered(0);
                  setGameOver(false);
                  setCracked(false);
                }}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                再来一局
              </button>
              <button
                onClick={onExit}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: THEME.radii.pill,
                  border: `1px solid ${THEME.colors.border}`,
                  background: THEME.colors.surface,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                返回大厅
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...shellStyle,
        background: flash
          ? "linear-gradient(180deg, rgba(246,247,251,1), rgba(246,247,251,0.92))"
          : THEME.colors.bg,
      }}
    >
      <div style={topHud}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 2px" }}>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              overflow: "hidden",
              border: `1px solid ${THEME.colors.border}`,
              background: THEME.colors.faint,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: `${tRatio * 100}%`,
                height: "100%",
                background: barColor,
                transition: "width 0.05s linear",
              }}
            />
          </div>

          <div style={hudRow}>
            <button onClick={onExit} style={{ ...pill, cursor: "pointer" }}>
              ← 返回大厅
            </button>

            <div style={{ ...pill, justifyContent: "center" }}>
              {combo >= 3 ? (
                <>
                  🔥 x <span style={{ fontSize: 18 }}>{combo}</span>
                </>
              ) : (
                <>连击：{combo}</>
              )}
            </div>

            <div style={{ ...pill, justifyContent: "center" }}>分数：{score}</div>
          </div>
        </div>
      </div>

      <div style={wordArea}>
        <div
          style={{
            ...wordStyle,
            animation: flash ? "pulseBg 0.9s ease-in-out infinite" : "none",
          }}
        >
          {halo ? (
            <div
              style={{
                position: "absolute",
                inset: -20,
                borderRadius: 999,
                background: "radial-gradient(circle, rgba(250,204,21,0.25), transparent 60%)",
                animation: "halo 1.2s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          ) : null}

          <div style={{ position: "relative", zIndex: 2 }}>{word?.term || "-"}</div>

          {cracked ? (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
              {Array.from({ length: 14 }).map((_, k) => (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: `${(Math.random() * 100) | 0}%`,
                    top: `${(Math.random() * 100) | 0}%`,
                    width: `${80 + ((Math.random() * 220) | 0)}px`,
                    height: 1,
                    background: "rgba(15,23,42,0.35)",
                    transform: `rotate(${(Math.random() * 180) | 0}deg)`,
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 8, textAlign: "center", opacity: 0.65, fontWeight: 900 }}>
          3 秒内选对（连击越高越快）
        </div>
      </div>

      <div style={halves}>
        <div onClick={() => answer("left")} style={halfBase("rgba(239,68,68,0.24)")}>
          {leftText || "（无释义）"}
        </div>
        <div onClick={() => answer("right")} style={halfBase("rgba(59,130,246,0.22)")}>
          {rightText || "（无释义）"}
        </div>
      </div>

      <style>{`
        @keyframes pulseBg {
          0% { filter: brightness(1); }
          50% { filter: brightness(1.03); }
          100% { filter: brightness(1); }
        }
        @keyframes halo {
          0% { transform: scale(0.98); opacity: 0.65; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(0.98); opacity: 0.65; }
        }
      `}</style>
    </div>
  );
}

/* ----------------------------- Main Lobby ----------------------------- */

function GameCard({ title, subtitle, tag, color, emoji, disabled, onClick, spanFull }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      style={{
        position: "relative",
        background: THEME.colors.surface,
        border: `1px solid ${THEME.colors.border}`,
        borderLeft: `4px solid ${disabled ? THEME.colors.border : color}`,
        borderRadius: THEME.radii.lg,
        padding: 14,
        boxShadow: "0 10px 26px rgba(15,23,42,0.08)",
        cursor: disabled ? "not-allowed" : "pointer",
        minHeight: 118,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
        gridColumn: spanFull ? "1 / -1" : undefined,
        opacity: disabled ? 0.78 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 14px 32px rgba(15,23,42,0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 10px 26px rgba(15,23,42,0.08)";
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 26 }}>{emoji}</div>
          <div style={{ fontSize: 18, fontWeight: 1000, color: THEME.colors.ink }}>{title}</div>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7, fontWeight: 800, lineHeight: 1.35 }}>
          {subtitle}
        </div>

        <div style={{ marginTop: 10, display: "inline-flex" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 1000,
              padding: "6px 10px",
              borderRadius: THEME.radii.pill,
              background: disabled ? THEME.colors.faint : `${color}1A`,
              color: disabled ? THEME.colors.muted : color,
              border: `1px solid ${disabled ? THEME.colors.border : `${color}33`}`,
            }}
          >
            {tag}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <div style={{ fontWeight: 1000, color: disabled ? THEME.colors.muted : color }}>开始 →</div>
      </div>

      {disabled ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: THEME.radii.lg,
            background: "rgba(11,18,32,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
            textAlign: "center",
            fontWeight: 1000,
            color: THEME.colors.ink,
          }}
        >
          收藏更多词汇后解锁
        </div>
      ) : null}
    </div>
  );
}

export default function PracticeClient({ accessToken }) {
  const [activeGame, setActiveGame] = useState(null); // null | "exam" | "swipe" | "rebuild" | "balloon" | "speed"
  const [me, setMe] = useState(null);
  const [vocabItems, setVocabItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ExamSystem integration states
  const [examOpen, setExamOpen] = useState(false);
  const [examActive, setExamActive] = useState(false);

  const authFetch = useMemo(() => makeAuthFetch(accessToken), [accessToken]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const [meRes, vocabRes] = await Promise.all([
          authFetch(remote("/api/me")),
          authFetch(remote("/api/vocab_favorites")),
        ]);

        const meJson = meRes.ok ? await meRes.json() : null;
        const vocabJson = vocabRes.ok ? await vocabRes.json() : { items: [] };

        if (cancelled) return;

        setMe(meJson);
        setVocabItems(Array.isArray(vocabJson?.items) ? vocabJson.items : []);
      } catch (e) {
        if (!cancelled) {
          setMe(null);
          setVocabItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  // keep "examOpen" behavior: entering exam mode auto opens setup
  useEffect(() => {
    if (activeGame === "exam") {
      setExamOpen(true);
    } else {
      setExamOpen(false);
      setExamActive(false);
    }
  }, [activeGame]);

  // stats (mastery_level may exist on item; fallback 0)
  const stats = useMemo(() => {
    const total = vocabItems?.length || 0;
    const learning = (vocabItems || []).filter((x) => Number(x?.mastery_level) === 1).length;
    const mastered = (vocabItems || []).filter((x) => Number(x?.mastery_level) === 2).length;
    return { total, learning, mastered };
  }, [vocabItems]);

  function notEnough() {
    return (vocabItems?.length || 0) < 4;
  }

  function updateMastery(id, newLevel) {
    setVocabItems((prev) =>
      (prev || []).map((it) => {
        if (it?.id === id) return { ...it, mastery_level: newLevel };
        return it;
      })
    );
  }

  // Game views
  if (activeGame === "exam") {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${THEME.colors.border}`, background: THEME.colors.bg }}>
          <div
            style={{
              maxWidth: 980,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              onClick={() => setActiveGame(null)}
              style={{
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface,
                borderRadius: THEME.radii.pill,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              ← 返回大厅
            </button>
            <div style={{ fontWeight: 1000 }}>🎮 考试系统</div>
            <div style={{ opacity: 0.7, fontWeight: 900 }}>{examActive ? "进行中" : "准备中"}</div>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <ExamSystem
            vocabItems={vocabItems}
            isSetupOpen={examOpen}
            onSetupClose={() => setExamOpen(false)}
            onMasteryUpdated={(id, level) => updateMastery(id, level)}
            onExamActiveChange={(v) => setExamActive(!!v)}
          />
        </div>
      </div>
    );
  }

  if (activeGame === "swipe") {
    if (notEnough())
      return (
        <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14 }}>
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              background: THEME.colors.surface,
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: THEME.radii.lg,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 1000 }}>词汇不足</div>
            <div style={{ opacity: 0.75, marginTop: 8, fontWeight: 800 }}>
              至少需要收藏 4 个词汇，才能开始游戏。
            </div>
            <button
              onClick={() => setActiveGame(null)}
              style={{
                marginTop: 14,
                height: 44,
                padding: "0 16px",
                borderRadius: THEME.radii.pill,
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              返回大厅
            </button>
          </div>
        </div>
      );
    return <SwipeGame vocabItems={vocabItems} onExit={() => setActiveGame(null)} />;
  }

  if (activeGame === "rebuild") {
    if (notEnough())
      return (
        <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14 }}>
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              background: THEME.colors.surface,
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: THEME.radii.lg,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 1000 }}>词汇不足</div>
            <div style={{ opacity: 0.75, marginTop: 8, fontWeight: 800 }}>
              至少需要收藏 4 个词汇，才能开始游戏。
            </div>
            <button
              onClick={() => setActiveGame(null)}
              style={{
                marginTop: 14,
                height: 44,
                padding: "0 16px",
                borderRadius: THEME.radii.pill,
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              返回大厅
            </button>
          </div>
        </div>
      );
    return <RebuildGame vocabItems={vocabItems} onExit={() => setActiveGame(null)} />;
  }

  if (activeGame === "balloon") {
    if (notEnough())
      return (
        <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14 }}>
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              background: THEME.colors.surface,
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: THEME.radii.lg,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 1000 }}>词汇不足</div>
            <div style={{ opacity: 0.75, marginTop: 8, fontWeight: 800 }}>
              至少需要收藏 4 个词汇，才能开始游戏。
            </div>
            <button
              onClick={() => setActiveGame(null)}
              style={{
                marginTop: 14,
                height: 44,
                padding: "0 16px",
                borderRadius: THEME.radii.pill,
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              返回大厅
            </button>
          </div>
        </div>
      );
    return <BalloonGame vocabItems={vocabItems} onExit={() => setActiveGame(null)} />;
  }

  if (activeGame === "speed") {
    if (notEnough())
      return (
        <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14 }}>
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              background: THEME.colors.surface,
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: THEME.radii.lg,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 1000 }}>词汇不足</div>
            <div style={{ opacity: 0.75, marginTop: 8, fontWeight: 800 }}>
              至少需要收藏 4 个词汇，才能开始游戏。
            </div>
            <button
              onClick={() => setActiveGame(null)}
              style={{
                marginTop: 14,
                height: 44,
                padding: "0 16px",
                borderRadius: THEME.radii.pill,
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.surface,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              返回大厅
            </button>
          </div>
        </div>
      );
    return <SpeedGame vocabItems={vocabItems} onExit={() => setActiveGame(null)} />;
  }

  // Lobby view
  const page = {
    minHeight: "100vh",
    background: THEME.colors.bg,
    color: THEME.colors.ink,
    padding: 14,
    boxSizing: "border-box",
  };

  const topBar = {
    maxWidth: 980,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 6px 14px",
  };

  const statGrid = {
    maxWidth: 980,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    padding: "0 6px",
  };

  const statCard = {
    background: THEME.colors.surface,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radii.lg,
    padding: 14,
    boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
  };

  const gamesGrid = {
    maxWidth: 980,
    margin: "14px auto 0",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    padding: "0 6px 18px",
  };

  return (
    <div style={page}>
      <div style={topBar}>
        <Link
          href="/"
          style={{
            border: `1px solid ${THEME.colors.border}`,
            background: THEME.colors.surface,
            borderRadius: THEME.radii.pill,
            padding: "8px 12px",
            textDecoration: "none",
            color: THEME.colors.ink,
            fontWeight: 900,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ← 返回首页
        </Link>

        <div style={{ fontSize: 18, fontWeight: 1000 }}>🎮 游戏大厅</div>

        <div style={{ opacity: 0.7, fontWeight: 900 }}>{me?.email ? me.email : "未登录"}</div>
      </div>

      <div style={statGrid}>
        <div style={statCard}>
          <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>📚 词汇总数</div>
          <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 8 }}>{loading ? "…" : stats.total}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>🔄 学习中</div>
          <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 8 }}>{loading ? "…" : stats.learning}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>✅ 已掌握</div>
          <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 8 }}>{loading ? "…" : stats.mastered}</div>
        </div>
      </div>

      <div style={gamesGrid}>
        <GameCard
          emoji="🎮"
          title="考试系统"
          subtitle="气泡拼写 · 极速连连看 · 选择题"
          tag="经典模式"
          color={THEME.colors.accent}
          disabled={loading ? true : notEnough()}
          onClick={() => setActiveGame("exam")}
        />
        <GameCard
          emoji="🃏"
          title="单词探探"
          subtitle="左滑❌ 右滑✅ 判断释义是否正确"
          tag="休闲模式"
          color="#ec4899"
          disabled={loading ? true : notEnough()}
          onClick={() => setActiveGame("swipe")}
        />
        <GameCard
          emoji="🧩"
          title="台词磁力贴"
          subtitle="点击方块，把打散的例句拼回去"
          tag="语感训练"
          color="#059669"
          disabled={loading ? true : notEnough()}
          onClick={() => setActiveGame("rebuild")}
        />
        <GameCard
          emoji="🎧"
          title="盲听气球"
          subtitle="听发音，点击正确释义的气球"
          tag="听力专精"
          color="#0891b2"
          disabled={loading ? true : notEnough()}
          onClick={() => setActiveGame("balloon")}
        />
        <GameCard
          emoji="⚡"
          title="极速二选一"
          subtitle="3秒内点击正确释义，连击拿高分"
          tag="挑战模式"
          color="#d97706"
          disabled={loading ? true : notEnough()}
          onClick={() => setActiveGame("speed")}
          spanFull
        />
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 6px", opacity: 0.65, fontWeight: 800 }}>
        {loading
          ? "正在加载你的词汇本…"
          : notEnough()
          ? "提示：去「我的收藏 → 词汇本」多收藏一些词汇，解锁全部游戏。"
          : "选一个游戏开始练习吧！"}
      </div>
    </div>
  );
}
