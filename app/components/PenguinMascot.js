"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const LINES = {
  welcome: [
    "你终于来了，我还以为你放弃学英语了呢 (叹气)",
    "哦？今天居然主动来了，进步了哦～",
    "欢迎回来！我一直在这守着，脚都站麻了",
    "来啦来啦！快开始，别辜负今天的好状态",
    "嗯哼，今天的你看起来特别能学进去的样子",
  ],
  guest: [
    "登录之后才能收藏词汇哦，我帮你看着呢 🐧",
    "注册一下吧，就两秒钟，我等你～",
    "游客模式？那多没意思，登录才有专属记录！",
  ],
  watching: [
    "哇！你的大脑正在疯狂吸收地道发音，我看见它在发光了！",
    "专注看视频中……本企鹅表示赞许 👍",
    "这句台词你仔细听了吗？原声的节奏感才是精华！",
    "沉浸式学习 ing……你现在的状态比教室里认真多了",
  ],
  saved: [
    "又抓到一个宝！生词本里的词越来越多，厉害了",
    "收藏了！记得去考试页练一练，不然只是收藏了个寂寞",
    "好词！我替你记住了。但你也要记住哦～",
  ],
  correct: [
    "答对了！这个词已经被你驯服了 ✅",
    "嗯！就是这样！继续保持这个节奏！",
    "完全正确！大脑转速正常，继续！",
  ],
  wrong: [
    "哎呀，这个词明明刚收藏过，你的记忆被外星人吃掉了吗？",
    "错了没关系，错了才会记住嘛——这是科学！",
    "没关系，错一次记十年，反而赚了",
  ],
  allDone: [
    "今天的任务全部完成！本企鹅为你骄傲！🎉",
    "完美打卡！今天也是没被英语打败的一天！",
    "任务完成！你现在可以理直气壮地摸鱼了（不对）",
  ],
  idle: [
    "喂喂，你还在吗？别走神啊，英语在等你呢",
    "发呆也是学习的一部分吗？（不是）快回来！",
    "别愣着了，点开一个视频，只看一个就好",
  ],
};

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const listeners = new Set();
export function triggerPenguin(event) { listeners.forEach(fn => fn(event)); }

const STORAGE_POS = "penguin_pos_v2";
const STORAGE_HIDDEN = "penguin_hidden_v1";

