(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.querySelector('.rpt-header__hamburger');
    const nav = document.getElementById('rpt-main-nav');
    if (!btn || !nav) return;

    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (link.dataset.scrollTo) return; // page scrolls away — no need to close
        nav.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', function (e) {
      if (!(e.target instanceof Element) || !e.target.closest('.rpt-header')) {
        nav.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  });
})();
