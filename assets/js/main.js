/* Caterina Alvarez: site behaviour. No dependencies. */
(() => {
  const doc = document.documentElement;
  const body = document.body;

  /* ---- header: hairline + compact height once the page scrolls */
  const header = document.querySelector('[data-header]');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- full-screen menu (phones, small tablets) */
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (toggle && menu) {
    const label = toggle.querySelector('.menu-toggle__label');
    const setOpen = (open) => {
      menu.classList.toggle('is-open', open);
      body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Close' : 'Menu';
      if (open) {
        menu.removeAttribute('inert');
        const first = menu.querySelector('a');
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 120);
      } else {
        menu.setAttribute('inert', '');
      }
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ---- slow fade-in as each block scrolls into view (CSS softens it for reduced-motion users).
     Once a block has arrived it lets go of the reveal styles, so its own hover effects run smoothly. */
  const revealables = document.querySelectorAll('[data-reveal], [data-sweep]');
  const letGo = (el) => {
    const done = (e) => {
      if (e.target !== el || !/^(opacity|mask-position|-webkit-mask-position)$/.test(e.propertyName)) return;
      el.removeEventListener('transitionend', done);
      el.removeAttribute('data-reveal');
      el.removeAttribute('data-sweep');
      el.classList.remove('is-in');
    };
    el.addEventListener('transitionend', done);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { letGo(entry.target); entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

  /* ---- ink: a drawing marked data-ink is traced in once, the first time it comes into view (see styles.css) */
  const inks = document.querySelectorAll('[data-ink]');
  if (inks.length) {
    if ('IntersectionObserver' in window) {
      const inkIo = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { entry.target.classList.add('is-inked'); inkIo.unobserve(entry.target); }
        });
      }, { threshold: 0.3 });
      inks.forEach((el) => inkIo.observe(el));
    } else {
      inks.forEach((el) => el.classList.add('is-inked'));
    }
  }

  /* ---- gallery: the arrows step one panel at a time and rest at either end (the row also scrolls by touch,
     trackpad and keyboard, so the arrows only appear once this script runs) */
  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    const track = gallery.querySelector('[data-gallery-track]');
    const nav = gallery.querySelector('[data-gallery-nav]');
    const prev = gallery.querySelector('[data-gallery-prev]');
    const next = gallery.querySelector('[data-gallery-next]');
    if (!track || !nav || !prev || !next) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const step = () => {
      const panel = track.querySelector('li');
      const gap = parseFloat(getComputedStyle(panel.parentElement).columnGap) || 0;
      return panel ? panel.getBoundingClientRect().width + gap : track.clientWidth;
    };
    const go = (dir) => track.scrollBy({ left: dir * step(), behavior: calm.matches ? 'auto' : 'smooth' });
    const update = () => {
      const end = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= end;
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    // with the row itself focused, the arrow keys step a panel (the browser's own small step would snap back)
    track.addEventListener('keydown', (e) => {
      if (e.target !== track) return;
      const to = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (to) { e.preventDefault(); go(to); }
      else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        track.scrollTo({ left: e.key === 'Home' ? 0 : track.scrollWidth, behavior: calm.matches ? 'auto' : 'smooth' });
      }
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    nav.hidden = false;
    update();
  });

  /* ---- footer year */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---- inquiry form: composes an email in the visitor's mail app (no server needed) */
  const form = document.querySelector('[data-inquiry]');
  if (form) {
    const status = form.querySelector('[data-status]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      // namedItem, not elements[name]: a field called e.g. "length" would collide with the collection's own properties
      const v = (name) => { const el = form.elements.namedItem(name); return el && typeof el.value === 'string' ? el.value.trim() : ''; };
      const to = form.getAttribute('data-inquiry');
      const title = v('title');
      const subject = `Editing inquiry${title ? `: ${title}` : ''}`;
      const lines = [
        `Name: ${v('first')} ${v('last')}`.trim(),
        `Email: ${v('email')}`,
        title ? `Working title: ${title}` : null,
        v('form') ? `Form: ${v('form')}` : null,
        v('wordcount') ? `Length: ${v('wordcount')} words` : null,
        v('stage') ? `Stage: ${v('stage')}` : null,
        '',
        v('message'),
      ].filter((line) => line !== null);
      const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
      form.setAttribute('data-last-mailto', href);
      if (status) status.hidden = false;
      window.location.href = href;
    });
  }

  doc.classList.add('is-ready');
})();
