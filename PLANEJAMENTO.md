# bjjpodio — Planejamento do MVP estático

> Ranking anual dos campeonatos de jiu-jitsu organizados pelo grupo de professores do Paraná.
> Objetivo desta fase: **front-end 100% estático para validar a ideia** com o professor e o grupo, antes de investir em banco de dados e login.

---

## 1. Identidade

### Nome

**bjjpodio** (nome definido). Curto, une a modalidade (BJJ) e o pódio.

- Domínio sugerido: `bjjpodio.com.br` (checar disponibilidade no registro.br)
- Repositório: `bjjpodio`
- Marca no site: escrever "BJJ Pódio" no logotipo e título para leitura fácil, mantendo `bjjpodio` como identificador (domínio, repo, pastas)
- Evitar "Circuito Paranaense": já existe um evento com esse nome (aparece na galeria do Bruno)

Slogan sugerido: **"Cada luta conta."**

### Paleta

Tema escuro (mesma linha do site do Bruno), mas com **dourado** como cor principal para diferenciar e remeter a pódio/ouro. Prata e bronze viram cores funcionais (1º, 2º, 3º lugar).

```css
:root {
  --bg:        #0b0d10;  /* fundo */
  --surface:   #14181d;  /* cards, tabelas */
  --surface-2: #1c2128;  /* hover, linhas alternadas */
  --border:    #2a313a;
  --text:      #f2f4f7;
  --text-mute: #9aa4b2;

  --gold:      #f5b301;  /* cor principal / CTA / 1º lugar */
  --silver:    #c0c6cf;  /* 2º lugar */
  --bronze:    #cd7f32;  /* 3º lugar */
  --red:       #e63946;  /* destaques pontuais, alertas */
}
```

Contraste: texto `#f2f4f7` sobre `#0b0d10` e dourado sobre fundo escuro passam em AA.

### Tipografia

- Títulos e números do ranking: **Barlow Condensed** (700), estilo esportivo
- Texto: **Inter** (400/500/600)
- Servidas pelo próprio site em `.woff2` (subconjunto latin, `font-display: swap`, preload). Sem Google Fonts: mais rápido e sem enviar IP de visitante a terceiros (LGPD). Licença OFL em `public/assets/fonts/`

### Tom de voz

Português do Brasil, direto, linguagem de tatame. Ex.: "Ranking geral", "Etapas", "Pódios", "Quem lidera".

---

## 2. Escopo do MVP estático

### Dentro

- Rankings individuais por gênero + idade + faixa (modelo CBJJ), kimono e no-gi separados, com filtro de peso e busca
- Ranking por academia/equipe
- Página do atleta (histórico de resultados e pontos)
- Página do campeonato (data, cidade, pódios por categoria)
- Página de regras (pontuação, desempate, premiação)
- Responsivo mobile-first (a galera vai abrir pelo celular, via WhatsApp)
- Dados **fictícios** em JSON, só para demonstração

### Fora (fase 2)

- Login dos professores e lançamento de resultados pelo site
- Banco de dados
- Upload de fotos, importação por CSV, imagem de pódio para Instagram

### Como o lançamento funciona na fase estática

Enquanto não há backend, os resultados ficam em arquivos `data/*.json` no repositório. Atualizar = editar o JSON (ou um CSV convertido em script) e fazer push. Cloudflare publica sozinho em ~1 minuto. Serve para validar; para o uso de domingo à noite com vários professores, a fase 2 (Supabase) resolve.

---

## 3. Stack e padrão do projeto

Seguindo o padrão do `bga-personal-page`: site estático, sem framework, hospedado na Cloudflare (`*.workers.dev`).

- HTML + CSS + JavaScript puro (ES modules), sem build obrigatório
- Dados em JSON, ranking **calculado no navegador** a partir de `resultados.json` + `regras.json`
- Imagens em WebP (hero em 1280 px, cards em 600 px)
- SEO e compartilhamento: `title`, `description`, Open Graph (`og:image` 1200x630, `og:locale pt_BR`), `theme-color #0b0d10`
- Deploy: **Cloudflare Workers com arquivos estáticos** (decidido), conectado ao GitHub (Workers Builds), sem comando de build
- Site publicado a partir de `public/`: arquivos de planejamento e README não vão para o ar
- `_headers` para cache (JSON sem cache, assets com cache curto) e cabeçalhos de segurança
- URLs limpas: a Cloudflare serve `atleta.html` em `/atleta`, então os links internos já usam `/atleta?id=...`
- Domínio próprio depois da validação (~R$ 40/ano)

