# Episodic

Acompanhe suas séries e o próximo episódio de cada uma. Site estático (Next.js, exportado com `output: "export"`) que chama o TMDB direto do navegador e guarda os dados no `localStorage`.

## Rodar no computador

```bash
npm install
cp .env.example .env.local   # e cole a chave do TMDB em NEXT_PUBLIC_TMDB_API_KEY
npm run dev                  # http://localhost:3000
```

A chave gratuita do TMDB sai em https://www.themoviedb.org/settings/api. Como o site é estático, a chave vai junto com o código publicado: use uma chave só de leitura.

## Publicar no GitHub Pages

O workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) gera o site a cada push na `main` e publica em `https://www.rpessotti.com/tv/` (o repositório se chama `tv`, e o `basePath` `/tv` é aplicado só no build do Pages).

Configuração única, no GitHub:

1. **Settings → Pages → Build and deployment → Source:** `GitHub Actions`.
2. **Settings → Secrets and variables → Actions → New repository secret:** nome `TMDB_API_KEY`, valor a chave do TMDB. (Opcional: `OMDB_API_KEY`, para as notas do IMDb e Metacritic; exige ligar a variável no workflow.)

Para testar o build do Pages localmente:

```bash
GITHUB_PAGES=true npm run build   # gera out/, servido sob /tv/
```

## Endereços

- `/` lista inicial · `/serie/?id=…` página da série · `/concluidas/` · `/lancamentos/`
- Em construção, fora dos menus: `/calendario/`, `/diario/`, `/listas/`, `/lista/?id=…`, `/perfil/`.
