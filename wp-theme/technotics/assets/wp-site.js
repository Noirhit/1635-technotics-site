(function () {
  'use strict';

  var nav = document.querySelector('.nav');
  var burger = document.querySelector('.nav__burger');
  if (nav && burger) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) nav.classList.remove('is-tucked');
    });
    nav.querySelectorAll('.nav__links a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('.reel').forEach(function (reel) {
    var shots = reel.querySelectorAll('img');
    if (shots.length < 2) return;
    var i = 0;
    var live = true;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        live = entries[0].isIntersecting;
      }, { threshold: 0.05 }).observe(reel);
    }
    window.setInterval(function () {
      if (!live) return;
      shots[i].classList.remove('is-on');
      i = (i + 1) % shots.length;
      shots[i].classList.add('is-on');
    }, 4200);
  });

  var form = document.getElementById('reach-form');
  if (form) {
    var status = form.querySelector('.form__status');
    var send = form.querySelector('button[type="submit"]');
    var original = send ? send.innerHTML : '';

    function say(text, kind) {
      if (!status) return;
      status.textContent = text;
      status.className = 'form__status' + (kind ? ' is-' + kind : '');
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (send) {
        send.disabled = true;
        send.textContent = 'Transmitting…';
      }
      say('', '');

      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
      })
        .then(function (response) { return response.json(); })
        .then(function (result) {
          if (!result.success) throw new Error(result.message || 'rejected');
          say('// RECEIVED — WE WILL COME BACK TO YOU', 'ok');
          form.reset();
        })
        .catch(function () {
          say('// TRANSMISSION FAILED — EMAIL US DIRECTLY', 'bad');
        })
        .finally(function () {
          if (send) {
            send.disabled = false;
            send.innerHTML = original;
          }
        });
    });
  }
}());
