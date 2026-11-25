/** Pricing + request draft. The form never claims that a request was sent. */
const CASTLE_DAY_RATE = 160;

export function calculatePrice(hours) {
  const count = Number(hours);
  if (!Number.isInteger(count) || count < 1 || count > 24) return null;
  return 120 * Math.min(count, 2) + 80 * Math.max(count - 2, 0);
}

export function setupBooking(i18n) {
  const form = document.querySelector('#booking-form');
  const labelEl = document.querySelector('#estimate-label');
  const priceEl = document.querySelector('#estimate-price');
  const noteEl = document.querySelector('#estimate-note');
  const result = document.querySelector('#request-result');
  const preview = document.querySelector('#request-preview');
  const message = document.querySelector('#copy-message');
  const emailLink = document.querySelector('#email-request');
  const hoursInput = document.querySelector('#hours');
  const eventInput = document.querySelector('#event-type');
  const productInput = document.querySelector('#booking-product');
  const hoursField = hoursInput.closest('label');
  const translate = key => i18n.t(key);
  const isFestival = () => eventInput.value === 'festival';
  const formatPrice = amount => amount.toLocaleString(i18n.current === 'et' ? 'et-EE' : 'ru-RU') + ' €';

  function getEstimate(product) {
    const castlePrice = formatPrice(CASTLE_DAY_RATE);
    const castleDaily = `${castlePrice} ${translate('booking.perDay')}`;
    if (product === 'castle') {
      return {price: castlePrice, note: translate('booking.castleNote'), draftPrice: castleDaily};
    }
    if (isFestival()) {
      if (product === 'both') {
        const note = translate('booking.bothFestivalNote');
        return {price: castlePrice, note, draftPrice: `${castleDaily}. ${note}`};
      }
      return {price: translate('pricing.onRequest'), note: translate('pricing.customNote'), draftPrice: translate('request.askPrice')};
    }
    const bullPrice = calculatePrice(hoursInput.value);
    if (bullPrice === null) return {price: '—', note: translate('pricing.invalidHours')};
    if (product === 'both') {
      const price = formatPrice(bullPrice + CASTLE_DAY_RATE);
      const note = `${translate('booking.productBull')} — ${formatPrice(bullPrice)}. ${translate('booking.productCastle')} — ${castleDaily}.`;
      return {price, note, draftPrice: `${price}. ${note}`};
    }
    return {price: formatPrice(bullPrice), note: translate('booking.estimateDelivery')};
  }

  function updateEstimate() {
    const product = productInput.value;
    const castleOnly = product === 'castle';
    hoursInput.disabled = castleOnly;
    hoursInput.required = !castleOnly;
    hoursField.hidden = castleOnly;
    const {price, note} = getEstimate(product);
    const label = product === 'both' && isFestival() ? 'booking.castleEstimateLabel' : 'booking.estimateLabel';
    labelEl.textContent = translate(label);
    priceEl.textContent = price;
    noteEl.textContent = note;
    result.hidden = true;
  }

  function buildRequest() {
    const product = productInput.value;
    const productLabel = productInput.selectedOptions[0].textContent;
    const values = new FormData(form);
    const fieldValue = name => String(values.get(name) || '').trim();
    const {price, draftPrice = price} = getEstimate(product);
    const bullDuration = `${fieldValue('hours')} ${translate('request.hourUnit')}`;
    const castleDuration = translate('request.oneDay');
    const durations = {
      bull: bullDuration,
      castle: castleDuration,
      both: `${translate('booking.productBull')} — ${bullDuration}. ${translate('booking.productCastle')} — ${castleDuration}.`,
    };
    const eventLabel = eventInput.options[eventInput.selectedIndex].textContent;
    const row = (key, value) => `${translate(`request.${key}`)}: ${value || '—'}`;
    return [
      translate('request.title'),
      row('product', productLabel),
      row('name', fieldValue('name')),
      row('contact', fieldValue('contact')),
      row('date', fieldValue('date')),
      row('location', fieldValue('location')),
      row('event', eventLabel),
      row('duration', durations[product]),
      row('estimate', draftPrice),
      row('notes', fieldValue('notes')),
      translate(product === 'bull' ? 'request.transport' : 'request.castleTransport'),
    ].join('\n');
  }

  hoursInput.addEventListener('input', updateEstimate);
  eventInput.addEventListener('change', updateEstimate);
  productInput.addEventListener('change', updateEstimate);
  form.addEventListener('input', () => { result.hidden = true; });

  document.querySelectorAll('[data-booking-product]').forEach(link => link.addEventListener('click', () => {
    productInput.value = link.dataset.bookingProduct;
    updateEstimate();
  }));

  document.querySelectorAll('[data-hours]').forEach(link => link.addEventListener('click', () => {
    productInput.value = 'bull';
    hoursInput.value = link.dataset.hours;
    eventInput.value = 'private';
    updateEstimate();
  }));
  document.querySelectorAll('[data-custom]').forEach(link => link.addEventListener('click', () => {
    productInput.value = 'bull';
    eventInput.value = 'festival';
    updateEstimate();
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!hoursInput.disabled && calculatePrice(hoursInput.value) === null) {
      hoursInput.setCustomValidity(translate('pricing.invalidHours'));
      hoursInput.reportValidity();
      hoursInput.setCustomValidity('');
      return;
    }
    preview.value = buildRequest();
    const subject = `${translate('request.mailSubject')}: ${productInput.selectedOptions[0].textContent}`;
    emailLink.href = `mailto:rodeorent1@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(preview.value)}`;
    result.hidden = false;
    message.textContent = '';
    result.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
    });
  });

  document.querySelector('#copy-request').addEventListener('click', async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(preview.value);
      } else {
        preview.focus();
        preview.select();
        if (!document.execCommand('copy')) throw new Error('clipboard');
      }
      message.textContent = translate('request.copied');
    } catch {
      preview.focus();
      preview.select();
      message.textContent = translate('request.copyManually');
    }
  });

  // Switching the language updates the visible estimate without altering fields.
  i18n.onChange(updateEstimate);
  return {updateEstimate};
}
