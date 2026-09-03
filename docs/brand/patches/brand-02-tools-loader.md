# Patch brand-02 — ignorar specs no loader de tools

- Base upstream: `dev @ 29f738dea`
- Motivo produto: arquivos `*.spec.js` / `*.test.js` dentro do diretório de
  tools faziam o boot tentar carregar teste como tool. Em deploy com volume
  de tools customizadas, isso quebra a API na subida.
- Arquivos: `api/server/services/start/tools.js` (1 condição no filtro).
- Área upstream tocada: `loadAndFormatTools` — função pequena e estável, mas
  qualquer refactor do loader conflita aqui.
- Invariantes:
  - `*.spec.js` e `*.test.js` nunca são carregados como tools.
  - Filtro `adminFilter`/`adminIncluded` comporta-se como antes para `.js` reais.
- Compatibilidade após sync:
  1. `git rebase upstream/dev` — esperar conflito só se o loader for refatorado.
  2. Regra de conflito: **adotar o upstream e reaplicar o filtro** (o filtro é
     2 linhas; o loader deles manda).
  3. `cd api && npx jest services/start` (se houver spec do loader).
- Testes: rebase + boot da API com um `*.spec.js` dummy no diretório de tools.
