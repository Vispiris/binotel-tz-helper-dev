  function getFeedbackSpecs(draft = loadDraft()) {
    return (draft.feedbackItems || []).map((item, index) => ({
      key: clean(item.key) || `feedback-${index + 1}`,
      name: clean(item.name),
      speaker: clean(item.speaker),
      includeSelect: Boolean(item.includeSelect),
    })).filter(item => item.name);
  }

  function feedbackVoicePath(spec, type) {
    const speaker = FEEDBACK_SPEAKERS[spec.speaker];
    if (!speaker) throw new Error(`Feedback "${spec.name}": невідомий диктор ${spec.speaker || '—'}.`);
    const suffix = {
      greeting: 'greeting-with-feedback-appeal-v1',
      beginning: 'feedback-beginning-v1',
      csat: 'feedback-csat-v1',
      select: 'feedback-select-v1',
      thanks: 'feedback-thanks-v1',
    }[type];
    return `vOffice/base/production/voice/${speaker.voicePrefix}_${suffix}`;
  }

  function renderFeedbackItem(item = {}) {
    return `<div class="bth-object" data-item="feedback"><div class="bth-object-head"><b>Feedback-об’єкт</b><button type="button" data-remove>×</button></div><div class="bth-fields bth-fields-3"><label>Назва об’єкта<input data-item-field="name" value="${escapeHtml(item.name || '')}" placeholder="Загальна"></label><label>Диктор<select data-item-field="speaker">${optionList(Object.entries(FEEDBACK_SPEAKERS).map(([value, speaker]) => ({ value, text: speaker.label })), item.speaker || 'usolovyova')}</select></label><label class="bth-checkbox"><input type="checkbox" data-item-field="includeSelect" ${item.includeSelect ? 'checked' : ''}>Додати питання Select «Що покращити»</label></div><div class="bth-note">CSAT 1–5 додається завжди першим. Select додається лише коли він потрібен у ТЗ.</div></div>`;
  }

  function setPanelPromptAnswer(answer, action) {
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const originalPrompt = pageWindow.prompt;
    pageWindow.prompt = () => answer;
    try {
      action();
    } finally {
      window.setTimeout(() => { pageWindow.prompt = originalPrompt; }, 0);
    }
  }

  function getFeedbackFeatureValue() {
    return clean(getField('input[name="feedback_activated"]')?.value);
  }

  function enableFeedbackFeature() {
    const hidden = getField('input[name="feedback_activated"]');
    const wrapper = $('#feedback_activated');
    const enable = wrapper && $('[data-value="1"]', wrapper);
    if (!hidden || !wrapper || !enable) throw new Error('Не знайдено перемикач Feedback у параметрах компанії.');

    if (getFeedbackFeatureValue() === '1') return false;
    const unlock = $('#unlock-button');
    if (!unlock) throw new Error('Не знайдено замок у параметрах компанії.');
    setPanelPromptAnswer('binotel', () => unlock.click());
    enable.click();
    if (getFeedbackFeatureValue() !== '1') throw new Error('Панель не перемкнула Feedback у стан «Увімкнено».');

    const form = hidden.closest('form');
    const submit = form && $all('button[type="submit"], input[type="submit"]', form).find(button => /сохран|зберег/i.test(clean(button.textContent || button.value)));
    if (!submit) throw new Error('Не знайдено кнопку збереження параметрів компанії для Feedback.');
    submit.click();
    return true;
  }

  function feedbackPresetReady(spec) {
    const required = ['beginning', 'csat', 'thanks', ...(spec.includeSelect ? ['select'] : [])].map(type => feedbackVoicePath(spec, type));
    const values = new Set($all('select[name="greetingData"], select[name="thanksData"]').flatMap(select => Array.from(select.options || []).map(option => option.value)));
    return required.every(value => values.has(value));
  }

  function getFeedbackSurveyEntries(name) {
    const target = normalize(name);
    const entries = [];
    $all('table tr').forEach(row => {
      const cells = Array.from(row.cells || []);
      if (!cells.some(cell => normalize(cell.textContent) === target)) return;
      const link = $('a[href*="module=feedback"][href*="surveyID"]', row);
      const idFromLink = link ? new URL(link.href, location.href).searchParams.get('surveyID') : '';
      const idFromCell = cells.map(cell => digitsOnly(cell.textContent)).find(value => /^\d+$/.test(value)) || '';
      const surveyID = clean(idFromLink || idFromCell);
      if (surveyID) entries.push({ surveyID, url: link?.href || '' });
    });
    return Array.from(new Map(entries.map(item => [item.surveyID, item])).values());
  }

  function feedbackEditUrl(surveyID = '') {
    const url = new URL(buildPanelUrl(CONFIG.feedbackModule, 'edit'));
    if (surveyID) url.searchParams.set('surveyID', surveyID);
    else url.searchParams.set('type', 'call');
    return url.toString();
  }

  function getFeedbackForm() {
    const greeting = getField('select[name="greetingData"]');
    return greeting?.closest('form') || null;
  }

  function submitFeedbackForm() {
    const form = getFeedbackForm();
    const submit = form && $all('button[type="submit"], input[type="submit"]', form).find(button => /сохран|зберег/i.test(clean(button.textContent || button.value)));
    if (!submit) throw new Error('Не знайдено кнопку збереження Feedback-об’єкта.');
    submit.click();
  }

  function fillFeedbackBase(spec) {
    const name = getField('input[name="name"]');
    const greeting = getField('select[name="greetingData"]');
    const thanks = getField('select[name="thanksData"]');
    if (!name || !greeting || !thanks) throw new Error('Форма Feedback неповна: немає назви, початку або подяки.');
    setFieldValue(name, spec.name);
    if (!setSelectValue(greeting, feedbackVoicePath(spec, 'beginning'))) throw new Error(`Feedback "${spec.name}": не знайдено голосове «Початок».`);
    if (!setSelectValue(thanks, feedbackVoicePath(spec, 'thanks'))) throw new Error(`Feedback "${spec.name}": не знайдено голосове «Вдячність».`);
  }

  function feedbackQuestionFields() {
    return $all('input[name^="listOfQuestions"][name$="[name]"]').map(name => {
      const prefix = name.name.slice(0, name.name.lastIndexOf('['));
      return {
        name,
        type: getField(`[name="${prefix}[type]"]`),
        data: getField(`[name="${prefix}[questionData]"]`),
      };
    });
  }

  function configureFeedbackQuestions(spec) {
    const expected = [
      { type: 'csat', data: feedbackVoicePath(spec, 'csat') },
      ...(spec.includeSelect ? [{ type: 'select', data: feedbackVoicePath(spec, 'select') }] : []),
    ];
    if (feedbackQuestionFields().length) throw new Error(`Feedback "${spec.name}": новий об’єкт уже містить питання; автоматичне перезаписування заборонене.`);
    const add = $('#add-question');
    if (!add) throw new Error('Не знайдено кнопку «Додати питання» у Feedback.');
    expected.forEach(() => add.click());
    const fields = feedbackQuestionFields();
    if (fields.length !== expected.length) throw new Error(`Feedback "${spec.name}": панель додала ${fields.length} питань замість ${expected.length}.`);
    expected.forEach((item, index) => {
      const field = fields[index];
      setFieldValue(field.name, 'Оценка качества работы сотрудника');
      if (!setSelectValue(field.type, item.type)) throw new Error(`Feedback "${spec.name}": не вдалося вибрати тип ${item.type}.`);
      if (!setSelectValue(field.data, item.data)) throw new Error(`Feedback "${spec.name}": не вдалося вибрати голосове для ${item.type}.`);
    });
  }

  function assertFeedbackSurveyMatches(spec) {
    const name = clean(getField('input[name="name"]')?.value);
    const greeting = clean(getField('select[name="greetingData"]')?.value);
    const thanks = clean(getField('select[name="thanksData"]')?.value);
    if (name !== spec.name) throw new Error(`Перевірка Feedback: очікується назва "${spec.name}", знайдено "${name}".`);
    if (greeting !== feedbackVoicePath(spec, 'beginning')) throw new Error(`Feedback "${spec.name}": невірне голосове початку.`);
    if (thanks !== feedbackVoicePath(spec, 'thanks')) throw new Error(`Feedback "${spec.name}": невірне голосове подяки.`);
    const expected = [
      { type: 'csat', data: feedbackVoicePath(spec, 'csat') },
      ...(spec.includeSelect ? [{ type: 'select', data: feedbackVoicePath(spec, 'select') }] : []),
    ];
    const actual = feedbackQuestionFields().map(field => ({ type: clean(field.type?.value), data: clean(field.data?.value) }));
    if (actual.length !== expected.length) throw new Error(`Feedback "${spec.name}": очікується ${expected.length} питань, знайдено ${actual.length}.`);
    expected.forEach((item, index) => {
      if (actual[index].type !== item.type || actual[index].data !== item.data) {
        throw new Error(`Feedback "${spec.name}": питання ${index + 1} не відповідає ТЗ.`);
      }
    });
  }

  async function applyFeedback() {
    const draft = loadDraft();
    const specs = getFeedbackSpecs(draft);
    const flow = loadFlow() || {};
    const index = Number(flow.index || 0);
    if (!specs.length || index >= specs.length) {
      saveFlow({ stage: 'scenarios', index: 0, feedbackAction: '' });
      await runAutomaticFlow();
      return;
    }

    const spec = specs[index];
    const action = clean(flow.feedbackAction) || 'enable';
    if (action === 'enable' || action === 'verifyEnable') {
      if (getModule() !== CONFIG.companyParamsModule) {
        window.location.href = buildPanelUrl(CONFIG.companyParamsModule);
        return;
      }
      if (action === 'verifyEnable') {
        if (getFeedbackFeatureValue() !== '1') throw new Error('Feedback не залишився увімкненим після збереження параметрів компанії.');
        log('Feedback у параметрах компанії увімкнено та перевірено.', 'success');
        saveFlow({ stage: 'feedback', index, feedbackAction: 'ensurePreset' });
        window.location.href = feedbackEditUrl();
        return;
      }
      if (getFeedbackFeatureValue() === '1') {
        saveFlow({ stage: 'feedback', index, feedbackAction: 'ensurePreset' });
        window.location.href = feedbackEditUrl();
        return;
      }
      saveFlow({ stage: 'feedback', index, feedbackAction: 'verifyEnable' });
      log('Вмикаю Feedback у параметрах компанії.', 'info');
      enableFeedbackFeature();
      return;
    }

    if (action === 'ensurePreset' || action === 'verifyPreset') {
      const isFeedbackForm = getModule() === CONFIG.feedbackModule && getParams().get('action') === 'edit' && Boolean(getField('select[name="greetingData"]'));
      if (!isFeedbackForm) {
        window.location.href = feedbackEditUrl();
        return;
      }
      if (feedbackPresetReady(spec)) {
        log(`Набір Feedback ${FEEDBACK_SPEAKERS[spec.speaker].label} доступний.`, 'success');
        saveFlow({ stage: 'feedback', index, feedbackAction: 'findSurvey' });
        window.location.href = buildPanelUrl(CONFIG.feedbackModule);
        return;
      }
      if (action === 'verifyPreset') throw new Error(`Після додавання набір Feedback ${FEEDBACK_SPEAKERS[spec.speaker].label} не з’явився у формах.`);
      const url = new URL(buildPanelUrl(CONFIG.voiceMessagesModule));
      url.searchParams.set('action', 'addStandardPreset');
      url.searchParams.set('preset', FEEDBACK_SPEAKERS[spec.speaker].preset);
      saveFlow({ stage: 'feedback', index, feedbackAction: 'verifyPreset' });
      log(`Додаю набір Feedback ${FEEDBACK_SPEAKERS[spec.speaker].label}, версія 1.`, 'info');
      window.location.href = url.toString();
      return;
    }

    if (action === 'findSurvey') {
      if (getModule() !== CONFIG.feedbackModule || getParams().get('action')) {
        window.location.href = buildPanelUrl(CONFIG.feedbackModule);
        return;
      }
      const entries = getFeedbackSurveyEntries(spec.name);
      if (entries.length > 1) throw new Error(`Знайдено ${entries.length} Feedback-об’єкти "${spec.name}". Спочатку приберіть дублікати.`);
      if (entries.length === 1) {
        saveFlow({ stage: 'feedback', index, feedbackAction: 'verifySurvey' });
        window.location.href = feedbackEditUrl(entries[0].surveyID);
        return;
      }
      saveFlow({ stage: 'feedback', index, feedbackAction: 'createBase' });
      window.location.href = feedbackEditUrl();
      return;
    }

    if (action === 'createBase') {
      fillFeedbackBase(spec);
      saveFlow({ stage: 'feedback', index, feedbackAction: 'configureQuestions' });
      log(`Створюю Feedback-об’єкт "${spec.name}".`, 'info');
      submitFeedbackForm();
      return;
    }

    if (action === 'configureQuestions') {
      if (!getParams().get('surveyID')) throw new Error(`Після створення Feedback "${spec.name}" панель не повернула surveyID.`);
      configureFeedbackQuestions(spec);
      saveFlow({ stage: 'feedback', index, feedbackAction: 'verifySurvey' });
      log(`Додаю питання Feedback "${spec.name}": CSAT${spec.includeSelect ? ' та Select' : ''}.`, 'info');
      submitFeedbackForm();
      return;
    }

    if (action === 'verifySurvey') {
      assertFeedbackSurveyMatches(spec);
      log(`Feedback "${spec.name}" повністю перевірено.`, 'success');
      saveFlow({ stage: 'feedback', index: index + 1, feedbackAction: 'enable' });
      window.location.href = buildPanelUrl(CONFIG.feedbackModule);
      return;
    }

    throw new Error(`Невідомий стан Feedback: ${action}.`);
  }
