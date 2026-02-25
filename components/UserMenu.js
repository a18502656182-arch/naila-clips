// components/UserMenu.js
import { useEffect, useMemo, useRef, useState } from "react";

function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    function handler(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside?.();
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, onOutside]);
}

export default function UserMenu({ me, onLogout }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useOutsideClick(wrapRef, () => setOpen(false));

  const initial = useMemo(() => {
    const email = String(me?.email || "");
    const ch = (email.split("@")[0] || "U").trim().slice(0, 1) || "U";
    return ch.toUpperCase();
  }, [me?.email]);

  // 未登录：只显示 登录 / 注册
  if (!me?.logged_in) {
    return (
      <>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a className="topBtn" href="/login">
            登录
          </a>
          <a className="topBtn dark" href="/register">
            注册
          </a>
        </div>
        <style jsx global>{styles}</style>
      </>
    );
  }

  // 已登录：头像下拉
  return (
    <>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <button
          type="button"
          className="avatarBtn"
          onClick={() => setOpen((v) => !v)}
          title={me?.email || "账号"}
        >
          <span className="avatarCircle">{initial}</span>
          <span style={{ opacity: 0.75, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
        </button>

        {open ? (
          <div className="menuPanel">
            <div className="menuHead">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="avatarCircle" style={{ width: 34, height: 34, fontSize: 14 }}>
                  {initial}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 950,
                      fontSize: 13,
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {me?.email || "（无邮箱）"}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, opacity: 0.7 }}>
                    {me?.is_member ? "会员" : "非会员"}
                  </div>
                </div>
              </div>
            </div>

            <div className="menuBody">
              <a className="menuItem" href="/bookmarks" onClick={() => setOpen(false)}>
                ❤️ 视频收藏
              </a>
              <button
                type="button"
                className="menuItem danger"
                onClick={() => {
                  setOpen(false);
                  onLogout?.();
                }}
              >
                退出
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx global>{styles}</style>
    </>
  );
}

const styles = `
  .avatarBtn {
    border: 1px solid #eee;
    background: white;
    border-radius: 999px;
    padding: 6px 10px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 900;
  }
  .avatarCircle {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: #111;
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 950;
    font-size: 13px;
  }
  .menuPanel {
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    width: 240px;
    border: 1px solid #eee;
    background: white;
    border-radius: 16px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    z-index: 60;
  }
  .menuHead {
    padding: 12px;
    border-bottom: 1px solid #eee;
    background: #fafafa;
  }
  .menuBody {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .menuItem {
    width: 100%;
    border: 1px solid #eee;
    background: white;
    border-radius: 12px;
    padding: 10px 10px;
    cursor: pointer;
    font-weight: 900;
    text-decoration: none;
    color: #111;
    text-align: left;
  }
  .menuItem.danger {
    border-color: #ffd5d5;
    background: #fff5f5;
    color: #b00000;
  }
`;
