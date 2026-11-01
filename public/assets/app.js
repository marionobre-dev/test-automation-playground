// Shared header/footer and small helpers used by every page.
(function () {
  const pages = [
    ['index.html', 'Home'],
    ['login.html', 'Login'],
    ['forms.html', 'Forms'],
    ['tables.html', 'Tables'],
    ['dynamic.html', 'Dynamic'],
    ['interactions.html', 'Interactions'],
    ['shop.html', 'Shop'],
    ['api.html', 'API'],
  ];
  const current = location.pathname.split('/').pop() || 'index.html';

  const header = document.getElementById('site-header');
  if (header) {
    header.className = 'site-header';
    header.innerHTML =
      '<div class="inner">' +
      '<a class="brand" href="index.html" data-testid="brand">Test Automation Playground</a>' +
      '<nav class="site-nav" aria-label="Main" data-testid="main-nav">' +
      pages.map(([href, label]) =>
        `<a href="${href}" data-testid="nav-${label.toLowerCase()}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`
      ).join('') +
      '</nav></div>';
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.className = 'site-footer';
    footer.textContent = 'Built for practising UI and API test automation. Data resets regularly.';
  }
})();

window.$ = (sel, root = document) => root.querySelector(sel);
window.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
window.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
window.escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
