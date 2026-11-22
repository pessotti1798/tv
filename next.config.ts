import type { NextConfig } from "next";

// No GitHub Pages o app fica em https://www.rpessotti.com/tv/ (repositório "tv").
// O workflow define GITHUB_PAGES=true; no computador o app abre na raiz.
const basePath = process.env.GITHUB_PAGES === "true" ? "/tv" : "";

const nextConfig: NextConfig = {
  // Site estático: `next build` gera a pasta out/ com HTML, CSS e JS.
  output: "export",
  basePath,
  // /serie/ em vez de /serie.html: funciona em qualquer hospedagem estática.
  trailingSlash: true,
  // Sem servidor de imagens: os pôsteres do TMDB já vêm em tamanhos prontos.
  images: { unoptimized: true },
};

export default nextConfig;
