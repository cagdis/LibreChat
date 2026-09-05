# DECISION — project sharing: veredito do spike

## Veredito: VIÁVEL, em 2 fases, estimado 2–4 semanas (1 dev + revisão de segurança)

O MVP desta branch prova o mecanismo central: membership gravado, leitura
controlada por `getAccessibleChatProject` e contexto resolvido por
`resolveProjectContext`, tudo com testes (6/6). Nenhum beco sem saída encontrado;
os seams de injeção (SPEC §4) e de permissão (SPEC §3) existem e são acessíveis.

## Fase 1 — conteúdo owner-only (3–5 dias)

- Polir o que o spike começou: `instructions`/`fileIds` no schema (ok),
  UI de edição (ok) + anexar arquivos ao projeto (falta), wiring da injeção
  nos seams (`context.ts` ou `initialize.ts` + união `toolFileIds`), testes de
  prompt (instructions aparecem no system) e de isolamento de arquivos.
- Entrega valor sozinha e é pré-requisito (vide #13494).

## Fase 2 — sharing (5–10 dias)

- Rotas share/unshare/members + enforcement em `/api/projects/*`, convos e files;
  UI de membros (convite, papéis, remover); `editor` aplicado em escrita;
  graduação members-array → principal `CHAT_PROJECT` no AclEntry (ou direto no
  AclEntry se preferir pagar o custo upfront — rever na fase 2);
  testes de vazamento (P0) + auditoria; feed de atividade (opcional, por último).
- Riscos: superfície nova de UI conflita nos syncs mensais (regra brand-10);
  cache `USER_PRINCIPALS` deve invalidar na mudança de membership.

## Alternativa barata descartada (por ora)

Exibir shared links dentro da página do projeto: dias, só leitura, sem edição
colaborativa. Reavaliar se a fase 2 travar.

## Perguntas que decidem escopo (SPEC §9, sem resposta ainda)

Domínio como grupo automático? SHARE-bit só do dono? Cota de arquivos de quem?
Feed no MVP?
