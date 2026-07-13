import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Single Remotion graph for the client Player (avoids dual-package hazards).
  transpilePackages: ["remotion", "@remotion/player", "@remotion/media-utils"],
  serverExternalPackages: [
    "@remotion/lambda",
    "@remotion/renderer",
    "@remotion/bundler",
    "@neondatabase/serverless",
  ],
  // Keep resolution inside this package — C:\mainer has sibling package-locks.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
