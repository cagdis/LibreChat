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
     (o check leve quebra primeiro — é o sinal).
  3. `npx tsc --noEmit` em `client`;
     `npx jest src/themes/arvorepress.spec.ts --runInBand --coverage=false --silent`
     em `client`.
- Por que `jest` com flags e nunca bare: o spec tem 8 linhas, mas o
  client-jest sobe `jsdom` + `babel-jest` + `collectCoverage: true`
  (`client/jest.config.cjs`), o que estoura heap em máquina pequena e leva
  ~200s. Com `--runInBand --coverage=false --silent` cai para ~30s.
  (Tentativa de script node puro descartada: o bundle `@librechat/client`
  não carrega fora de bundler/jest — interop Radix/Ariakit — então o
  canônico continua sendo o spec via resolver do jest.)
  Requer `npm install` atualizado (o rebase para `c302ae6f` trouxe `lucide` +
  `morphicons`; sem eles o spec falha com `Cannot find module 'lucide'`).
