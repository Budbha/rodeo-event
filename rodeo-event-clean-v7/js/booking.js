/** Pricing + request draft. The form never claims that a request was sent. */
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
    result.hidden = true;
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

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (calculatePrice(selectedHours()) === null) {
      hoursInput.setCustomValidity(translate('pricing.invalidHours'));
      hoursInput.reportValidity();
      hoursInput.setCustomValidity('');
      return;
    }
    preview.value = buildRequest();
    result.hidden = false;
    message.textContent = '';
    result.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
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
