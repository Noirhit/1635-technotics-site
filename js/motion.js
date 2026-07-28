/* ============================================
   MOTION — GSAP reveal system + hero sequence
   Quiet, mechanical, expo-out. One signature
   moment (hero); everything else stays subtle.
   ============================================ */
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !window.gsap) return; // content stays fully visible untouched

    gsap.registerPlugin(ScrollTrigger);

    var EASE = 'expo.out';

    /* Failsafe: gsap.from() hides elements before animating them. If anything
       throws while the timelines are being built, that content would stay
       invisible for good. Force everything visible if we ever get that far. */
    function revealAll() {
        gsap.set([
            '.hero-ticker', '.hero-meta', '.hero-line .hero-num', '.hero-logo',
            '.hero-lede', '.hero-cta .btn', '.hero-stats .stat', '.hero-band',
            '.section-tag', '.page-meta', '.section-head h2', '.section-sub',
            '.subteam', '.tl-step', '.rspec', '.spec', '.award', '.sponsor',
            '.bot-card', '.cad', '.bracket-card', '.frame', '.slideshow',
            '.team-photo', '.footer-num', '.card'
        ], { clearProps: 'all' });
    }

    document.addEventListener('DOMContentLoaded', function () {
      try {

        /* ---------- HERO LOAD SEQUENCE (index only) ---------- */
        var hero = document.querySelector('.hero');
        if (hero) {
            var tl = gsap.timeline({ defaults: { ease: EASE } });
            tl.from('.hero-ticker', { yPercent: -100, duration: 0.5 }, 0)
              .from('.hero-meta', { opacity: 0, y: 14, duration: 0.55 }, 0.15)
              .from('.hero-line .hero-num', {
                  yPercent: 108, duration: 0.9, stagger: 0.09
              }, 0.2)
              .from('.hero-logo', { opacity: 0, scale: 0.92, duration: 0.8 }, 0.45)
              .from('.hero-lede', { opacity: 0, y: 18, duration: 0.6 }, 0.55)
              .from('.hero-cta .btn', { opacity: 0, y: 14, duration: 0.5, stagger: 0.07 }, 0.65)
              .from('.hero-stats .stat', { opacity: 0, y: 16, duration: 0.5, stagger: 0.06 }, 0.75)
              .from('.hero-band', { opacity: 0, y: 30, duration: 0.8 }, 0.85);
        }

        /* ---------- SECTION HEADS — eyebrow, then title ---------- */
        gsap.utils.toArray('.section-head, .page-header .container').forEach(function (head) {
            var tag = head.querySelector('.section-tag, .page-meta');
            var title = head.querySelector('h1, h2');
            var sub = head.querySelector('.section-sub, p');
            var seq = gsap.timeline({
                scrollTrigger: { trigger: head, start: 'top 82%', once: true },
                defaults: { ease: EASE }
            });
            if (tag) seq.from(tag, { opacity: 0, x: -18, duration: 0.5 }, 0);
            if (title) seq.from(title, { opacity: 0, y: 26, duration: 0.7 }, 0.08);
            if (sub && sub !== title) seq.from(sub, { opacity: 0, y: 16, duration: 0.55 }, 0.2);
        });

        /* ---------- GRID ITEMS — staggered rise, batched ---------- */
        var gridSelector = [
            '.subteam', '.tl-step', '.rspec', '.spec', '.award',
            '.sponsor', '.bot-card', '.cad', '.member', '.stat-strip .stat'
        ].join(',');
        ScrollTrigger.batch(gridSelector, {
            start: 'top 88%',
            once: true,
            onEnter: function (els) {
                gsap.from(els, {
                    opacity: 0, y: 24, duration: 0.65, ease: EASE, stagger: 0.07
                });
            }
        });

        /* ---------- FRAMED MEDIA — settle-into-place scale ---------- */
        gsap.utils.toArray('.section .frame, .section .slideshow, .team-photo').forEach(function (el) {
            if (el.closest('.hero')) return;
            gsap.from(el, {
                opacity: 0, scale: 1.045, duration: 0.9, ease: EASE,
                scrollTrigger: { trigger: el, start: 'top 86%', once: true }
            });
        });

        /* ---------- BRACKET CARDS — slide from the right ---------- */
        gsap.utils.toArray('.bracket-card').forEach(function (el) {
            gsap.from(el, {
                opacity: 0, x: 28, duration: 0.7, ease: EASE,
                scrollTrigger: { trigger: el, start: 'top 85%', once: true }
            });
        });

        /* ---------- MISSION STRIP — slow horizontal drift on scroll ---------- */
        gsap.utils.toArray('.strip-inner').forEach(function (el) {
            gsap.fromTo(el, { x: 40 }, {
                x: -40, ease: 'none',
                scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
            });
        });

        /* ---------- BLOG CARDS — injected async, catch via observer ---------- */
        ['posts-container', 'blog-preview-container'].forEach(function (id) {
            var box = document.getElementById(id);
            if (!box) return;
            var mo = new MutationObserver(function () {
                var cards = box.querySelectorAll('.card');
                if (!cards.length) return;
                mo.disconnect();
                gsap.from(cards, {
                    opacity: 0, y: 24, duration: 0.65, ease: EASE, stagger: 0.08,
                    scrollTrigger: { trigger: box, start: 'top 88%', once: true }
                });
            });
            mo.observe(box, { childList: true });
        });

        /* ---------- FOOTER NUMBER — rises once ---------- */
        var footNum = document.querySelector('.footer-num');
        if (footNum) {
            gsap.from(footNum, {
                opacity: 0, y: 30, duration: 0.8, ease: EASE,
                scrollTrigger: { trigger: footNum, start: 'top 92%', once: true }
            });
        }

      } catch (err) {
        // Never let a motion bug cost the reader the content.
        revealAll();
      }
    });
})();
