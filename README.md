# BJJ Pódio

Ranking anual dos campeonatos de jiu-jitsu organizados pelo grupo de professores do Paraná. **Cada luta conta.**

Fase atual: protótipo estático em validação, sem dados lançados (os resultados entram pelo importador do Torneio Fácil). Planejamento completo em [PLANEJAMENTO.md](PLANEJAMENTO.md).

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
- Branches de PR rodam `npx wrangler preview` (prévia, em beta), que exige o bloco `[previews]` no `wrangler.toml`
- Endereço: https://bjjpodio.fabio-carlesso.workers.dev

### Endereço do site

A imagem de prévia de link (`og:image`) precisa de endereço completo e está como `https://bjjpodio.fabio-carlesso.workers.dev`. Quando houver domínio próprio, troque em todas as páginas:

```bash
grep -rl "bjjpodio.fabio-carlesso.workers.dev" public | xargs sed -i 's#https://bjjpodio.fabio-carlesso.workers.dev#https://NOVO-DOMINIO#g'
```

### Fora do Google durante o protótipo

`public/_headers` envia `X-Robots-Tag: noindex` para o protótipo não ir parar no Google. A prévia no WhatsApp continua funcionando. Remova a linha quando o ranking for divulgado oficialmente.

## Imagens

`node ferramentas/gerar-imagens.cjs` gera a imagem de prévia (`og-image.png`, 1200×630) e os ícones em `public/assets/img/`. Requer Playwright.

## Testes

```bash
npm test
```

No GitHub, o workflow **Testes** (`.github/workflows/testes.yml`) roda isso sozinho em todo PR e em todo push na `main`, junto com a simulação do deploy na Cloudflare (`wrangler deploy --dry-run`). O resultado aparece como check no PR.

Roda os testes do motor do ranking e **valida os dados** de `public/data/` (atleta ou etapa inexistente, posição inválida, categoria desconhecida, resultado duplicado). Rode sempre depois de editar os JSON.

## Sincronizar com o Torneio Fácil

O ranking contempla **todos os torneios do Paraná cadastrados no [Torneio Fácil](https://torneiofacil.com)**. Um comando busca a lista pública deles, cria/atualiza as etapas e importa os pódios publicados:

```bash
npm run sincronizar             # simula e mostra o relatório
npm run sincronizar -- --gravar # grava em public/data
npm test                        # confere e faça o commit
```

- Rode sempre que quiser (ex.: toda segunda): não duplica nada e só traz o que mudou
- Gi e no-gi do mesmo evento viram uma etapa. Etapa nova entra como **regional (×1)**; ajuste `nivel`, `nome` ou `cidade` em `campeonatos.json` à vontade, a sincronização não sobrescreve
- Só pontuam categorias com **pódio publicado** no Torneio Fácil. A página **Etapas** mostra quais torneios são contemplados e a situação de cada um
- Configuração em `ferramentas/torneiofacil-etapas.json`: estado, nível padrão, links a ignorar e correções de grafia de cidade

## Importar do Torneio Fácil

Os pódios de um torneio do [Torneio Fácil](https://torneiofacil.com) podem ser importados direto, sem digitar:

```bash
# 1. Cadastre a etapa em public/data/campeonatos.json (id, nome, data, cidade, nível, modalidade)
# 2. Simule (não grava nada) e confira o relatório
npm run importar -- https://torneiofacil.com/resultados/<slug> --campeonato <id-da-etapa>
# 3. Grave, rode os testes e faça o commit
npm run importar -- https://torneiofacil.com/resultados/<slug> --campeonato <id-da-etapa> --gravar
npm test
```

- Kimono e no-gi em links separados? Passe os dois: `npm run importar -- <link-gi> <link-nogi> --campeonato <id>`
- Reimportar depois de uma correção no Torneio Fácil: acrescente `--substituir`
- Atletas são reconhecidos pelo nome (sem acento/maiúscula). Novos são criados; homônimos e casos duvidosos ficam de fora e aparecem no relatório para lançar à mão
- Categorias "juntos" (ex.: adulto e master azul e roxa): idade e faixa reais vêm da categoria de peso do atleta no mesmo torneio
- Termo novo do Torneio Fácil (idade, faixa, peso): o importador para e pede para incluir em `ferramentas/torneiofacil-mapa.json`
- Usa a mesma chamada pública da página `torneiofacil.com/resultados/<slug>` (não oficial: pode mudar sem aviso)

## Atualizar resultados à mão

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
tests/             testes do ranking, do importador e validação dos dados
ferramentas/       sincronização e importador do Torneio Fácil, gerador de imagens
wrangler.toml      config do Worker (pasta public/, URLs limpas, 404)
```
