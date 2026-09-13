/*
 * Sets <html data-theme> before first paint so the page never flashes the wrong
 * theme. Loaded as a same-origin file rather than inline because the server's
 * CSP allows only script-src 'self'. Mirrors src/theme/ThemeProvider.tsx.
 */
(function () {
  function systemTheme() {
    try {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  var theme;
  try {
    var stored = localStorage.getItem('lockly.theme');
    theme = stored === 'light' || stored === 'dark' ? stored : systemTheme();
  } catch (e) {
    theme = systemTheme(); // storage blocked: behave as "System"
  }

  document.documentElement.setAttribute('data-theme', theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F5F6FA' : '#0B0D17');
})();
