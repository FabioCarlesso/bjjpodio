// Página do atleta (/atleta?id=slug): posição em cada ranking em que pontua e histórico das temporadas que contam.

import { calcularRanking, pesoDaTemporada } from '../ranking.js';
import {
  esc, formatarPontos, rotuloPts, formatarData, urlCampeonato, urlRanking, urlAcademia, montarPagina, parametro,
  temporadaDaPagina, definirTitulo, naoEncontrado, rotuloCategoria, rotuloRanking, nomeNivel, nomeModalidade,
  contaPontos, faixaBadge, pintarFaixas, medalha, posicaoTexto, seloPosicao,
} from '../render.js';

montarPagina((dados, ctx) => {
  const raiz = document.getElementById('pagina');
  const id = parametro('id');
  const atleta = ctx.atletas.get(id);
  if (!atleta) {
    naoEncontrado(raiz, 'Atleta não encontrado', 'O link pode estar errado ou o cadastro do atleta mudou.', { href: '/', texto: 'Ver os rankings' });
    return;
  }

  const temporada = temporadaDaPagina(dados);
  const academia = ctx.academias.get(atleta.academiaId);
  const faixa = ctx.faixas.get(atleta.faixa);
  // Todos os resultados do atleta que contam na temporada de referência (todas as modalidades e faixas).
  const meus = calcularRanking(dados, { temporada, busca: '' }).find((l) => l.atletaId === id);

  definirTitulo(atleta.nome, `${atleta.nome} (${academia?.nome ?? ''}) no ranking de jiu-jitsu do Paraná, temporada ${temporada}.`);

  raiz.innerHTML = `
    <header class="container page-header perfil">
      <nav class="trilha" aria-label="Você está em"><a href="/">Rankings</a> <span aria-hidden="true">/</span> Atleta</nav>
      <h1>${esc(atleta.nome)}</h1>
      <p class="perfil__sub">
        ${faixaBadge(atleta.faixa, ctx)} Faixa ${esc(faixa?.nome)}
        <span aria-hidden="true">·</span> <a href="${urlAcademia(atleta.academiaId)}">${esc(academia?.nome)}</a>
        ${academia?.cidade ? `<span aria-hidden="true">·</span> ${esc(academia.cidade)}` : ''}
      </p>
    </header>
    ${meus ? conteudo(meus) : `
      <section class="container section">
        <div class="card placeholder"><strong>Sem pontos no ranking</strong>Nenhum pódio nas temporadas que contam para ${temporada}.</div>
      </section>`}`;
  pintarFaixas(raiz, ctx);

  function conteudo(l) {
    return `
      <section class="container section" aria-labelledby="titulo-rankings">
        <h2 id="titulo-rankings">Rankings</h2>
        <ul class="lista-cards">${rankings(l).join('')}</ul>
      </section>

      <section class="container section" aria-labelledby="titulo-resultados">
        <h2 id="titulo-resultados">Resultados que contam</h2>
        <p class="text-mute">Pontos = colocação × peso da etapa × peso da temporada.</p>
        ${historico(l)}
      </section>`;
  }

  /** Um card por ranking (modalidade + idade + faixa) em que o atleta tem pontos. */
  function rankings(l) {
    const vistos = new Map();
    for (const r of l.resultados) {
      const chave = `${r.modalidade}|${r.idade}|${r.faixa}`;
      if (!vistos.has(chave)) vistos.set(chave, { modalidade: r.modalidade, sexo: atleta.sexo, idade: r.idade, faixa: r.faixa });
    }
    const ordemFaixa = (f) => dados.categorias.faixas.findIndex((x) => x.id === f);
    return [...vistos.values()]
      .sort((a, b) => ordemFaixa(b.faixa) - ordemFaixa(a.faixa) || a.modalidade.localeCompare(b.modalidade))
      .map((cat) => {
        const ranking = calcularRanking(dados, { temporada, ...cat });
        const minha = ranking.find((x) => x.atletaId === id);
        const antiga = cat.faixa !== atleta.faixa ? ' <span class="tag tag--mini">faixa anterior</span>' : '';
        return `
          <li>
            <a class="card-link" href="${urlRanking({ ...cat, temporada: temporada === Number(dados.regras.temporada) ? '' : temporada })}">
              <span class="card-link__titulo">${faixaBadge(cat.faixa, ctx, { decorativo: true })} ${esc(rotuloRanking(cat, ctx))}${antiga}</span>
              <span class="card-link__sub">${esc(nomeModalidade(cat.modalidade, ctx))}</span>
              <span class="card-link__valor">${posicaoTexto(minha.posicao)} <small>de ${ranking.length}</small></span>
              <span class="card-link__medalhas">${medalha('ouros', minha.ouros)}${medalha('pratas', minha.pratas)}${medalha('bronzes', minha.bronzes)}</span>
              <span class="card-link__sub">${formatarPontos(minha.pontos)} ${rotuloPts(minha.pontos)} · ver ranking</span>
            </a>
          </li>`;
      });
  }

  /** Resultados por temporada (com o peso dela) e por etapa, do mais recente para o mais antigo. */
  function historico(l) {
    const porTemporada = new Map();
    for (const r of l.resultados) {
      if (!porTemporada.has(r.temporada)) porTemporada.set(r.temporada, new Map());
      const etapas = porTemporada.get(r.temporada);
      if (!etapas.has(r.campeonatoId)) etapas.set(r.campeonatoId, []);
      etapas.get(r.campeonatoId).push(r);
    }
    return [...porTemporada].map(([t, etapas]) => `
      <h3 class="subtitulo temporada-titulo">Temporada ${t} <span class="tag tag--nivel">×${formatarPontos(pesoDaTemporada(t, temporada, dados.regras))}</span></h3>
      <ol class="linha-tempo">${[...etapas.values()].map((itens) => {
        const c = itens[0].campeonato;
        const total = itens.reduce((s, i) => s + i.pontos, 0);
        return `
          <li class="linha-tempo__item">
            <div class="linha-tempo__cab">
              <a class="linha-tempo__etapa" href="${urlCampeonato(c.id)}">${esc(c.nome)}</a>
              <span class="linha-tempo__total">+${formatarPontos(total)} <small>${rotuloPts(total)}</small></span>
            </div>
            <p class="linha-tempo__meta">${formatarData(c.data, { ano: true })} · ${esc(c.cidade)} · ${esc(nomeNivel(c.nivel, ctx))} ×${formatarPontos(itens[0].pesoEtapa)}</p>
            <ul class="linha-tempo__resultados">
              ${itens.map((i) => `
                <li>
                  ${seloPosicao(i.posicao)}
                  <span>${esc(rotuloCategoria(i, ctx))} · ${esc(nomeModalidade(i.modalidade, ctx))}</span>
                  <span class="linha-tempo__pts"><span class="conta">${contaPontos(i)}</span> ${rotuloPts(i.pontos)}</span>
                </li>`).join('')}
            </ul>
          </li>`;
      }).join('')}
      </ol>`).join('');
  }
});
