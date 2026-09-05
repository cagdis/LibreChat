# Patch brand-05a — identidade de deployment nos ícones

- Base upstream: `dev @ 29f738dea`
- Motivo produto: provider é detalhe de implementação; endpoints de modelo
  mostram sempre ícone/nome ÁrvorePress IA. Agents/Assistants mantêm avatar.
- Arquivos:
  - `client/src/branding/deployment.ts` (novo — fonte única da identidade)
  - `client/src/components/Endpoints/EndpointIcon.tsx` (early-return marca)
  - `client/src/components/Endpoints/ConvoIcon.tsx` (`displayIconURL` marca)
  - `client/src/components/Chat/Messages/MessageIcon.tsx` (idem)
  - `client/src/components/Share/MessageIcon.tsx` (idem)
  - specs atualizados: `ConvoIcon.test`, `EndpointIcon.test`, `MessageIcon.render.test`
- Área upstream tocada: componentes de ícone — área quente, muda com frequência
  (ex. padding Cohere removido do nosso caminho nesse meio tempo).
- Invariantes:
  - Endpoint de modelo (não-agent/assistant) → `deploymentBrand` sempre.
  - Agent/Assistant → avatar/nome da entidade, nunca a marca.
  - `EndpointIcon` com conversa `null` retorna a marca; `ConvoIcon` com conversa
    `null` também retorna a marca (unificado em T2 overnight; antes era `div` vazia).
  - Em `ConvoIcon`, `renderArt()` é inalcançável para modelos (early-return
    sempre pega) — conflito futuro ali é só aparente.
- Compatibilidade após sync:
  1. Regra: **manter o nosso**, reaplicar early-returns sobre o deles.
  2. `jest ConvoIcon EndpointIcon MessageIcon` — specs codificam a decisão.
