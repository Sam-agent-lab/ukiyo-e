const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  const kinds = [
    'petal',
    'petal',
    'drop',
    'petal',
    'petal',
    'drop',
    'petal',
    'petal',
    'drop',
    'petal',
    'petal',
    'drop',
  ];

  const layer = document.createElement('div');
  layer.className = 'drift';
  layer.dataset.testid = 'drift-layer';
  layer.setAttribute('aria-hidden', 'true');

  const items = kinds.map((kind, index) => {
    const item = document.createElement('span');
    const duration = 18 + ((index * 7) % 17);
    const delay = 1.4 + index * 2.6;

    item.className = `drift__item drift__${kind}`;
    item.dataset.driftKind = kind;
    item.style.setProperty('--drift-left', `${(index * 37 + 7) % 92 + 2}%`);
    item.style.setProperty('--drift-sway', `${((index * 29) % 160) - 80}px`);
    item.style.setProperty('--drift-sway-end', `${((index * 53) % 200) - 100}px`);
    item.style.setProperty('--drift-spin', `${((index * 41) % 360) - 180}deg`);
    item.style.setProperty('--drift-opacity', kind === 'petal' ? '0.45' : '0.25');
    item.style.animationDuration = `${duration}s`;
    item.style.animationDelay = `-${delay.toFixed(2)}s`;

    if (kind === 'petal') {
      if (index % 4 === 1) {
        item.classList.add('drift__petal--pink');
      }

      item.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M7 .8c2.8 3.2 4.9 5.8 4.9 8.1a4.9 4.9 0 0 1-9.8 0C2.1 6.6 4.2 4 7 .8Z"/></svg>';
    } else {
      item.style.setProperty('--drift-size', `${6 + ((index * 3) % 5)}px`);
    }

    return item;
  });

  layer.append(...items);
  // I petali restano dentro l'hero: non devono coprire titoli e poesie.
  const host = document.querySelector('[data-testid="hero"]') || document.body;
  host.append(layer);

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const state = entry.isIntersecting ? 'running' : 'paused';

      for (const item of items) {
        item.style.animationPlayState = state;
      }
    }
  });

  observer.observe(layer);
}
