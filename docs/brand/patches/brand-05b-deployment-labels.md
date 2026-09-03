# Patch brand-05b — labels genéricos + placeholder + ModelSelector

- Base upstream: `dev @ 29f738dea`
- Motivo produto: nenhuma superfície (header da mensagem, busca, share,
  placeholder do composer, seletor) pode expor nome de provider/modelo.
- Arquivos:
  - `MessageParts.tsx`, `MessageRender.tsx`, `ContentRender.tsx`,
    `Share/Message.tsx`, `SearchMessage.tsx` (`hoverLabel`/label marca)
  - `hooks/Messages/useMessageActions.tsx` (nome de fallback marca)
  - `hooks/Input/useTextarea.ts` + `locales/en/translation.json`
    (placeholder `com_ui_message_placeholder` quando não é agent/assistant;
    só `en` — demais idiomas via automação externa)
  - `hooks/Input/useTextarea.spec.tsx` (novo teste do placeholder)
  - `Chat/Menus/Endpoints/ModelSelector.tsx` (retorna `null` sempre que
    `modelSelect === false`; deployment com modelo fixo não tem o que escolher)
  - `librechat.yaml` NÃO versionado aqui, mas coerente: `modelSelect: false` +
    `modelSpecs.enforce: true` com DeepSeek rotulado `ÁrvorePress IA`.
- Área upstream tocada: headers de mensagem e composer — mudam com frequência.
- Invariantes:
  - Decisão consciente: `hoverLabel` de modelo some (perde-se debug do modelo
    na UI; logs/API mantêm).
  - Placeholder custom via prop continua tendo prioridade sobre o genérico.
- Compatibilidade após sync:
  1. Regra: **manter o nosso**, reaplicar sobre o deles.
  2. `jest useTextarea`; `tsc` em `client`.
  3. Se o upstream mudar chaves `com_endpoint_*`, revisar `getPlaceholderText`.
