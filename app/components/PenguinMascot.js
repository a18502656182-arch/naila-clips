"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// wechat_qr_url 由 page.js 从数据库读取后通过 props 传入
function WechatModal({ onClose, wechatQrUrl = "" }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(11,18,32,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, border: "1px solid rgba(11,18,32,0.08)", boxShadow: "0 24px 60px rgba(11,18,32,0.18)", padding: "20px 20px 16px", width: "100%", maxWidth: 300 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#0b1220" }}>💬 联系客服</div>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(11,18,32,0.10)", background: "rgba(11,18,32,0.04)", cursor: "pointer", color: "#94a3b8", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(11,18,32,0.08)", marginBottom: 12 }}>
          <img src={wechatQrUrl} alt="微信二维码" style={{ width: "100%", display: "block" }}
            onError={e => { e.target.style.display = "none"; e.target.parentNode.innerHTML = '<div style="font-size:13px;color:rgba(11,18,32,0.38);text-align:center;padding:32px 16px;line-height:1.8">图片加载失败，请联系客服</div>'; }} />
        </div>
        <div style={{ fontSize: 12, color: "rgba(11,18,32,0.5)", textAlign: "center", marginBottom: 10, lineHeight: 1.6 }}>
          截图后在微信扫一扫识别二维码添加客服
        </div>
        <div style={{ fontSize: 11, color: "rgba(11,18,32,0.38)", textAlign: "center", lineHeight: 1.7 }}>
          购买兑换码 · 售后 · 网站建议，均可联系
        </div>
      </div>
    </div>
  );
}

const LINES = {
  welcome: [
    "你终于来了，我还以为你放弃学英语了呢 (叹气)",
    "哦？今天居然主动来了，进步了哦～",
    "欢迎回来！我一直在这守着，脚都站麻了",
    "来啦来啦！快开始，别辜负今天的好状态",
    "嗯哼，今天的你看起来特别能学进去的样子",
    "每次你来，我都好开心——虽然我不会说出口",
    "打开网站的那一刻，你已经赢了一半了",
    "又是新的一天！今天又会学到什么地道表达呢",
    "来了就别走，学一个算一个，积累才是王道",
    "状态看起来不错！今天多学两句？",
  ],
  guest: [
    "登录之后才能收藏词汇哦，我帮你看着呢 🐧",
    "注册一下吧，就两秒钟，我等你～",
    "游客模式？那多没意思，登录才有专属记录！",
    "收藏不了很遗憾吧，登录一下就能存起来了",
    "学了忘了白学，登录后才有学习记录哦",
  ],
  watching: [
    "哇！你的大脑正在疯狂吸收地道发音，我看见它在发光了！",
    "专注看视频中……本企鹅表示赞许 👍",
    "这句台词你仔细听了吗？原声的节奏感才是精华！",
    "沉浸式学习 ing……你现在的状态比教室里认真多了",
    "不要只是听，试着跟着默念，效果翻倍的",
    "母语者说话的停顿和连读，比单词本身更重要",
    "这段视频里有几个宝藏表达，你注意到了吗",
    "看视频不是娱乐，是输入——虽然两者不冲突",
    "反复听同一句，直到能闭眼复述出来",
    "听不懂没关系，多听几遍就通了，别跳过",
  ],
  saved: [
    "又抓到一个宝！生词本里的词越来越多，厉害了",
    "收藏了！记得去游戏大厅练一练，不然只是收藏了个寂寞",
    "好词！我替你记住了。但你也要记住哦～",
    "收藏是第一步，用出来才算真正学会",
    "这个词收得好，地道又实用",
    "词汇本又厚了一点点，进步就是这样积累的",
    "哦～这个表达很常见，值得反复回味",
    "记住了吗？待会去游戏里检验一下",
    "好表达！下次说英语可以用上了",
    "悄悄告诉你，多收藏地道表达比背单词管用多了",
  ],
  correct: [
    "答对了！这个词已经被你驯服了 ✅",
    "嗯！就是这样！继续保持这个节奏！",
    "完全正确！大脑转速正常，继续！",
    "答对！你的词感越来越强了",
    "正确！母语者说这个词的时候就是这个意思",
    "对！这种题你都不带犹豫的，厉害",
    "100分！继续，不要停！",
    "对了对了！你现在的状态很好，乘胜追击！",
    "这个词你记得很牢嘛，收藏有效果吧",
    "正确！越来越顺手了对吧",
  ],
  wrong: [
    "哎呀，这个词明明刚收藏过，你的记忆被外星人吃掉了吗？",
    "错了没关系，错了才会记住嘛——这是科学！",
    "没关系，错一次记十年，反而赚了",
    "嗯……这个确实有点难，再看一遍原视频？",
    "答错了！但是错过之后印象更深，信我",
    "这道题很多人都错，你不孤单",
    "错了也别气馁，你比不来做题的人强多了",
    "下次一定！（不是安慰，是预言）",
    "错一道题没关系，但同一个词错两次就要反思了",
    "失误！不过你已经见过这个词了，下次认识它了",
  ],
  allDone: [
    "今天的任务全部完成！本企鹅为你骄傲！🎉",
    "完美打卡！今天也是没被英语打败的一天！",
    "任务完成！你现在可以理直气壮地摸鱼了（不对）",
    "全部做完了！今天的你值得被夸",
    "打卡成功！streak又延长了一天，别断哦",
    "完成！学英语就是这样一天一天变强的",
    "厉害！今天的目标达成，明天继续？",
    "打卡完成！你的连续学习记录在增长，保持住",
    "今天学到的东西，睡一觉之后会记得更牢",
    "任务清零！去手账页看看你今天的数据吧",
  ],
  idle: [
    "喂喂，你还在吗？别走神啊，英语在等你呢",
    "发呆也是学习的一部分吗？（不是）快回来！",
    "别愣着了，点开一个视频，只看一个就好",
    "摸鱼可以，但先学五分钟再摸",
    "我在这等了好久了……你去哪了",
    "屏幕还开着呢，要不要继续看下一句",
    "今天的打卡目标还没完成，加油！",
    "发现你停下来了，要不要换个游戏练练？",
    "走神了？点我一下，找回状态",
    "别让今天的streak白白断掉，还差一点点",
  ],
  click: [
    "干嘛呢，我又不是玩具……（虽然我确实很好玩）",
    "戳我有糖吃吗？（没有）",
    "你已经戳了我很多次了，我不会变聪明的",
    "有什么事吗？还是只是无聊？",
    "嗯？是在测试我有没有感觉吗（有的）",
    "别老戳我了，去学个词汇不好吗",
    "好了好了，我在呢，你可以继续学习了",
    "你每戳我一次，我就记住一次（假的）",
    "有事说事，没事……也可以戳（仅限三次）",
    "好吧你赢了，我承认被戳到有点开心",
  ],
};

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const listeners = new Set();
export function triggerPenguin(event) { listeners.forEach(fn => fn(event)); }

