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
  const successBox = document.querySelector('#booking-success');
  const errorBox = document.querySelector('#booking-error');
  const submitButton = form?.querySelector('button[type="submit"]');
  const submitButtonText = submitButton?.querySelector('[data-i18n="booking.prepare"]') || submitButton;

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
    if (result) result.hidden = true;
    if (successBox) successBox.hidden = true;
    if (errorBox) errorBox.hidden = true;
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

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!hoursInput.disabled && calculatePrice(hoursInput.value) === null) {
      hoursInput.setCustomValidity(translate('pricing.invalidHours'));
      hoursInput.reportValidity();
      hoursInput.setCustomValidity('');
      return;
    }

    const requestText = buildRequest();
    if (preview) preview.value = requestText;
    if (successBox) successBox.hidden = true;
    if (errorBox) errorBox.hidden = true;
    if (result) result.hidden = true;

    // Loading state
    const originalText = submitButtonText ? submitButtonText.textContent : '';
    if (submitButton) submitButton.disabled = true;
    if (submitButtonText) submitButtonText.textContent = translate('booking.sending');

    const payload = {
      name: fieldValue('name'),
      contact: fieldValue('contact'),
      date: fieldValue('date'),
      location: fieldValue('location'),
      eventType: eventInput.value,
      eventTypeLabel: eventInput.options[eventInput.selectedIndex].textContent,
      hours: fieldValue('hours'),
      estimate: isFestival() ? translate('request.askPrice') : `${calculatePrice(selectedHours())} €`,
      notes: fieldValue('notes'),
      language: i18n.current,
    };

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Success
      if (successBox) successBox.hidden = false;
      form.reset();
      updateEstimate();
      if (successBox) {
        successBox.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'nearest',
        });
      }
    } catch (err) {
      console.warn('[RODEO Booking] API send failed, showing fallback draft:', err);
      // Fallback: show error message and copyable draft
      if (errorBox) errorBox.hidden = false;
      if (result) result.hidden = false;
      if (message) message.textContent = '';
      const target = errorBox || result;
      if (target) {
        target.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'nearest',
        });
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
      if (submitButtonText) submitButtonText.textContent = originalText;
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

  document.querySelector('#copy-request')?.addEventListener('click', async () => {
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
