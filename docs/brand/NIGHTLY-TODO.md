# TODO overnight — opencode (executar nesta ordem)

Contexto: branch `brand/arvorepress-ia` (fork cagdis/LibreChat), deploy prod no ar
(`arvorepress.cagdis.com.br` + Traefik + Google OAuth). Worktree limpo e pushado.
Convenção: commits atômicos em PT, docs em `docs/brand/patches/`, nunca commitar
`.env`, `letsencrypt/`. Push SOMENTE com `git push origin brand/arvorepress-ia`
(sem `--force`; rebase é ritual manual diurno). Se algo quebrar o boot, pare e registre.

## T1. Conferir segredos de sessão (10 min)
- Verificar no `.env` (NÃO commitar, só ler) se `JWT_SECRET` e `JWT_REFRESH_SECRET`
  estão preenchidos com valores de ≥32 bytes.
- Se vazios: gerar com `openssl rand -hex 32`, preencher, `docker compose up -d --force-recreate api`,
  validar `https://arvorepress.cagdis.com.br/` 200.
- Critério: valores fixos presentes; sessões sobrevivem a restart.

## T2. Consistência ConvoIcon null (30 min)
- `client/src/components/Endpoints/ConvoIcon.tsx:170`: com `conversation=null`
  retorna `div` vazia; `EndpointIcon.tsx:63-71` retorna a marca. Unificar para a marca.
- Atualizar `ConvoIcon.test.tsx` + doc `brand-05a-deployment-icons.md`.
- Critério: `npx jest ConvoIcon EndpointIcon --runInBand --coverage=false` verde.

## T3. Placeholder i18n além do `en` (30 min)
- `com_ui_message_placeholder` existe só em `client/src/locales/en/translation.json`.
  Adicionar `pt-BR` ("Digite sua mensagem") + `es`, `fr`, `de` via mesma tradução,
  seguindo o padrão das chaves vizinhas.
- Critério: `tsc --noEmit` em `client` limpo nos arquivos tocados; UI em pt-BR exibe o placeholder.

## T4. Always-on: frontend sem toggles (120 min)
- Objetivo: nenhum botão de ferramenta no composer; tudo ligado sempre ("mágico").
- `client/src/components/Chat/Input/ToolsDropdown.tsx:378-399`: remover o botão do composer.
- `client/src/components/Chat/Input/BadgeRow.tsx:333,373-382`: remover badges
  (`WebSearch`, `CodeInterpreter`, `FileSearch`, `Skills`, `Memory`, `Artifacts`).
  **MANTER `MCPSelect` visível** — MCPs são conexão por usuário (OAuth/valores),
  não dá para forçar como built-in.
- `client/src/hooks/Chat/useChatFunctions.ts:373,697-725` (`getEphemeralAgent`):
  forçar `web_search, file_search, execute_code, artifacts, skills, memory,
  ask_user_question = true`, ignorando o átomo Recoil.
- `client/src/hooks/Plugins/useToolToggle.ts:80-123` + `Providers/BadgeRowContext.tsx:80-278`:
  parar de ler `localStorage` (`LAST_*_TOGGLE_*`, `*pinned`) — usuários existentes
  têm `false` gravado e isso anularia o always-on.
- MCP fora do escopo (nenhum servidor configurado); Agent Builder fora (usamos
  `modelSpecs.enforce`, só conversa efêmera).
- Atualizar specs afetados; documentar como `docs/brand/patches/brand-09-always-on.md`
  + entrada em `patches.json` (base_sha = `c302ae6f35b4`, commit = SHA do commit).
- Critério: `tsc --noEmit` limpo nos tocados; jest dos specs tocados
  (`--runInBand --coverage=false`) verde; composer sem nenhum botão de ferramenta.

## T5. Always-on: trava no backend (60 min)
- UI é cosmética: forçar na síntese do agente efêmero em
  `packages/api/src/agents/load.ts:67-120` (ignorar `req.body.ephemeralAgent`
  p/ built-ins); espelhar em `api/server/controllers/agents/openai.js:490-498`
  e `responses.js:734-742` se aplicável ao endpoint em uso.
- Não mexer em `ToolService.js:774-828` (capabilities do yaml já habilitam tudo).
- Critério: `tsc` em `packages/api`; teste manual via API registra `tools` ativos
  mesmo com `ephemeralAgent` tudo-false no request.

## T6. MCPs: runrun.it full + trio Google até o limite sem segredo (90 min)
- runrun.it (`https://arvore-mcp-runrun.cagdis.com/mcp`, Streamable HTTP, sem auth —
  `initialize` já responde `arvore-mcp-runrun 1.0.0`): declarar em `librechat.yaml`
  `mcpServers`, restart, smoke `tools/list` via API, confirmar aparecendo na UI.
- Google Drive/Gmail/Calendar: SEM segredo não dá para fechar click-conect; entregar:
  (a) qual servidor/ponte usar e por quê; (b) skeleton comentado no yaml;
  (c) shopping-list exata do que falta (chave ou URI de redirect no console Google).
- Critério: runrun.it clicável na UI de manhã; doc do trio Google pronta.

## T7. Smoke pós-tudo (15 min)
- `https://arvorepress.cagdis.com.br/` 200 + `<title>ÁrvorePress IA</title>`,
  `/login` 200, `/privacy/` 200, `https://admin.arvorepress.cagdis.com.br/` 200,
  `docker ps` tudo Up, sem `Cannot find module` nos logs do api.
- Critério: checklist OK registrado no commit final.

## GATEADA (não executar sem aprovação explícita)
- Runner self-hosted / deploy automático.
- Publicar consent Google além do atual / novos domínios em allowedDomains.
