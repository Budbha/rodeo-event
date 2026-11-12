/* RODEO EVENT V6.1 — animations isolated from booking & translation logic. */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const list = [
    ['.hero-content-main .eyebrow',120],['.hero h1 > *',160,100],
    ['.hero .lead',470],['.hero-desc',540],['.hero-cta-row',610],
    ['.pricing-intro .eyebrow',0],['.pricing-intro h2 > *',80,110],
    ['.pricing-intro p',230],['.pricing-signature',90],
    ['.section-row',0],['.tariff',50,100],['.price-explanation',80],
    ['.included-copy .eyebrow',0],['.included h2 > *',70,130],
    ['.included-lead',170],['.benefit',60,90],['.benefits-note',70],
    ['.safety-copy .eyebrow',0],['.safety-copy h2 > *',70,120],
    ['.safety-copy p',150],['.requirement',60,130],
    ['.booking-intro .eyebrow',0],['.booking-intro h2 > *',70,120],
    ['.booking-intro p',160],['.form-head',0],
    ['.fields',60],['.estimate',60],['.send-button',90]
  ];
  const targets = [];
  for (const [selector, delay, step = 0] of list) {
    document.querySelectorAll(selector).forEach((el, index) => {
      el.classList.add('motion-reveal');
      el.style.setProperty('--motion-delay', `${Math.min(delay + index * step, 380)}ms`);
      targets.push(el);
    });
  }
  const photo = document.querySelector('.included-photo');
  if (photo) {photo.classList.add('motion-photo-reveal'); targets.push(photo);}
  // Play each reveal again when returning from another section. A target
  // is rearmed only once it has fully left the viewport, to avoid flicker
  // at the edge of the screen while reading.
  const enterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, {rootMargin:'0px 0px -6% 0px', threshold:0.04});
  const resetObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) entry.target.classList.remove('is-visible');
    });
  }, {rootMargin:'0px', threshold:0});
  targets.forEach(el => {
    enterObserver.observe(el);
    resetObserver.observe(el);
  });
  const rail = document.createElement('div');
  rail.className = 'rodeo-progress';
  rail.setAttribute('aria-hidden','true');
  document.body.appendChild(rail);
  const images = ['.hero-photo','.included-photo img'].map(s=>document.querySelector(s)).filter(Boolean);
  const panels = ['.pricing-intro','.booking-intro'].map(s=>document.querySelector(s)).filter(Boolean);
  let scheduled = false;
  function render() {
    scheduled = false;
    const height = window.innerHeight || 900;
    const total = Math.max(1, document.documentElement.scrollHeight - height);
    rail.style.setProperty('--page-progress', Math.max(0,Math.min(1, window.scrollY/total)).toFixed(4));
    if (window.innerWidth <= 850) return;
    images.forEach(image => {
      const rect = image.parentElement.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > height + 100) return;
      const off = Math.max(-25,Math.min(25,(height/2-(rect.top+rect.height/2))*.042));
      image.style.setProperty('--media-offset',`${off.toFixed(1)}px`);
    });
    panels.forEach(panel => {
      const rect = panel.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > height + 100) return;
      const off = Math.max(-42,Math.min(42,(height/2-rect.top)*-.06));
      panel.style.setProperty('--glow-offset',`${off.toFixed(1)}px`);
    });
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(render);}}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  document.documentElement.classList.add('motion-enabled');
  schedule();
  reduced.addEventListener?.('change',event=>{
    if(!event.matches)return;
    document.documentElement.classList.remove('motion-enabled');
    enterObserver.disconnect();
    resetObserver.disconnect();
    rail.remove();
    window.removeEventListener('scroll',schedule);
    window.removeEventListener('resize',schedule);
  });
})();
