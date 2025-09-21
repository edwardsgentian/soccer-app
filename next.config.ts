import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https: data:; connect-src 'self' https: wss:; object-src 'none'; base-uri 'self';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
