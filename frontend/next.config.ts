import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // 빌드 시 ESLint 오류를 무시합니다.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 빌드 시 TypeScript 오류를 무시합니다.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
