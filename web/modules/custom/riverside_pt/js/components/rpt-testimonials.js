import { h, render } from "https://esm.sh/preact@10";
import { useState, useEffect, useReducer, useRef } from "https://esm.sh/preact@10/hooks";
import { html } from "https://esm.sh/htm@3/preact";

const TESTIMONIALS = [
  {
    name: "Sarah M.", category: "Sports Rehab Patient", initials: "SM", bgClass: "bg-pt-blue-400",
    quote: "After my ACL tear I was terrified I'd never run again. The team here built a plan that had me back on the field in four months. Every session felt purposeful.",
  },
  {
    name: "Leon N.", category: "Neurology Patient", initials: "LN", bgClass: "bg-pt-blue-300",
    quote: "Every new patient begins with a comprehensive diagnostic assessment. From there, they create a fully personalized treatment plan -- whether that means returning to sport, recovering from surgery, or restoring function.",
  },
  {
    name: "Diana K.", category: "Surgery Rehab Patient", initials: "DK", bgClass: "bg-pt-sage-400",
    quote: "Six weeks post-hip replacement and I was walking without a cane -- weeks ahead of what my surgeon expected. The therapists here are genuinely invested in your outcome, not just checking boxes.",
  },
  {
    name: "Marcus T.", category: "Sports Rehab Patient", initials: "MT", bgClass: "bg-pt-sage-500",
    quote: "I came in with chronic shoulder pain that three other clinics couldn't resolve. Two months in, I'm lifting overhead for the first time in years. The diagnostic process here is legitimately different.",
  },
  {
    name: "Rachel O.", category: "Surgery Rehab Patient", initials: "RO", bgClass: "bg-pt-blue-300",
    quote: "The booking process is seamless and the staff remembers you. I never felt like just another patient. My recovery from rotator cuff surgery exceeded every milestone.",
  },
  {
    name: "James P.", category: "Neurology Patient", initials: "JP", bgClass: "bg-pt-blue-400",
    quote: "After my stroke the neurological therapy program here gave me my independence back. The team combined manual therapy with targeted exercise in a way that made real, measurable progress every single week.",
  },
];

const CARD_W = 270;
const GAP = 20;
const STEP = CARD_W + GAP;
const TOTAL_W = TESTIMONIALS.length * CARD_W + (TESTIMONIALS.length - 1) * GAP;

function Testimonials() {
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const trackRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [left, setLeft] = useState(0);
  const [, forceUpdate] = useReducer(/** @type {(n: number, action?: any) => number} */ (function (n) { return n + 1; }), 0);

  function measureMax() {
    if (!containerRef.current) return 0;
    return Math.max(0, TOTAL_W - containerRef.current.offsetWidth);
  }

  var prev = function () {
    setLeft(function (l) { return Math.min(0, l + STEP); });
  };

  var next = function () {
    var maxL = measureMax();
    setLeft(function (l) { return Math.max(-maxL, l - STEP); });
  };

  useEffect(function () {
    /** @type {number | undefined} */
    var timer;
    function onResize() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var max = measureMax();
        setLeft(function (l) { return Math.min(0, Math.max(-max, l)); });
        forceUpdate(0);
      }, 150);
    }
    window.addEventListener("resize", onResize);
    return function () {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  var drag = useRef(/** @type {{x: number, left: number} | null} */ (null)); // null when idle, {x, left} when dragging

  /** @param {PointerEvent} e */
  var onPointerDown = function (e) {
    drag.current = { x: e.clientX, left: left };
    if (trackRef.current) trackRef.current.style.transition = "none";
    if (e.currentTarget instanceof Element) e.currentTarget.setPointerCapture(e.pointerId);
  };

  /** @param {PointerEvent} e */
  var onPointerMove = function (e) {
    if (!drag.current) return;
    setLeft(drag.current.left + (e.clientX - drag.current.x));
  };

  /** @param {PointerEvent} e */
  var onPointerUp = function (e) {
    if (!drag.current) return;
    drag.current = null;
    if (trackRef.current) trackRef.current.style.transition = "left 0.5s ease";
    var max = measureMax();
    setLeft(function (l) {
      var clamped = Math.min(0, Math.max(-max, l));
      var snapped = -Math.round(-clamped / STEP) * STEP;
      return Math.max(-max, snapped);
    });
  };

  var atStart = left >= 0;
  var atEnd = !!containerRef.current && left <= -measureMax();

  return html`
    <div style="overflow:hidden">
      <div class="px-6 py-16">
        <div ref=${containerRef} style="max-width:1200px; margin:0 auto">
        <div class="mb-10">
          <p class="text-xs tracking-widest uppercase text-pt-blue-500 font-semibold mb-4">Testimonials</p>
          <div class="flex items-end gap-6">
            <h2 class="text-[clamp(1.75rem,3vw,2.5rem)] font-serif font-normal text-gray-900 leading-tight max-w-[520px]">
              Don${String.fromCharCode(8217)}t take our word for it.<br />Hear it from our patients!
            </h2>
            <div class="flex gap-3 pb-1 shrink-0">
              <button
                onClick=${prev}
                disabled=${atStart}
                aria-label="Previous testimonials"
                class="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30"
              >${String.fromCharCode(8592)}</button>
              <button
                onClick=${next}
                disabled=${atEnd}
                aria-label="Next testimonials"
                class="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30"
              >${String.fromCharCode(8594)}</button>
            </div>
          </div>
        </div>
        <div
          ref=${trackRef}
          onPointerDown=${onPointerDown}
          onPointerMove=${onPointerMove}
          onPointerUp=${onPointerUp}
          onPointerCancel=${onPointerUp}
          style=${{ position: "relative", top: 0, left: left + "px", transition: "left 0.5s ease", display: "flex", gap: GAP + "px", paddingBottom: "2px", width: TOTAL_W + "px", touchAction: "pan-y" }}
        >
          ${TESTIMONIALS.map(function (t, i) { return html`
            <div key=${i} style=${{ width: CARD_W + "px", flexShrink: 0 }} class="border border-gray-200 rounded-lg p-6 flex flex-col gap-5 bg-white">
              <div
                class=${"w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-base shrink-0 " + t.bgClass}
              >${t.initials}</div>
              <p class="text-[15px] text-gray-700 leading-relaxed flex-1">${t.quote}</p>
              <div>
                <p class="text-xl font-serif text-gray-900 mb-0.5">${t.name}</p>
                <p class="text-xs tracking-widest uppercase text-pt-blue-500 font-semibold">${t.category}</p>
              </div>
            </div>
          `; })}
        </div>
        </div>
      </div>
    </div>
  `;
}

class RptTestimonials extends HTMLElement {
  connectedCallback() {
    render(html`<${Testimonials} />`, this);
  }
  disconnectedCallback() {
    render(null, this);
  }
}

customElements.define("rpt-testimonials", RptTestimonials);
