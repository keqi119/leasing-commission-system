import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lcs/commission-engine", "@lcs/database", "@lcs/shared"]
};

export default nextConfig;

