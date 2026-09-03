# Baseline upstream — fork cagdis/LibreChat

White-label ÁrvorePress vive no fork e acompanha o upstream `danny-avila/LibreChat`.
Este arquivo congela os SHAs contra os quais cada patch foi feito. O agent que
revisar compatibilidade após um sync deve comparar estes SHAs com o `upstream/dev`
atual e reler os docs em `docs/brand/patches/`.

- Trabalho original feito sobre: `upstream/dev @ 29f738dea`
  (`⏭️ feat: Honor an Interrupt Before the Model Has Answered (#15491)`)
- Rebase executado em 2026-09-03 para `upstream/dev @ 04e4fd6b68e7a0e0bc910f726952bd0ce834d334`
  (13 commits), sem conflitos nos 9 commits da pilha. `upstream/main` em
  `f9f1b2fb951a99e1fd01ee7291304a0370ea6132`.
- Remotos: `upstream = danny-avila/LibreChat` (leitura), `origin = cagdis/LibreChat` (escrita).
- `main` / `dev` do fork são espelhos do upstream (só fast-forward). Branding vive em
  `brand/arvorepress-ia`. Nunca commitar branding em `dev`/`main`.
