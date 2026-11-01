// Loaded in <head> so the saved theme applies before first paint (no flash).
// No saved choice = follow the system setting via prefers-color-scheme in style.css.
(function () {
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) { /* storage blocked */ }
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;

  window.currentTheme = function () {
    const set = document.documentElement.dataset.theme;
    if (set) return set;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  window.setTheme = function (theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch (e) { /* storage blocked */ }
    document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  };

  // Keep other tabs and the practice iframe in step when the choice changes elsewhere.
  window.addEventListener('storage', (e) => {
    if (e.key !== 'theme' || (e.newValue !== 'light' && e.newValue !== 'dark')) return;
    document.documentElement.dataset.theme = e.newValue;
    document.dispatchEvent(new CustomEvent('themechange', { detail: e.newValue }));
  });
})();
