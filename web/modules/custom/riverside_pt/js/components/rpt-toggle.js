import { h, render } from 'https://esm.sh/preact@10';
import { useState } from 'https://esm.sh/preact@10/hooks';
import { html } from 'https://esm.sh/htm@3/preact';

function Toggle({ label = 'Toggle' }) {
  const [checked, setChecked] = useState(false);

  return html`
    <button
      onClick=${() => {
        setChecked(c => !c)
      }}
      aria-pressed=${checked}
      class=${`flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#306f8e] text-sm font-medium cursor-pointer transition-colors ${
        checked ? 'bg-[#306f8e] text-white' : 'bg-transparent text-[#306f8e]'
      }`}
    >
      <span class="w-3 h-3 rounded-full bg-current"></span>
      ${label}
    </button>
  `;
}

class RptToggle extends HTMLElement {
  connectedCallback() {
    render(html`<${Toggle} label=${this.getAttribute('label')} />`, this);
  }

  disconnectedCallback() {
    render(null, this);
  }
}

customElements.define('rpt-toggle', RptToggle);
