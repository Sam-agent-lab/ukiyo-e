const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  const baseAmplitude = window.matchMedia('(pointer: coarse)').matches ? 60 : 120;
  const root = document.documentElement;

  // Desktop e mobile hanno layer diversi: entrambi espongono il livello.
  const layers = Array.from(
    document.querySelectorAll('[data-testid^="wave-layer"], [data-wave]'),
  ).map((element) => {
    const raw = element.getAttribute('data-wave') || element.getAttribute('data-testid');
    const match = raw.match(/(\d+)$/);
    const level = match ? Number(match[1]) : 1;

    return {
      element,
      amplitude: baseAmplitude * (1 - (level - 1) * 0.25),
      direction: level % 2 === 0 ? -1 : 1,
    };
  });

  let maxScroll = 1;
  let queued = false;

  const measure = () => {
    maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
  };

  const render = () => {
    queued = false;
    const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

    root.style.setProperty('--progress', progress);

    for (const layer of layers) {
      const offset = Math.round(layer.direction * layer.amplitude * progress * 100) / 100;
      layer.element.style.transform = `translate3d(0, ${offset}px, 0)`;
    }
  };

  const schedule = () => {
    if (queued) {
      return;
    }

    queued = true;
    window.requestAnimationFrame(render);
  };

  measure();
  render();

  // I font e gli asset possono cambiare l'altezza dopo il primo paint.
  // Se lo script parte a load gia' avvenuto, il listener non scatterebbe mai.
  if (document.readyState === 'complete') {
    measure();
    schedule();
  } else {
    window.addEventListener('load', () => {
      measure();
      schedule();
    }, { once: true });
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      measure();
      schedule();
    }).observe(document.body);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener(
    'resize',
    () => {
      measure();
      schedule();
    },
    { passive: true },
  );
}
