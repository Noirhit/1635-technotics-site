/* ==========================================================================
   SITE — functional behaviour. No decoration lives here.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- nav toggle ------------------------------------------------ */
  var nav = document.querySelector('.nav');
  var burger = document.querySelector('.nav__burger');
  if (nav && burger) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) nav.classList.remove('is-tucked');
    });
    nav.querySelectorAll('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- image reels ---------------------------------------------- */
  document.querySelectorAll('.reel').forEach(function (reel) {
    var shots = reel.querySelectorAll('img');
    if (shots.length < 2) return;
    var i = 0, live = true;
    new IntersectionObserver(function (es) { live = es[0].isIntersecting; },
      { threshold: 0.05 }).observe(reel);
    setInterval(function () {
      if (!live) return;
      shots[i].classList.remove('is-on');
      i = (i + 1) % shots.length;
      shots[i].classList.add('is-on');
    }, 4200);
  });

  /* ---------- blog: render from data/posts.json ------------------------ */
  function stamp(iso) {
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString('en-US',
        { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return iso; }
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // button, not a div-with-a-click — keyboard reachable and announced properly
  function cardHTML(p, i) {
    return '<article class="card" data-post="' + i + '" data-reveal data-fx="scale" style="--i:' + (i % 3) + '">' +
             '<div class="card__img"><img src="' + esc(p.image) + '" alt="" loading="lazy"></div>' +
             '<div class="card__body">' +
               '<span class="note note--red">' + esc(stamp(p.date)) + ' · ' + esc(p.author) + '</span>' +
               '<h3>' + esc(p.title) + '</h3>' +
               '<p>' + esc(p.excerpt) + '</p>' +
               '<button type="button" class="card__more">Read the entry' +
                 '<span class="u-sr">: ' + esc(p.title) + '</span></button>' +
             '</div>' +
           '</article>';
  }

  var feed = document.getElementById('feed');
  var latest = document.getElementById('latest');

  if (feed || latest) {
    fetch('data/posts.json')
      .then(function (r) { return r.json(); })
      .then(function (posts) {
        posts.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

        if (feed) {
          feed.innerHTML = posts.map(cardHTML).join('');
          feed.querySelectorAll('.card').forEach(function (c) {
            var open = function () { openPost(posts[c.dataset.post]); };
            // the whole card is a hit target, but the button is what focus lands on
            c.addEventListener('click', open);
            c.querySelector('.card__more').addEventListener('click', function (e) {
              e.stopPropagation(); open();
            });
          });
        }
        if (latest) {
          latest.innerHTML = posts.slice(0, 3).map(function (p, i) {
            return '<a class="card" href="blog.html" data-reveal data-fx="scale" style="--i:' + i + '">' +
                     '<div class="card__img"><img src="' + esc(p.image) + '" alt="" loading="lazy"></div>' +
                     '<div class="card__body">' +
                       '<span class="note note--red">' + esc(stamp(p.date)) + '</span>' +
                       '<h3>' + esc(p.title) + '</h3>' +
                       '<p>' + esc(p.excerpt) + '</p>' +
                       '<span class="card__more">Read the entry</span>' +
                     '</div></a>';
          }).join('');
        }

        // hand the freshly-injected cards to the reveal observer
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
          });
        }, { threshold: 0.12 });
        document.querySelectorAll('.card[data-reveal]').forEach(function (c) { io.observe(c); });
      })
      .catch(function () {
        var msg = '<p class="note">// FEED UNREACHABLE — RUN A LOCAL SERVER (VS CODE LIVE SERVER) OR VIEW THE DEPLOYED SITE</p>';
        if (feed) feed.innerHTML = msg;
      });
  }

  /* ---------- post modal ------------------------------------------------ */
  function openPost(p) {
    var wrap = document.createElement('div');
    wrap.className = 'sheetover is-open';
    wrap.innerHTML =
      '<div class="sheetover__panel" role="dialog" aria-modal="true" aria-label="' + p.title + '">' +
        '<button class="sheetover__x" aria-label="Close">&times;</button>' +
        '<img src="' + p.image + '" alt="">' +
        '<span class="note note--red">' + stamp(p.date) + ' · ' + p.author + '</span>' +
        '<h2>' + p.title + '</h2>' + p.body +
      '</div>';
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { wrap.classList.add('is-visible'); });

    function shut() {
      wrap.classList.remove('is-visible');
      document.body.style.overflow = '';
      setTimeout(function () { wrap.remove(); }, 400);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') shut(); }

    wrap.querySelector('.sheetover__x').addEventListener('click', shut);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) shut(); });
    document.addEventListener('keydown', onKey);
    wrap.querySelector('.sheetover__x').focus();
  }

  /* ---------- contact form (Web3Forms) --------------------------------- */
  var form = document.getElementById('reach-form');
  if (form) {
    var status = form.querySelector('.form__status');
    var send = form.querySelector('button[type="submit"]');
    var label = send ? send.innerHTML : '';

    function say(text, kind) {
      if (!status) return;
      status.textContent = text;
      status.className = 'form__status' + (kind ? ' is-' + kind : '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var key = form.querySelector('[name="access_key"]');
      if (!key || !key.value || key.value.indexOf('YOUR_') === 0) {
        say('// FORM NOT CONFIGURED — ADD A WEB3FORMS ACCESS KEY', 'bad');
        return;
      }
      if (send) { send.disabled = true; send.textContent = 'Transmitting…'; }
      say('', '');

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res.success) throw new Error(res.message || 'rejected');
          say('// RECEIVED — WE WILL COME BACK TO YOU', 'ok');
          form.reset();
        })
        .catch(function () {
          say('// TRANSMISSION FAILED — EMAIL US DIRECTLY', 'bad');
        })
        .finally(function () {
          if (send) { send.disabled = false; send.innerHTML = label; }
        });
    });
  }
})();
