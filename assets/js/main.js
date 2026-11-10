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

  /* ---- gallery: one thin line beneath the row, an equal part for each work. The part that is lit follows the row
     as it scrolls (touch, trackpad, keys or the line), moving from the first work at the start of the row to the last
     at its end; clicking a part scrolls to the place where its work is the one lit. The line is built here from the
     panels' own titles, so it only appears once this script runs */
  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    const track = gallery.querySelector('[data-gallery-track]');
    const line = gallery.querySelector('[data-gallery-line]');
    const panels = track ? [...track.querySelectorAll('[data-gallery-panel]')] : [];
    if (!track || !line || panels.length < 2) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const last = panels.length - 1;
    const room = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const current = () => (room() ? Math.round((track.scrollLeft / room()) * last) : 0);
    const show = (i) => {
      const to = Math.min(last, Math.max(0, i));
      track.scrollTo({ left: (to / last) * room(), behavior: calm.matches ? 'auto' : 'smooth' });
    };
    const parts = panels.map((panel, i) => {
      const part = document.createElement('button');
      const title = panel.querySelector('h3');
      part.type = 'button';
      part.className = 'pub-line__part';
      part.setAttribute('aria-label', `Show ${title ? title.textContent.trim() : `work ${i + 1}`}`);
      part.addEventListener('click', () => show(i));
      line.appendChild(part);
      return part;
    });
    let lit = -1;
    const update = () => {
      const i = current();
      if (i === lit) return;
      lit = i;
      parts.forEach((part, j) => (j === i ? part.setAttribute('aria-current', 'true') : part.removeAttribute('aria-current')));
    };
    // with the row itself focused, the arrow keys move one work along (the browser's own small step is too slight)
    track.addEventListener('keydown', (e) => {
      if (e.target !== track) return;
      const move = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (move) { e.preventDefault(); show(current() + move); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); show(e.key === 'Home' ? 0 : last); }
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', () => { lit = -1; update(); });
    line.hidden = false;
    update();
  });

  /* ---- scroll cue: on the longer pages (body[data-scroll-cue]) a soft band of her wall colour at the foot of the
     screen with a fine point in its middle, pointing down; pressed, the point moves the page on by most of a screen.
     It shows only at the top of the page: as soon as the page is scrolled it sinks away (and returns at the top), and
     it stays away when the page has nothing more below or the previous / next links (the footer's first band) are
     already in view, while the menu is open, or while someone is typing in a form */
  if (body.hasAttribute('data-scroll-cue') && 'IntersectionObserver' in window) {
    const end = document.querySelector('.pager') || document.querySelector('.site-footer');
    const cue = document.createElement('div');
    cue.className = 'scroll-cue is-hidden';
    cue.innerHTML = '<button class="scroll-cue__arrow" type="button" aria-label="Scroll down"><svg viewBox="0 0 20 14" aria-hidden="true" focusable="false"><path d="M18.5 1.5c-4.4 2.2-7.4 6-8.5 11.5-1.1-5.5-4.1-9.3-8.5-11.5" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg></button>';
    body.appendChild(cue);
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    cue.querySelector('button').addEventListener('click', () => {
      window.scrollBy({ top: Math.round(window.innerHeight * 0.8), behavior: calm.matches ? 'auto' : 'smooth' });
    });
    let ready = false;
    let endInView = false;
    let typing = false;
    let scrolled = window.scrollY > 24;
    const update = () => {
      const more = doc.scrollHeight > window.innerHeight + 8;
      cue.classList.toggle('is-hidden', !ready || !more || endInView || typing || scrolled);
    };
    if (end) {
      new IntersectionObserver(([entry]) => { endInView = entry.isIntersecting; update(); }, { rootMargin: '0px 0px -24px 0px' }).observe(end);
    }
    window.addEventListener('scroll', () => {
      const now = window.scrollY > 24;
      if (now !== scrolled) { scrolled = now; update(); }
    }, { passive: true });
    document.addEventListener('focusin', (e) => { typing = e.target.matches('input, textarea, select'); update(); });
    document.addEventListener('focusout', () => { typing = false; update(); });
    window.addEventListener('resize', update);
    setTimeout(() => { ready = true; update(); }, 700); // a moment after the page arrives
  }

  /* ---- freshness: a page left open in a tab, or brought back by the back button, can be older than the site. Shown again
     after ten minutes or more away, it reloads itself, so a returning reader always sees the latest version (but never
     while a message is half-written in the inquiry form) */
  const stale = 10 * 60 * 1000;
  let awaySince = 0;
  const writing = () => [...document.querySelectorAll('input, textarea')].some((el) => el.value.trim());
  const away = () => { awaySince = awaySince || Date.now(); };
  const back = () => {
    const long = awaySince && Date.now() - awaySince >= stale;
    awaySince = 0;
    if (long && !writing()) window.location.reload();
  };
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? away() : back()));
  window.addEventListener('pagehide', away);
  window.addEventListener('pageshow', (e) => { if (e.persisted) back(); });

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
      const subject = 'Editing inquiry';
      const lines = [
        `Name: ${v('first')} ${v('last')}`.trim(),
        `Email: ${v('email')}`,
        '',
        v('message'),
      ];
      const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
      form.setAttribute('data-last-mailto', href);
      if (status) status.hidden = false;
      window.location.href = href;
    });
  }

  doc.classList.add('is-ready');
})();
