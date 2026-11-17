(() => {
  const state = {
    mode: 'no-design',
    title: document.querySelector('#contactTitle'),
    lead: document.querySelector('#contactLead'),
    label: document.querySelector('#briefLabel'),
    brief: document.querySelector('#projectBrief'),
    submit: document.querySelector('#contactSubmit'),
    process: document.querySelector('#processList'),
    modal: document.querySelector('#contactModal'),
    preview: document.querySelector('#messagePreview'),
    telegram: document.querySelector('#telegramLink'),
    returnFocus: null
  };
  const copy = {
    'no-design': {
      title: 'Сделаем визуал, который помогает продавать',
      lead: 'Я изучу продукт, аудиторию и конкурентов, затем предложу направление и соберу дизайн под задачу.',
    points: [],
      label: 'Расскажите о товаре или задаче',
      placeholder: 'Например: карточки товара или рекламные слайды',
      submit: 'Рассказать о товаре',
      processTitle: ['Анализ конкурентов и ЦА', 'Подбор примеров и согласование', 'ТЗ и воронка продаж', 'Оценка сроков и стоимости', 'Создание визуала и согласование'],
      processDetail: ['Изучу конкурентов и целевую аудиторию, чтобы понять, как выделить продукт.', 'Предложу визуальные примеры и согласую направление до начала работы.', 'При необходимости соберу структуру дополнительных слайдов и воронку продаж.', 'Оценю объём работ, сроки и стоимость выбранного решения.', 'Создам визуал, покажу логику и доведу материалы до готового результата.']
    },
    'has-design': {
      title: 'Усилим дизайн, чтобы он работал лучше',
      lead: 'Я проверю текущий дизайн, найду точки роста и предложу подходящий вариант: доработку, редизайн или новый концепт.',
      label: 'Расскажите о товаре или задаче',
      placeholder: 'Например: что хочется улучшить в текущем дизайне',
      submit: 'Отправить на аудит',
      processTitle: ['Анализ конкурентов и ЦА', 'Подбор примеров и согласование', 'Доработка, редизайн или новый вариант', 'Оценка сроков и стоимости', 'Создание визуала и согласование'],
      processDetail: ['Проверю нишу и аудиторию, чтобы понять, что усилить в визуале.', 'Подберу примеры и согласую направление до начала работ.', 'Предложу доработку, редизайн или полностью новый вариант.', 'Оценю сроки и стоимость выбранного решения.', 'Создам визуал и согласую готовый результат.']
    }
  };
  const setMode = mode => {
    state.mode = mode;
    const content = copy[mode];
    state.title.textContent = content.title;
    state.title.classList.remove('is-changing');
    requestAnimationFrame(() => state.title.classList.add('is-changing'));
    state.lead.textContent = content.lead;
    state.label.textContent = content.label;
    state.brief.placeholder = content.placeholder;
    state.submit.firstChild.textContent = `${content.submit} `;
    [...state.process.querySelectorAll('strong')].forEach((item, index) => { item.textContent = content.processTitle[index]; });

    [...state.process.querySelectorAll('small')].forEach((item, index) => { item.textContent = content.processDetail[index]; });
    document.querySelectorAll('[data-design-state]').forEach(button => {
      const active = button.dataset.designState === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };
  document.querySelectorAll('[data-design-state]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.designState)));
  const closeModal = () => {
    state.modal.classList.remove('is-open');
    state.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('contact-modal-open');
    setTimeout(() => { state.modal.hidden = true; state.returnFocus?.focus(); }, 220);
  };
  const openModal = message => {
    state.preview.textContent = message;
    state.telegram.href = `https://t.me/k_puhov?text=${encodeURIComponent(message)}`;
    state.modal.hidden = false;
    requestAnimationFrame(() => { state.modal.classList.add('is-open'); state.modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('contact-modal-open'); state.modal.querySelector('.contact-modal-close').focus(); });
  };
  document.querySelector('#auditForm').addEventListener('submit', event => {
    event.preventDefault();
    const brief = state.brief.value.trim();

    const prefix = state.mode === 'no-design' ? 'Привет! Хочу обсудить дизайн нового проекта.' : 'Привет! Хочу обсудить аудит и улучшение текущего дизайна.';
    const message = brief ? `${prefix}\n\n${brief}` : prefix;
    state.returnFocus = state.submit;
    openModal(message);
    window.portfolioHaptic?.('success');
  });
  state.modal.addEventListener('click', event => { if (event.target.closest('[data-modal-close]')) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && state.modal.classList.contains('is-open')) closeModal(); });
  setMode(state.mode);
})();



