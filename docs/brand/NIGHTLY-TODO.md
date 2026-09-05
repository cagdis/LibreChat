# TODO overnight — opencode (executar nesta ordem)

Contexto: branch `brand/arvorepress-ia` (fork cagdis/LibreChat), stack de HOMOLOGAÇÃO/PoC
(`arvorepress.cagdis.com.br` + Traefik + Google OAuth) — **NÃO é produção**.
Deploy liberado: `docker compose build/up/down`, restarts e rebuilds à vontade,
pode usar os CLIs disponíveis (`docker`, `gcloud`, `gh`, `aws --profile cagdis-antiga`).
  ATENÇÃO: `cagdis-producao` teve logout proposital (conta sensível, era só p/ DNS) —
  NÃO faça login nela por conta própria em nenhuma hipótese.
Convenção: commits atômicos em PT, docs em `docs/brand/patches/`, nunca commitar
`.env`, `letsencrypt/`. Push SOMENTE com `git push origin brand/arvorepress-ia`
(sem `--force`; rebase é ritual manual diurno). Se algo quebrar o boot, pare e registre.
Regra de ambiguidade global: o **Intent** de cada tarefa prevalece sobre os passos literais; se o Intent for inalcançável, registre o bloqueio e siga para a próxima tarefa (nunca improvise credencial, escopo ou deploy parcial silencioso). Se algo quebrar o boot, TENTE CONSERTAR (rebuild com `--pull`, `up -d --force-recreate`, ler logs) — só pare e registre se esgotar as alternativas, pois há janela livre até de manhã.

## T1. Conferir segredos de sessão (10 min)
**Intent: de manhã, nenhum restart derruba sessões ativas; segredo de sessão é permanente e auditável.**
- Verificar no `.env` (NÃO commitar, só ler) se `JWT_SECRET` e `JWT_REFRESH_SECRET`
  estão preenchidos com valores de ≥32 bytes.
- Se vazios: gerar com `openssl rand -hex 32`, preencher, `docker compose up -d --force-recreate api`,
  validar `https://arvorepress.cagdis.com.br/` 200.
- Critério: valores fixos presentes; sessões sobrevivem a restart.

## T2. Consistência ConvoIcon null (30 min)
**Intent: identidade ÁrvorePress aparece em 100% das superfícies; nunca um ícone vazio onde deveria haver marca.**
- `client/src/components/Endpoints/ConvoIcon.tsx:170`: com `conversation=null`
  retorna `div` vazia; `EndpointIcon.tsx:63-71` retorna a marca. Unificar para a marca.
- Atualizar `ConvoIcon.test.tsx` + doc `brand-05a-deployment-icons.md`.
- Critério: `npx jest ConvoIcon EndpointIcon --runInBand --coverage=false` verde.

## T3. Placeholder i18n além do `en` (30 min)
**Intent: usuário BR vê o composer em português; nenhuma língua exibe chave crua ou texto inglês onde há tradução.**
- `com_ui_message_placeholder` existe só em `client/src/locales/en/translation.json`.
  Adicionar `pt-BR` ("Digite sua mensagem") + `es`, `fr`, `de` via mesma tradução,
  seguindo o padrão das chaves vizinhas.
- Critério: `tsc --noEmit` em `client` limpo nos arquivos tocados; UI em pt-BR exibe o placeholder.

## T4. Always-on: frontend sem toggles (120 min)
**Intent: de manhã o composer não mostra nenhum botão de ferramenta e o modelo sempre tem busca/código/artefatos/skills/memória ativos — comportamento 'mágico', sem o usuário ligar nada. Em ambiguidade, prefira ESCONDER UI e LIGAR backend.**
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
**Intent: mesmo se um client antigo/malicioso mandar tudo-desligado, o modelo continua com todas as built-ins — a trava real é no servidor, não no browser.**
- UI é cosmética: forçar na síntese do agente efêmero em
  `packages/api/src/agents/load.ts:67-120` (ignorar `req.body.ephemeralAgent`
  p/ built-ins); espelhar em `api/server/controllers/agents/openai.js:490-498`
  e `responses.js:734-742` se aplicável ao endpoint em uso.
