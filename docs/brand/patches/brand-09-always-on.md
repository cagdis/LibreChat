# Patch brand-09 — always-on tools + seletor filtrado (default + agents)

- Base upstream: `dev @ c302ae6f35b4`
- Motivo produto: comportamento "mágico" estilo ChatGPT/Claude — ferramentas
  sempre ativas, sem toggles no composer; seletor visível mostrando SÓ
  "ÁrvorePress IA" (default pré-selecionado) + agents do usuário; suporte a
  agents salvos (incompatível com `modelSpecs.enforce`, ver abaixo).
- Frontend:
  - `Chat/Input/BadgeRow.tsx`: removidos `<ToolsDropdown/>` e badges
    (`WebSearch`, `CodeInterpreter`, `FileSearch`, `Skills`, `Memory`, `Artifacts`).
    **`<MCPSelect/>` MANTIDO** — MCP é conexão por usuário (OAuth), não forçável.
  - `store/agents.ts` (`useGetEphemeralAgent`, choke point único dos fluxos de
    envio e aprovação): força `web_search/file_search/execute_code/skills/memory/
    ask_user_question=true`, `artifacts='default'`; `mcp` preservado do usuário.
    Com isso, `localStorage` legado (`LAST_*_TOGGLE_*`, `*pinned`) não precisa de
    migração — é lido mas sobrescrito na leitura.
  - `Chat/Menus/Endpoints/ModelSelector.tsx` + `ModelSelectorContext.tsx`:
    specs filtrados p/ `!group && default===true`; endpoints só `agents`;
    busca (`allItems`) filtrada igual. Reescreve a regra brand-05b
    ("ModelSelector retorna null" — morta com `modelSelect:true`).
- Backend (trava real):
  - `packages/api/src/agents/load.ts` (`loadEphemeralAgent`): normaliza o objeto
    com built-ins `true` (ignora flags do client, inclusive ausente).
  - `api/server/controllers/agents/openai.js` + `responses.js`: `ephemeralSkillsToggle`
    forçado (única flag crua lida fora de `load.ts`).
  - `ToolService` capabilities intactas (yaml já habilita tudo).
- `librechat.yaml`: `modelSelect:true` + `enforce:false`. ATENÇÃO: com `enforce:true`
  o backend exige `spec` em toda request (`buildEndpointOption.js:96`) e chat com
  agent salvo morre com "No model spec selected" — Agents e enforce são mutuamente
  exclusivos no upstream. Default de conversa nova continua sendo o spec
  `deepseek-default` via `getDefaultModelSpec`.
- Specs atualizados p/ semântica always-on: `ConvoIcon.test` (marca sem conversa),
  `packages/api/src/agents/__tests__/load.spec.ts` (4 testes: flags `false`/ausentes
  não desligam mais nada).
- Compatibilidade após sync:
  1. `BadgeRow/ToolsDropdown/useToolToggle` e `load.ts` são área quente — regra:
     **manter o nosso**, reaplicar force/filtros sobre o deles.
  2. Se upstream adicionar nova built-in toggleável, decidir: entra no force?
  3. `tsc` client + `packages/api`; jest ConvoIcon/EndpointIcon/load/useTextarea.
  4. Smoke: composer sem botões; conversa nova em ÁrvorePress IA; chat com agent
     responde; UI sem `deepseek-v4-pro` cru nem endpoint DeepSeek.
- LIÇÃO runtime flutuante (overnight 04/09): `Dockerfile.brand` usa
  `librechat-dev:latest` + `packages/api/dist` do builder. Se o upstream publicar
  runtime com `api/server` que exige exports ainda inexistentes na nossa base
  (caso real: `AccessControlService` + middlewares vindos da evolução ACL pós-base),
  o boot morre em `TypeError ... not a constructor`. Diagnóstico: comparar os
  identificadores que o runtime importa de `@librechat/api` com as chaves do nosso
  `dist` (overnight: 144 usados, 3 faltando). Fix permitido: shim ADITIVO
  (`acl/middleware.ts` verbatim + métodos adaptadores sobre primitivas existentes,
  documentados) — NUNCA portar a evolução inteira nem rebaixar runtime às cegas.
  Rebuild sempre com `--pull` APÓS conferir que base e runtime conversam.
