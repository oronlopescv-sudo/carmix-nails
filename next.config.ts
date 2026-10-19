import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacotado autossuficiente: a Hostinger (web app) arranca com
  // node .next/standalone/server.js — sem node_modules completo no runtime
  output: "standalone",
  // Página "Not found" simples; imagens servidas pela rota própria /uploads
  poweredByHeader: false,
  images: {
    // Formatos otimizados por next/image
    formats: ["image/webp"],
  },
};

export default nextConfig;