---

## 4. Estrutura de pastas

```
bjjpodio/
├── public/                     # ← diretório publicado pela Cloudflare
│   ├── index.html              # Rankings (blocos por gênero + idade + faixa)
│   ├── ranking.html            # Um ranking completo (/ranking?modalidade=&sexo=&idade=&faixa=)
│   ├── atleta.html             # Detalhe do atleta (/atleta?id=slug)
│   ├── campeonato.html         # Detalhe do campeonato (/campeonato?id=slug)
│   ├── campeonatos.html        # Lista de etapas
│   ├── academias.html          # Ranking por academia
│   ├── regras.html             # Regras e premiação
│   ├── sobre.html              # Sobre o grupo / contato
│   ├── 404.html                # Página não encontrada (not_found_handling)
│   ├── _headers                # Cache e cabeçalhos de segurança
│   ├── assets/
│   │   ├── css/
│   │   │   ├── tokens.css      # variáveis (paleta, espaçamentos)
│   │   │   ├── base.css        # reset, tipografia
│   │   │   └── components.css  # header, tabela, cards, chips, pódio
│   │   ├── js/
│   │   │   ├── layout.js       # header/rodapé compartilhados e menu mobile
│   │   │   ├── paginas/        # um script por página (inicio, atleta, campeonato...)
│   │   │   ├── data.js         # fetch dos JSON
│   │   │   ├── ranking.js      # cálculo de pontos e desempate
│   │   │   ├── filters.js      # filtros e busca
│   │   │   └── render.js       # montagem de tabelas e cards
│   │   ├── img/                # favicon, hero, og-image, ícones
│   │   └── logos/              # logos das academias
│   └── data/
│       ├── regras.json         # pontuação, pesos, desempate
│       ├── categorias.json     # faixas, idades, pesos, modalidades
│       ├── campeonatos.json
│       ├── academias.json
│       ├── atletas.json
│       └── resultados.json
├── tests/
│   └── ranking.test.js         # testes do motor + validação dos dados (npm test)
├── package.json                # scripts dev e test (sem dependências)
├── wrangler.toml               # config do Worker ([assets] directory = public)
├── README.md
└── PLANEJAMENTO.md
```

---

## 5. Modelo de dados (JSON)

### `regras.json`

