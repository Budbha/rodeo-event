(() => {
  'use strict';
  let lang = 'ru';
  const texts = [...document.querySelectorAll('[data-et]')];
  const placeholders = [...document.querySelectorAll('[data-placeholder-et]')];
  const altTexts = [...document.querySelectorAll('[data-alt-et]')];
  const ariaTexts = [...document.querySelectorAll('[data-aria-et]')];
  for (const el of texts) el.dataset.ru = el.textContent;
  for (const el of placeholders) el.dataset.ruPlaceholder = el.placeholder;
  for (const el of altTexts) el.dataset.ruAlt = el.alt;
  for (const el of ariaTexts) el.dataset.ruAria = el.getAttribute('aria-label');

  const form = document.querySelector('#booking-form');
  const priceEl = document.querySelector('#estimate-price');
  const noteEl = document.querySelector('#estimate-note');
  const result = document.querySelector('#request-result');
  const preview = document.querySelector('#request-preview');
  const message = document.querySelector('#copy-message');
  const hoursInput = document.querySelector('#hours');
  const eventInput = document.querySelector('#event-type');

  // Only the first two hours are €120/h; further hours are €80/h.
  function estimate(hours) {
    const n = Number(hours);
    if (!Number.isInteger(n) || n < 1 || n > 24) return null;
    return 120 * Math.min(n, 2) + 80 * Math.max(n - 2, 0);
  }
  const isFestival = () => eventInput.value === 'festival';
  const normalizedHours = () => Number(hoursInput.value);
  function updateEstimate() {
    const sum = estimate(normalizedHours());
    if (isFestival()) {
      priceEl.textContent = lang === 'et' ? 'KOKKULEPPEL' : 'ПО ЗАПРОСУ';
      noteEl.textContent = lang === 'et' ? 'Suurürituse täpne hind sõltub tingimustest.' : 'Для крупных мероприятий стоимость рассчитывается индивидуально.';
    } else if (sum === null) {
      priceEl.textContent = '—';
      noteEl.textContent = lang === 'et' ? 'Vali 1–24 täistundi.' : 'Укажите от 1 до 24 полных часов.';
    } else {
      priceEl.textContent = sum.toLocaleString(lang === 'et' ? 'et-EE' : 'ru-RU') + ' €';
      noteEl.textContent = lang === 'et' ? 'Tallinnas tasuta transport. Mujal kokkuleppel.' : 'Доставка по Таллинну бесплатно. В другие города — по договорённости.';
    }
    result.hidden = true;
  }
  function setLanguage(next) {
    lang = next === 'et' ? 'et' : 'ru';
    document.documentElement.lang = lang;
    for (const el of texts) el.textContent = lang === 'et' ? el.dataset.et : el.dataset.ru;
    for (const el of placeholders) el.placeholder = lang === 'et' ? el.dataset.placeholderEt : el.dataset.ruPlaceholder;
    for (const el of altTexts) el.alt = lang === 'et' ? el.dataset.altEt : el.dataset.ruAlt;
    for (const el of ariaTexts) el.setAttribute('aria-label', lang === 'et' ? el.dataset.ariaEt : el.dataset.ruAria);
    for (const button of document.querySelectorAll('[data-lang]')) button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    document.title = lang === 'et' ? 'RODEO EVENT — mehaanilise pulli rent Eestis' : 'RODEO EVENT — аренда механического быка в Эстонии';
    const meta = document.querySelector('meta[name="description"]');
    meta.content = lang === 'et' ? 'RODEO EVENT — mehaanilise pulli premium-rent Eestis. Hinnad, transport, paigaldus, juhendaja ja päring.' : 'RODEO EVENT — премиальная аренда механического быка в Эстонии. Тарифы, доставка, монтаж и инструктор. Оставьте заявку на мероприятие.';
    updateEstimate();
  }
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  hoursInput.addEventListener('input', updateEstimate);
  eventInput.addEventListener('change', updateEstimate);
  document.querySelectorAll('[data-hours]').forEach(link => link.addEventListener('click', () => {
    hoursInput.value = link.dataset.hours;
    eventInput.value = 'private';
    updateEstimate();
  }));
  document.querySelectorAll('[data-custom]').forEach(link => link.addEventListener('click', () => {
    eventInput.value = 'festival';
    updateEstimate();
  }));

  const value = key => String(new FormData(form).get(key) || '').trim();
  const eventText = () => eventInput.options[eventInput.selectedIndex].textContent;
  function buildRequest() {
    const sum = isFestival() ? (lang === 'et' ? 'Kokkuleppel' : 'По запросу') : (estimate(normalizedHours()) ?? '—') + ' €';
    const day = value('date') || '—';
    if (lang === 'et') return [
      'RODEO EVENT — päringu mustand (saatmata)',
      'Nimi: ' + value('name'),
      'Kontakt: ' + value('contact'),
      'Kuupäev: ' + day,
      'Toimumiskoht: ' + (value('location') || '—'),
      'Üritus: ' + eventText(),
      'Rendi kestus: ' + value('hours') + ' tundi',
      'Esialgne hind: ' + sum,
      'Lisainfo: ' + (value('notes') || '—'),
      'Transport väljaspool Tallinna kokkuleppel.'
    ].join('\n');
    return [
      'RODEO EVENT — черновик заявки (не отправлен)',
      'Имя: ' + value('name'),
      'Контакт: ' + value('contact'),
      'Дата: ' + day,
      'Место проведения: ' + (value('location') || '—'),
      'Мероприятие: ' + eventText(),
      'Продолжительность: ' + value('hours') + ' ч',
      'Предварительная стоимость: ' + sum,
      'Комментарий: ' + (value('notes') || '—'),
      'Доставка за пределы Таллинна согласовывается отдельно.'
    ].join('\n');
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (estimate(normalizedHours()) === null) {
      hoursInput.setCustomValidity(lang === 'et' ? 'Vali 1–24 täistundi.' : 'Укажите от 1 до 24 полных часов.');
      hoursInput.reportValidity();
      hoursInput.setCustomValidity('');
      return;
    }
    preview.value = buildRequest();
    result.hidden = false;
    message.textContent = '';
    result.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest'});
  });
  document.querySelector('#copy-request').addEventListener('click', async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(preview.value);
      else { preview.focus(); preview.select(); if (!document.execCommand('copy')) throw new Error('clipboard'); }
      message.textContent = lang === 'et' ? 'Kopeeritud. Päring pole saadetud.' : 'Скопировано. Заявка пока не отправлена.';
    } catch (err) {
      preview.focus(); preview.select();
      message.textContent = lang === 'et' ? 'Tekst on valitud. Vajuta Ctrl+C.' : 'Текст выделен — нажмите Ctrl+C.';
    }
  });
  updateEstimate();
})();
