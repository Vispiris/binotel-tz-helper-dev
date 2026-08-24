(function () {
  'use strict';

  const SCRIPT_VERSION = '0.15.3-dev';

  const CONFIG = {
    panelId: 'binotel-tz-helper-safe-dev-panel',
    modalId: 'binotel-tz-helper-safe-dev-modal',
    alertId: 'binotel-tz-helper-safe-dev-alert',
    stopButtonId: 'binotel-tz-helper-safe-dev-stop',
    positionStorageKey: 'binotel_tz_helper_safe_dev_position_v1',
    draftStorageKey: 'binotel_tz_helper_safe_dev_draft_v2',
    flowStorageKey: 'binotel_tz_helper_safe_dev_flow_v2',
    logStorageKey: 'binotel_tz_helper_safe_dev_log_v1',
    deleteFlowStorageKey: 'binotel_tz_helper_safe_dev_delete_flow_v2',
    tzCaptureStorageKey: 'binotel_tz_helper_safe_dev_sheet_capture_v1',
    pbxSchemeModule: 'pbxScheme',
    companyParamsModule: 'companyProperties',
    endpointsModule: 'endpoints',
    ringGroupsModule: 'ringGroups',
    gsmPortsModule: 'gsmPorts',
    pbxNumbersEnhancedModule: 'pbxNumbersEnhanced',
    pbxNumbersModule: 'pbxNumbers',
    departmentsModule: 'departments',
    voiceMessagesModule: 'voiceMessages',
    feedbackModule: 'feedback',
    routesModule: 'routes',
    trunksModule: 'trunks',
  };

  const TARIFFS = [
    'Unknown',
    'Lite',
    'Pro',
    'Pro+',
    'Enterprise',
    'Phone number',
    'Pro SOHO',
    'Pro Wire',
    'Pro Wire One',
    'Bookon',
    'Bookon One',
    'Chat',
    'Feedback',
    'SmartCRM',
    'OnlineKasa',
    'RestoApp',
  ];

  const REGIONS = [
    { value: '', text: 'Оберіть регіон' },
    'Україна',
    'Європа',
    'Казахстан',
    'Узбекистан',
    'Азербайджан',
  ];

  const LANGUAGES = [
    { value: 'ua', text: 'Українська' },
    { value: 'ru', text: 'Русский' },
    { value: 'en', text: 'English' },
    { value: 'pl', text: 'Polski' },
    { value: 'es', text: 'Español' },
    { value: 'de', text: 'Deutsch' },
    { value: 'ge', text: 'Georgian' },
  ];

  const TIMEZONES = [
    'Europe/Kiev',
    'Europe/Moscow',
    'Europe/London',
    'Europe/Warsaw',
    'Europe/Chisinau',
    'Asia/Yerevan',
    'America/New_York',
    'America/Los_Angeles',
    'Canada/Atlantic',
    'Asia/Barnaul',
    'Asia/Baku',
    'Asia/Aqtau',
    'Asia/Kuala_Lumpur',
    'Asia/Yekaterinburg',
    'Asia/Vladivostok',
    'Asia/Magadan',
  ];

  const DEFAULT_DRAFT = {
    contextCompanyId: '',
    contextProjectId: '',
    companyId: '',
    projectId: '',
    tzUrl: '',
    skipCompanyParams: false,
    externallyProvisionedNumbers: '',
    tariff: 'Pro',
    region: '',
    regionNotImportant: false,
    language: 'ua',
    timezone: 'Europe/Kiev',
    endpointsFirstLine: '',
    endpointsCount: '',
    ringGroupsRows: '',
    gsmNumbersRows: '',
    gsmEmail: '',
    createTemporaryNumbers: false,
    departmentsRows: '',
    standardVoiceMessages: '',
    workingScenarioName: '',
    workingScenarioActions: '',
    nonWorkingScenarioName: '',
    nonWorkingScenarioActions: '',
    scheduleName: '',
    scheduleRule: '',
    incomingNumber: '',
    blockStates: {},
    endpointRows: [],
    ringGroupItems: [],
    gsmNumberItems: [],
    departmentItems: [],
    feedbackItems: [],
    workingActions: [],
    nonWorkingActions: [],
    scenarioItems: [],
    scheduleItems: [],
    manualRouteInstructions: '',
    block11Enabled: false,
    block11AlphaName: 'BinSMS',
    block11Gateway: 'Binotel',
    tzReadIssues: [],
    tzReadAt: '',
    dryRun: true,
  };

  const TZ_BLOCKS = [
    { id: 'company', number: '1', title: 'Параметри компанії', projectAware: false },
    { id: 'endpoints', number: '2', title: 'Внутрішні лінії та доступи', projectAware: true },
    { id: 'ringGroups', number: '3', title: 'Групи виклику', projectAware: true, dependsOn: ['endpoints'] },
    { id: 'gsmNumbers', number: '4', title: 'GSM і тимчасові номери', projectAware: false },
    { id: 'departments', number: '5', title: 'Відділи', projectAware: true, dependsOn: ['endpoints', 'gsmNumbers'] },
    { id: 'voiceMessages', number: '6', title: 'Голосові повідомлення', projectAware: true },
    { id: 'scenarios', number: '7', title: 'Сценарії та графіки', projectAware: true, dependsOn: [] },
    { id: 'feedback', number: '8.1', title: 'Feedback', projectAware: false, dependsOn: [] },
    { id: 'block11', number: '11', title: 'BinSMS', projectAware: false },
  ];

  const STANDARD_UA_VOICE = {
    'ua_greeting': { path: 'vOffice/base/production/voice/ua_greeting', label: 'Стандартне привітання в робочий час' },
    'ua_waiting': { path: 'vOffice/base/production/voice/ua_waiting', label: 'Стандартне повідомлення очікування' },
    'ua_off-hoursvm': { path: 'vOffice/base/production/voice/ua_off-hoursvm', label: 'Стандартне привітання в неробочий час з голосовою поштою' },
    'ua_sorryvm': { path: 'vOffice/base/production/voice/ua_sorryvm', label: 'Стандартне повідомлення «Вибачте» з голосовою поштою' },
    'ua_weekend': { path: 'vOffice/base/production/voice/ua_weekend', label: 'Стандартне повідомлення для вихідного дня' },
    'ua_dslobodenyuk_greeting-with-feedback-appeal-v1': { path: 'vOffice/base/production/voice/ua_dslobodenyuk_greeting-with-feedback-appeal-v1', label: 'Привітання зі зверненням до Feedback' },
    'ua_dslobodenyuk_feedback-beginning-v1': { path: 'vOffice/base/production/voice/ua_dslobodenyuk_feedback-beginning-v1', label: 'Feedback — початок опитування' },
    'ua_dslobodenyuk_feedback-csat-v1': { path: 'vOffice/base/production/voice/ua_dslobodenyuk_feedback-csat-v1', label: 'Feedback — оцінка CSAT' },
    'ua_dslobodenyuk_feedback-select-v1': { path: 'vOffice/base/production/voice/ua_dslobodenyuk_feedback-select-v1', label: 'Feedback — вибір оцінки' },
    'ua_dslobodenyuk_feedback-thanks-v1': { path: 'vOffice/base/production/voice/ua_dslobodenyuk_feedback-thanks-v1', label: 'Feedback — подяка' },
    'ua_opisarenko_greeting-with-feedback-appeal-v1': { path: 'vOffice/base/production/voice/ua_opisarenko_greeting-with-feedback-appeal-v1', label: 'Ольга Писаренко — привітання з Feedback-закликом, версія 1' },
    'ua_opisarenko_feedback-beginning-v1': { path: 'vOffice/base/production/voice/ua_opisarenko_feedback-beginning-v1', label: 'Ольга Писаренко — Feedback початок' },
    'ua_opisarenko_feedback-csat-v1': { path: 'vOffice/base/production/voice/ua_opisarenko_feedback-csat-v1', label: 'Ольга Писаренко — Feedback оцінка 1–5' },
    'ua_opisarenko_feedback-select-v1': { path: 'vOffice/base/production/voice/ua_opisarenko_feedback-select-v1', label: 'Ольга Писаренко — Feedback вибір покращення' },
    'ua_opisarenko_feedback-thanks-v1': { path: 'vOffice/base/production/voice/ua_opisarenko_feedback-thanks-v1', label: 'Ольга Писаренко — Feedback подяка' },
    'ua_usolovyova_greeting-with-feedback-appeal-v1': { path: 'vOffice/base/production/voice/ua_usolovyova_greeting-with-feedback-appeal-v1', label: 'Юлія Соловйова — привітання з Feedback-закликом, версія 1' },
    'ua_usolovyova_feedback-beginning-v1': { path: 'vOffice/base/production/voice/ua_usolovyova_feedback-beginning-v1', label: 'Юлія Соловйова — Feedback початок' },
    'ua_usolovyova_feedback-csat-v1': { path: 'vOffice/base/production/voice/ua_usolovyova_feedback-csat-v1', label: 'Юлія Соловйова — Feedback оцінка 1–5' },
    'ua_usolovyova_feedback-select-v1': { path: 'vOffice/base/production/voice/ua_usolovyova_feedback-select-v1', label: 'Юлія Соловйова — Feedback вибір покращення' },
    'ua_usolovyova_feedback-thanks-v1': { path: 'vOffice/base/production/voice/ua_usolovyova_feedback-thanks-v1', label: 'Юлія Соловйова — Feedback подяка' },
  };

  const FEEDBACK_SPEAKERS = {
    opisarenko: {
      label: 'Ольга Писаренко',
      aliases: /писаренко|pysarenko|pisarenko/i,
      preset: 'Украинские файлы_Ольга Писаренко_Feedback',
      voicePrefix: 'ua_opisarenko',
    },
    usolovyova: {
      label: 'Юлія Соловйова',
      aliases: /солов[йь]?ова|solovyova/i,
      preset: 'Украинские файлы_Юлія Соловйова_Feedback',
      voicePrefix: 'ua_usolovyova',
    },
    dslobodenyuk: {
      label: 'Дмитро Слободенюк',
      aliases: /слободенюк|slobodenyuk/i,
      preset: 'Украинские файлы_Дмитро Слободенюк_Feedback',
      voicePrefix: 'ua_dslobodenyuk',
    },
  };

  let stopRequested = false;

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getParams() {
    return new URLSearchParams(window.location.search);
  }

  function getModule() {
    return getParams().get('module') || '';
  }

  function getCompanyIdFromUrl() {
    return getParams().get('companyID') || '';
  }

  function getProjectIdFromUrl() {
    return getParams().get('showProjectID') || '';
  }

  function isProjectAgnosticModule(module = getModule()) {
    return [
      CONFIG.pbxSchemeModule,
      CONFIG.companyParamsModule,
      CONFIG.gsmPortsModule,
      CONFIG.pbxNumbersEnhancedModule,
      CONFIG.pbxNumbersModule,
      CONFIG.feedbackModule,
    ].includes(clean(module));
  }

  function isPanelPage() {
    return location.hostname === 'panel.binotel.com';
  }

  function loadDraft() {
    try {
      return { ...DEFAULT_DRAFT, ...JSON.parse(localStorage.getItem(CONFIG.draftStorageKey) || '{}') };
    } catch (error) {
      return { ...DEFAULT_DRAFT };
    }
  }

  function saveDraft(patch = {}) {
    const current = loadDraft();
    const next = { ...current, ...patch };
    localStorage.setItem(CONFIG.draftStorageKey, JSON.stringify(next));
    return next;
  }

  function makeUrlBoundDraft(companyId = getCompanyIdFromUrl(), projectId = getProjectIdFromUrl()) {
    const cleanCompanyId = clean(companyId);
    const cleanProjectId = clean(projectId);

    return {
      ...DEFAULT_DRAFT,
      contextCompanyId: cleanCompanyId,
      contextProjectId: cleanProjectId,
      companyId: cleanCompanyId,
      projectId: cleanProjectId,
    };
  }

  function replaceDraftForCurrentUrl(reason = '') {
    const next = makeUrlBoundDraft();
    localStorage.setItem(CONFIG.draftStorageKey, JSON.stringify(next));
    clearFlow();

    if (reason) {
      setStatus(reason, 'warn');
    }

    return next;
  }

  function loadFlow() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.flowStorageKey) || 'null');
    } catch (error) {
      return null;
    }
  }

  function saveFlow(patch = {}) {
    const next = {
      active: true,
      stage: 'context',
      index: 0,
      ...loadFlow(),
      ...patch,
    };
    localStorage.setItem(CONFIG.flowStorageKey, JSON.stringify(next));
    return next;
  }

  function clearFlow() {
    localStorage.removeItem(CONFIG.flowStorageKey);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function optionList(values, selected) {
    return values
      .map(item => {
        const value = typeof item === 'string' ? item : item.value;
        const text = typeof item === 'string' ? item : item.text;
        return `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(text)}</option>`;
      })
      .join('');
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalize(value) {
    return clean(value).toLowerCase();
  }

  function digitsOnly(value) {
    return String(value || '').replace(/\D+/g, '');
  }

  function isValidEndpointNumber(value) {
    return /^[1-9]\d{2,}$/.test(clean(value));
  }

  function visibleField(field) {
    if (!field) return false;
    const style = window.getComputedStyle(field);
    return style.display !== 'none' && style.visibility !== 'hidden' && field.type !== 'hidden';
  }

  function visibleElement(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  }

  function getCompanyId() {
    const draft = loadDraft();
    return clean(draft.companyId || getCompanyIdFromUrl());
  }

  function getProjectId() {
    const draft = loadDraft();
    return clean(draft.projectId || getProjectIdFromUrl());
  }

  function rememberUrlContext() {
    const flow = loadFlow();
    if (flow && flow.active) return;

    const companyId = getCompanyIdFromUrl();
    const projectId = getProjectIdFromUrl();
    const draft = loadDraft();

    if (!companyId) return;

    const draftCompanyId = clean(draft.contextCompanyId || draft.companyId);
    const draftProjectId = clean(draft.contextProjectId || draft.projectId);
    const companyChanged = draftCompanyId && draftCompanyId !== companyId;
    const projectChanged = projectId && draftProjectId && draftProjectId !== projectId;

    if (companyChanged || projectChanged) {
      replaceDraftForCurrentUrl('Відкрита інша компанія/проєкт — старі дані очищено.');
      return;
    }

    const patch = {};
    if (companyId && !draft.companyId) patch.companyId = companyId;
    if (projectId && !draft.projectId) patch.projectId = projectId;
    if (!projectId && draft.projectId) patch.projectId = '';
    if (companyId && !draft.contextCompanyId) patch.contextCompanyId = companyId;
    if (projectId && !draft.contextProjectId) patch.contextProjectId = projectId;
    if (!projectId && draft.contextProjectId) patch.contextProjectId = '';

    if (Object.keys(patch).length) saveDraft(patch);
  }

  function buildPanelUrl(module, action = '') {
    const companyId = getCompanyId();
    const projectId = getProjectId();
    const params = new URLSearchParams();

    params.set('module', module);
    if (action) params.set('action', action);
    if (companyId) params.set('companyID', companyId);
    if (projectId && !isProjectAgnosticModule(module)) params.set('showProjectID', projectId);

    return `https://panel.binotel.com/?${params.toString()}`;
  }

  function buildPbxSchemeUrl(companyId) {
    const params = new URLSearchParams();
    params.set('module', CONFIG.pbxSchemeModule);
    params.set('companyID', companyId);
    return `https://panel.binotel.com/?${params.toString()}`;
  }

  function setStatus(message, type = 'info') {
    const panel = $(`#${CONFIG.panelId}`);
    const status = panel && $('.bth-status', panel);
    if (status) {
      status.textContent = message;
      status.dataset.type = type;
    }
    console.log('[TZ helper]', message);
  }

  function readStoredLogs() {
    try {
      const value = JSON.parse(localStorage.getItem(CONFIG.logStorageKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function saveStoredLogs(items) {
    try {
      localStorage.setItem(CONFIG.logStorageKey, JSON.stringify(items.slice(0, 120)));
    } catch (error) {
      // localStorage can be blocked in rare cases; visual log still works.
    }
  }

  function addLogLineToBox(box, item) {
    if (!box || !item) return;
    const line = document.createElement('div');
    line.className = `bth-log-line ${item.type || 'info'}`;
    line.textContent = `${item.time || new Date().toLocaleTimeString()} — ${item.message || ''}`;
    box.prepend(line);
  }

  function renderStoredLogs(box) {
    if (!box) return;
    box.innerHTML = '';
    readStoredLogs().slice().reverse().forEach(item => addLogLineToBox(box, item));
  }

  function log(message, type = 'info') {
    setStatus(message, type);
    const item = {
      time: new Date().toLocaleTimeString(),
      message,
      type,
    };
    const stored = readStoredLogs();
    stored.unshift(item);
    saveStoredLogs(stored);

    const modal = $(`#${CONFIG.modalId}`);
    const box = modal && $('.bth-log', modal);
    if (!box) return;
    addLogLineToBox(box, item);
  }

  function showCenterAlert(message, type = 'error') {
    renderStyles();

    let alert = $(`#${CONFIG.alertId}`);
    if (!alert) {
      alert = document.createElement('div');
      alert.id = CONFIG.alertId;
      document.body.appendChild(alert);
    }

    alert.dataset.type = type;
    alert.innerHTML = `
      <div class="bth-alert-card">
        <div class="bth-alert-title">${type === 'error' ? 'Помилка' : 'Повідомлення'}</div>
        <div class="bth-alert-text">${escapeHtml(message)}</div>
        <button class="bth-alert-ok" type="button">Ок</button>
      </div>
    `;

    $('.bth-alert-ok', alert).addEventListener('click', () => {
      alert.classList.remove('open');
    });

    alert.classList.add('open');
  }

  function showStopButton() {
    let button = $(`#${CONFIG.stopButtonId}`);
    if (!button) {
      button = document.createElement('button');
      button.id = CONFIG.stopButtonId;
      button.textContent = '⛔ STOP';
      button.addEventListener('click', () => {
        stopRequested = true;
        clearFlow();
        log('Зупинку запитано. Скрипт не піде на наступний крок.', 'warn');
      });
      document.body.appendChild(button);
    }
    button.style.display = 'block';
  }

  function hideStopButton() {
    const button = $(`#${CONFIG.stopButtonId}`);
    if (button) button.style.display = 'none';
  }

  function setFieldValue(field, value) {
    if (!field || value === undefined || value === null || value === '') return false;

    field.focus();
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function setSelectValue(select, value) {
    if (!select || value === undefined || value === null || value === '') return false;

    const target = normalize(value);
    const option = Array.from(select.options || []).find(item =>
      normalize(item.value) === target ||
      normalize(item.textContent) === target ||
      normalize(item.textContent).includes(target)
    );

    if (!option) return false;

    select.value = option.value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function findSelectByOptionText(value) {
    const target = normalize(value);
    if (!target) return null;

    return $all('select').find(select =>
      Array.from(select.options || []).some(option =>
        normalize(option.value) === target ||
        normalize(option.textContent) === target
      )
    ) || null;
  }

  function getField(selectors) {
    return String(selectors)
      .split(',')
      .map(selector => $(selector.trim()))
      .find(Boolean) || null;
  }

  function getVisibleField(selectors, root = document) {
    return String(selectors)
      .split(',')
      .map(selector => Array.from(root.querySelectorAll(selector.trim())).find(visibleField))
      .find(Boolean) || null;
  }

  function getFormWithField(selectors) {
    const fields = $all(selectors).filter(visibleField);
    const field = fields[0];
    return field ? field.closest('form') : null;
  }

  function findInputByLabel(labelText) {
    const target = normalize(labelText);
    const labels = $all('label');

    for (const label of labels) {
      if (!normalize(label.textContent).includes(target)) continue;

      const forId = label.getAttribute('for');
      if (forId) {
        const byFor = document.getElementById(forId);
        if (byFor) return byFor;
      }

      const local = label.querySelector('input, textarea, select');
      if (local) return local;

      const wrapper = label.closest('div, tr, .control-group, .form-group');
      const nearby = wrapper && wrapper.querySelector('input, textarea, select');
      if (nearby) return nearby;
    }

    return null;
  }

  function getFieldValue(field) {
    if (!field) return '';

    if (field.tagName === 'SELECT') {
      const optionText = field.selectedOptions && field.selectedOptions[0]
        ? field.selectedOptions[0].textContent
        : '';
      return clean(`${field.value || ''} ${optionText || ''}`);
    }

    return clean(field.value || field.textContent || '');
  }

  function getFirstNumber(value) {
    const match = clean(value).match(/\d+/);
    return match ? String(Number(match[0])) : '';
  }

  function assertSipServerIsAllowed() {
    const sipField =
      findInputByLabel('SIP сервер') ||
      findInputByLabel('Sip сервер') ||
      findInputByLabel('SIP server') ||
      getField('select[name*="sip" i], input[name*="sip" i]');

    if (!sipField) {
      throw new Error('Не знайшов поле "SIP сервер" у параметрах компанії. Перевірку не пройдено.');
    }

    const sipValue = getFieldValue(sipField);
    const sipNumber = getFirstNumber(sipValue);

    if (sipNumber === '') {
      throw new Error('Не зміг прочитати значення поля "SIP сервер". Перевірку не пройдено.');
    }

    if (sipNumber === '0') {
      throw new Error('SIP сервер = 0. Звернись до СВ для зміни SIP сервера.');
    }

    return sipNumber;
  }

  function assertSipServerMatchesRegion(sipNumber, draft) {
    if (draft.regionNotImportant) {
      log('Перевірку регіону пропущено: увімкнено "регіон не важливий".', 'warn');
      return;
    }

    const region = clean(draft.region);
    const sip = Number(sipNumber);

    if (!region) {
      throw new Error('Оберіть регіон або поставте галку "регіон не важливий".');
    }

    let ok = false;
    let expected = '';

    if (region === 'Україна') {
      ok = sip >= 1 && sip <= 49;
      expected = 'SIP 1–49';
    } else if (region === 'Казахстан') {
      ok = sip >= 50 && sip <= 53;
      expected = 'SIP 50–53';
    } else if (region === 'Узбекистан') {
      ok = sip === 70;
      expected = 'SIP 70';
    } else if (region === 'Європа') {
      ok = sip === 80;
      expected = 'SIP 80';
    } else if (region === 'Азербайджан') {
      ok = sip === 65;
      expected = 'SIP 65';
    } else {
      throw new Error(`Невідомий регіон: ${region}.`);
    }

    if (!ok) {
      throw new Error(`SIP сервер ${sipNumber} не відповідає регіону "${region}". Очікується ${expected}. Звернись до СВ для зміни SIP сервера.`);
    }

    log(`Регіон "${region}" відповідає SIP серверу ${sipNumber}.`, 'success');
  }

  function clickButtonByText(texts) {
    const list = Array.isArray(texts) ? texts : [texts];
    return clickButtonByTextIn(document, list);
  }

  function clickButtonByTextIn(root, texts) {
    const list = Array.isArray(texts) ? texts : [texts];
    const buttons = Array.from(root.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, .btn'))
      .filter(visibleElement)
      .filter(button => !button.disabled);
    const found = buttons.find(button => {
      const value = button.value || button.textContent || '';
      return list.some(text => normalize(value).includes(normalize(text)));
    });

    if (!found) return false;
    found.click();
    return true;
  }

  function clickSubmitNear(field, texts) {
    const form = field && field.closest('form');
    if (form && clickButtonByTextIn(form, texts)) return true;

    const card = field && field.closest('.modal, .panel, .well, .container-fluid, .span10, .row-fluid, div');
    if (card && clickButtonByTextIn(card, texts)) return true;

    return clickButtonByText(texts);
  }

  function clickButtonByTextWithTemporaryConfirm(texts) {
    const originalConfirm = window.confirm;

    window.confirm = function(message) {
      const text = String(message || '');
      if (/временн|тимчас/i.test(text)) {
        log(`Автопідтверджено: ${text}`, 'info');
        return true;
      }

      return originalConfirm.call(window, message);
    };

    try {
      return clickButtonByText(texts);
    } finally {
      setTimeout(() => {
        if (window.confirm !== originalConfirm) {
          window.confirm = originalConfirm;
        }
      }, 1500);
    }
  }

  async function clickSubmitAndContinue(message, nextStage, nextIndex = 0) {
    const clicked = clickButtonByText(['Сохранить', 'Зберегти', 'Добавить', 'Додати']);
    if (!clicked) throw new Error('Не знайшов кнопку збереження/додавання на сторінці.');

    saveFlow({ stage: nextStage, index: nextIndex });
    log(message, 'success');
    await sleep(1200);
  }

  function normalizeLineList(value) {
    return String(value || '')
      .split(/[,\n;]+/)
      .map(item => clean(item))
      .filter(Boolean);
  }

  function getBlockItems(value) {
    return String(value || '')
      .trim()
      .split(/\n\s*\n+/)
      .map(block => block.trim())
      .filter(Boolean)
      .map(block => block
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
      );
  }

  function getGsmNumberItems(value) {
    return getBlockItems(value)
      .map(lines => ({
        number: clean(lines[0]),
        name: clean(lines[1] || ''),
      }))
      .filter(item => item.number);
  }

  function getDepartmentBlocks(value) {
    const blocks = getBlockItems(value);
    const result = [];

    blocks.forEach(lines => {
      if (lines.length > 3 && lines.length % 3 === 0) {
        for (let index = 0; index < lines.length; index += 3) {
          result.push(lines.slice(index, index + 3));
        }
        return;
      }

      result.push(lines);
    });

    return result;
  }

  function getDepartmentItems(value) {
    return getDepartmentBlocks(value)
      .map(lines => ({
        name: clean(lines[0]),
        phoneNumbers: normalizeLineList(lines[1]),
        endpoints: normalizeLineList(lines.slice(2).join(',')),
      }))
      .filter(item => item.name);
  }

  function getTemporaryMap() {
    const flow = loadFlow() || {};
    return { ...(flow.temporaryNumbersByRealNumber || {}) };
  }

  function rememberTemporaryNumber(realNumber, temporaryNumber) {
    const map = getTemporaryMap();
    map[clean(realNumber)] = clean(temporaryNumber);
    saveFlow({ temporaryNumbersByRealNumber: map });
  }

  function extractTemporaryNumbersFromText(text) {
    return Array.from(new Set(String(text || '').match(/\b089\d{7}\b/g) || []));
  }

  function collectTemporaryNumbersFromPage() {
    return extractTemporaryNumbersFromText(document.body ? document.body.textContent : '');
  }

  function getRingGroupItems(value) {
    const text = String(value || '').trim();
    if (!text) return [];

    return text
      .split(/\n\s*\n+/)
      .map(block => block.trim())
      .filter(Boolean)
      .map(block => {
        const lines = block
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean);

        if (lines.length === 1 && lines[0].includes('|')) {
          const [number, name, endpointLines] = lines[0].split('|').map(part => part.trim());
          return { number, name, endpointLines };
        }

        return {
          number: lines[0] || '',
          name: lines[1] || '',
          endpointLines: lines.slice(2).join(','),
        };
      });
  }

  function assertSafeTestTarget(draft) {
    const companyId = clean(draft.companyId || getCompanyIdFromUrl());
    const projectId = clean(draft.projectId || getProjectIdFromUrl());
    const currentCompanyId = clean(getCompanyIdFromUrl());
    const currentProjectId = clean(getProjectIdFromUrl());
    if (currentCompanyId && companyId !== currentCompanyId) {
      throw new Error(`Відкрита компанія ${currentCompanyId}, а в конструкторі вказана ${companyId}. Перехід без окремої перевірки заборонено.`);
    }
    if (projectId && !isProjectAgnosticModule() && projectId !== currentProjectId) {
      throw new Error(`Відкритий проєкт ${currentProjectId}, а конструктор прив’язаний до ${projectId}. Виконання зупинено.`);
    }
  }

  function getDraftGsmNumberItems(draft) {
    if (Array.isArray(draft.gsmNumberItems) && draft.gsmNumberItems.length) {
      return draft.gsmNumberItems.filter(item => clean(item.number));
    }
    return getGsmNumberItems(draft.gsmNumbersRows).map(item => ({
      ...item,
      email: clean(draft.gsmEmail),
      createTemporary: Boolean(draft.createTemporaryNumbers),
      operatorDependency: false,
    }));
  }

  function buildExecutionPlan(draft) {
    const endpointsIgnored = getBlockState(draft, 'endpoints').ignored;
    const endpoints = endpointsIgnored ? [] : legacyEndpointRows(draft).filter(item => clean(item.number));
    const ringGroups = getRingGroupItems(draft.ringGroupsRows);
    const gsmNumbers = getDraftGsmNumberItems(draft);
    const departments = getDepartmentItems(draft.departmentsRows);
    const scenarios = getScenarioSpecs(draft);
    const schedules = getScheduleSpecs(draft);
    const lines = [
      'БЕЗПЕЧНИЙ ПЛАН — панель не буде змінена',
      `Компанія / проєкт: ${clean(draft.companyId) || getCompanyIdFromUrl() || '—'} / ${clean(draft.projectId) || getProjectIdFromUrl() || 'без проєкту'}`,
      '',
      '1. Параметри компанії',
      ...(draft.skipCompanyParams
        ? ['• Не змінювати пакет, регіон, мову MyBusiness, часовий пояс і посилання на ТЗ; назву компанії скрипт не змінює']
        : [
          `• ТЗ: ${clean(draft.tzUrl)}`,
          `• Пакет: ${clean(draft.tariff) || 'не вказано'}`,
          `• Регіон: ${draft.regionNotImportant ? 'перевірку вимкнено' : clean(draft.region) || 'не вказано'}`,
          `• Мова: ${clean(draft.language) || 'не вказано'}`,
          `• Часовий пояс: ${clean(draft.timezone) || 'не вказано'}`,
        ]),
      '',
      'Зовнішні залежності',
      ...(normalizeLineList(draft.externallyProvisionedNumbers).length
        ? normalizeLineList(draft.externallyProvisionedNumbers).map(number => `• Номер ${number} має бути доданий оператором до запуску`)
        : ['• Немає']),
      '',
      '2. Внутрішні лінії',
      ...(endpointsIgnored
        ? ['• Пропустити: блок позначений «Ігнорувати»']
        : endpoints.length
          ? endpoints.map(item => `• ВЛ ${clean(item.number)}${item.createAccess ? ` + доступ MyBusiness (${clean(item.accessName) || clean(item.email) || 'дані з конструктора'})` : ''}`)
          : ['• Пропустити: у блоці немає ВЛ']),
      '',
      '3. Групи виклику',
      ...(ringGroups.length
        ? ringGroups.map(group => `• ${clean(group.number)} — ${clean(group.name)}: ${normalizeLineList(group.endpointLines).join(', ') || 'без ВЛ'}`)
        : ['• Пропустити']),
      '',
      '4. GSM номери',
      ...(gsmNumbers.length
        ? gsmNumbers.map(item => `• ${item.number}${item.name ? ` — ${item.name}` : ''}${item.createTemporary ? ' + тимчасовий номер' : ''}${item.operatorDependency ? ' (лише перевірити)' : ''}`)
        : ['• Пропустити']),
      '',
      '5. Відділи',
      ...(departments.length
        ? departments.map(item => `• ${item.name}: номери ${item.phoneNumbers.join(', ') || '—'}; ВЛ ${item.endpoints.join(', ') || '—'}`)
        : ['• Пропустити']),
      '',
      '6. Стандартні голосові повідомлення',
      ...(normalizeLineList(draft.standardVoiceMessages).length
        ? normalizeLineList(draft.standardVoiceMessages).map(key => `• ${STANDARD_UA_VOICE[key]?.label || key}`)
        : ['• Пропустити']),
      '',
      '7. Вхідні сценарії та графіки',
      ...(scenarios.length
        ? scenarios.flatMap(scenario => [
          `• ${scenario.isOffHours === '1' ? 'Неробочий' : 'Робочий'} сценарій: ${scenario.name}`,
          ...scenario.actions.map((action, index) => `  ${index + 1}. ${describeScenarioAction(action)}`),
        ])
        : ['• Сценарії пропустити']),
      ...(schedules.length
        ? schedules.flatMap(schedule => [
          `• Графік: ${schedule.name}`,
          ...schedule.rules.map((rule, index) => `  ${index + 1}. ${rule.rule} → ${rule.scenarioName}`),
          `  Вхідні номери: ${schedule.incomingNumbers.join(', ') || 'не вибрані'}`,
        ])
        : ['• Графіки пропустити']),
      '• Порядок дій сценарію: додавати у формі у зворотному порядку, бо панель ставить нову дію зверху',
      '',
      '8.1. Feedback',
      ...((draft.feedbackItems || []).length
        ? draft.feedbackItems.map(item => `• ${clean(item.name)} — ${FEEDBACK_SPEAKERS[item.speaker]?.label || item.speaker}; CSAT${item.includeSelect ? ' + Select' : ''}`)
        : ['• Пропустити']),
      '',
      'Виконати вручну після скрипта',
      `• Вихідні маршрути: ${clean(draft.manualRouteInstructions) || 'прочитати блок 6 ТЗ і налаштувати вручну'}`,
    ];

    return lines;
  }

  function previewExecutionPlan(draft) {
    validateDraft(draft);
    const plan = buildExecutionPlan(draft);
    plan.forEach(line => {
      if (line) log(line, 'info');
    });
    setStatus('План сформовано. Жодних змін у панелі не виконано.', 'success');
    showCenterAlert(plan.join('\n'), 'success');
  }

  function validateDraft(draft) {
    if (!clean(draft.companyId) && !getCompanyIdFromUrl()) {
      throw new Error('Вкажи Panel ID / companyID.');
    }

    if (!clean(draft.tzUrl)) {
      throw new Error('Вкажи посилання на ТЗ.');
    }

    const unresolved = TZ_BLOCKS.filter(block => {
      const state = getBlockState(draft, block.id);
      return !state.ignored && clean(state.issue);
    });
    if (unresolved.length) {
      throw new Error(`Спочатку перевір або ігноруй блоки: ${unresolved.map(block => block.number).join(', ')}.`);
    }

    const needsProject = TZ_BLOCKS.some(block => block.projectAware && !getBlockState(draft, block.id).ignored);
    if (needsProject && !clean(draft.projectId) && !getProjectIdFromUrl()) {
      throw new Error('Для активних проєктних блоків потрібен Project ID / showProjectID.');
    }

    if (!draft.skipCompanyParams && !draft.regionNotImportant && !clean(draft.region)) {
      throw new Error('Оберіть регіон або поставте галку "регіон не важливий".');
    }

    if (!getBlockState(draft, 'endpoints').ignored) {
      const endpointNumbers = (draft.endpointRows || []).map(item => clean(item.number)).filter(Boolean);
      const invalidEndpointNumbers = endpointNumbers.filter(number => !isValidEndpointNumber(number));
      if (invalidEndpointNumbers.length) {
        throw new Error(`Блок 2: некоректні ВЛ: ${[...new Set(invalidEndpointNumbers)].join(', ')}. Дозволені лише цифри, номер має починатися від 100, без початкових нулів.`);
      }
      const duplicateEndpointNumbers = endpointNumbers.filter((number, index) => endpointNumbers.indexOf(number) !== index);
      if (duplicateEndpointNumbers.length) {
        throw new Error(`Блок 2: ВЛ повторюються: ${[...new Set(duplicateEndpointNumbers)].join(', ')}.`);
      }
    }

    const endpointNumberSet = new Set(getBlockState(draft, 'endpoints').ignored
      ? []
      : legacyEndpointRows(draft).map(item => clean(item.number)).filter(Boolean));
    const ringGroups = getBlockState(draft, 'ringGroups').ignored ? [] : getRingGroupItems(draft.ringGroupsRows);
    const ringGroupNumberSet = new Set(ringGroups.map(item => clean(item.number)).filter(Boolean));
    ringGroups.forEach(group => {
      const missing = normalizeLineList(group.endpointLines).filter(number => !endpointNumberSet.has(number));
      if (missing.length) throw new Error(`Блок 3: група ${clean(group.number) || 'без номера'} містить ВЛ, яких немає у блоці 2: ${missing.join(', ')}.`);
    });

    const gsmNumbers = getBlockState(draft, 'gsmNumbers').ignored ? [] : getDraftGsmNumberItems(draft);
    const invalidGsmNumbers = gsmNumbers.map(item => clean(item.number)).filter(number => !/^(?:0\d{9}|38\d{10})$/.test(number));
    if (invalidGsmNumbers.length) throw new Error(`Блок 4: некоректні телефонні номери: ${invalidGsmNumbers.join(', ')}.`);
    const duplicateGsmNumbers = gsmNumbers.map(item => clean(item.number)).filter((number, index, items) => items.indexOf(number) !== index);
    if (duplicateGsmNumbers.length) throw new Error(`Блок 4: номери повторюються: ${[...new Set(duplicateGsmNumbers)].join(', ')}.`);
    const gsmNumberSet = new Set(gsmNumbers.map(item => clean(item.number)).filter(Boolean));
    const departments = getBlockState(draft, 'departments').ignored ? [] : getDepartmentItems(draft.departmentsRows);
    departments.forEach(department => {
      const missingEndpoints = department.endpoints.filter(number => !endpointNumberSet.has(number));
      if (missingEndpoints.length) throw new Error(`Блок 5: відділ "${department.name}" містить ВЛ, яких немає у блоці 2: ${missingEndpoints.join(', ')}.`);
      const missingNumbers = department.phoneNumbers.filter(number => !gsmNumberSet.has(number));
      if (missingNumbers.length) throw new Error(`Блок 5: відділ "${department.name}" містить номери, яких немає у блоці 4: ${missingNumbers.join(', ')}.`);
    });

    const unknownVoiceKeys = getBlockState(draft, 'voiceMessages').ignored ? [] : normalizeLineList(draft.standardVoiceMessages)
      .filter(key => !STANDARD_UA_VOICE[key]);
    if (unknownVoiceKeys.length) {
      throw new Error(`Невідомі стандартні голосові файли: ${unknownVoiceKeys.join(', ')}.`);
    }

    const feedbackItems = getBlockState(draft, 'feedback').ignored ? [] : (draft.feedbackItems || []).filter(item => clean(item.name));
    const feedbackNames = new Set();
    feedbackItems.forEach(item => {
      if (!FEEDBACK_SPEAKERS[item.speaker]) throw new Error(`Feedback "${clean(item.name)}": не вибрано підтримуваного диктора.`);
      const normalizedName = normalize(item.name);
      if (feedbackNames.has(normalizedName)) throw new Error(`Feedback-об’єкт "${clean(item.name)}" додано в конструктор двічі.`);
      feedbackNames.add(normalizedName);
    });

    const scenarios = getBlockState(draft, 'scenarios').ignored ? [] : getScenarioSpecs(draft);
    scenarios.forEach(scenario => {
      if (!scenario.name) throw new Error('Для кожної структури дій потрібно вказати назву сценарію.');
      if (!scenario.actions.length) throw new Error(`Сценарій "${scenario.name}" не має жодної дії.`);
      scenario.actions.forEach(action => {
        if (action.type === 'voice' && !STANDARD_UA_VOICE[action.voiceKey]) {
          throw new Error(`Сценарій "${scenario.name}": невідоме голосове ${action.voiceKey}.`);
        }
        if (action.type !== 'voice' && (!/^\d+$/.test(action.target) || !/^\d+$/.test(action.timeout) || Number(action.timeout) < 1)) {
          throw new Error(`Сценарій "${scenario.name}": для ${action.type} потрібні цифровий номер і додатний таймаут.`);
        }
        if (action.type === 'endpoint' && !endpointNumberSet.has(clean(action.target))) {
          throw new Error(`Сценарій "${scenario.name}": ВЛ ${action.target} відсутня у блоці 2.`);
        }
        if (action.type === 'ringGroup' && !ringGroupNumberSet.has(clean(action.target))) {
          throw new Error(`Сценарій "${scenario.name}": група ${action.target} відсутня у блоці 3.`);
        }
      });
      if (scenario.feedbackName && !feedbackNames.has(normalize(scenario.feedbackName))) {
        throw new Error(`Сценарій "${scenario.name}": Feedback-об’єкт "${scenario.feedbackName}" відсутній у блоці 8.1.`);
      }
    });
    const scenarioNames = new Set(scenarios.map(item => item.name));
    const schedules = getBlockState(draft, 'scenarios').ignored ? [] : getScheduleSpecs(draft);
    schedules.forEach(schedule => {
      if (!schedule.name) throw new Error('Блок 7: у кожного графіка має бути назва.');
      if (!schedule.rules.length) throw new Error(`Графік "${schedule.name}" не має правил.`);
      if (!schedule.incomingNumbers.length) throw new Error(`Графік "${schedule.name}": не вибрано жодного вхідного номера.`);
      const unknownIncoming = schedule.incomingNumbers.filter(number => !gsmNumberSet.has(number));
      if (unknownIncoming.length) throw new Error(`Графік "${schedule.name}": вхідні номери відсутні у блоці 4: ${unknownIncoming.join(', ')}.`);
      schedule.rules.forEach(rule => {
        if (!scenarioNames.has(rule.scenarioName)) throw new Error(`Графік "${schedule.name}": сценарій "${rule.scenarioName || '—'}" не знайдено у конструкторі.`);
        if (rule.rule !== 'Все другое время' && !/^(?:\*|\d{2}:\d{2}-\d{2}:\d{2}),(?:mon|tue|wed|thu|fri|sat|sun)(?:,(?:mon|tue|wed|thu|fri|sat|sun))*,\*,\*$/.test(rule.rule)) {
          throw new Error(`Графік "${schedule.name}": некоректне правило "${rule.rule || 'порожнє'}".`);
        }
      });
    });

    assertSafeTestTarget(draft);
  }

  function getScenarioActions(value) {
    return String(value || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const parts = line.split('|').map(clean);
        const type = parts[0];
        if (type === 'voice' && parts[1]) {
          return { type, voiceKey: parts[1], sourceLine: index + 1 };
        }
        if ((type === 'endpoint' || type === 'ringGroup') && parts[1]) {
          return { type, target: parts[1], timeout: parts[2], sourceLine: index + 1 };
        }
        throw new Error(`Невірна дія сценарію у рядку ${index + 1}: "${line}".`);
      });
  }

  function getBlockState(draft, blockId) {
    return {
      ignored: false,
      issue: '',
      ...(draft.blockStates && draft.blockStates[blockId] ? draft.blockStates[blockId] : {}),
    };
  }

  function legacyEndpointRows(draft) {
    if (Array.isArray(draft.endpointRows) && draft.endpointRows.length) return draft.endpointRows;
    const first = Number(clean(draft.endpointsFirstLine));
    const count = Number(clean(draft.endpointsCount));
    if (!Number.isInteger(first) || !Number.isInteger(count) || count < 1) return [];
    return Array.from({ length: count }, (_, index) => ({ number: String(first + index) }));
  }

  function legacyScenarioActions(value) {
    try {
      return getScenarioActions(value).map(action => ({ ...action }));
    } catch (error) {
      return [];
    }
  }

  function getStructuredDraft(draft) {
    const legacyScenarios = [
      { key: 'working', name: clean(draft.workingScenarioName), type: 'working', actions: legacyScenarioActions(draft.workingScenarioActions) },
      { key: 'nonWorking', name: clean(draft.nonWorkingScenarioName), type: 'offHours', actions: legacyScenarioActions(draft.nonWorkingScenarioActions) },
    ].filter(item => item.name || item.actions.length);
    const legacySchedules = clean(draft.scheduleName) ? [{
      name: clean(draft.scheduleName),
      mode: clean(draft.scheduleRule) === 'Все другое время' ? 'always' : 'custom',
      rules: clean(draft.scheduleRule) ? [{ rule: clean(draft.scheduleRule), scenarioName: clean(draft.workingScenarioName) }] : [],
      fallbackScenarioName: clean(draft.nonWorkingScenarioName),
      incomingNumbers: normalizeLineList(draft.incomingNumber),
    }] : [];
    return {
      endpointRows: legacyEndpointRows(draft),
      ringGroupItems: Array.isArray(draft.ringGroupItems) && draft.ringGroupItems.length
        ? draft.ringGroupItems
        : getRingGroupItems(draft.ringGroupsRows).map(item => ({
          number: clean(item.number),
          name: clean(item.name),
          endpoints: normalizeLineList(item.endpointLines),
        })),
      gsmNumberItems: Array.isArray(draft.gsmNumberItems) && draft.gsmNumberItems.length
        ? draft.gsmNumberItems
        : getDraftGsmNumberItems(draft),
      departmentItems: Array.isArray(draft.departmentItems) && draft.departmentItems.length
        ? draft.departmentItems
        : getDepartmentItems(draft.departmentsRows),
      feedbackItems: Array.isArray(draft.feedbackItems) ? draft.feedbackItems : [],
      workingActions: Array.isArray(draft.workingActions) && draft.workingActions.length
        ? draft.workingActions
        : legacyScenarioActions(draft.workingScenarioActions),
      nonWorkingActions: Array.isArray(draft.nonWorkingActions) && draft.nonWorkingActions.length
        ? draft.nonWorkingActions
        : legacyScenarioActions(draft.nonWorkingScenarioActions),
      scenarioItems: Array.isArray(draft.scenarioItems) && draft.scenarioItems.length ? draft.scenarioItems : legacyScenarios,
      scheduleItems: Array.isArray(draft.scheduleItems) && draft.scheduleItems.length ? draft.scheduleItems : legacySchedules,
    };
  }

  function serializeScenarioActions(actions) {
    return (actions || []).map(action => {
      if (action.type === 'voice') return `voice|${clean(action.voiceKey)}`;
      return `${clean(action.type)}|${clean(action.target)}|${clean(action.timeout)}`;
    }).filter(line => !line.endsWith('|')).join('\n');
  }

  function applyStructuredCompatibility(draft) {
    const endpoints = Array.isArray(draft.endpointRows) ? draft.endpointRows.filter(item => clean(item.number)) : [];
    const endpointNumbers = endpoints.map(item => Number(clean(item.number)));
    const sequential = endpointNumbers.every((number, index) => Number.isInteger(number) && (!index || number === endpointNumbers[index - 1] + 1));
    draft.endpointsFirstLine = endpoints.length && sequential ? String(endpointNumbers[0]) : '';
    draft.endpointsCount = endpoints.length && sequential ? String(endpoints.length) : '';
    draft.ringGroupsRows = (draft.ringGroupItems || []).map(item => [
      clean(item.number),
      clean(item.name),
      normalizeLineList(item.endpoints).join(', '),
    ].join('\n')).join('\n\n');
    draft.gsmNumbersRows = (draft.gsmNumberItems || []).map(item => [clean(item.number), clean(item.name)].filter(Boolean).join('\n')).join('\n\n');
    draft.createTemporaryNumbers = (draft.gsmNumberItems || []).some(item => item.createTemporary);
    draft.externallyProvisionedNumbers = (draft.gsmNumberItems || []).filter(item => item.operatorDependency).map(item => clean(item.number)).filter(Boolean).join(', ');
    draft.departmentsRows = (draft.departmentItems || []).map(item => [
      clean(item.name),
      normalizeLineList(item.phoneNumbers).join(', '),
      normalizeLineList(item.endpoints).join(', '),
    ].join('\n')).join('\n\n');
    draft.workingScenarioActions = serializeScenarioActions(draft.workingActions);
    draft.nonWorkingScenarioActions = serializeScenarioActions(draft.nonWorkingActions);
    const firstWorking = (draft.scenarioItems || []).find(item => item.type !== 'offHours') || {};
    const firstOffHours = (draft.scenarioItems || []).find(item => item.type === 'offHours') || {};
    draft.workingScenarioName = clean(firstWorking.name);
    draft.workingScenarioActions = serializeScenarioActions(firstWorking.actions || []);
    draft.nonWorkingScenarioName = clean(firstOffHours.name);
    draft.nonWorkingScenarioActions = serializeScenarioActions(firstOffHours.actions || []);
    const firstSchedule = (draft.scheduleItems || [])[0] || {};
    draft.scheduleName = clean(firstSchedule.name);
    draft.scheduleRule = clean(firstSchedule.rules?.[0]?.rule) || (firstSchedule.mode === 'always' ? 'Все другое время' : '');
    draft.incomingNumber = normalizeLineList(firstSchedule.incomingNumbers).join(', ');
    return draft;
  }

  function blockCardHeader(draft, blockId, number, title) {
    const state = getBlockState(draft, blockId);
    const status = state.ignored ? 'Ігнорується' : state.issue ? 'Потрібна перевірка' : 'Готовий';
    const type = state.ignored ? 'ignored' : state.issue ? 'issue' : 'ready';
    return `<div class="bth-block-head"><h3>Блок ${number}. ${escapeHtml(title)}</h3><span class="bth-badge ${type}">${status}</span></div>
      <label class="bth-checkbox"><input type="checkbox" data-ignore-block="${blockId}" ${state.ignored ? 'checked' : ''}>Ігнорувати блок — інженер виконає вручну</label>
      ${state.issue ? `<div class="bth-issue">${escapeHtml(state.issue)}</div>` : ''}`;
  }

  function voiceOptions(selected) {
    return optionList(Object.entries(STANDARD_UA_VOICE).map(([value, item]) => ({ value, text: item.label })), selected);
  }

  function targetOptions(items, selected, valueKey = 'number', labelKey = 'name') {
    return `<option value="">Оберіть</option>` + (items || []).map(item => {
      const value = clean(item[valueKey]);
      const label = [value, clean(item[labelKey])].filter(Boolean).join(' — ');
      return `<option value="${escapeHtml(value)}" ${clean(selected) === value ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('');
  }

  function renderScenarioActionRow(action = {}, scenario = 'working', context = {}) {
    const type = clean(action.type) || 'voice';
    return `<div class="bth-item bth-scenario-action" data-scenario="${scenario}">
      <label>Тип дії<select data-item-field="type"><option value="voice" ${type === 'voice' ? 'selected' : ''}>Голосове</option><option value="endpoint" ${type === 'endpoint' ? 'selected' : ''}>Внутрішня лінія</option><option value="ringGroup" ${type === 'ringGroup' ? 'selected' : ''}>Смарт-група виклику</option></select></label>
      <label class="bth-action-voice-wrap">Голосове<select data-item-field="voiceKey" class="bth-action-voice">${voiceOptions(action.voiceKey)}</select></label>
      <label class="bth-action-endpoint-wrap">Внутрішня лінія<select data-item-field="endpointTarget" class="bth-action-endpoint">${targetOptions(context.endpointRows, action.type === 'endpoint' ? action.target : '')}</select></label>
      <label class="bth-action-group-wrap">Смарт-група виклику<select data-item-field="ringGroupTarget" class="bth-action-group">${targetOptions(context.ringGroupItems, action.type === 'ringGroup' ? action.target : '')}</select></label>
      <label class="bth-action-timeout-wrap">Таймаут, с<input data-item-field="timeout" class="bth-action-timeout" value="${escapeHtml(action.timeout || '40')}" placeholder="40"></label>
      <div class="bth-item-buttons"><button type="button" data-move="up">↑</button><button type="button" data-move="down">↓</button><button type="button" data-remove>×</button></div>
    </div>`;
  }

  function scenarioOptions(items, selected) {
    return `<option value="">Оберіть сценарій</option>` + (items || []).map(item => `<option value="${escapeHtml(item.name)}" ${clean(selected) === clean(item.name) ? 'selected' : ''}>${escapeHtml(item.name || 'Без назви')}</option>`).join('');
  }

  function feedbackOptions(items, selected) {
    return `<option value="">Не використовується</option>` + (items || []).map(item => `<option value="${escapeHtml(item.name)}" ${clean(selected) === clean(item.name) ? 'selected' : ''}>${escapeHtml(item.name || 'Без назви')}</option>`).join('');
  }

  function renderScenarioCard(item = {}, context = {}) {
    const key = clean(item.key) || `scenario-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `<div class="bth-object bth-scenario-card" data-scenario-card data-scenario-key="${escapeHtml(key)}"><div class="bth-object-head"><b>Сценарій</b><button type="button" data-remove>×</button></div><div class="bth-fields"><label>Назва<input data-scenario-field="name" value="${escapeHtml(item.name || '')}"></label><label>Тип<select data-scenario-field="type"><option value="working" ${item.type !== 'offHours' ? 'selected' : ''}>Робочий</option><option value="offHours" ${item.type === 'offHours' ? 'selected' : ''}>Неробочий</option></select></label></div><label>Об’єкт Feedback<select data-scenario-field="feedbackName">${feedbackOptions(context.feedbackItems, item.feedbackName)}</select></label><label>Дії — у порядку ТЗ</label><div data-scenario-actions>${(item.actions || []).map(action => renderScenarioActionRow(action, key, context)).join('')}</div><button class="bth-add" type="button" data-add-scenario-action>+ Додати дію</button></div>`;
  }

  const SCHEDULE_DAYS = [{ value: 'mon', label: 'Пн' }, { value: 'tue', label: 'Вт' }, { value: 'wed', label: 'Ср' }, { value: 'thu', label: 'Чт' }, { value: 'fri', label: 'Пт' }, { value: 'sat', label: 'Сб' }, { value: 'sun', label: 'Нд' }];

  function renderScheduleRule(rule = {}, scenarioItems = []) {
    const days = normalizeLineList(rule.days || 'mon,tue,wed,thu,fri');
    const allDay = Boolean(rule.allDay) || clean(rule.rule).startsWith('*,');
    return `<div class="bth-object bth-schedule-rule" data-schedule-rule><div class="bth-object-head"><b>Правило графіка</b><button type="button" data-remove>×</button></div><label class="bth-checkbox"><input type="checkbox" data-rule-field="allDay" ${allDay ? 'checked' : ''}>Весь день</label><div class="bth-fields bth-fields-3" data-rule-time><label>З<input type="time" data-rule-field="start" value="${escapeHtml(rule.start || '09:00')}"></label><label>До<input type="time" data-rule-field="end" value="${escapeHtml(rule.end || '18:00')}"></label><label>Сценарій<select data-rule-field="scenarioName">${scenarioOptions(scenarioItems, rule.scenarioName)}</select></label></div><div class="bth-days">${SCHEDULE_DAYS.map(day => `<label class="bth-checkbox"><input type="checkbox" data-rule-day="${day.value}" ${days.includes(day.value) ? 'checked' : ''}>${day.label}</label>`).join('')}</div></div>`;
  }

  function renderScheduleCard(item = {}, context = {}) {
    const numbers = context.gsmNumberItems || [];
    return `<div class="bth-object bth-schedule-card" data-schedule-card><div class="bth-object-head"><b>Графік</b><button type="button" data-remove>×</button></div><div class="bth-fields"><label>Назва графіка<input data-schedule-field="name" value="${escapeHtml(item.name || '')}"></label><label>Режим<select data-schedule-field="mode"><option value="always" ${item.mode === 'always' ? 'selected' : ''}>24/7</option><option value="custom" ${item.mode !== 'always' ? 'selected' : ''}>За розкладом</option></select></label></div><div data-schedule-custom><div data-schedule-rules>${(item.rules || []).map(rule => renderScheduleRule(rule, context.scenarioItems)).join('')}</div><button class="bth-add" type="button" data-add-schedule-rule>+ Додати правило</button></div><label><span data-schedule-scenario-label>Сценарій для решти часу</span><select data-schedule-field="fallbackScenarioName">${scenarioOptions(context.scenarioItems, item.fallbackScenarioName)}</select></label><label>Вхідні номери</label><div class="bth-days" data-schedule-numbers>${numbers.map(number => `<label class="bth-checkbox"><input type="checkbox" data-schedule-number="${escapeHtml(number.number)}" ${normalizeLineList(item.incomingNumbers).includes(clean(number.number)) ? 'checked' : ''}>${escapeHtml([number.number, number.name].filter(Boolean).join(' — '))}</label>`).join('') || '<span>Спочатку додайте номери у блоці 4</span>'}</div></div>`;
  }

  function renderSimpleItem(type, item = {}) {
    if (type === 'endpoint') return `<div class="bth-object" data-item="endpoint"><div class="bth-object-head"><b>Внутрішня лінія</b><button type="button" data-remove>×</button></div><div class="bth-fields"><label>Номер ВЛ<input data-item-field="number" value="${escapeHtml(item.number || '')}" placeholder="901"></label><label class="bth-checkbox"><input type="checkbox" data-item-field="createAccess" ${item.createAccess ? 'checked' : ''}>Створити доступ MyBusiness</label></div><div class="bth-access-fields"><div class="bth-fields bth-fields-3"><label>Ім’я<input data-item-field="accessName" value="${escapeHtml(item.accessName || '')}"></label><label>Email<input data-item-field="email" value="${escapeHtml(item.email || '')}"></label><label>Контактний номер<input data-item-field="mobilePhoneNumber" value="${escapeHtml(item.mobilePhoneNumber || '')}" placeholder="380…"></label></div><label>Роль<select data-item-field="role"><option value="employee" ${item.role !== 'administrator' ? 'selected' : ''}>Співробітник</option><option value="administrator" ${item.role === 'administrator' ? 'selected' : ''}>Адміністратор</option></select></label></div><label>Якщо доступ не створюється — причина<input data-item-field="accessNote" value="${escapeHtml(item.accessNote || '')}" placeholder="Наприклад: email вкаже сам"></label></div>`;
    if (type === 'group') return `<div class="bth-object" data-item="group"><div class="bth-object-head"><b>Група виклику</b><button type="button" data-remove>×</button></div><div class="bth-fields bth-fields-3"><label>Номер групи<input data-item-field="number" value="${escapeHtml(item.number || '')}"></label><label>Назва<input data-item-field="name" value="${escapeHtml(item.name || '')}"></label><label>Внутрішні лінії<input data-item-field="endpoints" value="${escapeHtml(normalizeLineList(item.endpoints).join(', '))}" placeholder="901, 902"></label></div></div>`;
    if (type === 'gsm') return `<div class="bth-object" data-item="gsm"><div class="bth-object-head"><b>Номер</b><button type="button" data-remove>×</button></div><div class="bth-fields bth-fields-3"><label>Номер телефону<input data-item-field="number" value="${escapeHtml(item.number || '')}" placeholder="050…"></label><label>Назва<input data-item-field="name" value="${escapeHtml(item.name || '')}"></label><label>Email<input data-item-field="email" value="${escapeHtml(item.email || '')}" placeholder="Порожньо = noemail"></label></div><div class="bth-fields"><label class="bth-checkbox"><input type="checkbox" data-item-field="createTemporary" ${item.createTemporary ? 'checked' : ''}>Створити тимчасовий номер</label><label class="bth-checkbox"><input type="checkbox" data-item-field="operatorDependency" ${item.operatorDependency ? 'checked' : ''}>Очікується від оператора — лише перевірити наявність</label></div></div>`;
    return `<div class="bth-object" data-item="department"><div class="bth-object-head"><b>Відділ</b><button type="button" data-remove>×</button></div><div class="bth-fields bth-fields-3"><label>Назва відділу<input data-item-field="name" value="${escapeHtml(item.name || '')}"></label><label>Телефонні номери<input data-item-field="phoneNumbers" value="${escapeHtml(normalizeLineList(item.phoneNumbers).join(', '))}"></label><label>Внутрішні лінії<input data-item-field="endpoints" value="${escapeHtml(normalizeLineList(item.endpoints).join(', '))}"></label></div></div>`;
  }

  function describeScenarioAction(action) {
    if (action.type === 'voice') return `голосове ${action.voiceKey}`;
    const targetLabel = action.type === 'endpoint' ? 'ВЛ' : 'група';
    return `${targetLabel} ${action.target}, таймаут ${action.timeout} с`;
  }

  function getScenarioSpecs(draft) {
    if (Array.isArray(draft.scenarioItems) && draft.scenarioItems.length) {
      return draft.scenarioItems.map((item, index) => ({
        key: clean(item.key) || `scenario-${index + 1}`,
        name: clean(item.name),
        isOffHours: item.type === 'offHours' ? '1' : '0',
        feedbackName: clean(item.feedbackName),
        actions: Array.isArray(item.actions) ? item.actions : [],
      })).filter(item => item.name || item.actions.length);
    }
    return [
      {
        key: 'working',
        name: clean(draft.workingScenarioName),
        isOffHours: '0',
        actions: getScenarioActions(draft.workingScenarioActions),
      },
      {
        key: 'nonWorking',
        name: clean(draft.nonWorkingScenarioName),
        isOffHours: '1',
        actions: getScenarioActions(draft.nonWorkingScenarioActions),
      },
    ].filter(item => item.name || item.actions.length);
  }

  function getScheduleSpecs(draft) {
    if (Array.isArray(draft.scheduleItems) && draft.scheduleItems.length) {
      return draft.scheduleItems.map((item, index) => {
        const configured = (item.rules || []).filter(rule => clean(rule.scenarioName));
        const rules = item.mode === 'always'
          ? [{ rule: 'Все другое время', scenarioName: clean(configured[0]?.scenarioName || item.fallbackScenarioName) }]
          : [
            ...configured.map(rule => ({ rule: clean(rule.rule || makeScheduleRuleString(rule)), scenarioName: clean(rule.scenarioName) })),
            ...(clean(item.fallbackScenarioName) ? [{ rule: 'Все другое время', scenarioName: clean(item.fallbackScenarioName) }] : []),
          ];
        return { key: `schedule-${index + 1}`, name: clean(item.name), rules, incomingNumbers: normalizeLineList(item.incomingNumbers) };
      }).filter(item => item.name || item.rules.length || item.incomingNumbers.length);
    }
    if (!clean(draft.scheduleName)) return [];
    return [{ key: 'schedule-1', name: clean(draft.scheduleName), rules: [
      { rule: clean(draft.scheduleRule), scenarioName: clean(draft.workingScenarioName) },
      { rule: 'Все другое время', scenarioName: clean(draft.nonWorkingScenarioName) },
    ].filter(item => item.rule && item.scenarioName), incomingNumbers: normalizeLineList(draft.incomingNumber) }];
  }

  async function ensurePanelContext(draft) {
    const companyId = clean(draft.companyId || getCompanyIdFromUrl());
    const projectId = clean(draft.projectId || getProjectIdFromUrl());
    if (!companyId) throw new Error('Вкажи Panel ID / companyID.');

    const currentCompany = getCompanyIdFromUrl();
    const currentProject = getProjectIdFromUrl();

    if (currentCompany === companyId && (!projectId || isProjectAgnosticModule() || currentProject === projectId)) {
      saveDraft({ companyId, projectId });
      saveFlow({ stage: 'externalDependencies', index: 0 });
      await runAutomaticFlow();
      return;
    }

    if (projectId && currentCompany === companyId && currentProject && currentProject !== projectId) {
      log(`В URL відкритий інший showProjectID: ${currentProject}. Відкриваю потрібний проєкт ${projectId}.`, 'info');
    }

    saveDraft({ companyId, projectId });
    log(projectId ? `Відкриваю проєкт ${projectId} компанії ${companyId}.` : `Відкриваю компанію ${companyId}.`, 'info');
    window.location.href = projectId ? buildPanelUrl(CONFIG.pbxSchemeModule) : buildPbxSchemeUrl(companyId);
  }

  function assertCurrentProjectContext(draft, flow) {
    if (!flow || flow.stage === 'context') return;

    const companyId = clean(draft.companyId);
    const projectId = clean(draft.projectId);
    const currentCompany = getCompanyIdFromUrl();
    const currentProject = getProjectIdFromUrl();

    if (!currentCompany && !currentProject) return;

    if (currentCompany !== companyId || (projectId && !isProjectAgnosticModule() && currentProject !== projectId)) {
      clearFlow();
      throw new Error(`Скрипт зупинено: відкрита інша компанія або проєкт. Очікувалось companyID ${companyId}, showProjectID ${projectId}; зараз companyID ${currentCompany || '—'}, showProjectID ${currentProject || '—'}.`);
    }
  }

  async function verifyExternalDependencies() {
    const draft = loadDraft();
    const requiredNumbers = normalizeLineList(draft.externallyProvisionedNumbers);

    if (!requiredNumbers.length) {
      saveFlow({ stage: draft.skipCompanyParams ? 'endpoints' : 'company', index: 0 });
      await runAutomaticFlow();
      return;
    }

    if (getModule() !== CONFIG.gsmPortsModule) {
      log('Перевіряю номери, які має додати оператор.', 'info');
      window.location.href = buildPanelUrl(CONFIG.gsmPortsModule);
      return;
    }

    const missing = requiredNumbers.filter(number => !visibleRowExistsByTarget(number));
    if (missing.length) {
      throw new Error(
        `Запуск зупинено до внесення змін: оператор ще не додав номер ${missing.join(', ')}. ` +
        'Шапку компанії та блоки ТЗ не змінено. Після появи номера запусти цей самий пресет повторно.'
      );
    }

    log(`Зовнішні номери знайдено: ${requiredNumbers.join(', ')}.`, 'success');
    saveFlow({ stage: draft.skipCompanyParams ? 'endpoints' : 'company', index: 0 });
    await runAutomaticFlow();
  }