No modelo do [ranking de atletas da CBJJ](https://cbjj.com.br/athlete-ranking-info).

```json
{
  "temporada": 2026,
  "fonte": "https://cbjj.com.br/athlete-ranking-info",
  "pontosPorPosicao": {
    "categoria": { "1": 9, "2": 3, "3": 1 },
    "absoluto": { "1": 13.5, "2": 4.5, "3": 1.5 }
  },
  "pesoPorNivel": { "regional": 1, "estadual": 2, "grande": 4 },
  "pesoPorTemporada": [3, 2, 1],
  "desempate": [],
  "premiacao": "A definir com o grupo"
}
```

- `pesoPorTemporada[0]` é a temporada atual, `[1]` a anterior, `[2]` a retrasada; mais antigas não contam
- `desempate` vazio = pontos iguais dividem a posição (como a CBJJ). Aceita `ouros`, `pratas`, `bronzes`, `campeonatosDisputados` se o grupo quiser critério

### `categorias.json`

Lista única de sexos, faixas, idades, pesos e modalidades. Alimenta os filtros e a validação dos dados.

```json
{
  "faixas": [{ "id": "branca", "nome": "Branca", "cor": "#f2f4f7" }],
  "idades": [{ "id": "adulto", "nome": "Adulto" }],
  "pesos":  [{ "id": "leve", "nome": "Leve" }],
  "modalidades": [{ "id": "kimono", "nome": "Kimono" }, { "id": "nogi", "nome": "No-gi" }],
  "sexos": [{ "id": "M", "nome": "Masculino" }, { "id": "F", "nome": "Feminino" }]
}
```

### `campeonatos.json`

Etapas futuras ficam na lista sem resultados (aparecem como "próximas etapas").

```json
[
  { "id": "copa-abertura-2026", "nome": "Copa Abertura", "data": "2026-03-15", "cidade": "Curitiba", "nivel": "estadual", "modalidade": ["kimono"] }
]
```

### `academias.json`

```json
[
  { "id": "base-solida", "nome": "Base Sólida Jiu-Jitsu", "sigla": "BS", "cidade": "Curitiba" }
]
```

### `atletas.json`

Só o **ano** de nascimento (não a data completa), por causa dos atletas menores de idade. A faixa é a atual.

```json
[
  { "id": "rafael-moreira-rt", "nome": "Rafael Moreira", "academiaId": "raiz-tatame", "sexo": "M", "faixa": "branca", "anoNascimento": 2001 }
]
```

### `resultados.json`

Só pódios (1º, 2º e 3º, podendo haver dois 3º lugares). A categoria vai **no resultado**, porque o atleta pode trocar de faixa ou de peso, e os pontos ficam na faixa/idade em que foram conquistados. Absoluto é `"peso": "absoluto"`. Atleta sozinho na chave também é lançado (pontua). Um resultado por linha, para facilitar a edição à mão.

```json
[
  { "campeonatoId": "copa-abertura-2026", "atletaId": "rafael-moreira-rt", "modalidade": "kimono", "faixa": "branca", "idade": "adulto", "peso": "leve", "posicao": 1 }
]
```

Pontos **não são gravados**: são calculados por `ranking.js` a partir da regra. Assim, se a regra mudar, o ranking se recalcula sem mexer nos resultados.

---

## 6. Páginas e componentes

### Rankings (`index.html`)
- Hero compacto: nome, slogan, temporada, última etapa, próxima etapa
- Kimono / No-gi (rankings separados) e busca de atleta
- **Um bloco por ranking** (gênero + idade + faixa, como a CBJJ) com o top 5 e "Ver todos"

### Ranking (`ranking.html?modalidade=&sexo=&idade=&faixa=[&peso=][&temporada=]`)
- Seletores de gênero, idade, faixa, peso (inclui absoluto; recalcula só com aquele peso, como a CBJJ) e temporada
- **Pódio visual** dos 3 primeiros, lista com medalhas, etapas e pontos; busca mantém a posição real
- No mobile a tabela vira lista de cards; o link guarda o ranking para compartilhar

### Atleta (`atleta.html?id=`)
- Cabeçalho com nome, academia, faixa
- Um card por ranking em que pontua (posição, medalhas, pontos); faixa anterior sinalizada
- Resultados por temporada (com o peso dela) e por etapa, com a conta aberta: `9 × 4 × 3 = 108`

### Campeonato (`campeonato.html?id=`)
- Data, cidade, nível (peso da etapa) e peso da temporada no ranking atual
- Pódios por categoria (inclui absoluto), em acordeão; quadro de medalhas por academia

### Etapas (`campeonatos.html[?temporada=]`)
- Próximas e realizadas; troca de temporada (2026, 2025, 2024)

### Academias (`academias.html[?modalidade=]`)
- Ranking pela soma dos pontos dos atletas na modalidade; acordeão com os atletas (`#academia-<id>` abre direto)

### Regras (`regras.html`)
- Fórmula, exemplos, tabelas de colocação, peso da etapa e peso da temporada, lidos de `regras.json`

### Componentes reutilizáveis
Header com menu mobile, tabela/cards de ranking, chip de filtro, pódio, medalha (ouro/prata/bronze), card de campeonato, rodapé com contato por WhatsApp.

---

## 7. Regras de cálculo (modelo CBJJ)

Fonte: [cbjj.com.br/athlete-ranking-info](https://cbjj.com.br/athlete-ranking-info) e a página do [ranking 2026](https://cbjj.com.br/2026-athletes-ranking).

```
pontos  = colocação × peso da etapa × peso da temporada
          colocação: categoria 9 / 3 / 1 · absoluto 13,5 / 4,5 / 1,5
          peso da etapa: regional ×1 · estadual ×2 · grande ×4
          peso da temporada: atual ×3 · anterior ×2 · retrasada ×1 · mais antigas não contam
ranking = gênero + idade + faixa, numa modalidade; categoria de peso e absoluto somam juntos
empate  = pontos iguais dividem a posição (6, 6, 8), sem critério de desempate
```

| Regra da CBJJ | No circuito |
|---|---|
| Pesos dos campeonatos: Brasileiro ×4, Sul-Americano/BJJ Pro ×2, Open/Sul-Brasileiro ×1 | Nível da etapa: grande ×4, estadual ×2, regional ×1 |
| Temporada começa no Campeonato Brasileiro | Temporada = ano-calendário |
| Só ranking de kimono | Kimono e no-gi em **rankings separados** (como a IBJJF) |
| Pontos valem só na faixa e idade em que foram conquistados | Igual (a categoria fica gravada no resultado) |
| Sozinho na chave pontua | Igual |
| Troca de academia não muda os pontos | Igual |
| Filtro de peso recalcula com os pontos daquele peso | Igual |
| — | Ranking por academia: soma dos atletas na modalidade |

- "Etapas" na lista = etapas em que o atleta subiu ao pódio (só pódios são lançados)
- Implementado em `public/assets/js/ranking.js` (funções puras), coberto por `npm test` (inclui os 3 exemplos oficiais da página da CBJJ), que também valida a integridade de `public/data/`

Tudo vem de `regras.json`, então trocar a regra durante a validação é editar um arquivo.

---

## 8. Plano de execução

| Etapa | Entregável | Esforço |
|---|---|---|
| 1. Setup | Repo, `wrangler.toml`, `_headers`, `tokens.css`, `base.css`, layout base | 2 h |
| 2. Dados fake | 3 a 4 campeonatos, 25 a 30 atletas, 6 academias, resultados | 1 h |
| 3. Motor do ranking | `ranking.js` com pontos, pesos, desempate e testes simples | 2 h |
| 4. Ranking geral | Pódio, filtros, busca, tabela/cards | 3 a 4 h |
| 5. Demais páginas | Atleta, campeonato, academias, regras | 3 h |
| 6. Polimento | Responsivo, acessibilidade, SEO, Open Graph, performance | 2 h |
| 7. Deploy | Cloudflare Workers (`*.workers.dev`) + link para o professor | 1 h |

Total estimado: **2 finais de semana**.

---

## 9. Deploy

Hospedagem: **Cloudflare Workers com arquivos estáticos**, conectado ao GitHub (Workers Builds).

1. Repositório no GitHub: `FabioCarlesso/bjjpodio`
2. Worker `bjjpodio` criado no painel e conectado ao repositório (Workers & Pages → Create → Import a repository)
3. A cada push na `main`, a Cloudflare roda `npx wrangler deploy`, que lê o `wrangler.toml`:
   - `[assets] directory = "./public"`: publica só a pasta do site
   - `html_handling = "auto-trailing-slash"`: `/atleta` serve `atleta.html`
   - `not_found_handling = "404-page"`: endereço inexistente serve `404.html`
   - `public/_headers` é aplicado (e não fica acessível como arquivo)
4. Link de validação: https://bjjpodio.fabio-carlesso.workers.dev
5. Alternativa sem Git: `npx wrangler deploy`
6. Após aprovação: registrar o domínio e adicionar no Worker → Settings → Domains & Routes

Desenvolvimento local: `npm run dev` (`wrangler dev`, simula a Cloudflare com URLs limpas, 404 e `_headers`).

---

## 10. Validação da ideia

### O que mostrar ao professor
Link do protótipo com dados fictícios e o pedido: *"Abre no celular e me diz o que mudaria."*

### Perguntas a fechar
1. ~~A regra de pontos está certa?~~ Definido: modelo da CBJJ. Falta confirmar o nível (regional/estadual/grande) de cada etapa real
2. Ranking só individual ou também por academia?
3. ~~Quais categorias aparecem?~~ Definido: rankings por gênero + idade + faixa, kimono e no-gi separados. Faltam as idades reais do circuito (kids, juvenil, masters)
4. Quem lança os resultados no domingo à noite?
5. Há premiação no fim do ano? Quem banca?
6. Nome e logo do circuito

### Critérios de sucesso
- O professor e pelo menos 2 outros professores entendem o ranking em menos de 1 minuto
- Pedem alterações de regra, não de conceito
- Confirmam que vão usar toda semana

### Riscos
- **Nomes duplicados ou escritos diferente:** usar `id` único por atleta desde já
- **Atualização manual por JSON:** aceitável só para validar; migrar para Supabase na fase 2
- **Dados de menores de idade:** mostrar só nome e academia, sem foto nem data de nascimento completa; combinar com os professores e pedir ciência dos responsáveis

---

## 11. Fase 2 (depois de validar)

- Supabase: Postgres + login dos professores + permissões
- Tela de admin pensada para domingo à noite: cadastrar campeonato, lançar pódios por categoria com autocomplete de atleta
- Ranking calculado por view SQL
- Importação por CSV
- Imagem de pódio para Instagram / WhatsApp
- Encerramento de temporada: campeões e histórico por ano
- Domínio próprio

---

## 12. Checklist inicial

- [ ] Checar o domínio `bjjpodio.com.br` no registro.br
- [x] Criar o repositório `bjjpodio`
- [x] Configurar a Cloudflare no repositório (`wrangler.toml`, `public/`, `_headers`)
- [x] Criar `tokens.css` com a paleta
- [x] Layout base (header com menu mobile, rodapé, páginas vazias)
- [x] Montar `regras.json` provisório
- [x] Conectar o repositório no painel da Cloudflare (Worker `bjjpodio`)
- [x] Gerar dados fictícios (temporada 2026 em andamento)
- [x] Implementar `ranking.js` com testes
- [x] Construir `index.html` com pódio e filtros
- [x] Páginas de atleta, etapa, etapas, academias e regras
- [x] Polimento: imagem de prévia, ícones, fontes locais, acessibilidade (axe: 0 violações), cache
- [x] Deploy no `workers.dev` e ajustar o endereço do `og:image`
- [ ] Mandar o link para o professor

---

## 13. Decisões registradas

| Data | Decisão |
|---|---|
| 2026-11 | ~~Hospedagem no Cloudflare Pages~~ → trocado por **Cloudflare Workers com arquivos estáticos**: o projeto foi criado como Worker no painel, e é o caminho que a Cloudflare recomenda para projetos novos. Comportamento igual (URLs limpas, 404, `_headers`) |
| 2026-11 | Site publicado a partir de `public/`, sem etapa de build |
| 2026-11 | Header e rodapé injetados por `layout.js` para não duplicar HTML nas 7 páginas |
| 2026-11 | Protótipo mostra a **temporada 2026 em andamento**: 5 etapas realizadas, 2 próximas |
| 2026-11 | Atletas, academias e nomes de etapas **inventados**; cidades reais do Paraná |
| 2026-11 | Sem WhatsApp no rodapé por enquanto |
| 2026-11 | Categoria (faixa, idade, peso) gravada no resultado; atleta guarda só o ano de nascimento |
| 2026-11 | Página inicial na ordem: hero → filtros de categoria → pódio → busca + lista (a busca não altera o pódio) |
| 2026-11 | Filtros ficam na URL (`/?faixa=azul&peso=leve`) para compartilhar o link de uma categoria |
| 2026-11 | Lista de ranking em `<ol>`: cards no celular, tabela a partir de 720 px |
| 2026-11 | Academia não tem página própria: o clique abre o ranking geral filtrado (`/?academia=...`) |
| 2026-11 | Página do atleta mostra a posição dele em cada categoria em que lutou, com link para o ranking da categoria |
| 2026-11 | Página da etapa: pódios por categoria em acordeão (separados por modalidade) e quadro de medalhas por academia |
| 2026-11 | Página de regras gerada a partir de `regras.json`: mudou a regra, a página muda junto |
| 2026-11 | Fontes servidas pelo próprio site (sem Google Fonts) |
| 2026-11 | Protótipo com `X-Robots-Tag: noindex`: nomes fictícios fora do Google; sem sitemap até ter dados reais |
| 2026-11 | `og:image` aponta para `https://bjjpodio.fabio-carlesso.workers.dev` (trocar quando houver domínio próprio; comando no README) |
| 2026-11 | CSS/JS sempre revalidados (sem hash no nome); fontes com cache de 1 ano; imagens 1 dia |
| 2026-11 | **Regras iguais às do ranking da CBJJ**: absoluto 13,5/4,5/1,5, peso da etapa 1/2/4, peso da temporada ×3/×2/×1 com janela de 3 temporadas, pontos presos à faixa/idade, sem desempate |
| 2026-11 | Kimono e no-gi em rankings separados (a CBJJ só tem kimono) |
| 2026-11 | Fim do ranking geral: página inicial com um bloco por ranking (gênero + idade + faixa) e página `/ranking` com a lista completa |
| 2026-11 | Dados fictícios de 2024 e 2025 para mostrar o peso das temporadas, trocas de faixa e atleta sozinho na chave |

---

## 14. Antes de usar com dados reais

- [ ] Remover `X-Robots-Tag: noindex` de `public/_headers` e criar `sitemap.xml` + `robots.txt`
- [ ] Com domínio próprio, atualizar o `og:image` (ver README)
- [ ] Termo de ciência dos responsáveis pelos atletas menores de idade
- [ ] Prévia de link por atleta/etapa (hoje o WhatsApp mostra o título genérico da página, porque a prévia não roda JavaScript). Dá para resolver na fase 2 com código no próprio Worker
