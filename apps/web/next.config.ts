import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js"],
  transpilePackages: ["@lcs/commission-engine", "@lcs/database", "@lcs/shared"]
};

export default nextConfig;
