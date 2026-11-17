import type { NextConfig } from "next";

const sameOrigin = process.env.FINSENSE_SAME_ORIGIN === 'true';

const nextConfig: NextConfig = {
  distDir: sameOrigin ? '.next-aws' : '.next',
  async rewrites() {
    if (!sameOrigin) return [];

    return {
      beforeFiles: [{ source: '/', destination: '/index.html' }],
      afterFiles: [],
      fallback: [{
        source: '/:path((?!api(?:/|$)|assets(?:/|$)|_next(?:/|$))[^.]+)',
        destination: '/index.html',
      }],
    };
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
