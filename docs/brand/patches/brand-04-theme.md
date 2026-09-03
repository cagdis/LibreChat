# Patch brand-04 — tema ÁrvorePress + wiring no App

- Base upstream: `dev @ 29f738dea`
- Motivo produto: workspace neutro com verde da marca só em acento/ação;
  tema claro como padrão quando não há tema via env.
- Arquivos: `client/src/themes/arvorepress.ts` (novo), `arvorepress.spec.ts`
  (novo), `client/src/App.jsx` (usa `themeDefinition` quando sem `envTheme`).
- Área upstream tocada: `App.jsx` (bloco `ThemeProvider` — muda quando o
  engine de temas evolui) e o contrato `ThemeDefinition` de `@librechat/client`.
- Invariantes:
  - Com `envTheme` presente, comportamento é o do upstream (`themeName:
    'environment'`); sem ele, cai no tema ÁrvorePress claro.
  - `validateThemeDefinition(arvorepress)` sem erros (spec dedicado).
  - Tema só seleciona cores/aparência — sem CSS arbitrário nem comportamento
    (regra de theming do `CLAUDE.md`).
- Compatibilidade após sync:
  1. `App.jsx` — regra: **manter o nosso**, reaplicar sobre o deles.
  2. Se `ThemeDefinition` mudar de versão, atualizar `arvorepress.ts`
     (o spec quebra primeiro — é o sinal).
  3. `npx tsc --noEmit` em `client`; `jest arvorepress`.
