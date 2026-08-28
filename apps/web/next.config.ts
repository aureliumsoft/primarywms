import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@primarywms/db", "@primarywms/shared"],
  serverExternalPackages: ["argon2", "@prisma/client"],
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  async redirects() {
    return [{ source: "/signin", destination: "/login", permanent: false }];
  },
};

export default nextConfig;
