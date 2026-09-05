# Patch brand-01 — estratégia do fork e baseline

- Decisão: white-label vive no fork `cagdis/LibreChat`, branch longa
  `brand/arvorepress-ia`. `dev`/`main` do fork são espelhos fast-forward do
  upstream (`danny-avila/LibreChat`), nunca recebem commits de branding.
- Por que fork em org e não branch no upstream: sem permissão de escrita no
  upstream e sem interesse em mandar white-label para lá; fork dá controle de
  release e de acesso (repo privado da org).
- Por que branch longa + commits atômicos em vez de um commit único: cada sync
  do upstream vira um rebase onde cada conflito vem com motivo e regra de
  resolução documentados (ver `SYNC.md` e docs `brand-0*`).
- `BASELINE.md` congela os SHAs; `patches.json` é o índice máquina-legível.
