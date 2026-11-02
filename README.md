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

## Testes

```bash
npm test
```

Roda os testes do motor do ranking e **valida os dados** de `public/data/` (atleta ou etapa inexistente, posição inválida, categoria desconhecida, resultado duplicado). Rode sempre depois de editar os JSON.

## Atualizar resultados

1. Adicionar os pódios em `public/data/resultados.json` (um por linha)
2. Atleta novo? Adicionar em `atletas.json` com um `id` único (`nome-sobrenome-sigla`)
3. `npm test` para conferir
4. Push na `main`: o Pages publica em cerca de 1 minuto

## Estrutura

```
public/            site publicado
  assets/css/      tokens.css, base.css, components.css
  assets/js/       layout.js (header/rodapé), data.js (carrega JSON), ranking.js (cálculo)
  data/            regras, categorias, campeonatos, academias, atletas, resultados
  _headers         cache e cabeçalhos de segurança
tests/             testes do ranking e validação dos dados
wrangler.toml      config do Pages
```
