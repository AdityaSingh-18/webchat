import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "unsplash.com",
      }
    ]
  },
  devIndicators: false,
  /* config options here */
};

export default nextConfig;
