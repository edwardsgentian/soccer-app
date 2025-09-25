import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src * 'unsafe-eval' 'unsafe-inline' data: blob:; script-src * 'unsafe-eval' 'unsafe-inline' data: blob:; style-src * 'unsafe-inline' data:; img-src * data: blob:; font-src * data:; connect-src *; frame-src *; object-src 'none';"
          }
        ]
      }
    ]
  }
};

export default nextConfig;
