import { h, render } from "https://esm.sh/preact@10";
import { useState } from "https://esm.sh/preact@10/hooks";
import { html } from "https://esm.sh/htm@3/preact";

const TESTIMONIALS = [
  {
    name: "Sarah M.", category: "Sports Rehab Patient", initials: "SM", color: "#8ab4be",
    quote: "After my ACL tear I was terrified I'd never run again. The team here built a plan that had me back on the field in four months. Every session felt purposeful.",
  },
  {
    name: "Leon N.", category: "Neurology Patient", initials: "LN", color: "#a3bfc8",
    quote: "Every new patient begins with a comprehensive diagnostic assessment. From there, they create a fully personalized treatment plan tailored to your goals -- whether that means returning to sport, recovering from surgery, or restoring function.",
  },
  {
    name: "Diana K.", category: "Surgery Rehab Patient", initials: "DK", color: "#7aa3af",
    quote: "Six weeks post-hip replacement and I was walking without a cane -- weeks ahead of what my surgeon expected. The therapists here are genuinely invested in your outcome, not just checking boxes.",
  },
  {
    name: "Marcus T.", category: "Sports Rehab Patient", initials: "MT", color: "#6b9dab",
    quote: "I came in with chronic shoulder pain that three other clinics couldn't resolve. Two months in, I'm lifting overhead for the first time in years. The diagnostic process here is legitimately different.",
  },
  {
    name: "Rachel O.", category: "Surgery Rehab Patient", initials: "RO", color: "#93b8c3",
    quote: "The booking process is seamless and the staff remembers you. I never felt like just another patient. My recovery from rotator cuff surgery exceeded every milestone.",
  },
  {
    name: "James P.", category: "Neurology Patient", initials: "JP", color: "#80aab5",
    quote: "After my stroke the neurological therapy program here gave me my independence back. The team combined manual therapy with targeted exercise in a way that made real, measurable progress every single week.",
  },
];

const CARD_W = 270;
const GAP = 20;

function Testimonials() {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex(function(i) { return Math.max(0, i - 1); });
  const next = () => setIndex(function(i) { return Math.min(TESTIMONIALS.length - 1, i + 1); });

  const leftEdge = "max(1.5rem, calc((100vw - 1248px) / 2 + 1.5rem))";

  return html`
    <div style="overflow:hidden">
      <div class="py-16" style=${{ paddingLeft: leftEdge }}>
        <div class="mb-10 pr-6">
          <p class="text-xs tracking-widest uppercase text-[#306f8e] font-semibold mb-4">Testimonials</p>
          <div class="">
            <h2 class="text-[clamp(1.75rem,3vw,2.5rem)] font-serif font-normal text-gray-900 leading-tight max-w-[520px]">
              Don${String.fromCharCode(8217)}t take our word for it.<br />Hear it from our patients!
            </h2>
            <div class="flex gap-3 pb-1 shrink-0">
              <button
                onClick=${prev}
                disabled=${index === 0}
                aria-label="Previous testimonials"
                class="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30"
              >${String.fromCharCode(8592)}</button>
              <button
                onClick=${next}
                disabled=${index === TESTIMONIALS.length - 1}
                aria-label="Next testimonials"
                class="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30"
              >${String.fromCharCode(8594)}</button>
            </div>
          </div>
        </div>
        <div style=${{ display: "flex", gap: GAP + "px", transform: "translateX(-" + (index * (CARD_W + GAP)) + "px)", transition: "transform 0.5s ease", paddingBottom: "2px" }}>
          ${TESTIMONIALS.map((t, i) => html`
            <div key=${i} style=${{ width: CARD_W + "px", flexShrink: 0 }} class="border border-gray-200 rounded-lg p-6 flex flex-col gap-5 bg-white">
              <div
                class="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-base shrink-0"
                style=${{ backgroundColor: t.color }}
              >${t.initials}</div>
              <p class="text-[15px] text-gray-700 leading-relaxed flex-1">${t.quote}</p>
              <div>
                <p class="text-xl font-serif text-gray-900 mb-0.5">${t.name}</p>
                <p class="text-xs tracking-widest uppercase text-[#306f8e] font-semibold">${t.category}</p>
              </div>
            </div>
          `)}
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
