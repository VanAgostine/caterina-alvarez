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

  /* ---- slow fade-in as each block scrolls into view (CSS softens it for reduced-motion users) */
  const revealables = document.querySelectorAll('[data-reveal], [data-sweep]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

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
