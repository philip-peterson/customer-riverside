import { h, render } from "https://esm.sh/preact@10";
import { useState } from "https://esm.sh/preact@10/hooks";
import { html } from "https://esm.sh/htm@3/preact";

const FAQS = [
  {
    q: "What should I expect at my first appointment?",
    a: "Your first visit is a comprehensive diagnostic assessment lasting about an hour. We evaluate your movement, strength, pain points, and medical history to build a personalized treatment plan before any hands-on therapy begins.",
  },
  {
    q: "Do I need a referral from my doctor?",
    a: "In most cases, no. Washington state allows direct access to physical therapy, so you can book an appointment without a physician referral. However, some insurance plans require one -- check with your provider to be sure.",
  },
  {
    q: "How long does a typical course of treatment last?",
    a: "It depends on your condition and goals. Some patients see resolution in four to six weeks; others with surgical rehab or neurological conditions may work with us for several months. We set clear milestones at the start so you always know where you stand.",
  },
  {
    q: "What insurances do you accept?",
    a: "We accept most major insurance plans including Premera, Regence, Aetna, Cigna, and Medicare. We also offer self-pay rates. Contact us before your first appointment and we'll verify your coverage.",
  },
  {
    q: "Can I book an appointment online?",
    a: "Yes. Use the booking tool on this page to pick a service type, choose an available slot, and submit your request. You'll receive a confirmation email immediately.",
  },
  {
    q: "What should I wear or bring to my session?",
    a: "Wear comfortable, loose-fitting clothing that allows easy access to the area being treated. Bring a photo ID, your insurance card, and any relevant imaging (X-rays, MRI reports) on your first visit.",
  },
];

function FaqItem({ item, open, onToggle }) {
  return html`
    <div class="border-b border-gray-200">
      <button
        onClick=${onToggle}
        class="w-full flex items-center justify-between gap-6 py-5 text-left cursor-pointer bg-transparent"
        aria-expanded=${open}
      >
        <span class="text-[1.0625rem] text-gray-900">${item.q}</span>
        <span class="shrink-0 text-xl text-gray-400 leading-none" style=${{ display: "inline-block", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s ease" }}>+</span>
      </button>
      <div style=${{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
        <div style="overflow:hidden">
          <p class="text-[15px] text-gray-500 leading-relaxed pb-5">${item.a}</p>
        </div>
      </div>
    </div>
  `;
}

function Faq() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = function(i) {
    setOpenIndex(function(prev) { return prev === i ? null : i; });
  };

  return html`
    <div class="py-20 px-6 bg-white">
      <h2 class="text-[clamp(3.5rem,8vw,6rem)] font-serif font-normal text-gray-900 text-center mb-16 leading-none">FAQ</h2>
      <div class="max-w-[860px] mx-auto border-t border-gray-200">
        ${FAQS.map((item, i) => html`
          <${FaqItem}
            key=${i}
            item=${item}
            open=${openIndex === i}
            onToggle=${function() { toggle(i); }}
          />
        `)}
      </div>
    </div>
  `;
}

class RptFaq extends HTMLElement {
  connectedCallback() {
    render(html`<${Faq} />`, this);
  }
  disconnectedCallback() {
    render(null, this);
  }
}

customElements.define("rpt-faq", RptFaq);
