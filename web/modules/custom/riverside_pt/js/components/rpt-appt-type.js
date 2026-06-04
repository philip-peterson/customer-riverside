import { h, render } from "https://esm.sh/preact@10";
import { useState } from "https://esm.sh/preact@10/hooks";
import { html } from "https://esm.sh/htm@3/preact";

const TYPES = [
  { id: "diagnostic", label: "Diagnostic Assessment", duration: "60 MINS" },
  { id: "sports",     label: "Sports Rehabilitation",  duration: "60 MINS" },
  { id: "surgical",   label: "Surgery Rehabilitation", duration: "60 MINS" },
  { id: "neuro",      label: "Neurological Therapy",   duration: "60 MINS" },
];

const CHECK = html`<svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polyline points="1,5.5 5,9.5 13,1" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function ApptType() {
  const [selected, setSelected] = useState("diagnostic");

  function select(id) {
    setSelected(id);
    document.dispatchEvent(new CustomEvent("rpt:appt-type-change", { detail: { type: id } }));
  }

  return html`
    <div>
      <p class="text-xs tracking-widest uppercase text-pt-blue-500 font-semibold mb-5">Select Appointment Type</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${TYPES.map(function (t) {
          var active = selected === t.id;
          return html`
            <button
              key=${t.id}
              onClick=${function () { select(t.id); }}
              style="text-align:left; cursor:pointer;"
              class=${
                "flex items-center gap-4 p-4 w-full rounded-xl border transition-colors " +
                (active ? "bg-pt-blue-500 border-pt-blue-500" : "bg-white border-pt-blue-200 hover:border-pt-blue-500")
              }
            >
              <div class=${
                "w-8 h-8 rounded-full shrink-0 flex items-center justify-center border " +
                (active ? "border-white/60" : "border-pt-blue-200")
              }>
                ${active ? CHECK : null}
              </div>
              <div>
                <p class=${"font-serif text-[1.0625rem] font-normal leading-snug " + (active ? "text-white" : "text-gray-900")}>
                  ${t.label}
                </p>
                <p class=${"text-[0.6875rem] tracking-widest font-semibold mt-0.5 " + (active ? "text-white/70" : "text-pt-blue-500")}>
                  ${t.duration}
                </p>
              </div>
            </button>
          `;
        })}
      </div>
    </div>
  `;
}

class RptApptType extends HTMLElement {
  connectedCallback() {
    render(html`<${ApptType} />`, this);
  }
  disconnectedCallback() {
    render(null, this);
  }
}

customElements.define("rpt-appt-type", RptApptType);
