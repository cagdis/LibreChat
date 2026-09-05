# Patch brand-08 — deploy prod (Traefik + Google OAuth + privacy)

- Base upstream: `dev @ c302ae6f35b4`
- Motivo produto: expor o white-label em `https://arvorepress.cagdis.com.br`
  com TLS automático e login somente-Google, fechado por domínio.
- Arquivos versionados:
  - `prod/privacy/privacy/index.html` (novo — política de privacidade servida
    em `/privacy/`; exigida pelo Google para publicar o consent OAuth externo)
  - `docs/brand/patches/brand-08-prod-deploy.md` (este doc)
  - `.gitignore` (`letsencrypt/` — contém as chaves privadas do ACME, nunca commitar)
- Arquivos **de deploy versionados** (sem segredos — auditado; segredos ficam
  só no `.env`, gitignorado): `docker-compose.override.yml`, `librechat.yaml`.
  (`librechat.yaml` referencia `${DEEPSEEK_API_KEY}`, cuja chave real vive no `.env`.)
- Infra fora do repo:
  - DNS (conta `cagdis-producao`, zona `cagdis.com.br`):
    `arvorepress` e `admin.arvorepress` → A `98.92.27.8`.
  - SG da instância (conta `cagdis-antiga`, us-east-1): 80/443 abertos.
- Override local (molde: doc oficial Traefik do LibreChat + redirect http→https,
  que a doc não inclui):
  - `api`: labels `Host(arvorepress.cagdis.com.br)`, `websecure`, `leresolver`, porta 3080.
  - `traefik:v3.6`: 80/443, `docker.sock`, `./letsencrypt`, redirect permanente
    web→websecure, ACME tlschallenge (`contato@cagdis.com`).
  - `admin-panel`: `Host(admin.arvorepress.cagdis.com.br)`, porta 3000,
    `SESSION_COOKIE_SECURE=true`; `ADMIN_PANEL_URL` no `.env`.
  - `privacy` (nginx:alpine, `./prod/privacy` read-only): regra
    `Host && PathPrefix(/privacy)` — regra mais longa vence o catch-all do app.
- `.env` prod: `DOMAIN_CLIENT/SERVER=https://arvorepress.cagdis.com.br`,
  `DISABLE_COMPRESSION=true` (Traefik comprime), Google-only:
  `ALLOW_EMAIL_LOGIN=false`, `ALLOW_REGISTRATION=false`,
  `ALLOW_SOCIAL_LOGIN=true`, `ALLOW_SOCIAL_REGISTRATION=true` (ver abaixo),
  `ALLOW_EMAIL_LOGIN_OVERRIDE=true` (só p/ login direto do painel admin; logado).
- `librechat.yaml` prod (não versionado): `registration.allowedDomains` =
  `cagdis.com`, `arvoredecomunicacao.com.br`; `modelSelect: false`,
  `modelSpecs.enforce: true` (DeepSeek rotulado ÁrvorePress IA).
- Google Cloud (console; sem API/CLI — `gcloud iap oauth-brands` foi
  descontinuado em 2026): consent Externo, publicado; redirect
  `https://arvorepress.cagdis.com.br/oauth/google/callback`.
- Onboarding com cadastro fechado: `create-user --provider=google` por membro
  (conta local nunca vincula ao Google sozinha — dá `AUTH_FAILED`); com
  `allowedDomains`, abrir `ALLOW_SOCIAL_REGISTRATION` dispensa whitelist.
- Lições de compatibilidade após sync:
  1. `Dockerfile.brand` usa runtime `librechat-dev:latest` + `dist` novo: se o
     upstream adicionar dependência ao backend (ex. `@opentelemetry/winston-transport`
     em #15565), rebuild **com `--pull`** — cache antigo quebra o boot (crash loop).
  2. Conta local pré-existente bloqueia o 1º login Google do mesmo e-mail;
     apagar ou migrar antes.
- Compatibilidade após sync: rebuild + `up -d`, smoke https `/`, `/login`,
  `/privacy/`, login Google de domínio permitido e negado.
