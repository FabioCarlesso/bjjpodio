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
- Carregar via Google Fonts com `display=swap` (ou self-host em `.woff2` para performance)

### Tom de voz

Português do Brasil, direto, linguagem de tatame. Ex.: "Ranking geral", "Etapas", "Pódios", "Quem lidera".

---

## 2. Escopo do MVP estático

### Dentro

- Ranking geral individual, com busca e filtros (faixa, categoria de peso, idade, kimono / no-gi)
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
- Deploy: **Cloudflare Pages** (decidido), conectado ao GitHub, sem comando de build
- Site publicado a partir de `public/`: arquivos de planejamento e README não vão para o ar
- `_headers` do Pages para cache (JSON sem cache, assets com cache curto) e cabeçalhos de segurança
- URLs limpas: o Pages serve `atleta.html` em `/atleta`, então os links internos já usam `/atleta?id=...`
- Domínio próprio depois da validação (~R$ 40/ano)

---

## 4. Estrutura de pastas

```
bjjpodio/
├── public/                     # ← diretório publicado pelo Cloudflare Pages
│   ├── index.html              # Ranking geral
│   ├── atleta.html             # Detalhe do atleta (/atleta?id=slug)
│   ├── campeonato.html         # Detalhe do campeonato (/campeonato?id=slug)
│   ├── campeonatos.html        # Lista de etapas
│   ├── academias.html          # Ranking por academia
│   ├── regras.html             # Regras e premiação
│   ├── sobre.html              # Sobre o grupo / contato
│   ├── 404.html                # Página não encontrada (servida pelo Pages)
│   ├── _headers                # Cache e cabeçalhos de segurança (Pages)
│   ├── assets/
│   │   ├── css/
│   │   │   ├── tokens.css      # variáveis (paleta, espaçamentos)
│   │   │   ├── base.css        # reset, tipografia
│   │   │   └── components.css  # header, tabela, cards, chips, pódio
│   │   ├── js/
│   │   │   ├── layout.js       # header/rodapé compartilhados e menu mobile
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
├── wrangler.toml               # config do Pages (pages_build_output_dir)
├── README.md
└── PLANEJAMENTO.md
```

---

## 5. Modelo de dados (JSON)

### `regras.json`

```json
{
  "temporada": 2026,
  "pontosPorPosicao": { "1": 9, "2": 3, "3": 1 },
  "pesoPorNivel": { "regional": 1, "estadual": 1.5, "grande": 2 },
  "melhoresResultados": null,
  "desempate": ["ouros", "pratas", "bronzes", "campeonatosDisputados"],
  "premiacao": "A definir com o grupo"
}
```

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

Só pódios (1º, 2º e 3º, podendo haver dois 3º lugares). A categoria vai **no resultado**, porque o atleta pode trocar de faixa ou de peso durante a temporada. Um resultado por linha, para facilitar a edição à mão.

```json
[
  { "campeonatoId": "copa-abertura-2026", "atletaId": "rafael-moreira-rt", "modalidade": "kimono", "faixa": "branca", "idade": "adulto", "peso": "leve", "posicao": 1 }
]
```

Pontos **não são gravados**: são calculados por `ranking.js` a partir da regra. Assim, se a regra mudar, o ranking se recalcula sem mexer nos resultados.

---

## 6. Páginas e componentes

### Ranking geral (`index.html`)
- Hero compacto: nome, slogan, temporada, "última atualização"
- **Pódio visual** dos 3 primeiros (ouro no centro, prata e bronze nas laterais)
- Filtros em chips: faixa, peso, idade, kimono / no-gi, temporada
- Busca por nome
- Tabela: posição, atleta, academia, pontos, 🥇🥈🥉, etapas disputadas
- No mobile a tabela vira lista de cards

### Atleta (`atleta.html?id=`)
- Cabeçalho com nome, academia, faixa
- Totais: pontos, medalhas, posição no ranking
- Linha do tempo de campeonatos (estilo "Conquistas" do site do Bruno)

### Campeonato (`campeonato.html?id=`)
- Data, cidade, nível/peso
- Pódios por categoria, em acordeão

### Academias (`academias.html`)
- Ranking por soma de pontos dos atletas, com número de atletas e medalhas

### Regras (`regras.html`)
- Tabela de pontos, pesos, desempate e premiação, lidos de `regras.json` (uma fonte de verdade)

### Componentes reutilizáveis
Header com menu mobile, tabela/cards de ranking, chip de filtro, pódio, medalha (ouro/prata/bronze), card de campeonato, rodapé com contato por WhatsApp.

---

## 7. Regras de cálculo (provisórias)

```
pontos = pontosPorPosicao[posicao] × pesoPorNivel[nivelDoCampeonato]
total  = soma dos pontos (ou só os N melhores, se "melhoresResultados" estiver definido)
desempate = ouros → pratas → bronzes → nº de campeonatos
empate total = mesma posição (1, 2, 2, 4), listados em ordem alfabética
```

