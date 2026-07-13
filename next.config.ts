import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@remotion/lambda",
    "@remotion/renderer",
  ],
};

export default nextConfig;