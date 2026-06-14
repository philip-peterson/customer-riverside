import { h, render } from 'https://esm.sh/preact@10';
import { useState, useLayoutEffect, useRef } from 'https://esm.sh/preact@10/hooks';
import { html } from 'https://esm.sh/htm@3/preact';

const IMAGES = [
  { src: '/modules/custom/riverside_pt/images/hero.jpg', alt: 'Physical therapy session' },
  { src: '/modules/custom/riverside_pt/images/Frame_6.png', alt: 'Patient care' },
  { src: '/modules/custom/riverside_pt/images/hero.jpg', alt: 'Rehabilitation' },
  { src: '/modules/custom/riverside_pt/images/Frame_6.png', alt: 'Our facility' },
];

function Carousel() {
  const [index, setIndex] = useState(0);
  const [itemWidth, setItemWidth] = useState(0);
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useLayoutEffect(() => {
    const update = () => {
      if (containerRef.current) setItemWidth(containerRef.current.offsetWidth / 1.5);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const prev = () => setIndex(i => Math.max(0, i - 1));
  const next = () => setIndex(i => Math.min(IMAGES.length - 1, i + 1));

  return html`
    <div class="relative">
      <div ref=${containerRef} class="overflow-hidden">
        <div
          class="flex"
          style=${{ transform: `translateX(${-index * itemWidth}px)`, transition: 'transform 0.4s ease' }}
        >
          ${IMAGES.map((img, i) => html`
            <div key=${i} style=${{ width: itemWidth + 'px', flexShrink: 0 }}>
              <img src=${img.src} alt=${img.alt} class="w-full h-72 object-cover" />
            </div>
          `)}
        </div>
      </div>

      <button
        onClick=${prev}
        disabled=${index === 0}
        class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center text-lg cursor-pointer disabled:opacity-30"
        aria-label="Previous"
      >&#8592;</button>
      <button
        onClick=${next}
        disabled=${index === IMAGES.length - 1}
        class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center text-lg cursor-pointer disabled:opacity-30"
        aria-label="Next"
      >&#8594;</button>
    </div>
  `;
}

class RptCarousel extends HTMLElement {
  connectedCallback() {
    render(html`<${Carousel} />`, this);
  }
  disconnectedCallback() {
    render(null, this);
  }
}

customElements.define('rpt-carousel', RptCarousel);
