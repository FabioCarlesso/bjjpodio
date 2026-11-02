// Header e rodapé compartilhados por todas as páginas (sem build, sem duplicar HTML).
// Cada página marca <body data-page="..."> para destacar o item ativo no menu.

const NAV = [
  { page: 'rankings',    href: '/',            label: 'Rankings' },
  { page: 'campeonatos', href: '/campeonatos', label: 'Etapas' },
  { page: 'academias',   href: '/academias',   label: 'Academias' },
  { page: 'regras',      href: '/regras',      label: 'Regras' },
  { page: 'sobre',       href: '/sobre',       label: 'Sobre' },
];

function renderHeader(current) {
  const items = NAV.map(({ page, href, label }) => {
    const aria = page === current ? ' aria-current="page"' : '';
    return `<li><a href="${href}"${aria}>${label}</a></li>`;
  }).join('');

  return `
    <header class="site-header">
      <div class="container site-header__inner">
        <a class="brand" href="/" aria-label="BJJ Pódio, página inicial">
          <img src="/assets/img/favicon.svg" alt="" width="32" height="32">
          BJJ <span>Pódio</span>
        </a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
          <span class="nav-toggle__bar"></span>
          <span class="visually-hidden">Abrir menu</span>
        </button>
        <nav class="site-nav" id="site-nav" aria-label="Principal">
          <ul>${items}</ul>
        </nav>
      </div>
    </header>`;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container site-footer__inner">
        <p>BJJ Pódio · Cada luta conta.</p>
        <p>Protótipo em validação com os professores.</p>
      </div>
    </footer>`;
}

function setupMenu(root) {
  const toggle = root.querySelector('.nav-toggle');
  const nav = root.querySelector('.site-nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.visually-hidden').textContent = open ? 'Fechar menu' : 'Abrir menu';
    nav.classList.toggle('is-open', open);
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
}

const current = document.body.dataset.page;
const headerSlot = document.getElementById('site-header');
const footerSlot = document.getElementById('site-footer');

if (headerSlot) {
  headerSlot.innerHTML = renderHeader(current);
  setupMenu(headerSlot);
}
if (footerSlot) footerSlot.innerHTML = renderFooter();
