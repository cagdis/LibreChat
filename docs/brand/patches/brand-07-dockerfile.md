# Patch brand-07 — Dockerfile.brand (build do front white-label)

- Base upstream: `dev @ 29f738dea`
- Motivo produto: runtime continua a imagem publicada LibreChat; só o front
  white-label + `packages/api/dist` + `tools.js` são sobrepostos. Mantém a
  camada local pequena e o deploy como `docker compose` com override.
- Arquivos: `Dockerfile.brand` (novo). `docker-compose.override.yml` (local,
  gitignorado — vive só no host do deploy) faz bind de `librechat.yaml` e builda esse Dockerfile.
- Área upstream tocada: nenhuma em código — mas o `COPY` de
  `api/server/services/start/tools.js` acopla ao patch brand-02: se o loader
  mudar de caminho, o Dockerfile quebra o build.
- Invariantes:
  - `libreoffice-writer` presente no runtime (preview DOCX do patch 06).
  - `rm -rf /app/client/dist` antes do `COPY` — sem ele, assets velhos
    (favicons antigos) continuariam servidos.
- Compatibilidade após sync:
  1. Se `tools.js` mudar de caminho no upstream, atualizar o `COPY`.
  2. Rebuild local + smoke test (login, chat, upload DOCX com preview).
