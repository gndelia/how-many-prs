import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/api/og/[lang]/[login]": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
