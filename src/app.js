/* Vezra Studio — interactions & motion. No dependencies. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, w = window;
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var raf = w.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* ---------- mobile menu ---------- */
  var btn = $('#menuBtn'), nav = $('#mnav');
  function setMenu(open) {
    if (!btn || !nav) return;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    root.classList.toggle('menu-open', open);
    if (open) {
      nav.hidden = false;
      $$('a', nav).forEach(function (a, i) { a.style.transitionDelay = (0.06 + i * 0.045) + 's'; });
      raf(function () { raf(function () { nav.classList.add('is-open'); }); });
    } else {
      nav.classList.remove('is-open');
      $$('a', nav).forEach(function (a) { a.style.transitionDelay = '0s'; });
      var done = function () { if (!nav.classList.contains('is-open')) nav.hidden = true; };
      reduce ? done() : setTimeout(done, 380);
    }
  }
  if (btn && nav) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); btn.focus(); } });
    w.addEventListener('resize', function () { if (w.innerWidth > 980 && root.classList.contains('menu-open')) setMenu(false); });
  }

  /* ---------- header state + progress, sticky CTA ---------- */
  var hdr = $('.hdr'), sticky = $('.sticky-cta'), ticking = false;
  var heroCta = $('.hero .cta-row') || $('.phero .cta-row') || $('.phero h1') || $('.nf .cta-row');
  var stops = [$('#contact'), $('footer')].filter(Boolean);
  var heroGone = false, stopVisible = false;
  function onScroll() {
    ticking = false;
    var y = w.scrollY || w.pageYOffset;
    var max = Math.max(1, root.scrollHeight - w.innerHeight);
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 8);
      hdr.style.setProperty('--p', Math.min(1, y / max).toFixed(4));
    }
  }
  w.addEventListener('scroll', function () { if (!ticking) { ticking = true; raf(onScroll); } }, { passive: true });
  onScroll();
  function updateSticky() {
    if (!sticky) return;
    var on = heroGone && !stopVisible;
    sticky.classList.toggle('is-on', on);
    sticky.setAttribute('aria-hidden', String(!on));
    var a = $('a', sticky); if (a) a.tabIndex = on ? 0 : -1;
  }
  if ('IntersectionObserver' in w && sticky) {
    if (heroCta) new IntersectionObserver(function (es) { heroGone = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; updateSticky(); }).observe(heroCta);
    else heroGone = true;
    var vis = new Map();
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vis.set(e.target, e.isIntersecting); });
      stopVisible = Array.from(vis.values()).some(Boolean); updateSticky();
    }, { rootMargin: '0px 0px -10% 0px' });
    stops.forEach(function (s) { so.observe(s); });
  }

  /* ---------- digits that slide in ---------- */
  $$('[data-roll]').forEach(function (el) {
    var txt = el.textContent, i = 0, html = '';
    el.setAttribute('aria-label', txt);
    for (var k = 0; k < txt.length; k++) {
      var ch = txt[k];
      if (/\d/.test(ch)) { html += '<span class="rd" aria-hidden="true" style="--i:' + (i++) + '"><span>' + ch + '</span></span>'; }
      else { html += '<span aria-hidden="true">' + ch + '</span>'; }
    }
    el.innerHTML = html;
    if (!reduce) el.classList.add('rolled');
  });

  /* ---------- count up ---------- */
  function countUp(el) {
    var to = parseInt(el.getAttribute('data-count'), 10);
    if (!to || reduce) return;
    var t0 = null, dur = 1100 + to * 40;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(to * e);
      if (p < 1) raf(step);
    }
    el.textContent = '0'; raf(step);
  }

  /* ---------- reveal on scroll ---------- */
  $$('[data-stagger]').forEach(function (g) { Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i % 6); }); });
  $$('[data-steps] .step').forEach(function (s, i) { s.style.setProperty('--i', i); });
  var revealSel = '[data-reveal],[data-stagger],[data-steps],.sec-head,.guar,[data-count]';
  if ('IntersectionObserver' in w && !reduce) {
    root.classList.add('rv-ready');
    // clipped headings report zero area to the observer, so they are watched through their parent
    var proxies = new Map();
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        (proxies.get(e.target) || [e.target]).forEach(function (t) {
          t.classList.add('in');
          if (t.hasAttribute('data-count')) countUp(t);
        });
        ro.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    $$(revealSel).forEach(function (el) {
      var target = el.matches('h2[data-reveal]') ? el.parentElement : el;
      if (target !== el) { var list = proxies.get(target) || [target]; if (list.indexOf(el) < 0) list.push(el); proxies.set(target, list); }
      ro.observe(target);
    });
    // safety net: never leave content hidden if something odd happens (print, very tall elements)
    w.addEventListener('beforeprint', function () { $$(revealSel).forEach(function (el) { el.classList.add('in'); }); });
  } else {
    $$(revealSel).forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- images fade in ---------- */
  $$('.shot .scr img').forEach(function (img) {
    var ok = function () { img.classList.add('ok'); measure(img.closest('.is-long')); };
    if (img.complete && img.naturalWidth) ok(); else { img.addEventListener('load', ok); img.addEventListener('error', function () { img.classList.add('ok'); }); }
  });

  /* ---------- long screenshots scroll on hover (desktop) / gently on touch ---------- */
  var longShots = $$('.shot.is-long');
  function measure(shot) {
    if (!shot) return;
    var img = $('.scr img', shot), scr = $('.scr', shot);
    if (!img || !scr) return;
    var dist = Math.max(0, img.getBoundingClientRect().height - scr.getBoundingClientRect().height);
    shot.style.setProperty('--dist', dist + 'px');
    shot.style.setProperty('--dur', Math.min(9, Math.max(2.8, dist / 420)).toFixed(2) + 's');
    shot.style.setProperty('--auto', Math.min(26, Math.max(10, dist / 160)).toFixed(1) + 's');
  }
  longShots.forEach(measure);
  var rt; w.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { longShots.forEach(measure); }, 150); });
  if (!reduce) {
    if (finePointer) {
      longShots.forEach(function (s) {
        var host = s.closest('[data-case]') || s;
        host.addEventListener('pointerenter', function () { measure(s); s.classList.add('is-scrolling'); });
        host.addEventListener('pointerleave', function () { s.classList.remove('is-scrolling'); });
      });
    } else if ('IntersectionObserver' in w) {
      var ao = new IntersectionObserver(function (es) {
        es.forEach(function (e) { measure(e.target); e.target.classList.toggle('auto', e.isIntersecting); });
      }, { threshold: 0.35 });
      longShots.forEach(function (s) { ao.observe(s); });
    }
  }

  /* ---------- pointer effects (desktop only) ---------- */
  if (finePointer && !reduce) {
    // cursor bubble over case visuals
    var pill = d.createElement('div');
    pill.className = 'cursor-pill'; pill.setAttribute('aria-hidden', 'true');
    d.body.appendChild(pill);
    $$('[data-cursor]').forEach(function (el) {
      el.addEventListener('pointerenter', function () { pill.textContent = el.getAttribute('data-cursor') + ' →'; pill.classList.add('on'); });
      el.addEventListener('pointerleave', function () { pill.classList.remove('on'); });
    });
    d.addEventListener('pointermove', function (e) {
      pill.style.setProperty('--cx', e.clientX + 'px'); pill.style.setProperty('--cy', e.clientY + 'px');
    }, { passive: true });

    // spotlight on dark cards
    $$('[data-spot]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--mx', '-600px'); el.style.setProperty('--my', '-600px'); });
    });

    // gentle 3D tilt on the deadline card
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add('is-tilting');
        el.style.transform = 'perspective(1100px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg)';
      });
      el.addEventListener('pointerleave', function () { el.classList.remove('is-tilting'); el.style.transform = ''; });
    });

    // magnetic buttons
    $$('[data-magnet]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + (x * 0.18).toFixed(1) + 'px,' + (y * 0.3).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- FAQ: smooth open / close, one answer at a time ---------- */
  function animateClose(det) {
    var body = $('.ans', det);
    if (!det.open || !body) return;
    if (reduce || !body.animate) { det.open = false; return; }
    if (det._anim) det._anim.cancel();
    det._anim = body.animate([{ height: body.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 300, easing: 'cubic-bezier(.65,0,.35,1)' });
    det._anim.onfinish = function () { det.open = false; det._anim = null; };
  }
  function animateOpen(det) {
    var body = $('.ans', det);
    if (reduce || !body || !body.animate) { det.open = true; return; }
    if (det._anim) det._anim.cancel();
    det.open = true;
    det._anim = body.animate([{ height: '0px', opacity: 0 }, { height: body.scrollHeight + 'px', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    det._anim.onfinish = function () { det._anim = null; };
  }
  $$('details').forEach(function (det) {
    var sum = $('summary', det);
    if (!sum || !$('.ans', det)) return;
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      var group = det.closest('[data-accordion]');
      if (det.open && !det._anim) { animateClose(det); return; }
      if (group) $$('details', group).forEach(function (o) { if (o !== det) animateClose(o); });
      animateOpen(det);
    });
  });

  /* ---------- swipe lanes: dots under each lane on phones ---------- */
  function visibleKids(lane) { return Array.prototype.filter.call(lane.children, function (c) { return !c.hidden && c.offsetParent !== null; }); }
  function laneIndex(lane) {
    var kids = visibleKids(lane), x = lane.scrollLeft, best = 0, bd = Infinity;
    var pad = parseFloat(getComputedStyle(lane).scrollPaddingLeft) || 0;
    kids.forEach(function (k, i) { var dd = Math.abs(k.offsetLeft - pad - x); if (dd < bd) { bd = dd; best = i; } });
    var perView = kids[0] ? lane.clientWidth / kids[0].offsetWidth : 1;
    if (perView < 1.5 && x + lane.clientWidth >= lane.scrollWidth - 4) best = kids.length - 1;
    return best;
  }
  function goTo(lane, i) {
    var kids = visibleKids(lane); if (!kids.length) return;
    i = Math.max(0, Math.min(kids.length - 1, i));
    var pad = parseFloat(getComputedStyle(lane).scrollPaddingLeft) || 0;
    lane.scrollTo({ left: kids[i].offsetLeft - pad, behavior: reduce ? 'auto' : 'smooth' });
  }
  $$('.lane').forEach(function (lane) {
    if (getComputedStyle(lane).position === 'static') lane.style.position = 'relative';
    var dots = d.createElement('div');
    dots.className = 'lane-dots'; dots.setAttribute('aria-hidden', 'true');
    lane.parentNode.insertBefore(dots, lane.nextSibling);
    var slider = lane.closest('[data-slider]');
    var cur = slider ? $('[data-current]', slider) : null, tot = slider ? $('[data-total]', slider) : null;
    var prev = slider ? $('[data-prev]', slider) : null, next = slider ? $('[data-next]', slider) : null;
    function render() {
      var kids = visibleKids(lane), n = kids.length, idx = laneIndex(lane);
      if (dots.children.length !== n) {
        dots.innerHTML = '';
        kids.forEach(function (_, i) { var b = d.createElement('button'); b.type = 'button'; b.tabIndex = -1; b.addEventListener('click', function () { goTo(lane, i); }); dots.appendChild(b); });
      }
      Array.prototype.forEach.call(dots.children, function (b, i) { b.setAttribute('aria-current', String(i === idx)); });
      if (cur) cur.textContent = String(idx + 1).padStart(2, '0');
      if (tot) tot.textContent = String(n).padStart(2, '0');
      var perView = Math.max(1, Math.round(lane.clientWidth / ((kids[0] && kids[0].offsetWidth) || lane.clientWidth)));
      if (prev) prev.disabled = lane.scrollLeft < 4;
      if (next) next.disabled = lane.scrollLeft + lane.clientWidth >= lane.scrollWidth - 4 || n <= perView;
    }
    var t; lane.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(render, 60); }, { passive: true });
    w.addEventListener('resize', render);
    lane._render = render;
    if (prev) prev.addEventListener('click', function () { goTo(lane, laneIndex(lane) - 1); });
    if (next) next.addEventListener('click', function () { goTo(lane, laneIndex(lane) + 1); });
    if (slider) slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { goTo(lane, laneIndex(lane) + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { goTo(lane, laneIndex(lane) - 1); e.preventDefault(); }
    });
    render();
  });

  /* ---------- case filters ---------- */
  var f = $$('[data-filter]');
  f.forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-filter'), i = 0;
      f.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $$('[data-type]').forEach(function (c) {
        var show = v === 'all' || c.getAttribute('data-type') === v;
        c.hidden = !show;
        c.classList.remove('flt-in');
        if (show && !reduce) { c.style.setProperty('--i', i++); void c.offsetWidth; c.classList.add('flt-in'); }
      });
      $$('.lane').forEach(function (l) { if (l.querySelector('[data-type]')) { l.scrollLeft = 0; if (l._render) l._render(); } });
    });
  });

  /* ---------- copy Telegram handle ---------- */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy');
      var mark = function () { b.setAttribute('data-done', ''); setTimeout(function () { b.removeAttribute('data-done'); }, 1800); };
      var fallback = function () { var r = d.createRange(); r.selectNodeContents(b); var s = w.getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(t).then(mark, fallback); } catch (e) { fallback(); }
    });
  });


  /* ---------- fit each screen into the window (residual scale via CSS zoom) ---------- */
  var supportsZoom = 'zoom' in d.documentElement.style;
  function fitScreens() {
    if (!supportsZoom) return;
    var hdrH = hdr ? hdr.offsetHeight : 0, avail = w.innerHeight - hdrH;
    var on = w.innerHeight >= 560 && w.innerWidth >= 340;
    var units = [];
    $$('main > .screen').forEach(function (s) {
      if (s.classList.contains('hero') && getComputedStyle(s).display === 'block') {
        var a = $('.hero-copy', s), b = $('.hero-b', s);
        if (a) units.push({ box: a, inner: a.children, pad: true });
        if (b) units.push({ box: b, inner: b.children, pad: true, extra: 46 });
      } else {
        units.push({ box: s, inner: s.children, pad: true });
      }
    });
    units.forEach(function (u) {
      var kids = Array.prototype.slice.call(u.inner);
      kids.forEach(function (c) { c.style.zoom = ''; c.removeAttribute('data-fit'); });
      if (!on) return;
      var cs = getComputedStyle(u.box);
      var room = avail - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - (u.extra || 0);
      var floor = w.innerWidth <= 820 ? 0.8 : 0.76, z = 1;
      function content() { var t = 0; kids.forEach(function (c) { var r = c.getBoundingClientRect(), m = getComputedStyle(c); t += r.height + parseFloat(m.marginTop) + parseFloat(m.marginBottom); }); return t; }
      for (var k = 0; k < 5; k++) {
        var h = content();
        if (h <= room + 1 || z <= floor) break;
        z = Math.max(floor, z * (room / h) - 0.004);
        kids.forEach(function (c) { c.style.zoom = z.toFixed(3); c.setAttribute('data-fit', ''); });
      }
    });
    longShots.forEach(measure);
  }
  var ft; w.addEventListener('resize', function () { clearTimeout(ft); ft = setTimeout(fitScreens, 120); });
  fitScreens();
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(fitScreens);
  w.addEventListener('load', fitScreens);

  /* ---------- pause the marquee when off-screen ---------- */
  var mq = $('[data-marquee] .marquee-track');
  if (mq && 'IntersectionObserver' in w) {
    new IntersectionObserver(function (es) { mq.style.animationPlayState = es[0].isIntersecting ? '' : 'paused'; }).observe(mq);
  }
})();