- Não mexer em `ToolService.js:774-828` (capabilities do yaml já habilitam tudo).
- Critério: `tsc` em `packages/api`; teste manual via API registra `tools` ativos
  mesmo com `ephemeralAgent` tudo-false no request.

## T6. MCPs: runrun.it full + trio Google oficial (90 min)
**Intent: de manhã o Daniel encontra (a) runrun.it declarado, ligado e clicável na UI; (b) trio Google (Drive/Gmail/Calendar oficiais) com tudo pronto EXCETO os 3 passos de console que só ele faz (~5 min: redirect URIs + scopes + colar client ID/secret) — após isso, cada usuário conecta a PRÓPRIA conta Google na UI. Em ambiguidade, NÃO invente credencial: registre o que falta.**
- runrun.it (`https://arvore-mcp-runrun.cagdis.com/mcp`, Streamable HTTP, sem auth —
  `initialize` já responde `arvore-mcp-runrun 1.0.0`): declarar em `librechat.yaml`
  `mcpServers`, restart, smoke `tools/list` via API, confirmar aparecendo na UI.
- Google Drive/Gmail/Calendar = **MCPs oficiais do Google** (gmailmcp/drivemcp/
  calendarmcp.googleapis.com) + OAuth por usuário no LibreChat — igual ChatGPT/Claude,
  sem terceiro, sem ponte self-hosted. Doc: librechat.ai/docs/mcp_servers/google_workspace.
  FEITO via gcloud: APIs + MCP services habilitados no projeto. Esqueleto comentado
  já em `librechat.yaml` + vars vazias no `.env`.
- FALTA (console, ~5 min do Daniel de manhã): no OAuth client, adicionar redirect URIs
  `https://arvorepress.cagdis.com.br/api/mcp/{gmail,drive,calendar}/oauth/callback`;
  em Data Access adicionar os scopes do doc; colar client ID/secret em
  `GOOGLE_WORKSPACE_MCP_CLIENT_*` no `.env`. Pode reusar o client atual ou criar
  "LibreChat Google Workspace MCP". Depois: descomentar yaml, restart, cada usuário
  clica Conectar na UI. Atenção: scopes Gmail/Drive são sensíveis → aviso de app
  não verificado até completar verificação Google (só polimento futuro).
- Critério: runrun.it clicável na UI de manhã; trio Google pronto p/ ligar após console.

## T7. Seletor filtrado: só ÁrvorePress IA + agents (150 min)
**Intent: de manhã o seletor está VISÍVEL mas mostra SÓ 'ÁrvorePress IA' (padrão, pré-selecionado em toda conversa nova) + os agents do usuário; chat padrão e chat com agent (ex. Mater Dei) funcionam; nenhum outro modelo/endpoint é alcançável. Em ambiguidade, prefira ESCONDER opção a EXIBIR.**
- Base: `enforce:false` + `modelSelect:true` em `librechat.yaml` (commitado; era o inverso).
  Motivo: com `enforce:true` o backend exige `spec` em toda request
  (`buildEndpointOption.js:96-100`) e chat com agent salvo morre com
  "No model spec selected" — Agents e enforce são mutuamente exclusivos no upstream.
- Auditar fontes de opções do seletor: `ModelSelector.tsx` (reescrever o early-return-null
  do brand-05b), menu de endpoints (`endpointsMenu`), `getDefaultModelSpec`/`getModelSpecPreset`
  em `ChatRoute.tsx` (default continua sendo o spec `deepseek-default`).
- Filtro: exibir apenas (a) spec default `deepseek-default` ("ÁrvorePress IA") e
  (b) agents de `agentsMap`. Esconder: endpoint DeepSeek direto, outros modelos,
  spec `deepseek-chat-fallback` (já `showInMenu:false`), presets/parâmetros que vazem provider.
