/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
