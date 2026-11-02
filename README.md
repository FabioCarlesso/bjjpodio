# BJJ Pódio

Ranking anual dos campeonatos de jiu-jitsu organizados pelo grupo de professores do Paraná. **Cada luta conta.**

Fase atual: protótipo estático com dados fictícios para validar a ideia. Planejamento completo em [PLANEJAMENTO.md](PLANEJAMENTO.md).

## Stack

- HTML + CSS + JavaScript puro (ES modules), sem build
- Dados em `public/data/*.json`; o ranking é calculado no navegador
- Hospedagem: Cloudflare Pages

## Rodar localmente

```bash
npx wrangler pages dev public   # simula o Pages (URLs limpas e _headers)
# ou
npx serve public
```

## Deploy (Cloudflare Pages)

Cloudflare → Workers & Pages → Create → Pages → Connect to Git → `bjjpodio`:

| Campo | Valor |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Build command | *(vazio)* |
| Build output directory | `public` |

Cada push na `main` publica em `bjjpodio.pages.dev`. Outras branches ganham URL de preview.

## Atualizar resultados

Editar os arquivos em `public/data/` e fazer push. O Pages publica em cerca de 1 minuto.

## Estrutura

```
public/            site publicado
  assets/css/      tokens.css, base.css, components.css
  assets/js/       layout.js (header/rodapé) e, em breve, data/ranking/filters/render
  data/            regras.json e demais dados
  _headers         cache e cabeçalhos de segurança
wrangler.toml      config do Pages
```
