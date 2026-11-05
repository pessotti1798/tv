import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O projeto fica no iCloud Drive: o sufixo ".nosync" faz o iCloud ignorar a
  // pasta de build (milhares de arquivos), mantendo-a dentro do projeto.
  distDir: ".next.nosync",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
