// Regras lidas de regras.json: a página nunca fica diferente do cálculo.

import { esc, formatarPontos, montarPagina, nomeNivel, seloPosicao } from '../render.js';

const CRITERIOS = {
  ouros: 'Mais ouros',
  pratas: 'Mais pratas',
  bronzes: 'Mais bronzes',
  campeonatosDisputados: 'Mais etapas com pódio',
};

montarPagina((dados, ctx) => {
  const { regras } = dados;
  const posicoes = Object.keys(regras.pontosPorPosicao).sort((a, b) => a - b);
  const niveis = Object.entries(regras.pesoPorNivel);
  const [nivelExemplo, pesoExemplo] = niveis.find(([, p]) => p !== 1) ?? niveis[0];
  const ouro = regras.pontosPorPosicao[posicoes[0]];
  // Coluna "Base" só quando nenhum nível tem peso 1 (senão ela repete a coluna desse nível).
  const mostrarBase = !niveis.some(([, p]) => p === 1);

  document.getElementById('pagina').innerHTML = `
    <section class="container section" aria-labelledby="titulo-conta">
      <h2 id="titulo-conta">Como a pontuação funciona</h2>
      <p class="formula">Pontos = <strong>pontos da posição</strong> × <strong>peso da etapa</strong></p>
      <p class="text-mute">Exemplo: ouro numa etapa ${esc(nomeNivel(nivelExemplo, ctx).toLowerCase())} vale ${formatarPontos(ouro)} × ${formatarPontos(pesoExemplo)} = <strong class="text-ouro">${formatarPontos(ouro * pesoExemplo)} pontos</strong>.</p>
      <div class="tabela-rolagem">
        <table class="tabela tabela--regras">
          <caption class="visually-hidden">Pontos por posição em cada nível de etapa</caption>
          <thead>
            <tr><th scope="col">Posição</th>${mostrarBase ? '<th scope="col">Base</th>' : ''}${niveis.map(([n, p]) => `<th scope="col">${esc(nomeNivel(n, ctx))} <small>×${formatarPontos(p)}</small></th>`).join('')}</tr>
          </thead>
          <tbody>${posicoes.map((pos) => `
            <tr>
              <th scope="row">${seloPosicao(Number(pos))}</th>
              ${mostrarBase ? `<td class="tabela__num">${formatarPontos(regras.pontosPorPosicao[pos])}</td>` : ''}
              ${niveis.map(([, p]) => `<td class="tabela__num">${formatarPontos(regras.pontosPorPosicao[pos] * p)}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <ul class="lista-regras">
        <li>${Number.isInteger(regras.melhoresResultados) && regras.melhoresResultados > 0
          ? `Contam os <strong>${regras.melhoresResultados} melhores resultados</strong> de cada atleta na temporada. As medalhas contam todas.`
          : 'Contam <strong>todos os resultados</strong> da temporada.'}</li>
        <li>Kimono e no-gi somam no mesmo ranking. Os filtros mostram cada modalidade separada.</li>
        <li>Pódio com dois 3º lugares: os dois recebem os pontos de 3º.</li>
        <li>O ranking por academia soma os pontos de todos os seus atletas.</li>
      </ul>
    </section>

    <section class="container section" aria-labelledby="titulo-desempate">
      <h2 id="titulo-desempate">Desempate</h2>
      <p class="text-mute">Com a mesma pontuação, vale a ordem abaixo.</p>
      <ol class="lista-numerada">
        ${regras.desempate.map((c) => `<li>${esc(CRITERIOS[c] ?? c)}</li>`).join('')}
        <li>Empate em tudo: os atletas dividem a posição.</li>
      </ol>
    </section>

    <section class="container section" aria-labelledby="titulo-premiacao">
      <h2 id="titulo-premiacao">Premiação</h2>
      <div class="card"><p>${esc(regras.premiacao)}</p></div>
    </section>`;
});
