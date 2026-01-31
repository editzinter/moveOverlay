import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disabled to fix react-chessboard missing piece rendering bug
};

export default nextConfig;
