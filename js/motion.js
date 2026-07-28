/* ==========================================================================
   MOTION — one reveal system, consistent micro-interactions.
   The signature moments live in rig.js (WebGL). Everything here stays quiet.
   ========================================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. page-load sequence ------------------------------------ */
  // stamp an order index so the stagger never depends on element type
  document.querySelectorAll('.o').forEach(function (el, i) {
    el.style.setProperty('--o', i);
  });

  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    document.body.classList.add('is-loaded');
    var h = document.querySelector('[data-hero-lines]');
    if (h) h.classList.add('is-loaded');
  }
  // fire on load, but never let rAF be the only path — a backgrounded tab
  // must not leave the page sitting at opacity 0.
  if (document.readyState === 'complete') requestAnimationFrame(boot);
  else window.addEventListener('load', function () { requestAnimationFrame(boot); });
  setTimeout(boot, 1600);

  /* ---------- 2. reveal system ----------------------------------------- */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reveals.length) {
    if (REDUCED) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
          if (e.target.hasAttribute('data-count')) count(e.target);
          e.target.querySelectorAll('[data-count]').forEach(count);
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- 3. number counters --------------------------------------- */
  function count(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    if (REDUCED) { el.textContent = target.toLocaleString(); return; }
    var dur = 1300, start = performance.now();
    (function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e).toLocaleString();
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  }
  document.querySelectorAll('[data-count]').forEach(function (el) {
    if (el.closest('[data-reveal]')) return;
    var o = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { count(el); o.disconnect(); }
    }, { threshold: 0.4 });
    o.observe(el);
  });

  /* ---------- 4. nav: tuck on scroll-down + progress hairline ---------- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var bar = nav.querySelector('.nav__progress');
    var last = 0, queued = false;

    function onScroll() {
      var y = window.scrollY;
      if (y > last && y > 220 && !nav.classList.contains('is-open')) {
        nav.classList.add('is-tucked');
      } else {
        nav.classList.remove('is-tucked');
      }
      last = y;
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
      }
    }
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { onScroll(); queued = false; });
    }, { passive: true });
    onScroll();
  }

  /* ---------- 5. magnetic buttons (pointer devices only) --------------- */
  if (!REDUCED && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.style.transition = 'transform 0.35s cubic-bezier(0.16,1,0.3,1)';
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) * 0.18;
        var dy = (e.clientY - r.top - r.height / 2) * 0.30;
        el.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- 6. GSAP layer (progressive enhancement) ------------------ */
  if (!REDUCED && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // gentle parallax on framed media — factor stays under 0.15
    gsap.utils.toArray('[data-drift]').forEach(function (el) {
      gsap.to(el, {
        yPercent: parseFloat(el.dataset.drift) || -9,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });
    });

    // grid cells wipe in as a wave, not a uniform fade
    gsap.utils.toArray('[data-wave]').forEach(function (grid) {
      gsap.from(grid.children, {
        opacity: 0,
        y: 22,
        duration: 0.55,
        ease: 'power3.out',
        stagger: 0.055,
        scrollTrigger: { trigger: grid, start: 'top 82%' }
      });
    });

    // horizontal rail nudges once as it enters — signals it scrolls sideways
    gsap.utils.toArray('[data-nudge]').forEach(function (rail) {
      ScrollTrigger.create({
        trigger: rail, start: 'top 72%', once: true,
        onEnter: function () {
          gsap.fromTo(rail, { scrollLeft: 0 }, {
            scrollLeft: 88, duration: 0.65, ease: 'power2.inOut', yoyo: true, repeat: 1
          });
        }
      });
    });
  }
})();
