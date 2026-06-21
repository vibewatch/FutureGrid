import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["d3"],
  env: {
    BLS_API_KEY: process.env.BLS_API_KEY,
    ONET_API_KEY: process.env.ONET_API_KEY,
  },
};

export default nextConfig;