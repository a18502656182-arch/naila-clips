/** @type {import('next').NextConfig} */

// 正式后端地址（Production 用）
// Preview 环境可通过 RAILWAY_API_URL 环境变量覆盖，指向 dev 后端
const RAILWAY_BASE =
  process.env.RAILWAY_API_URL ||
  "https://railway.nailaobao.top";

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "imagedelivery.net" },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/cf-img/:path*",
        destination: "https://imagedelivery.net/:path*",
      },
      {
        source: "/api/:path*",
        destination: `${RAILWAY_BASE}/api/:path*`,
      },
      {
        source: "/rsc-api/:path*",
        destination: `${RAILWAY_BASE}/rsc-api/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
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
