(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const springs = { lead: [620, 36], trail: [190, 19] };
  const items = new Set();
  const pause = reduce ? 700 : 480;

  function springValue(state, target, dt) {
    const acceleration = -state.k * (state.x - target) - state.c * state.v;
    state.v += acceleration * dt;
    state.x += state.v * dt;
    return state.x;
  }

  function makeWords(element, state) {
    const text = element.textContent.trim();
    element.dataset.readAlongText = text;
    state.words.length = 0;
    element.replaceChildren();
    text.split(/(\s+)/).forEach(part => {
      if (/^\s+$/.test(part)) element.append(document.createTextNode(part));
      else {
        const word = document.createElement('span');
        word.className = 'read-along-word';
        word.textContent = part;
        element.append(word);
        state.words.push(word);
      }
    });
    const highlight = document.createElement('span');
    highlight.className = 'read-along-highlight';
    highlight.setAttribute('aria-hidden', 'true');
    element.prepend(highlight);
    state.highlight = highlight;
    element.setAttribute('aria-label', text);
  }

  function refresh(element) {
    if (!element) return;
    let state = [...items].find(item => item.element === element)?.state;
    if (!state) {
      state = { words: [], highlight: null, index: -1, elapsed: pause, doneElapsed: 0, last: performance.now(), finished: false, x: { x: 0, v: 0, k: springs.lead[0], c: springs.lead[1] }, y: { x: 0, v: 0, k: springs.lead[0], c: springs.lead[1] }, w: { x: 0, v: 0, k: springs.trail[0], c: springs.trail[1] }, h: { x: 0, v: 0, k: springs.trail[0], c: springs.trail[1] }, targetX: 0, targetY: 0, targetW: 0, targetH: 0 };
      items.add({ element, state });
    }
    makeWords(element, state);
    state.index = -1;
    state.elapsed = pause;
    state.doneElapsed = 0;
    state.finished = false;
    element.classList.remove('is-read-done');
  }

  function chooseWord(item) {
    const { element, state } = item;
    if (!state.words.length) return;
    if (state.index + 1 >= state.words.length) {
      state.index = state.words.length - 1;
      state.finished = true;
      state.doneElapsed = 0;
    } else state.index += 1;
    state.words.forEach((word, index) => {
      word.classList.toggle('is-read', index === state.index);
      word.classList.toggle('is-seen', index < state.index);
    });
    const word = state.words[state.index];
    const parent = element.getBoundingClientRect();
    const rect = word.getBoundingClientRect();
    const fontSize = parseFloat(getComputedStyle(word).fontSize) || rect.height;
    state.targetX = rect.left - parent.left - 4;
    state.targetW = rect.width + 8;
    state.targetH = fontSize + 2;
    state.targetY = rect.top - parent.top + (rect.height - state.targetH) / 2;
  }

  function frame(now) {
    items.forEach(item => {
      const { element, state } = item;
      const dt = Math.min((now - state.last) / 1000, 1 / 30); state.last = now;
      if (!state.finished) {
        state.elapsed += dt * 1000;
        if (state.elapsed >= pause) { state.elapsed = 0; chooseWord(item); }
      } else {
        state.doneElapsed += dt * 1000;
        if (state.doneElapsed >= 520) element.classList.add('is-read-done');
      }
      if (state.highlight) {
        const x = springValue(state.x, state.targetX, dt);
        const y = springValue(state.y, state.targetY, dt);
        const width = springValue(state.w, state.targetW, dt);
        const height = springValue(state.h, state.targetH, dt);
        state.highlight.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        state.highlight.style.width = `${width}px`;
        state.highlight.style.height = `${height}px`;
      }
    });
    requestAnimationFrame(frame);
  }

  document.querySelectorAll('[data-read-along]').forEach(refresh);
  window.readAlong = { refresh };
  requestAnimationFrame(frame);
})();
