# Patch brand-06 — cap configurável de preview + LibreOffice DOCX

- Base upstream: `dev @ 29f738dea`
- Motivo produto: DOCX ricos com imagens estouravam o cap fixo de 512 KB e
  caíam para download-only; operação quer preview inline fiel (pdf.js) com
  teto ajustável por env.
- Arquivos:
  - `packages/api/src/files/preview.ts` (novo — `resolveMaxFilePreviewBytes`
    + `MAX_FILE_PREVIEW_BYTES`, default 512 KB via `FILE_PREVIEW_MAX_OUTPUT_BYTES`)
  - `packages/api/src/files/preview.spec.ts` (novo)
  - `packages/api/src/files/code/extract.ts` (`MAX_TEXT_CACHE_BYTES` = cap
    compartilhado, antes hardcoded)
  - `packages/api/src/files/documents/html.ts` (`OFFICE_HTML_OUTPUT_CAP`
    importa do `preview.ts`; elimina mirror manual e o ciclo extract↔html)
  - `packages/api/src/files/index.ts` (export `./preview`)
  - `.env.example` (documenta `FILE_PREVIEW_MAX_EXTRACT_BYTES`,
    `FILE_PREVIEW_MAX_OUTPUT_BYTES=2097152`, `OFFICE_PREVIEW_LIBREOFFICE=docx`)
- Área upstream tocada: pipeline de preview (`extract`, `html`) — área ativa.
- Invariantes:
  - Default continua 512 KB; só muda com env explícita.
  - Cap maior aumenta payload SSE/Mongo — monitorar antes de subir em produção.
- Compatibilidade após sync:
  1. Regra: **manter o nosso**, reaplicar sobre o deles; se o upstream
     introduzir o próprio cap configurável, avaliar convergir.
  2. `jest preview` em `packages/api`; `tsc --noEmit` em `packages/api`.
