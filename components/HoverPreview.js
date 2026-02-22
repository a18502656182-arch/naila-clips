// components/HoverPreview.js
import { useEffect, useMemo, useRef, useState } from "react";

function isCoarsePointer() {
  if (typeof window === "undefined") return true;
  return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
}

export default function HoverPreview({
  coverUrl,
  videoUrl,
  alt = "",
  borderRadius = 12,
}) {
  const [hover, setHover] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // 手机/触摸屏不做 hover 预览
    setCanHover(!isCoarsePointer());
  }, []);

  const showVideo = canHover && hover && !!videoUrl;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (showVideo) {
      // 尝试播放（必须静音）
      try {
        v.currentTime = 0;
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    } else {
      try {
        v.pause();
      } catch {}
    }
  }, [showVideo]);

  const boxStyle = useMemo(
    () => ({
      width: "100%",
      borderRadius,
      overflow: "hidden",
      background: "#f3f3f3",
      position: "relative",
      aspectRatio: "16 / 9",
    }),
    [borderRadius]
  );

  return (
    <div
      style={boxStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* 封面 */}
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: showVideo ? "none" : "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: showVideo ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.6,
            fontSize: 12,
          }}
        >
          no cover
        </div>
      )}

      {/* hover 预览视频 */}
      {showVideo ? (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          preload="metadata"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : null}
    </div>
  );
}
