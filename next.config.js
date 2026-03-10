/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "imagedelivery.net" },
    ],
  },

  // imagedelivery.net (Cloudflare Images) 在国内被墙
  // 通过 Vercel 边缘节点反代，浏览器请求 /cf-img/... 即可
  async rewrites() {
    return [
      {
        source: "/cf-img/:path*",
        destination: "https://imagedelivery.net/:path*",
      },
      // Railway 后端在国内直连不稳定，走 Vercel 边缘节点转发
      // 清空 NEXT_PUBLIC_API_BASE 环境变量后生效
      {
        source: "/api/:path*",
        destination: "https://railway.nailaobao.top/api/:path*",
      },
      {
        source: "/rsc-api/:path*",
        destination: "https://railway.nailaobao.top/rsc-api/:path*",
      },
    ];
  },

  async headers() {
    return [
      {
        // ✅ 只给首页 document 加 CDN 缓存策略
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=30, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
