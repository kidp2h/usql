import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  assetPrefix: "./",
  trailingSlash: true,
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
