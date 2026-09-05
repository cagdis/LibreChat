# SPEC — Compartilhamento de Projetos (paridade ChatGPT/Claude Projects)

Status: estudo (spike T9). Nada implementado; branch `brand` intocada.
Objetivo: projeto com instruções custom + arquivos + compartilhamento view/edit
por usuário e por domínio, igual ChatGPT Projects e Claude Projects.

## 1. Estado atual auditado (código, não achismo)

`ChatProject` (`packages/data-schemas/src/schema/chatProject.ts:4-50`) é um
agrupador pessoal de chats: `name, description, user, conversationCount,
lastConversationAt/Id`. Conversas ligam-se via `chatProjectId` (`schema/convo.ts:341`).
Rotas em `api/server/routes/projects.js` (CRUD + assign), tudo filtrado por `user`
— id de outro usuário vira 404. UI em `client/src/components/Projects/`
(criar/renomear/apagar/atribuir chats). "Escopo de projeto" no composer só carimba
`chatProjectId` na conversa nova; **não injeta nada no prompt**. Grep confirma:
zero `instruction|knowledge|file|share` nos componentes de Projects.

Ou seja: falta TUDO — conteúdo (instructions/files) e compartilhamento.

## 2. O que a comunidade propõe (2 issues + 2 PRs lidos)

- **#13496 (OPEN, spec oficial do sharing)**: Project como novo *principal* no ACL
  (ao lado de user/role/group), níveis view/edit, feed de atividade compartilhada.
  Comentário-chave de um contribuidor que desistiu: sharing "presume project-scoped
  knowledge and instructions already exist, so this likely sequences after #13494
  and #13495".
- **#13494 (OPEN, fase 1)**: contexto compartilhado do projeto — instructions,
  knowledge, memory, defaults.
- **#13495 (OPEN, suporte)**: Knowledge Base standalone (coleções RAG consumíveis
  por projetos, agents e chats).
- **#13051 (MERGED)**: ACL granular dos shared links — o primitivo a reutilizar
  (NÃO criar 2º sistema de permissão).
- **#13467 (MERGED)**: Projects pessoais (agrupador) — já está no nosso tree.

Sequência upstream = nossa sequência: conteúdo (fase 1) → sharing (fase 2).

## 3. Como o ACL existente funciona (seam de extensão)

- Store único: `AclEntry` (`schema/aclEntry.ts`) — `principalType (user|group|public|role)`,
  `principalId`, `resourceType` (hoje: `agent, codeEnvironment, promptGroup, mcpServer,
  remoteAgent, skill, sharedLink` — **sem project**), `resourceId`, `permBits`
  (`VIEW=1, EDIT=2, DELETE=4, SHARE=8`), `roleId`, `grantedBy/At/expiredAt/tenantId`.
- Checagem: `AccessControlService.checkPermission()` (`packages/api/src/acl/accessControlService.ts:391`)
  + `findAccessibleResources()` para listagens; middleware genérico
  `canAccessResource` (`api/server/middleware/accessResources/canAccessResource.js:35`).
- Para plugar projeto: adicionar `CHAT_PROJECT` ao enum `ResourceType`
  (`packages/data-provider/src/accessPermissions.ts:45-53`) — o mapa
  `ResourceCapabilityMap` quebra em compilação até registrar a capability (seam
  guiado pelo compilador); criar papéis `VIEWER/EDITOR/OWNER` (espelhar bloco
  `SKILL_*` em `methods/accessRole.ts:232-252`); ciclo de grants espelhando
  `shared-links/service.ts:125-178` (grant OWNER na criação, `removeAllPermissions` no delete);
  trocar `ChatProject.find({user})` por `findAccessibleResources`.

## 4. Onde instructions e files entram na conversa (seams)

- **Instructions do projeto (string)**: dois pontos limpos —
  (a) dinâmico: `context.ts:117-127,175-178` via `prepareRuntimeAgent`
  (`client.js:2585-2625`), junto a `sharedRunContext/memory/scopedContext`
  (vale p/ efêmero + salvo, sobrevive a handoffs);
  (b) estável: `initialize.ts:1648-1661` após `replaceSpecialVars`, via
  `appendAdditionalInstructions` (mesmo padrão do guard de memória e artifacts).
- **Arquivos do projeto**: união em `initialize.ts:1043-1103` (`toolFileIds`) para
  fluir em hidratação → `primeResources` → `requestAttachments`/`tool_resources`
  (texto vira tail inline; `embedded` vira `file_search`; `codeEnvRef` vira
  `_injected_files`). Precisa de `db.getProjectFiles(projectId)` + filtro de acesso
  análogo a `filterFilesByAgentAccess`, e cuidado anti-duplicação
  (`attachments.ts:63-86`).
- NÃO reusar `vector_store_ids` (legado Assistants, só preservado).

## 5. Desenho por fases

**Fase 1 — conteúdo owner-only** (sem ACL): estender schema (`instructions`,
`file refs`), UI (editar no ProjectWorkspace), injeção nos seams acima.
Entrega valor sozinha e é pré-requisito.

**Fase 2 — sharing**: `CHAT_PROJECT` no ACL (§3), UI de membros (view/edit,
por usuário + por domínio `arvoredecomunicacao.com.br`), lista via
`findAccessibleResources`, enforcement nas rotas `/api/projects/*`, convos e files.

**Fora de escopo**: feed de atividade compartilhada (opcional no #13496), subagents
entre projetos, migração de chats entre owners.

## 6. Segurança (vazamento entre usuários = risco P0)

- Todo read de projeto/convo/file do projeto passa por `checkPermission`
  (nunca só `findOne({_id})`); role `role` suprimida cross-tenant como nos links.
- `permBits ≤ 15` ou writes falham/reads silenciam.
- Arquivos: `resolveShareFile`-like (membership do snapshot) antes de stream.
- Teste obrigatório: usuário B não lista/lê/edita nada do projeto de A; ex-membro
  perde acesso imediatamente (sem cache vazando — atentar a `USER_PRINCIPALS` cache).

## 7. Impacto white-label e rebase

Superfície nova grande (diálogos, workspace, membros) em área quente do upstream
(Projects mudou em #14866 eyn #15056 recentemente). Regra: componentes novos vivem
em `client/src/components/Projects/` (nossos, conflito raro); reaplicar guards nas
rotas a cada sync; documentar como `brand-10-*` quando sair do spike.

## 8. Estimativa honesta

- Spike (esta noite): DECISION + slice mínimo (instructions owner-only com teste). OK.
- Fase 1: 3–5 dias. Fase 2: 5–10 dias (ACL + UI + segurança + testes).
  Total paridade: **2–4 semanas** de 1 dev, mais revisão de segurança.
- Alternativa barata se bastar leitura: compartilhar via **shared links** (já existe)
  dentro de uma página de projeto — dias, não semanas — mas sem edição colaborativa.

## 9. Perguntas para o Daniel (decidem escopo)

1. Domínio `arvoredecomunicacao.com.br` como *grupo* automático de membros vale,
   ou convite nominal?
2. Editor pode convidar/remover membros (bit SHARE) ou só o dono?
3. Arquivos do projeto contam na cota de quem (dono ou uploader)?
4. Feed de atividade compartilhada entra no MVP?