const STORAGE_POS = "penguin_pos_v2";
const STORAGE_HIDDEN = "penguin_hidden_v1";

export default function PenguinMascot({ wechatQrUrl = "/cf-img/qvilyoTfnpu3-vu3LTcGwQ/13252c4c-662b-4537-9ad0-c571d226af00/qr" }) {
  const [pos, setPos] = useState(null);
  const [text, setText] = useState("");
  const [bounce, setBounce] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [showWechat, setShowWechat] = useState(false);
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
    setPos({ left: 20, top: window.innerHeight - 110 });
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
    e.preventDefault();
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
    const onMove = ev => { ev.preventDefault(); const tt = ev.touches[0]; moveDrag(tt.clientX, tt.clientY); };
    const onEnd = () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      endDrag();
      // 手机端：没有移动就视为点击
      if (!isDragMove.current) handleClick();
    };
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
    showBubble ? setShowBubble(false) : show(getRandom(LINES.click));
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
      {showWechat && <WechatModal onClose={() => setShowWechat(false)} wechatQrUrl={wechatQrUrl} />}
      <style>{`
        @keyframes pFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes pBounce { 0%,100%{transform:translateY(0)} 30%{transform:translateY(-10px)} 60%{transform:translateY(-4px)} }
        @keyframes bIn { 0%{opacity:0;transform:translateY(8px) scale(0.94)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        .penguin-root { display: flex !important; }
      `}</style>

      <div className="penguin-root" style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 9000, flexDirection: "column", alignItems: "center", gap: 4, userSelect: "none", WebkitUserSelect: "none" }}>

        {/* 气泡 */}
        {showBubble && !minimized && (
          <div style={{
            position: "absolute", bottom: 90,
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

        {/* 下方两个按钮并排居中 */}
        {!minimized && !dragging && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <style>{`
              .p-cs-btn { font-size: 10px; font-weight: 900; color: #fff; background: linear-gradient(135deg,#059669,#0d9488); border: none; border-radius: 999px; padding: 3px 9px; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 8px rgba(5,150,105,0.40); }
              .p-hd-btn { font-size: 10px; font-weight: 900; color: rgba(11,18,32,0.45); background: rgba(255,255,255,0.75); border: 1px solid rgba(11,18,32,0.12); border-radius: 999px; cursor: pointer; padding: 3px 9px; white-space: nowrap; }
              @media (max-width: 768px) {
                .penguin-root { transform: scale(0.78); transform-origin: bottom left; }
              }
            `}</style>
            <button className="p-cs-btn" onClick={(e) => { e.stopPropagation(); setShowWechat(true); }}>客服</button>
            <button className="p-hd-btn" onClick={() => { setMinimized(true); setShowBubble(false); try { localStorage.setItem(STORAGE_HIDDEN, "1"); } catch {}; }}>隐藏</button>
          </div>
        )}
      </div>
    </>
  );
}
