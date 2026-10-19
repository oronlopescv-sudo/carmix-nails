import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Página "Not found" simples; imagens servidas pela rota própria /uploads
  poweredByHeader: false,
  images: {
    // Formatos otimizados por next/image
    formats: ["image/webp"],
  },
};

export default nextConfig;