export default function Home() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>首页 OK ✅</h1>
      <p>
        测试接口：
        <a href="/api/clips?difficulty=beginner&access=free" target="_blank">
          打开 /api/clips
        </a>
      </p>
    </div>
  );
}
