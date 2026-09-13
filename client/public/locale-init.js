/*
 * Sets <html lang dir> before first paint so the page never flashes the wrong
 * language or flips from left-to-right to right-to-left. Same-origin file rather
 * than inline because the server's CSP allows only script-src 'self'.
 * Mirrors src/i18n/languages.ts — keep SUPPORTED and RTL in sync with it.
 */
(function () {
  var SUPPORTED = ['en', 'ar'];
  var RTL = ['ar'];

  function supported(tag) {
    if (typeof tag !== 'string') return null;
    var base = tag.toLowerCase().split('-')[0];
    return SUPPORTED.indexOf(base) !== -1 ? base : null;
  }

  var lang = null;
  try {
    lang = supported(localStorage.getItem('lockly.lang'));
  } catch (e) {
    // storage blocked: fall through to device detection
  }

  if (!lang) {
    try {
      var preferred =
        navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
      for (var i = 0; i < preferred.length && !lang; i++) lang = supported(preferred[i]);
    } catch (e) {
      // ignore
    }
  }

  lang = lang || 'en';
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', RTL.indexOf(lang) !== -1 ? 'rtl' : 'ltr');
})();
