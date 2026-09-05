# DEMO — MVP project sharing (spike, sem deploy)

Branch: `spike/project-sharing`. Nada aqui foi para `brand` nem para homologação.
Reprodução determinística: tudo abaixo roda sem servidor, só jest + mongo em memória.

## Roteiro

1. `npx jest src/methods/chatProjectSharing.spec.ts` em `packages/data-schemas`
   → 6/6 verde. Cobre o ciclo completo:
   - dono cria projeto com `instructions` + `fileIds`;
   - `shareChatProject(owner, id, membro, 'viewer')`;
   - membro lê via `getAccessibleChatProject` (role `viewer`, vê instructions);
   - estranho recebe `null` em tudo;
   - upgrade p/ `editor`, `unshare` revoga;
   - `resolveProjectContext(membro)` devolve `{instructions, fileIds, role}`
     — exatamente o objeto que alimentaria a montagem do prompt (SPEC §4:
     `context.ts` / `initialize.ts`), e `null` para estranhos.
2. UI (não deployada): `ProjectEditDialog` ganhou campo Instructions (até 8000
   chars), salvo via `updateProject` (método estendido).
3. `resolveProjectContext` é o contrato de injeção: o wiring nos seams do
   SPEC §4 (append em `additional_instructions` + união em `toolFileIds` +
   filtro de acesso por projeto) é fase seguinte — endereços mapeados, não executados.

## Gaps honestos do MVP

- Sem rotas HTTP (`POST /api/projects/:id/share` etc.) — métodos prontos e testados,
  faltam handlers finos + `canAccessResource` por rota.
- Sem UI de membros/convite e sem "aceitar" (share é direto, sem convite pendente).
- Sem enforcement em convos/files do projeto (leitura via `chatProjectId` ainda é
  só do dono) — o `resolveProjectContext` retorna `null` p/ estranhos, mas as rotas
  atuais não o consultam.
- Sem feed de atividade, sem `editor` vs `viewer` aplicado em escrita (só registrado).
- Members em array no doc (graduação: principal `CHAT_PROJECT` no AclEntry, SPEC §3).
