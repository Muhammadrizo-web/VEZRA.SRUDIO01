/* Vezra Studio — interactions & motion. Без зависимостей. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, w = window;
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in w;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var raf = w.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  if (reduce) root.classList.remove('anim');

  /* ---------- hero timeline: fills day by day ---------- */
  runTimeline();
  function runTimeline() {
    var tl = $('[data-timeline] .tl-days');
    if (!tl) return;
    var items = $$('li', tl), n = items.length;
    function set(p) {
      tl.style.setProperty('--p', p.toFixed(4));
      items.forEach(function (li, i) { li.classList.toggle('on', p >= (n > 1 ? i / (n - 1) : 1) - 0.001); });
    }
    if (!root.classList.contains('anim')) { set(1); return; }
    var dur = 2400, delay = 500, startT = null;
    set(0);
    setTimeout(function () {
      function step(t) {
        if (!startT) startT = t;
        var x = Math.min(1, (t - startT) / dur);
        var e = x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        set(e);
        if (x < 1) raf(step);
      }
      raf(step);
    }, delay);
  }

  /* ---------- mobile menu ---------- */
  var btn = $('#menuBtn'), nav = $('#mnav');
  function setMenu(open) {
    if (!btn || !nav) return;
    btn.setAttribute('aria-expanded', String(open));
    var L = { ru: ['Закрыть меню', 'Открыть меню'], en: ['Close menu', 'Open menu'], uz: ['Menyuni yopish', 'Menyuni ochish'] }[root.lang] || ['Закрыть меню', 'Открыть меню'];
    btn.setAttribute('aria-label', open ? L[0] : L[1]);
    root.classList.toggle('menu-open', open);
    d.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      nav.hidden = false;
      $$('.wrap > a', nav).forEach(function (a, i) { a.style.transitionDelay = (0.04 + i * 0.04) + 's'; });
      raf(function () { raf(function () { nav.classList.add('is-open'); }); });
    } else {
      nav.classList.remove('is-open');
      $$('.wrap > a', nav).forEach(function (a) { a.style.transitionDelay = '0s'; });
      setTimeout(function () { if (!nav.classList.contains('is-open')) nav.hidden = true; }, reduce ? 0 : 320);
    }
  }
  if (btn && nav) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); btn.focus(); } });
    w.addEventListener('resize', function () { if (getComputedStyle(btn).display === 'none' && root.classList.contains('menu-open')) setMenu(false); });
  }

  /* ---------- header: border on scroll, hides when scrolling down ---------- */
  var hdr = $('.hdr'), lastY = w.scrollY || 0, ticking = false;
  function onScroll() {
    ticking = false;
    var y = w.scrollY || w.pageYOffset;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 8);
      if (!root.classList.contains('menu-open')) {
        if (y > lastY + 6 && y > 320) hdr.classList.add('is-hidden');
        else if (y < lastY - 6 || y < 320) hdr.classList.remove('is-hidden');
      }
    }
    lastY = y;
  }
  w.addEventListener('scroll', function () { if (!ticking) { ticking = true; raf(onScroll); } }, { passive: true });
  onScroll();
  d.addEventListener('focusin', function (e) { if (hdr && hdr.contains(e.target)) hdr.classList.remove('is-hidden'); });

  /* ---------- charts start when they come into view ---------- */
  $$('[data-steps] .step').forEach(function (s, i) { s.style.setProperty('--i', i); });
  var charts = $$('[data-bars],[data-steps]');
  if (root.classList.contains('anim') && hasIO) {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); co.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -15% 0px' });
    charts.forEach(function (el) { co.observe(el); });
  } else {
    charts.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- images fade in ---------- */
  $$('.scr img').forEach(function (img) {
    var ok = function () { img.classList.add('ok'); measure(img.closest('.is-long')); };
    if (img.complete && img.naturalWidth) ok(); else { img.addEventListener('load', ok); img.addEventListener('error', function () { img.classList.add('ok'); }); }
  });

  /* ---------- long screenshots scroll on hover (desktop) / by themselves on touch ---------- */
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
    } else if (hasIO) {
      var ao = new IntersectionObserver(function (es) {
        es.forEach(function (e) { measure(e.target); e.target.classList.toggle('auto', e.isIntersecting); });
      }, { threshold: 0.35 });
      longShots.forEach(function (s) { ao.observe(s); });
    }
  }

  /* ---------- FAQ: smooth open / close, one answer at a time ---------- */
  function animateClose(det) {
    var body = $('.ans', det);
    if (!det.open || !body) return;
    if (reduce || !body.animate) { det.open = false; return; }
    if (det._anim) det._anim.cancel();
    det._anim = body.animate([{ height: body.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.65,0,.35,1)' });
    det._anim.onfinish = function () { det.open = false; det._anim = null; };
  }
  function animateOpen(det) {
    var body = $('.ans', det);
    if (reduce || !body || !body.animate) { det.open = true; return; }
    if (det._anim) det._anim.cancel();
    det.open = true;
    det._anim = body.animate([{ height: '0px', opacity: 0 }, { height: body.scrollHeight + 'px', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.16,1,.3,1)' });
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

  /* ---------- work filters ---------- */
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

  /* ---------- mobile: sticky CTA at the bottom ----------
     Появляется, когда первый экран прокручен, и прячется, пока на экране
     финальный блок с контактами или открыто меню. */
  var mcta = $('#mcta');
  if (mcta) {
    var finalBox = $('#contact'), finalVisible = false, mctaTick = false;
    var mctaLink = $('a', mcta);
    var mctaUpdate = function () {
      mctaTick = false;
      var y = w.scrollY || w.pageYOffset;
      var on = y > Math.min(560, w.innerHeight * 0.7) && !finalVisible && !root.classList.contains('menu-open');
      mcta.classList.toggle('is-on', on);
      mcta.setAttribute('aria-hidden', String(!on));
      if (mctaLink) mctaLink.tabIndex = on ? 0 : -1;
    };
    if (finalBox && hasIO) {
      new IntersectionObserver(function (es) { finalVisible = es[0].isIntersecting; mctaUpdate(); }, { rootMargin: '0px 0px 80px 0px' }).observe(finalBox);
    }
    w.addEventListener('scroll', function () { if (!mctaTick) { mctaTick = true; raf(mctaUpdate); } }, { passive: true });
    if (btn) btn.addEventListener('click', function () { setTimeout(mctaUpdate, 0); });
    mctaUpdate();
  }

  /* ---------- pause the marquee when off-screen ---------- */
  var mq = $('[data-marquee] .marquee-track');
  if (mq && hasIO) {
    new IntersectionObserver(function (es) { mq.style.animationPlayState = es[0].isIntersecting ? '' : 'paused'; }).observe(mq);
  }
})();
