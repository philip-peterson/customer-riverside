// Add data-scroll-to="#target-id" to any link to smooth-scroll instead of navigate.
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-scroll-to]');
      if (!link) return;
      var target = document.querySelector(link.dataset.scrollTo);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });
})();
