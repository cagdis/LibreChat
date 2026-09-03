# Patch brand-03 — identidade visual ÁrvorePress (assets + manifest + login)

- Base upstream: `dev @ 29f738dea`
- Motivo produto: white-label — `index.html`, manifest PWA e tela de login
  devem mostrar ÁrvorePress IA, não LibreChat.
- Arquivos:
  - `client/index.html` (lang pt-BR, title/description, theme-color, favicons)
  - `client/vite.config.ts` (manifest + workbox; removidos favicons antigos)
  - `client/src/components/Auth/AuthLayout.tsx` (logo + badge IA)
  - `client/public/assets/arvorepress-icon.png`, `logo-arvorepress.png` (novos)
  - `client/BRANDING.md` (origem autorizada dos assets + paleta)
- Área upstream tocada: `vite.config.ts` (bloco workbox/manifest muda com
  frequência), `AuthLayout.tsx`, `index.html`.
- Invariantes:
  - Nenhuma referência a `logo.svg` / `favicon-*` no HTML/manifest.
  - Logo tem versão legível em light e dark (`brightness-0 dark:brightness-100`
    é gambiarra consciente — trocar por 2 assets quando houver).
  - Favicons antigos seguem em `public/assets/` (não deletados; só
    desreferenciados) para não quebrar cache de PWA instalada.
- Compatibilidade após sync:
  1. `vite.config.ts` — conflito provável a cada bump do Vite/PWA; regra:
     **adotar o upstream e reaplicar o bloco manifest** (é o único trecho nosso).
  2. `AuthLayout.tsx` — regra: **manter o nosso**, reaplicar sobre o deles.
  3. `npx tsc --noEmit` em `client`; build do client.
