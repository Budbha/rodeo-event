/**
 * RODEO EVENT — i18n
 * All website copy is stored in locales/ru.json and locales/et.json.
 * The RU markup in index.html is a no-JS / initial-load fallback only.
 */
const LANGUAGES = ['ru', 'et'];
const cache = new Map();

function resolveKey(dictionary, path) {
  return path.split('.').reduce((value, key) => value?.[key], dictionary);
}

async function fetchDictionary(language) {
  if (!cache.has(language)) {
    const fileUrl = new URL(`../locales/${language}.json`, import.meta.url);
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Could not load ${fileUrl.pathname} (${response.status})`);
    cache.set(language, await response.json());
  }
  return cache.get(language);
}

export function createI18n() {
  let current = 'ru';
  let dictionary = null;
  let changeCount = 0;
  const listeners = new Set();
  const buttons = Array.from(document.querySelectorAll('[data-lang]'));

  function t(key) {
    const value = resolveKey(dictionary, key);
    if (typeof value !== 'string') {
      console.warn(`[RODEO i18n] Missing translation: ${current}.${key}`);
      return key;
    }
    return value;
  }

  function translateDocument() {
    const attributes = [
      ['data-i18n', 'textContent'],
      ['data-i18n-placeholder', 'placeholder'],
      ['data-i18n-alt', 'alt'],
      ['data-i18n-aria-label', 'aria-label'],
    ];
    for (const [attribute, target] of attributes) {
      document.querySelectorAll(`[${attribute}]`).forEach(element => {
        const translation = t(element.getAttribute(attribute));
        if (target === 'textContent') element.textContent = translation;
        else element.setAttribute(target, translation);
      });
    }

    document.documentElement.lang = current;
    document.title = t('meta.title');
    document.querySelector('meta[name="description"]').content = t('meta.description');
    buttons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === current));
    });
    listeners.forEach(callback => callback(current));
  }

  async function setLanguage(language, {updateUrl = true} = {}) {
    const chosen = LANGUAGES.includes(language) ? language : 'ru';
    const id = ++changeCount;
    try {
      const result = await fetchDictionary(chosen);
      if (id !== changeCount) return;
      current = chosen;
      dictionary = result;
      translateDocument();
      if (updateUrl) {
        const url = new URL(window.location.href);
        if (chosen === 'ru') url.searchParams.delete('lang');
        else url.searchParams.set('lang', chosen);
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
    } catch (error) {
      console.error('[RODEO i18n] Translation failed:', error);
      // The static Russian text in index.html remains visible if the web server
      // cannot provide JSON; do not blank the page on a network error.
    }
  }

  async function initialize() {
    buttons.forEach(button => button.addEventListener('click', () => {
      void setLanguage(button.dataset.lang);
    }));
    const requested = new URLSearchParams(window.location.search).get('lang');
    await setLanguage(requested === 'et' ? 'et' : 'ru', {updateUrl: false});
  }

  return {
    initialize,
    setLanguage,
    t,
    onChange(callback) { listeners.add(callback); return () => listeners.delete(callback); },
    get current() { return current; },
  };
}
