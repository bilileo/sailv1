import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  typescript: {
    // Permite compilar a producción aunque haya discrepancias de tipos
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
