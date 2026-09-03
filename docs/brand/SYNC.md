# Sync com o upstream

Procedimento mensal (ou antes de cada release interna):

1. `git fetch upstream dev main`
2. Fast-forward dos espelhos: `git checkout dev && git merge --ff-only upstream/dev`
   (idem para `main`). Se não for fast-forward, alguém commitou branding em
   `dev`/`main` por engano — investigar antes de prosseguir.
3. `git checkout brand/arvorepress-ia && git rebase upstream/dev`
4. Para cada patch em `docs/brand/patches.json`, rodar o `compat_check` declarado
   e reler o doc do patch. Regra de conflito por patch está no próprio doc
   (manter nosso / adotar upstream / reescrever).
5. `npm run static-checks -- --against upstream/dev`
6. `npx tsc --noEmit` em `client` e `packages/api`; `jest` nos specs tocados.
7. Build do client (`npm run frontend`) uma vez no final.
8. Atualizar `BASELINE.md` com os novos SHAs e `git push --force-with-lease`.

Pendência conhecida: pilha inicial foi fechada sobre `dev @ 29f738dea`;
primeiro rebase deve mirar `04e4fd6b` (13 commits de diferença).
