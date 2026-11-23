/**
 * RODEO EVENT — Pricing calculation & Booking submission via Resend
 */

export function calculatePrice(hours) {
  const count = Number(hours);
  if (!Number.isInteger(count) || count < 1 || count > 24) return null;
  return 120 * Math.min(count, 2) + 80 * Math.max(count - 2, 0);
}

export function setupBooking(i18n) {
  const form = document.querySelector('#booking-form');
  const priceEl = document.querySelector('#estimate-price');
  const noteEl = document.querySelector('#estimate-note');
  const result = document.querySelector('#request-result');
  const preview = document.querySelector('#request-preview');
  const message = document.querySelector('#copy-message');
  const hoursInput = document.querySelector('#hours');
  const eventInput = document.querySelector('#event-type');
  const successBox = document.querySelector('#booking-success');
  const errorBox = document.querySelector('#booking-error');
  const submitButton = form?.querySelector('button[type="submit"]');
  const submitButtonText = submitButton?.querySelector('[data-i18n="booking.prepare"]') || submitButton;

  const translate = key => i18n.t(key);
  const isFestival = () => eventInput.value === 'festival';
  const selectedHours = () => Number(hoursInput.value);
  const fieldValue = name => String(new FormData(form).get(name) || '').trim();

  function updateEstimate() {
    const amount = calculatePrice(selectedHours());
    if (isFestival()) {
      priceEl.textContent = translate('pricing.onRequest');
      noteEl.textContent = translate('pricing.customNote');
    } else if (amount === null) {
      priceEl.textContent = '—';
      noteEl.textContent = translate('pricing.invalidHours');
    } else {
      priceEl.textContent = amount.toLocaleString(i18n.current === 'et' ? 'et-EE' : 'ru-RU') + ' €';
      noteEl.textContent = translate('booking.estimateDelivery');
    }
    if (result) result.hidden = true;
    if (successBox) successBox.hidden = true;
    if (errorBox) errorBox.hidden = true;
  }

  function buildRequest() {
    const amount = calculatePrice(selectedHours());
    const total = isFestival() ? translate('request.askPrice') : `${amount} €`;
    const eventLabel = eventInput.options[eventInput.selectedIndex].textContent;
    const row = (key, value) => `${translate(`request.${key}`)}: ${value || '—'}`;
    return [
      translate('request.title'),
      row('name', fieldValue('name')),
      row('contact', fieldValue('contact')),
      row('date', fieldValue('date')),
      row('location', fieldValue('location')),
      row('event', eventLabel),
      row('duration', `${fieldValue('hours')} ${translate('request.hourUnit')}`),
      row('estimate', total),
      row('notes', fieldValue('notes')),
      translate('request.transport'),
    ].join('\n');
  }

  hoursInput?.addEventListener('input', updateEstimate);
  eventInput?.addEventListener('change', updateEstimate);

  document.querySelectorAll('[data-hours]').forEach(link => link.addEventListener('click', () => {
    hoursInput.value = link.dataset.hours;
    eventInput.value = 'private';
    updateEstimate();
  }));
  document.querySelectorAll('[data-custom]').forEach(link => link.addEventListener('click', () => {
    eventInput.value = 'festival';
    updateEstimate();
  }));

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (calculatePrice(selectedHours()) === null) {
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
