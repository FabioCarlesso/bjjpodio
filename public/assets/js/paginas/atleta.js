// Página do atleta (/atleta?id=slug): totais, posição por categoria e histórico de resultados.

import { calcularRanking } from '../ranking.js';
import {
  esc, formatarPontos, rotuloPts, formatarData, urlCampeonato, urlRanking, montarPagina, parametro,
  temporadaDaPagina, definirTitulo, naoEncontrado, rotuloCategoria, nomeNivel, nomeModalidade,
  faixaBadge, pintarFaixas, medalha, posicaoTexto, seloPosicao,
} from '../render.js';

montarPagina((dados, ctx) => {
  const raiz = document.getElementById('pagina');
  const id = parametro('id');
  const atleta = ctx.atletas.get(id);
  if (!atleta) {
    naoEncontrado(raiz, 'Atleta não encontrado', 'O link pode estar errado ou o cadastro do atleta mudou.', { href: '/', texto: 'Ver o ranking geral' });
    return;
  }

  const temporada = temporadaDaPagina(dados);
  const geral = calcularRanking(dados, { temporada });
  const linha = geral.find((l) => l.atletaId === id);
  const academia = ctx.academias.get(atleta.academiaId);
  const faixa = ctx.faixas.get(atleta.faixa);

  definirTitulo(atleta.nome, `${atleta.nome} (${academia?.nome ?? ''}) no ranking de jiu-jitsu do Paraná, temporada ${temporada}.`);

  raiz.innerHTML = `
    <header class="container page-header perfil">
      <nav class="trilha" aria-label="Você está em"><a href="/">Ranking</a> <span aria-hidden="true">/</span> Atleta</nav>
      <h1>${esc(atleta.nome)}</h1>
      <p class="perfil__sub">
        ${faixaBadge(atleta.faixa, ctx)} Faixa ${esc(faixa?.nome)}
        <span aria-hidden="true">·</span> <a href="${urlRanking({ academia: atleta.academiaId })}">${esc(academia?.nome)}</a>
        ${academia?.cidade ? `<span aria-hidden="true">·</span> ${esc(academia.cidade)}` : ''}
      </p>
    </header>
    ${linha ? conteudo(linha, geral.length) : `
      <section class="container section">
        <div class="card placeholder"><strong>Sem pódios na temporada ${temporada}</strong>Os resultados aparecem aqui assim que forem lançados.</div>
      </section>`}`;
  pintarFaixas(raiz, ctx);

  function conteudo(l, totalGeral) {
    return `
      <section class="container section" aria-label="Resumo da temporada ${temporada}">
        <dl class="numeros">
          <div class="numeros__item"><dt>Posição geral</dt><dd>${posicaoTexto(l.posicao)} <small>de ${totalGeral}</small></dd></div>
          <div class="numeros__item"><dt>Pontos</dt><dd>${formatarPontos(l.pontos)}</dd></div>
          <div class="numeros__item"><dt>Medalhas</dt><dd class="numeros__medalhas">${medalha('ouros', l.ouros)}${medalha('pratas', l.pratas)}${medalha('bronzes', l.bronzes)}</dd></div>
          <div class="numeros__item"><dt>Etapas com pódio</dt><dd>${l.campeonatosDisputados}</dd></div>
        </dl>
      </section>

      <section class="container section" aria-labelledby="titulo-categorias">
        <h2 id="titulo-categorias">Por categoria</h2>
        <ul class="lista-cards">${porCategoria(l).join('')}</ul>
      </section>

      <section class="container section" aria-labelledby="titulo-resultados">
        <h2 id="titulo-resultados">Resultados ${temporada}</h2>
        <ol class="linha-tempo">${historico(l).join('')}</ol>
      </section>`;
  }

  /** Posição do atleta no ranking de cada categoria em que lutou (kimono e no-gi juntos). */
  function porCategoria(l) {
    const vistas = new Map();
    for (const r of l.resultados) {
      const chave = `${r.faixa}|${r.idade}|${r.peso}`;
      if (!vistas.has(chave)) vistas.set(chave, { faixa: r.faixa, idade: r.idade, peso: r.peso, sexo: atleta.sexo });
    }
    return [...vistas.values()].map((cat) => {
      const ranking = calcularRanking(dados, { temporada, ...cat });
      const minha = ranking.find((x) => x.atletaId === id);
      return `
        <li>
          <a class="card-link" href="${urlRanking(cat)}">
            <span class="card-link__titulo">${faixaBadge(cat.faixa, ctx)} ${esc(rotuloCategoria(cat, ctx))}</span>
            <span class="card-link__valor">${posicaoTexto(minha.posicao)} <small>de ${ranking.length}</small></span>
            <span class="card-link__sub">${formatarPontos(minha.pontos)} ${rotuloPts(minha.pontos)} · ver ranking da categoria</span>
          </a>
        </li>`;
    });
  }

  /** Resultados agrupados por etapa, da mais recente para a mais antiga. */
  function historico(l) {
    const porEtapa = new Map();
    for (const r of l.resultados) {
      if (!porEtapa.has(r.campeonatoId)) porEtapa.set(r.campeonatoId, []);
      porEtapa.get(r.campeonatoId).push(r);
    }
    return [...porEtapa.values()].map((itens) => {
      const c = itens[0].campeonato;
      const peso = dados.regras.pesoPorNivel[c.nivel] ?? 1;
      const total = itens.filter((i) => i.contaNoTotal).reduce((s, i) => s + i.pontos, 0);
      return `
        <li class="linha-tempo__item">
          <div class="linha-tempo__cab">
            <a class="linha-tempo__etapa" href="${urlCampeonato(c.id)}">${esc(c.nome)}</a>
            <span class="linha-tempo__total">+${formatarPontos(total)} <small>${rotuloPts(total)}</small></span>
          </div>
          <p class="linha-tempo__meta">${formatarData(c.data, { ano: true })} · ${esc(c.cidade)} · ${esc(nomeNivel(c.nivel, ctx))}${peso !== 1 ? ` (×${formatarPontos(peso)})` : ''}</p>
          <ul class="linha-tempo__resultados">
            ${itens.map((i) => `
              <li class="${i.contaNoTotal ? '' : 'is-descartado'}">
                ${seloPosicao(i.posicao)}
                <span>${esc(rotuloCategoria(i, ctx))} · ${esc(nomeModalidade(i.modalidade, ctx))}</span>
                <span class="linha-tempo__pts">${formatarPontos(i.pontos)} ${rotuloPts(i.pontos)}${i.contaNoTotal ? '' : ' <small>(fora dos melhores)</small>'}</span>
              </li>`).join('')}
          </ul>
        </li>`;
    });
  }
});
