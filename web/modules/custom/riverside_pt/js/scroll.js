import zenscroll from "https://esm.sh/zenscroll@4.0.2";

var FIXED_BUFFER = 0; // breathing room below fixed header when menu is closed

// Returns the effective scroll offset to clear the header.
// When the hamburger is open, offsetHeight already includes the expanded nav,
// so no extra buffer is needed. When closed, add FIXED_BUFFER for breathing room.
function headerOffset() {
  var header = document.querySelector(".rpt-header");
  if (!header) return 0;
  var pos = window.getComputedStyle(header).position;
  if (pos !== "fixed" && pos !== "sticky") return 0;
  var nav = document.getElementById("rpt-main-nav");
  var menuOpen = nav && nav.classList.contains("is-open");
  return header.offsetHeight + (menuOpen ? 0 : FIXED_BUFFER);
}

// On load: scroll to the anchor from either the URL hash or drupalSettings
// (set by the server when rendering the home page at a clean URL like /services).
document.addEventListener("DOMContentLoaded", function () {
  var settings = window.drupalSettings && window.drupalSettings.riversidePt;
  var anchor = window.location.hash || (settings && settings.scrollTo);
  if (!anchor) return;
  var target = document.querySelector(anchor);
  if (!target) return;
  requestAnimationFrame(function () {
    zenscroll.toY(Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset()), 0);
  });
});

document.addEventListener("click", function (e) {
  var link = e.target.closest("[data-scroll-to]");
  if (!link) return;
  var target = document.querySelector(link.dataset.scrollTo);
  if (!target) return;
  e.preventDefault();
  history.pushState({}, "", link.getAttribute("href"));
  zenscroll.toY(Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset()), 400);
});