- `melhoresResultados`: quando é um número N, só os N resultados de maior pontuação somam; as medalhas contam todas
- "Campeonatos disputados" conta as etapas em que o atleta subiu ao pódio (só pódios são lançados)
- Ranking por academia = soma dos totais dos atletas da academia
- Filtros de categoria (faixa, peso, idade, modalidade, sexo) **recalculam** as posições: viram o ranking daquela categoria. A busca por nome **não**: mostra o atleta na posição real
- Implementado em `public/assets/js/ranking.js` (funções puras), coberto por `npm test`, que também valida a integridade de `public/data/`

Tudo vem de `regras.json`, então trocar a regra durante a validação é editar um arquivo.

---

## 8. Plano de execução

| Etapa | Entregável | Esforço |
|---|---|---|
| 1. Setup | Repo, `wrangler.toml` (Pages), `_headers`, `tokens.css`, `base.css`, layout base | 2 h |
| 2. Dados fake | 3 a 4 campeonatos, 25 a 30 atletas, 6 academias, resultados | 1 h |
| 3. Motor do ranking | `ranking.js` com pontos, pesos, desempate e testes simples | 2 h |
| 4. Ranking geral | Pódio, filtros, busca, tabela/cards | 3 a 4 h |
| 5. Demais páginas | Atleta, campeonato, academias, regras | 3 h |
| 6. Polimento | Responsivo, acessibilidade, SEO, Open Graph, performance | 2 h |
| 7. Deploy | Cloudflare Pages (`*.pages.dev`) + link para o professor | 1 h |

Total estimado: **2 finais de semana**.

---

## 9. Deploy

Hospedagem: **Cloudflare Pages** com integração Git.

1. Repositório no GitHub: `FabioCarlesso/bjjpodio`
2. Cloudflare → Workers & Pages → Create → **Pages** → Connect to Git → selecionar `bjjpodio`
3. Configuração do build:
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: *(vazio)*
   - Build output directory: `public`
4. Cada push na `main` publica em produção; cada branch/PR ganha uma URL de preview (`<branch>.bjjpodio.pages.dev`), útil para mostrar mudanças antes de publicar
5. Link de validação: `bjjpodio.pages.dev`
6. Alternativa sem Git: `npx wrangler pages deploy public --project-name bjjpodio`
7. Após aprovação: registrar o domínio e adicionar em Pages → Custom domains

Desenvolvimento local: `npx wrangler pages dev public` (simula o Pages, inclusive `_headers` e URLs limpas) ou `npx serve public`.

---

## 10. Validação da ideia

### O que mostrar ao professor
Link do protótipo com dados fictícios e o pedido: *"Abre no celular e me diz o que mudaria."*

### Perguntas a fechar
1. A regra de pontos está certa? Campeonato grande vale mais?
2. Ranking só individual ou também por academia?
3. Quais categorias aparecem (faixa, peso, idade, kimono / no-gi)?
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
- [x] Configurar Cloudflare Pages no repositório (`wrangler.toml`, `public/`, `_headers`)
- [x] Criar `tokens.css` com a paleta
- [x] Layout base (header com menu mobile, rodapé, páginas vazias)
- [x] Montar `regras.json` provisório
- [ ] Conectar o repositório no painel do Cloudflare Pages
- [x] Gerar dados fictícios (temporada 2026 em andamento)
- [x] Implementar `ranking.js` com testes
- [x] Construir `index.html` com pódio e filtros
- [ ] Deploy no `pages.dev`
- [ ] Mandar o link para o professor

---

## 13. Decisões registradas

| Data | Decisão |
|---|---|
| 2026-11 | Hospedagem no **Cloudflare Pages** (em vez de Workers com static assets), conectado ao GitHub |
| 2026-11 | Site publicado a partir de `public/`, sem etapa de build |
| 2026-11 | Header e rodapé injetados por `layout.js` para não duplicar HTML nas 7 páginas |
| 2026-11 | Protótipo mostra a **temporada 2026 em andamento**: 5 etapas realizadas, 2 próximas |
| 2026-11 | Atletas, academias e nomes de etapas **inventados**; cidades reais do Paraná |
| 2026-11 | Sem WhatsApp no rodapé por enquanto |
| 2026-11 | Categoria (faixa, idade, peso) gravada no resultado; atleta guarda só o ano de nascimento |
| 2026-11 | Página inicial na ordem: hero → filtros de categoria → pódio → busca + lista (a busca não altera o pódio) |
| 2026-11 | Filtros ficam na URL (`/?faixa=azul&peso=leve`) para compartilhar o link de uma categoria |
| 2026-11 | Lista de ranking em `<ol>`: cards no celular, tabela a partir de 720 px |