- Reescrever doc `brand-05b-deployment-labels.md` (regra "ModelSelector retorna null" morre)
  + entrada em `patches.json`; atualizar specs dos componentes tocados.
- Critério: `tsc` limpo; jest tocados verde; smoke: (1) conversa nova vem em ÁrvorePress IA
  sem tocar em nada; (2) chat com Mater Dei responde; (3) grep na UI não lista
  deepseek-v4-pro cru, endpoint DeepSeek nem outros modelos.

## T8. Smoke pós-tudo (15 min)
**Intent: de manhã o Daniel abre os URLs e todos respondem 200; chat padrão + chat com agent respondem; qualquer regressão do overnight é detectada aqui, não pelo usuário.**
- `https://arvorepress.cagdis.com.br/` 200 + `<title>ÁrvorePress IA</title>`,
  `/login` 200, `/privacy/` 200, `https://admin.arvorepress.cagdis.com.br/` 200,
  `docker ps` tudo Up, sem `Cannot find module` nos logs do api.
- Critério: checklist OK registrado no commit final.

## T9. SPIKE isolado: MVP compartilhamento de projetos (restante da noite)
**Intent: de manhã existe, na branch descartável `spike/project-sharing`, um MVP
ponta-a-ponta funcionando: projeto com instructions + arquivos, compartilhado com
outro usuário, cujo chat usa o contexto do projeto — e a `brand`/homologação intactas.**
- ISOLAMENTO (inviolável): `git checkout -b spike/project-sharing origin/brand/arvorepress-ia`;
  TODO o trabalho commita e pusha SÓ em `spike/project-sharing`; NUNCA merge/nada na `brand`;
  NUNCA `docker compose` com código do spike (sem deploy do spike!); se a branch prestar,
  vira proposta diurna — se não, `git branch -D` e ninguém soube.
- Alvo funcional (paridade): projeto com (a) instruções custom → system prompt dos chats
  do projeto; (b) arquivos → contexto (file_search/file context); (c) compartilhar com
  outros usuários (view + edit), por usuário e por domínio.
- Base de pesquisa (AUDITORIA FEITA 04/09: `ChatProject` em
  `packages/data-schemas/src/schema/chatProject.ts` tem SÓ `name, description, user,
  conversationCount` — projeto pessoal é mero agrupador de chats, SEM instructions,
  SEM files, SEM sharing. Ou seja: antes de compartilhar, é preciso CRIAR instruções
  e arquivos no projeto. Reler ainda: #13496, #13051, `client/src/components/Projects/`.
- Roteiro: (1) SPEC lida (`docs/brand/spike-sharing/SPEC.md` — auditoria, ACL, seams);
  (2) MVP = menor vertical completo: schema `instructions`+`file refs` no ChatProject,
  injeção no prompt (seam `context.ts` ou `initialize.ts`), share VIEW com 1 usuário
  via `AclEntry` (`CHAT_PROJECT`), listagem por `findAccessibleResources`, enforcement
  nas rotas; (3) UI mínima (editar instructions + botão compartilhar + aceitar);
  EDIT pode ficar para depois SE o tempo estourar — registrar como gap;
  (4) testes de isolamento (B não vê nada de A) + `DECISION.md` com o que faltou p/ paridade total.
- Critério: demo roteirizada em `docs/brand/spike-sharing/DEMO.md` (passo a passo
  reproduzível na branch do spike, SEM deploy em homologação); zero diff na `brand`.
- Critério: `DECISION.md` com veredito + (protótipo OU motivo documentado de inviabilidade
  numa noite); zero diff na `brand`; zero restart de prod causado pelo spike.


## GATEADA (não executar sem aprovação explícita)
- Runner self-hosted / deploy automático.
- Publicar consent Google além do atual / novos domínios em allowedDomains.
