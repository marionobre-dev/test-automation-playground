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
      '<a class="brand" href="index.html" data-testid="brand"><img src="assets/favicon.svg" alt="" width="24" height="24">Mario\'s Test Automation Playground</a>' +
      '<nav class="site-nav" aria-label="Main" data-testid="main-nav">' +
      pages.map(([href, label]) =>
        `<a href="${href}" data-testid="nav-${label.toLowerCase()}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`
      ).join('') +
      '</nav>' +
      '<button type="button" class="theme-toggle" id="theme-toggle" data-testid="theme-toggle"></button>' +
      '</div>';

    const toggle = document.getElementById('theme-toggle');
    const sync = () => {
      const theme = window.currentTheme();
      toggle.textContent = theme === 'dark' ? '☀ Light mode' : '☾ Dark mode';
      toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      toggle.dataset.theme = theme;
    };
    toggle.addEventListener('click', () => window.setTheme(window.currentTheme() === 'dark' ? 'light' : 'dark'));
    document.addEventListener('themechange', sync);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync);
    sync();
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.className = 'site-footer';
    footer.textContent = 'Built for practising UI and API test automation. Data resets regularly.';
  }
})();

// "Show me how" solutions. The code lives in a <template> and is only added to the
// page while the solution is open, so its text never matches learners' locators.
(function () {
  const KEYWORDS = /^(import|from|export|default|const|let|for|of|while|if|else|break|return|await|async|new|true|false|null|typeof)$/;
  const TOKEN = /(\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\b([A-Za-z_]+)\b/g;
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function dedent(text) {
    const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
    const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    return lines.map((l) => l.slice(indent)).join('\n');
  }

  function highlight(code) {
    let out = '', last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(code))) {
      out += esc(code.slice(last, m.index));
      if (m[1]) out += `<span class="tok-c">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="tok-s">${esc(m[2])}</span>`;
      else if (KEYWORDS.test(m[3])) out += `<span class="tok-k">${m[3]}</span>`;
      else out += m[3];
      last = TOKEN.lastIndex;
    }
    return out + esc(code.slice(last));
  }

  function render(code) {
    const block = document.createElement('div');
    block.className = 'code-block';
    block.innerHTML = `<pre><code>${highlight(code)}</code></pre><button type="button" class="copy secondary small">Copy</button>`;
    block.querySelector('.copy').addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(code); e.target.textContent = 'Copied'; }
      catch { e.target.textContent = 'Select and copy'; }
      setTimeout(() => (e.target.textContent = 'Copy'), 1500);
    });
    return block;
  }

  document.querySelectorAll('details.solution').forEach((details) => {
    const template = details.querySelector('template');
    if (!template) return;
    const code = dedent(template.content.textContent);
    details.addEventListener('toggle', () => {
      const shown = details.querySelector('.code-block');
      if (details.open && !shown) details.appendChild(render(code));
      if (!details.open && shown) shown.remove();
    });
  });

  // Static, always-visible snippets (e.g. setup instructions on the home page).
  document.querySelectorAll('pre.snippet > code').forEach((el) => {
    el.innerHTML = highlight(dedent(el.textContent));
  });
})();

window.$ = (sel, root = document) => root.querySelector(sel);
window.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
window.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
window.escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