export default function PenguinMascot() {
  const [pos, setPos] = useState(null);
  const [text, setText] = useState("");
  const [bounce, setBounce] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [minimized, setMinimized] = useState(() => {
    try { return localStorage.getItem(STORAGE_HIDDEN) === "1"; } catch { return false; }
  });
  const [dragging, setDragging] = useState(false);
  const hideTimer = useRef(null);
  const idleTimer = useRef(null);
  const hasGreeted = useRef(false);
  const lastActivity = useRef(Date.now());
  const dragRef = useRef(null);
  const isDragMove = useRef(false);
  const penguinRef = useRef(null); // 用于注册 non-passive touchstart

  // 注册 non-passive touchstart，防止 React 合成事件无法 preventDefault
  useEffect(() => {
    const el = penguinRef.current;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => el.removeEventListener("touchstart", onTouchStart);
  });

  // 初始化位置（仅客户端）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POS);
      if (saved) { setPos(JSON.parse(saved)); return; }
    } catch {}
    setPos({ left: window.innerWidth - 92, top: window.innerHeight - 110 });
  }, []);

  // resize 边界
  useEffect(() => {
    const onResize = () => setPos(p => p ? {
      left: Math.max(0, Math.min(p.left, window.innerWidth - 72)),
      top: Math.max(0, Math.min(p.top, window.innerHeight - 80)),
    } : p);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const show = useCallback((msg) => {
    clearTimeout(hideTimer.current);
    setText(msg); setShowBubble(true); setBounce(true);
    setTimeout(() => setBounce(false), 600);
    hideTimer.current = setTimeout(() => setShowBubble(false), 8000);
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (minimized) return;
      const map = { correct: LINES.correct, wrong: LINES.wrong, saved: LINES.saved, allDone: LINES.allDone, watching: LINES.watching };
      if (map[event]) show(getRandom(map[event]));
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, [show, minimized]);

  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;
    const t = setTimeout(() => {
      try { show(localStorage.getItem("sb_access_token") ? getRandom(LINES.welcome) : getRandom(LINES.guest)); }
      catch { show(getRandom(LINES.welcome)); }
    }, 2500);
    return () => clearTimeout(t);
  }, [show]);

  useEffect(() => {
    const reset = () => { lastActivity.current = Date.now(); };
    ["mousemove","click","keydown","scroll"].forEach(e => window.addEventListener(e, reset));
    idleTimer.current = setInterval(() => {
      if (minimized || Date.now() - lastActivity.current < 120000) return;
      show(getRandom(LINES.idle));
      lastActivity.current = Date.now();
    }, 15000);
    return () => {
      ["mousemove","click","keydown","scroll"].forEach(e => window.removeEventListener(e, reset));
      clearInterval(idleTimer.current);
    };
  }, [show, minimized]);

  function savePos(p) { try { localStorage.setItem(STORAGE_POS, JSON.stringify(p)); } catch {} }

  function startDrag(clientX, clientY) {
    isDragMove.current = false;
    dragRef.current = { startX: clientX, startY: clientY, origLeft: pos?.left ?? 0, origTop: pos?.top ?? 0 };
    setDragging(true);
  }

  function moveDrag(clientX, clientY) {
    if (!dragRef.current) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) isDragMove.current = true;
    const size = minimized ? 28 : 72;
    const sizeY = minimized ? 28 : 80;
    const newPos = {
      left: Math.max(0, Math.min(dragRef.current.origLeft + dx, window.innerWidth - size)),
      top: Math.max(0, Math.min(dragRef.current.origTop + dy, window.innerHeight - sizeY)),
    };
    setPos(newPos);
  }

  function endDrag() {
    dragRef.current = null;
    setDragging(false);
    setPos(p => { if (p) savePos(p); return p; });
  }

  // 鼠标事件
  function onMouseDown(e) {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
    const onMove = ev => moveDrag(ev.clientX, ev.clientY);
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); endDrag(); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // 触摸事件
  function onTouchStart(e) {
    e.preventDefault(); // 阻止滚动误触发拖拽
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
    const onMove = ev => { ev.preventDefault(); const tt = ev.touches[0]; moveDrag(tt.clientX, tt.clientY); };
    const onEnd = () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); endDrag(); };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }

  function handleClick() {
    if (isDragMove.current) return;
    if (minimized) {
      setMinimized(false);
      try { localStorage.removeItem(STORAGE_HIDDEN); } catch {}
      show(getRandom(LINES.welcome));
      return;
    }
    showBubble ? setShowBubble(false) : show(getRandom([...LINES.welcome, ...LINES.idle]));
  }

  if (!pos) return null;

  // 隐藏状态：右下角显示一个极小的点，点击可恢复，支持拖动
  if (minimized) {
    return (
      <button
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={handleClick}
        title="拖动可移位 · 点击显示企鹅"
        style={{
          position: "fixed", left: pos.left, top: pos.top, zIndex: 9000,
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(79,70,229,0.15)",
          border: "1px solid rgba(79,70,229,0.25)",
          cursor: dragging ? "grabbing" : "grab", fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "none", padding: 0,
        }}
      >🐧</button>
    );
  }
  const bubbleOnLeft = pos.left > (typeof window !== "undefined" ? window.innerWidth / 2 : 400);

  return (
    <>
      <style>{`
        @keyframes pFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes pBounce { 0%,100%{transform:translateY(0)} 30%{transform:translateY(-10px)} 60%{transform:translateY(-4px)} }
        @keyframes bIn { 0%{opacity:0;transform:translateY(8px) scale(0.94)} 100%{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      <div style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 9000, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, userSelect: "none", WebkitUserSelect: "none" }}>

        {/* 气泡 */}
        {showBubble && !minimized && (
          <div style={{
            position: "absolute", bottom: 64,
            ...(bubbleOnLeft ? { right: 0 } : { left: 0 }),
            width: 210, padding: "10px 30px 10px 14px",
            background: "#fff", borderRadius: 16,
            border: "1px solid rgba(99,102,241,0.22)",
            boxShadow: "0 8px 30px rgba(11,18,32,0.13)",
            fontSize: 13, lineHeight: 1.55, color: "#0b1220", fontWeight: 600,
            animation: "bIn 260ms cubic-bezier(.2,.9,.2,1)",
          }}>
            {text}
            <button onClick={() => setShowBubble(false)} style={{ position: "absolute", top: 7, right: 8, width: 18, height: 18, borderRadius: 999, background: "rgba(11,18,32,0.07)", border: "none", cursor: "pointer", fontSize: 10, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        )}

        {/* 企鹅 */}
        <div
          ref={penguinRef}
          onMouseDown={onMouseDown}
          onClick={handleClick}
          title="拖动可移位 · 点击说话"
          style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg,#0f172a,#4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
            cursor: dragging ? "grabbing" : "grab",
            boxShadow: dragging ? "0 14px 40px rgba(79,70,229,0.55)" : "0 6px 24px rgba(79,70,229,0.35)",
            animation: dragging ? "none" : bounce ? "pBounce 600ms ease" : "pFloat 3s ease-in-out infinite",
            transform: dragging ? "scale(1.1)" : "scale(1)",
            transition: "box-shadow 150ms, transform 150ms",
            border: "2px solid rgba(255,255,255,0.15)",
          }}
        >🐧</div>

        {/* 隐藏 */}
        {!minimized && !dragging && (
          <button onClick={() => { setMinimized(true); setShowBubble(false); try { localStorage.setItem(STORAGE_HIDDEN, "1"); } catch {} }} style={{ fontSize: 10, color: "rgba(11,18,32,0.40)", background: "none", border: "none", cursor: "pointer", padding: "1px 4px", fontWeight: 900 }}>隐藏</button>
        )}
      </div>
    </>
  );
}
