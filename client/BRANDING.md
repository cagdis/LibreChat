# ÁrvorePress brand assets

The runtime assets in `public/assets` were obtained from the client's official website with the
client's authorization for this white-label deployment.

- `arvorepress-icon.png`: https://arvorepress.com.br/wp-content/uploads/2026/06/arvore-press-icone-1.png
- `logo-arvorepress.png`: https://arvorepress.com.br/wp-content/uploads/2026/06/logo-arvore-press-branco.png

The color theme follows the official website's primary colors: `#1A1A1A`, `#2E3B3B`, `#064023`,
`#17E65C`, `#D8E6E1`, and `#E6F2EE`. Large surfaces remain neutral for readability; brand greens
are reserved for interactive emphasis, and the vivid green appears only in the official icon.

Provider identity is intentionally kept out of the product UI. The deployment-wide assistant name
and icon live in `src/branding/deployment.ts`, independently of whichever model backs the service.
