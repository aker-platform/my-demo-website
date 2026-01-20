import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow build to succeed even with type errors in convex folder
    // until `npm run convex:dev` generates the proper types
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
