(() => {
  const list = document.querySelector('#processList');
  const root = document.querySelector('#stepProgress');
  if (!list || !root) return;

  const rows = [...list.querySelectorAll('.process-row')];
  const bar = root.querySelector('#stepProgressBar');
  const dots = root.querySelector('#stepProgressDots');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = motionPreference.matches;
  const dwellTime = 5200;
  let autoTimer = 0;
  let touchStart = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const spring = (x, stiffness, damping) => ({ x, v: 0, target: x, stiffness, damping });
  const move = (state, dt) => {
    const acceleration = -state.stiffness * (state.x - state.target) - state.damping * state.v;
    state.v += acceleration * dt;
    state.x += state.v * dt;
  };
  const line = spring(0, 160, 22);
  const states = [];
  let current = 0;
  let frame = 0;
  let lastTime = performance.now();

  const labels = ['Анализ', 'Направление', 'План', 'Расчёт', 'Дизайн'];
  rows.forEach((row, index) => {
    row.setAttribute('aria-current', 'false');
    const position = `${index / (rows.length - 1) * 100}%`;
    const dot = document.createElement('button');
    dot.className = 'step-progress-dot';
    dot.type = 'button';
    dot.style.left = position;
    dot.setAttribute('aria-label', `Этап ${index + 1}: ${labels[index]}`);
    dot.addEventListener('click', () => go(index));
    const number = document.createElement('b');
    number.textContent = String(index + 1).padStart(2, '0');
    const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    check.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 12.5l4.5 4.5L19 7.5');
    check.append(path);
    dot.append(number, check);
    dots.append(dot);

    states.push({ dot, number, path, fill: spring(0, 260, 24), check: spring(0, 140, 20), pop: spring(1, 500, 14), active: spring(0, 300, 26) });
  });

  function render() {
    bar.style.width = `${(clamp(line.x, 0, 1) * 100).toFixed(3)}%`;
    states.forEach(state => {
      const fill = clamp(state.fill.x, 0, 1);
      const active = clamp(state.active.x, 0, 1);
      state.dot.style.background = fill > .01
        ? `color-mix(in srgb, var(--accent) ${(fill * 100).toFixed(1)}%, #ededf0)`
        : active > .01 ? `color-mix(in srgb, #171719 ${(active * 100).toFixed(1)}%, #ededf0)` : '';
      state.dot.style.color = active > .5 ? '#fff' : '';
      state.number.style.opacity = String(1 - fill);
      state.path.style.strokeDashoffset = String(22 * (1 - clamp(state.check.x, 0, 1)));
      state.dot.style.transform = `scale(${state.pop.x.toFixed(4)})`;
    });
  }

  function tick(now) {
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    const subdivisions = 4;
    for (let part = 0; part < subdivisions; part++) {
      move(line, dt / subdivisions);
      states.forEach(state => [state.fill, state.check, state.pop, state.active].forEach(item => move(item, dt / subdivisions)));
    }
    render();
    frame = requestAnimationFrame(tick);
  }

  function go(index) {
    current = clamp(index, 0, rows.length - 1);
    if (reduceMotion) {
      line.x = line.target = current / (rows.length - 1);
      states.forEach((state, i) => {
        state.fill.x = state.fill.target = i < current ? 1 : 0;
        state.check.x = state.check.target = i < current ? 1 : 0;
        state.active.x = state.active.target = i === current ? 1 : 0;
        state.pop.x = state.pop.target = 1;
      });
    } else {
      line.target = current / (rows.length - 1);
      states.forEach((state, i) => {
        const complete = i < current;
        state.fill.target = complete ? 1 : 0;
        state.active.target = i === current ? 1 : 0;
        state.check.target = complete ? 1 : 0;
        if (i === current) { state.pop.x = .7; state.pop.v = 6; }
      });
    }
    rows.forEach((row, i) => {
      const active = i === current;
      row.classList.toggle('is-active', active);
      row.setAttribute('aria-current', String(active));
      states[i].dot.setAttribute('aria-current', String(active));
    });
    render();
    clearTimeout(autoTimer);
    if (!reduceMotion) {
      autoTimer = window.setTimeout(() => go(current === rows.length - 1 ? 0 : current + 1), dwellTime);
    }
  }

  rows.forEach((row, index) => row.addEventListener('click', () => go(index)));
  root.addEventListener('touchstart', event => {
    touchStart = event.changedTouches[0].clientX;
  }, { passive: true });
  root.addEventListener('touchend', event => {
    if (touchStart === null) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    touchStart = null;
    if (Math.abs(distance) < 42) return;
    go(current + (distance < 0 ? 1 : -1));
  }, { passive: true });
  const onReducedMotionChange = event => {
    clearTimeout(autoTimer);
    if (event.matches) {
      states.forEach(state => { state.pop.x = state.pop.target = 1; });
      go(current);
      cancelAnimationFrame(frame);
    } else {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
      go(current);
    }
  };
  motionPreference.addEventListener?.('change', onReducedMotionChange);

  go(0);
  if (!reduceMotion) frame = requestAnimationFrame(tick);
})();
