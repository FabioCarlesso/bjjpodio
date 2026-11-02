# BJJ Pódio

Ranking anual dos campeonatos de jiu-jitsu organizados pelo grupo de professores do Paraná. **Cada luta conta.**

Fase atual: protótipo estático com dados fictícios para validar a ideia. Planejamento completo em [PLANEJAMENTO.md](PLANEJAMENTO.md).

## Stack

- HTML + CSS + JavaScript puro (ES modules), sem build
- Dados em `public/data/*.json`; o ranking é calculado no navegador
- Regras no modelo do [ranking de atletas da CBJJ](https://cbjj.com.br/athlete-ranking-info) (detalhes no `PLANEJAMENTO.md`, seção 7)
- Hospedagem: Cloudflare Workers (só arquivos estáticos de `public/`, sem código de servidor)

## Rodar localmente

```bash
npm run dev        # wrangler dev: simula a Cloudflare (URLs limpas, 404 e _headers) em http://localhost:8787
```

## Deploy (Cloudflare Workers)

O Worker `bjjpodio` está conectado ao GitHub (Workers Builds). Cada push na `main` roda `npx wrangler deploy`, que publica a pasta `public/` conforme o `wrangler.toml`. Não há comando de build.

- O `name` no `wrangler.toml` precisa ser igual ao nome do Worker no painel
- Endereço: https://bjjpodio.fabio-carlesso.workers.dev

### Endereço do site

A imagem de prévia de link (`og:image`) precisa de endereço completo e está como `https://bjjpodio.fabio-carlesso.workers.dev`. Quando houver domínio próprio, troque em todas as páginas:

```bash
grep -rl "bjjpodio.fabio-carlesso.workers.dev" public | xargs sed -i 's#https://bjjpodio.fabio-carlesso.workers.dev#https://NOVO-DOMINIO#g'
```

### Fora do Google durante o protótipo

`public/_headers` envia `X-Robots-Tag: noindex` para os nomes fictícios não irem parar no Google. A prévia no WhatsApp continua funcionando. Remova a linha quando os dados forem reais.

## Imagens

`node ferramentas/gerar-imagens.cjs` gera a imagem de prévia (`og-image.png`, 1200×630) e os ícones em `public/assets/img/`. Requer Playwright.

## Testes

```bash
npm test
```

Roda os testes do motor do ranking e **valida os dados** de `public/data/` (atleta ou etapa inexistente, posição inválida, categoria desconhecida, resultado duplicado). Rode sempre depois de editar os JSON.

## Atualizar resultados

1. Adicionar os pódios em `public/data/resultados.json` (um por linha). Absoluto: `"peso": "absoluto"`. Atleta sozinho na chave também entra (pontua)
2. Atleta novo? Adicionar em `atletas.json` com um `id` único (`nome-sobrenome-sigla`)
3. `npm test` para conferir
4. Push na `main`: a Cloudflare publica em cerca de 1 minuto

## Estrutura

```
public/            site publicado
  assets/css/      tokens.css, base.css, components.css
  assets/js/       layout.js (header/rodapé), data.js (carrega JSON), ranking.js (cálculo),
                   filters.js (filtros/URL), render.js (helpers de HTML)
  assets/js/paginas/  um script por página
  data/            regras, categorias, campeonatos, academias, atletas, resultados
  _headers         cache e cabeçalhos de segurança
tests/             testes do ranking e validação dos dados
wrangler.toml      config do Worker (pasta public/, URLs limpas, 404)
```
