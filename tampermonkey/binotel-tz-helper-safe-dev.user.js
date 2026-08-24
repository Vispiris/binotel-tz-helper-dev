// ==UserScript==
// @name         Binotel TZ helper SAFE DEV
// @namespace    http://tampermonkey.net/
// @version      0.15.2-dev
// @description  Конструктор та безпечний виконавець ТЗ Binotel
// @author       Codex
// @updateURL    https://raw.githubusercontent.com/Vispiris/binotel-tz-helper-dev/main/tampermonkey/binotel-tz-helper-safe-dev.user.js
// @downloadURL  https://raw.githubusercontent.com/Vispiris/binotel-tz-helper-dev/main/tampermonkey/binotel-tz-helper-safe-dev.user.js
// @match        https://panel.binotel.com/*
// @match        https://docs.google.com/spreadsheets/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      docs.google.com
// @connect      googleusercontent.com
// @noframes
// ==/UserScript==
(function () {
  'use strict';

  const SCRIPT_VERSION = '0.15.2-dev';

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
      schedule.rules.forEach(rule => {
        if (!scenarioNames.has(rule.scenarioName)) throw new Error(`Графік "${schedule.name}": сценарій "${rule.scenarioName || '—'}" не знайдено у конструкторі.`);
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
  async function applyCompanyParams() {
    const draft = loadDraft();

    if (draft.skipCompanyParams) {
      log('Шапку та параметри компанії пропущено за умовою ТЗ.', 'info');
      saveFlow({ stage: 'endpoints', index: 0 });
      await runAutomaticFlow();
      return;
    }

    if (getModule() !== CONFIG.companyParamsModule) {
      log('Відкриваю параметри компанії.', 'info');
      window.location.href = buildPanelUrl(CONFIG.companyParamsModule);
      return;
    }

    const sipNumber = assertSipServerIsAllowed();
    log(`SIP сервер перевірено: ${sipNumber}.`, 'success');
    assertSipServerMatchesRegion(sipNumber, draft);

    const tzUrlField =
      findInputByLabel('Адрес технического задания') ||
      findInputByLabel('Адрес технічного завдання') ||
      getField('input[name*="technical" i], input[name*="tz" i], input[name*="task" i]');
    setFieldValue(tzUrlField, draft.tzUrl);

    const tariffField =
      findInputByLabel('Пакет') ||
      findInputByLabel('Тариф') ||
      findInputByLabel('Package') ||
      getField('select[name*="package" i], select[name*="tariff" i]');
    const tariffSelect =
      tariffField && tariffField.tagName === 'SELECT'
        ? tariffField
        : findSelectByOptionText(draft.tariff);
    if (tariffSelect) {
      const changed = setSelectValue(tariffSelect, draft.tariff);
      log(changed ? `Пакет встановлено: ${draft.tariff}.` : `Не знайшов пакет у списку: ${draft.tariff}.`, changed ? 'success' : 'warn');
    } else {
      log('Не знайшов поле "Пакет/Тариф".', 'warn');
    }

    const languageField =
      findInputByLabel('Язык в MyBusiness') ||
      findInputByLabel('Мова в MyBusiness') ||
      getField('select[name*="language" i], select[name*="lang" i]');
    if (languageField && languageField.tagName === 'SELECT') setSelectValue(languageField, draft.language);

    const timezoneField =
      findInputByLabel('Часовой пояс') ||
      findInputByLabel('Часовий пояс') ||
      getField('select[name*="timezone" i], select[name*="timeZone" i]');
    if (timezoneField && timezoneField.tagName === 'SELECT') setSelectValue(timezoneField, draft.timezone);

    await clickSubmitAndContinue('Параметри компанії збережено.', 'endpoints', 0);
  }

  async function applyEndpoints() {
    const draft = loadDraft();
    const flow = loadFlow() || {};
    const index = Number(flow.index || 0);
    const requestedLines = (draft.endpointRows || []).map(item => clean(item.number)).filter(Boolean);

    if (!requestedLines.length) {
      saveFlow({ stage: 'ringGroups', index: 0 });
      await runAutomaticFlow();
      return;
    }

    const invalidLines = requestedLines.filter(line => !isValidEndpointNumber(line));
    if (invalidLines.length) throw new Error(`Некоректні ВЛ: ${[...new Set(invalidLines)].join(', ')}. Мінімальний номер — 100, початкові нулі заборонені.`);
    if (index >= requestedLines.length) {
      saveFlow({ stage: 'ringGroups', index: 0, endpointAction: '' });
      await runAutomaticFlow();
      return;
    }

    if (getModule() !== CONFIG.endpointsModule) {
      log('Відкриваю внутрішні лінії.', 'info');
      window.location.href = buildPanelUrl(CONFIG.endpointsModule);
      return;
    }

    const line = requestedLines[index];
    const isEditPage = getParams().get('action') === 'edit';

    if (!isEditPage) {
      const rows = $all('tr').filter(row => textMatchesTarget(row.textContent, line));
      const inTargetProject = rows.some(row => $all('a[href]', row).some(link => {
        const url = new URL(link.href, location.href);
        return url.searchParams.get('module') === CONFIG.endpointsModule &&
          url.searchParams.get('action') === 'edit' &&
          url.searchParams.get('showProjectID') === clean(draft.projectId);
      }));

      if (inTargetProject) {
        log(`ВЛ ${line} вже існує саме у проєкті ${draft.projectId} — перевірено, пропускаю.`, 'success');
        saveFlow({ stage: 'endpoints', index: index + 1, endpointAction: '' });
        await runAutomaticFlow();
        return;
      }

      saveFlow({ stage: 'endpoints', index, endpointAction: 'create' });
      log(`Створюю ВЛ ${line} окремою формою у проєкті ${draft.projectId}.`, 'info');
      window.location.href = buildPanelUrl(CONFIG.endpointsModule, 'edit');
      return;
    }

    if (flow.endpointAction !== 'create') {
      window.location.href = buildPanelUrl(CONFIG.endpointsModule);
      return;
    }

    const numberField = getVisibleField('input[name="internalNumber"]');
    const projectField = getVisibleField('select[name="projectID"]');
    if (!numberField) throw new Error(`Не знайшов поле internalNumber для ВЛ ${line}.`);
    if (!setFieldValue(numberField, line)) throw new Error(`Не зміг заповнити ВЛ ${line}.`);
    if (projectField && !setSelectValue(projectField, clean(draft.projectId))) {
      throw new Error(`Не зміг вибрати проєкт ${draft.projectId} для ВЛ ${line}.`);
    }

    saveFlow({ stage: 'endpoints', index: index + 1, endpointAction: '' });
    log(`Зберігаю ВЛ ${line} у проєкті ${draft.projectId}.`, 'info');
    if (!clickSubmitNear(numberField, ['Сохранить', 'Зберегти'])) {
      throw new Error(`Не знайшов кнопку збереження ВЛ ${line}.`);
    }
  }
  function findRingGroupEditButton(groupNumber) {
    const rows = $all('tr');
    const target = clean(groupNumber);

    for (const row of rows) {
      if (!clean(row.textContent).includes(target)) continue;
      const edit =
        row.querySelector('a[href*="action=edit"], a[href*="edit"], .glyphicon-wrench, .icon-edit, button, a');
      if (edit) return edit;
    }

    return null;
  }

  function findEditButtonByRowText(targetText) {
    const target = clean(targetText);
    if (!target) return null;

    const rows = $all('tr');
    for (const row of rows) {
      if (!clean(row.textContent).includes(target)) continue;
      const edit =
        row.querySelector('a[href*="action=edit"], a[href*="edit"], .glyphicon-wrench, .icon-edit, button, a');
      if (edit) return edit;
    }

    return null;
  }

  function visibleRowExistsByTarget(targetText) {
    return $all('tr, label')
      .filter(visibleElement)
      .some(item => textMatchesTarget(item.textContent, targetText));
  }

  function visibleRowExistsByName(targetText) {
    const target = clean(targetText).toLowerCase();
    if (!target) return false;

    return $all('tr')
      .filter(visibleElement)
      .some(item => clean(item.textContent).toLowerCase().includes(target));
  }

  async function waitForVisibleRows(timeoutMs = 4000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if ($all('tr').filter(visibleElement).length > 1) return true;
      await sleep(250);
    }
    return false;
  }

  function textMatchesTarget(text, targetText) {
    const target = clean(targetText);
    if (!target) return false;

    const source = clean(text);
    if (!source) return false;

    const targetDigits = digitsOnly(target);
    const sourceDigits = digitsOnly(source);

    if (/^\d+$/.test(target)) {
      const exactNumber = new RegExp(`(^|\\D)${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\D|$)`);
      if (exactNumber.test(source)) return true;

      // Для телефонних номерів панель часто ставить пробіли: 0670000000 -> 067 000 00 00.
      return targetDigits.length >= 7 && sourceDigits.includes(targetDigits);
    }

    return source.toLowerCase().includes(target.toLowerCase());
  }

  function ringGroupExists(groupNumber, groupName) {
    const number = clean(groupNumber);
    const name = clean(groupName).toLowerCase();

    return $all('tr')
      .filter(visibleElement)
      .some(row => {
        const text = clean(row.textContent);
        const lower = text.toLowerCase();
        return (
          (number && textMatchesTarget(text, number)) ||
          (name && lower.includes(name))
        );
      });
  }

  function findCheckboxByTarget(targetText) {
    const candidates = [
      ...$all('label'),
      ...$all('tr'),
      ...$all('li'),
      ...$all('div'),
    ]
      .filter(visibleElement)
      .map(element => ({
        element,
        checkbox: element.querySelector('input[type="checkbox"]'),
        text: clean(element.textContent),
      }))
      .filter(item => item.checkbox && visibleElement(item.checkbox) && textMatchesTarget(item.text, targetText))
      .sort((a, b) => a.text.length - b.text.length);

    return candidates[0] ? candidates[0].checkbox : null;
  }

  function setCheckboxByExactText(targetText, checked = true) {
    const checkbox = findCheckboxByTarget(targetText);
    if (!checkbox) return false;

    if (checkbox.checked !== checked) checkbox.click();
    return true;
  }

  function setEndpointCheckboxByLine(lineNumber, checked = true) {
    const checkbox = findCheckboxByTarget(lineNumber);
    if (!checkbox) return false;

    if (checkbox.checked !== checked) {
      checkbox.click();
    }

    return true;
  }

  function selectOptionByTextOrValue(targetText) {
    const target = clean(targetText);
    if (!target) return false;

    for (const select of $all('select')) {
      if (!visibleField(select) || select.disabled) continue;

      const options = Array.from(select.options || []);
      const option = options.find(item =>
        textMatchesTarget(item.textContent, target) ||
        textMatchesTarget(item.value, target)
      );

      if (!option) continue;

      if (select.multiple) {
        option.selected = true;
      } else {
        select.value = option.value;
      }

      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    return false;
  }

  function selectTargetOnPage(targetText) {
    return setCheckboxByExactText(targetText, true) || selectOptionByTextOrValue(targetText);
  }

  async function applyRingGroups() {
    const draft = loadDraft();
    const rows = getRingGroupItems(draft.ringGroupsRows);
    const flow = loadFlow() || {};
    const index = Number(flow.index || 0);

    if (!rows.length || index >= rows.length) {
      saveFlow({ stage: 'gsmNumbers', index: 0, ringGroupAction: '' });
      await runAutomaticFlow();
      return;
    }

    const row = rows[index];
    const groupNumber = clean(row.number);
    const groupName = clean(row.name);
    const lines = normalizeLineList(row.endpointLines);

    if (!groupNumber || !groupName) {
      throw new Error('Формат групи має бути: номер, назва, лінії. Нова група відділяється пустим рядком.');
    }

    const params = getParams();
    const isEditPage = getModule() === CONFIG.ringGroupsModule && params.get('action') === 'edit';

    if (getModule() !== CONFIG.ringGroupsModule) {
      log('Відкриваю групи виклику.', 'info');
      window.location.href = buildPanelUrl(CONFIG.ringGroupsModule);
      return;
    }

    if (isEditPage && flow.ringGroupAction !== 'create') {
      log(`Сторінка додавання групи відкрита без перевірки списку. Повертаюсь до списку, щоб не створити дубль групи ${groupNumber}.`, 'warn');
      window.location.href = buildPanelUrl(CONFIG.ringGroupsModule);
      return;
    }

    if (!isEditPage) {
      await waitForVisibleRows(5000);

      const existence = getRingGroupExistence(groupNumber, groupName, draft.projectId);
      if (existence.inTargetProject) {
        log(`Група ${groupNumber} / "${groupName}" вже існує у потрібному проєкті — пропускаю створення.`, 'success');
        saveFlow({ stage: 'ringGroups', index: index + 1, ringGroupAction: '' });
        await runAutomaticFlow();
        return;
      }

      if (existence.exists) {
        throw new Error(`Номер або назва групи ${groupNumber} / "${groupName}" уже зайняті в іншому проєкті. Потрібен інший номер; автоматична заміна заборонена.`);
      }

      log(`Створюю нову групу ${groupNumber}.`, 'info');
      saveFlow({ stage: 'ringGroups', index, ringGroupAction: 'create' });
      window.location.href = buildPanelUrl(CONFIG.ringGroupsModule, 'edit');
      return;
    }

    setFieldValue(getField('input[name="number"], #ringGroupNumber'), groupNumber);
    setFieldValue(getField('input[name="name"]'), groupName);
    const projectField = getVisibleField('select[name="projectID"]');
    if (projectField && !setSelectValue(projectField, clean(draft.projectId))) {
      throw new Error(`Не зміг вибрати проєкт ${draft.projectId} для групи ${groupNumber}.`);
    }

    const missing = [];
    const selected = [];
    lines.forEach(line => {
      if (setEndpointCheckboxByLine(line, true)) {
        selected.push(line);
      } else {
        missing.push(line);
      }
    });

    if (selected.length) {
      log(`Для групи ${groupNumber} вибрано ВЛ: ${selected.join(', ')}`, 'success');
    }

    if (missing.length) {
      log(`Не знайшов ВЛ для групи ${groupNumber}: ${missing.join(', ')}`, 'warn');
    }

    const clicked = clickButtonByText(['Сохранить', 'Зберегти', 'Добавить', 'Додати']);
    if (!clicked) throw new Error('Не знайшов кнопку збереження/додавання групи.');

    saveFlow({ stage: 'ringGroups', index: index + 1, ringGroupAction: '' });
    log(`Група ${groupNumber} збережена.`, 'success');
    await sleep(1200);
    await continueAfterRingGroupSave_();
  }

  async function continueAfterRingGroupSave_() {
    await runAutomaticFlow();
  }

  function getVisibleWritableFields() {
    return $all('input[type="text"], input:not([type]), input[type="email"], textarea')
      .filter(visibleField)
      .filter(field => !field.disabled && !field.readOnly);
  }

  async function applyGsmNumbers() {
    const draft = loadDraft();
    const rows = getDraftGsmNumberItems(draft);
    const flow = loadFlow() || {};
    const index = Number(flow.index || 0);

    if (!rows.length || index >= rows.length) {
      saveFlow({ stage: 'departments', index: 0 });
      await runAutomaticFlow();
      return;
    }

    const item = rows[index];
    if (!item.number) throw new Error('У блоці номерів не вказано номер.');

    if (getModule() !== CONFIG.gsmPortsModule) {
      log('Відкриваю GSM порти.', 'info');
      window.location.href = buildPanelUrl(CONFIG.gsmPortsModule);
      return;
    }

    const isEditPage = getParams().get('action') === 'edit';

    if (!isEditPage) {
      if (visibleRowExistsByTarget(item.number)) {
        log(`GSM номер ${item.number} вже існує — повторно не створюю.`, 'success');
        if (item.createTemporary && !getTemporaryMap()[item.number]) {
          saveFlow({ stage: 'gsmTemporaryOpen', index, pendingRealNumber: item.number });
        } else {
          saveFlow({ stage: 'gsmNumbers', index: index + 1 });
        }
        await runAutomaticFlow();
        return;
      }

      if (!clickButtonByText(['Додати', 'Добавить'])) {
        throw new Error('Не знайшов кнопку додавання GSM номера.');
      }

      log(`Відкриваю форму додавання GSM номера ${item.number}.`, 'info');
      return;
    }

    const gsmForm =
      getFormWithField('input[name="number"]') ||
      getFormWithField('select[name="server"]') ||
      document;
    const visibleFields = getVisibleWritableFields().filter(field => !field.closest('form') || field.closest('form') === gsmForm);
    const numberField =
      getVisibleField('input[name="number"]', gsmForm) ||
      getVisibleField('input[name*="phone" i]', gsmForm) ||
      visibleFields[0];

    if (!numberField || numberField.disabled || numberField.readOnly) {
      throw new Error(`Форма GSM номера відкрита, але не знайшов активне поле "Номер" для ${item.number}.`);
    }

    const nameField =
      getVisibleField('input[name="name"]', gsmForm) ||
      getVisibleField('input[name*="title" i]', gsmForm) ||
      visibleFields.find(field => field !== numberField && /name|title|назв/i.test(field.name || field.id || field.placeholder || '')) ||
      visibleFields.find(field => field !== numberField);
    const emailField =
      getVisibleField('input[name="email"]', gsmForm) ||
      getVisibleField('input[type="email"], input[name*="email" i]', gsmForm) ||
      visibleFields.find(field => /mail|email|почт|пошт/i.test(field.name || field.id || field.placeholder || ''));
    const serverField =
      getVisibleField('select[name="server"]', gsmForm) ||
      getVisibleField('select[name*="server" i]', gsmForm);

    if (!setFieldValue(numberField, item.number)) {
      throw new Error(`Не зміг заповнити номер GSM: ${item.number}.`);
    }
    if (item.name) {
      setFieldValue(nameField, item.name);
    }
    setFieldValue(emailField, clean(item.email) || 'noemail');

    if (serverField && serverField.tagName === 'SELECT') {
      const serverChanged = setSelectValue(serverField, 'rgsm0');
      log(serverChanged ? 'GSM сервер встановлено: rgsm0.' : 'Не знайшов rgsm0 у списку GSM серверів.', serverChanged ? 'success' : 'warn');
    } else {
      log('Не знайшов поле GSM сервера. Перевір, чи rgsm0 виставився автоматично.', 'warn');
    }

    const nextStage = item.createTemporary ? 'gsmTemporaryOpen' : 'gsmNumbers';
    const nextIndex = item.createTemporary ? index : index + 1;

    saveFlow({
      stage: nextStage,
      index: nextIndex,
      pendingRealNumber: item.number,
      temporaryBefore: collectTemporaryNumbersFromPage(),
    });

    log(`Додаю GSM номер ${item.number}.`, 'info');
    if (!clickSubmitNear(numberField, ['Зберегти', 'Сохранить', 'Додати', 'Добавить'])) {
      throw new Error('Не знайшов кнопку збереження GSM номера.');
    }

    return;
  }

  async function applyGsmTemporaryOpen() {
    const flow = loadFlow() || {};
    const realNumber = clean(flow.pendingRealNumber);

    if (!realNumber) {
      saveFlow({ stage: 'gsmNumbers', index: Number(flow.index || 0) + 1 });
      await runAutomaticFlow();
      return;
    }

    if (getModule() !== CONFIG.pbxNumbersEnhancedModule) {
      log(`Відкриваю розширені телефонні номери для тимчасового номера до ${realNumber}.`, 'info');
      window.location.href = buildPanelUrl(CONFIG.pbxNumbersEnhancedModule);
      return;
    }

    const before = collectTemporaryNumbersFromPage();
    saveFlow({
      stage: 'gsmTemporaryFind',
      index: Number(flow.index || 0),
      pendingRealNumber: realNumber,
      temporaryBefore: before,
    });

    if (!clickButtonByTextWithTemporaryConfirm(['Добавить временный номер для ВАТС', 'Добавить временный', 'Додати тимчасовий', 'тимчасовий номер'])) {
      log(`Не знайшов кнопку тимчасового номера для ${realNumber}. Йду далі без мапи тимчасового.`, 'warn');
      saveFlow({ stage: 'gsmNumbers', index: Number(flow.index || 0) + 1 });
      await runAutomaticFlow();
      return;
    }

    log(`Створюю тимчасовий номер для ${realNumber}.`, 'info');
    await sleep(1800);
    await runAutomaticFlow();
  }

  async function applyGsmTemporaryFind() {
    const flow = loadFlow() || {};
    const realNumber = clean(flow.pendingRealNumber);
    const before = Array.isArray(flow.temporaryBefore) ? flow.temporaryBefore : [];

    if (getModule() !== CONFIG.pbxNumbersEnhancedModule) {
      window.location.href = buildPanelUrl(CONFIG.pbxNumbersEnhancedModule);
      return;
    }

    const after = collectTemporaryNumbersFromPage();
    const created = after.find(number => !before.includes(number));

    if (created) {
      rememberTemporaryNumber(realNumber, created);
      log(`Запам’ятав тимчасовий номер: ${realNumber} → ${created}.`, 'success');
    } else {
      log(`Не зміг визначити новий тимчасовий номер для ${realNumber}. У відділ додам тільки основний номер.`, 'warn');
    }

    saveFlow({
      stage: 'gsmNumbers',
      index: Number(flow.index || 0) + 1,
      pendingRealNumber: '',
      temporaryBefore: [],
    });
    await runAutomaticFlow();
  }

  async function applyDepartments() {
    const draft = loadDraft();
    const rows = getDepartmentItems(draft.departmentsRows);
    const flow = loadFlow() || {};
    const index = Number(flow.index || 0);

    if (!rows.length || index >= rows.length) {
      saveFlow({ stage: 'voiceMessages', index: 0 });
      await runAutomaticFlow();
      return;
    }

    const department = rows[index];
    const params = getParams();
    const isEditPage = getModule() === CONFIG.departmentsModule && params.get('action') === 'edit';

    if (getModule() !== CONFIG.departmentsModule) {
      log('Відкриваю відділи.', 'info');
      window.location.href = buildPanelUrl(CONFIG.departmentsModule);
      return;
    }

    if (!isEditPage) {
      if (visibleRowExistsByName(department.name)) {
        log(`Відділ "${department.name}" вже існує — пропускаю створення.`, 'warn');
        saveFlow({ stage: 'departments', index: index + 1 });
        await runAutomaticFlow();
        return;
      }

      log(`Створюю відділ "${department.name}".`, 'info');
      window.location.href = buildPanelUrl(CONFIG.departmentsModule, 'edit');
      return;
    }

    setFieldValue(
      getVisibleField('input[name="name"], input[name*="title" i]') ||
      findInputByLabel('Назва') ||
      findInputByLabel('Название') ||
      findInputByLabel('Name'),
      department.name
    );

    const targets = [
      ...department.phoneNumbers,
      ...department.endpoints,
    ].map(clean).filter(Boolean);

    const missing = [];
    const selected = [];
    targets.forEach(target => {
      if (selectTargetOnPage(target)) {
        selected.push(target);
      } else {
        missing.push(target);
      }
    });

    if (selected.length) log(`Для відділу "${department.name}" вибрано: ${selected.join(', ')}`, 'success');
    if (missing.length) log(`Не знайшов для відділу "${department.name}": ${missing.join(', ')}`, 'warn');

    await clickSubmitAndContinue(`Відділ "${department.name}" збережено.`, 'departments', index + 1);
  }

  function getRingGroupExistence(groupNumber, groupName, projectId) {
    const number = clean(groupNumber);
    const name = clean(groupName).toLowerCase();
    const rows = $all('tr').filter(visibleElement).filter(row => {
      const text = clean(row.textContent);
      return (number && textMatchesTarget(text, number)) || (name && text.toLowerCase().includes(name));
    });
    const inTargetProject = rows.some(row => $all('a[href]', row).some(link => {
      const url = new URL(link.href, location.href);
      return url.searchParams.get('module') === CONFIG.ringGroupsModule &&
        url.searchParams.get('action') === 'edit' &&
        url.searchParams.get('showProjectID') === clean(projectId);
    }));
    return { exists: rows.length > 0, inTargetProject };
  }

  function standardVoiceMessageExists(item) {
    const pathKey = item.path.split('/').pop();
    return $all('tr, a[href]')
      .filter(visibleElement)
      .some(element => {
        const href = element.getAttribute && element.getAttribute('href') || '';
        const text = normalize(element.textContent || '');
        return href.includes(pathKey) || text.includes(normalize(item.label));
      });
  }

  async function applyStandardVoiceMessages() {
    const draft = loadDraft();
    const keys = normalizeLineList(draft.standardVoiceMessages);
    const flow = loadFlow() || {};
    const index = Number(flow.index || 0);

    if (!keys.length || index >= keys.length) {
      saveFlow({ stage: 'feedback', index: 0, feedbackAction: 'enable' });
      await runAutomaticFlow();
      return;
    }

    if (getModule() !== CONFIG.voiceMessagesModule) {
      log('Відкриваю голосові повідомлення.', 'info');
      window.location.href = buildPanelUrl(CONFIG.voiceMessagesModule);
      return;
    }

    const key = keys[index];
    const item = STANDARD_UA_VOICE[key];
    if (!item) throw new Error(`Невідомий стандартний голосовий файл: ${key}.`);

    if (standardVoiceMessageExists(item)) {
      log(`Голосове повідомлення вже є: ${item.label}.`, 'success');
      saveFlow({ stage: 'voiceMessages', index: index + 1 });
      await runAutomaticFlow();
      return;
    }

    saveFlow({ stage: 'voiceMessages', index: index + 1 });
    const url = new URL(buildPanelUrl(CONFIG.voiceMessagesModule));
    url.searchParams.set('action', 'addStandardFile');
    url.searchParams.set('filePath', item.path);
    log(`Додаю готовий український файл: ${item.label}.`, 'info');
    window.location.href = url.toString();
  }
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
  function getNamedLinkEntry(name, action, projectId) {
    const target = clean(name).toLowerCase();
    const candidates = [];
    $all('a[href*="module=routes"][href*="routeID"]').forEach(link => {
      const url = new URL(link.href, location.href);
      if (url.searchParams.get('action') !== action) return;
      const row = link.closest('tr');
      if (!row) return;
      const exactNameCell = Array.from(row.cells || [])
        .some(cell => clean(cell.textContent).toLowerCase() === target);
      if (exactNameCell) candidates.push({ link, url, text: clean(row.textContent) });
    });
    const uniqueById = Array.from(new Map(candidates.map(item => [item.url.searchParams.get('routeID'), item])).values());
    const inProject = uniqueById.filter(item => item.url.searchParams.get('showProjectID') === clean(projectId));
    return {
      exactProject: inProject[0] || null,
      exactProjectCount: inProject.length,
      any: uniqueById[0] || null,
    };
  }

  function selectTargetInSelect(select, target) {
    if (!select) return false;
    const option = Array.from(select.options || []).find(item =>
      textMatchesTarget(item.textContent, target) || textMatchesTarget(item.value, target)
    );
    if (!option) return false;
    select.value = option.value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function selectNamedOption(select, target) {
    if (!select) return false;
    const normalizedTarget = normalize(target);
    const options = Array.from(select.options || []);
    const option = options.find(item => normalize(item.textContent) === normalizedTarget) ||
      options.find(item => normalize(item.textContent).startsWith(`${normalizedTarget} -`));
    if (!option) return false;
    select.value = option.value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function getRuleFieldByName(name) {
    return $all('[name^="rules["]').find(field => field.name === name) || null;
  }

  function getNewRuleField(beforeNames, suffix) {
    return $all(`[name^="rules["][name$="[${suffix}]"]`)
      .find(field => !beforeNames.has(field.name)) || null;
  }

  function addScenarioActionToForm(action) {
    const beforeNames = new Set($all('[name^="rules["]').map(field => field.name));
    const triggerId = action.type === 'voice'
      ? 'addPlayBack'
      : action.type === 'endpoint'
        ? 'addExten'
        : 'addSmartRingGroup';
    const trigger = $(`#${triggerId}`);
    if (!trigger) throw new Error(`Не знайшов кнопку дії #${triggerId}.`);
    trigger.click();

    const suffix = action.type === 'voice'
      ? 'playback'
      : action.type === 'endpoint'
        ? 'ext'
        : 'smartRingGroup';
    const field = getNewRuleField(beforeNames, suffix);
    if (!field) throw new Error(`Панель не додала поле ${suffix}.`);

    if (action.type === 'voice') {
      const voice = STANDARD_UA_VOICE[action.voiceKey];
      if (!voice || !setSelectValue(field, voice.path)) {
        throw new Error(`У сценарії немає готового голосового ${action.voiceKey}.`);
      }
      return;
    }

    if (!selectTargetInSelect(field, action.target)) {
      throw new Error(`У сценарії не знайдено ${action.type === 'endpoint' ? 'ВЛ' : 'групу'} ${action.target}.`);
    }
    const prefix = field.name.slice(0, field.name.lastIndexOf('['));
    const timeoutField = getRuleFieldByName(`${prefix}[timeout]`);
    if (!timeoutField || !setFieldValue(timeoutField, action.timeout)) {
      throw new Error(`Не знайшов таймаут для ${action.type} ${action.target}.`);
    }
  }

  function readScenarioActionsFromForm() {
    return $all('[name^="rules["]').filter(field =>
      /\[(playback|ext|smartRingGroup)\]$/.test(field.name)
    ).map(field => {
      const prefix = field.name.slice(0, field.name.lastIndexOf('['));
      const timeout = clean(getFieldValue(getRuleFieldByName(`${prefix}[timeout]`)));
      if (field.name.endsWith('[playback]')) {
        const key = Object.keys(STANDARD_UA_VOICE).find(item => STANDARD_UA_VOICE[item].path === field.value) || field.value;
        return { type: 'voice', voiceKey: key };
      }
      const type = field.name.endsWith('[ext]') ? 'endpoint' : 'ringGroup';
      return { type, target: clean(field.selectedOptions?.[0]?.textContent || field.value), timeout };
    });
  }

  function assertScenarioFormMatches(spec) {
    if (clean(getFieldValue(getField('#routeName, input[name="name"]'))) !== spec.name) {
      throw new Error(`Перевірка сценарію "${spec.name}": назва не збігається.`);
    }
    if (clean(getFieldValue(getField('select[name="projectID"]'))).split(' ')[0] !== clean(loadDraft().projectId)) {
      throw new Error(`Перевірка сценарію "${spec.name}": інший проєкт.`);
    }
    if (clean(getField('select[name="isOffHours"]')?.value) !== spec.isOffHours) {
      throw new Error(`Перевірка сценарію "${spec.name}": невірний тип робочого часу.`);
    }

    const feedbackField = getField('select[name="reviewStructureID"]');
    const feedbackName = clean(feedbackField?.selectedOptions?.[0]?.textContent);
    if (spec.feedbackName && normalize(feedbackName) !== normalize(spec.feedbackName)) {
      throw new Error(`Перевірка сценарію "${spec.name}": очікується Feedback "${spec.feedbackName}", знайдено "${feedbackName || 'не вибрано'}".`);
    }
    if (!spec.feedbackName && clean(feedbackField?.value) !== '0') {
      throw new Error(`Перевірка сценарію "${spec.name}": Feedback не передбачений ТЗ, але у формі вибрано "${feedbackName}".`);
    }

    const actual = readScenarioActionsFromForm();
    if (actual.length !== spec.actions.length) {
      throw new Error(`Перевірка сценарію "${spec.name}": очікується ${spec.actions.length} дій, знайдено ${actual.length}.`);
    }
    spec.actions.forEach((expected, index) => {
      const found = actual[index];
      if (expected.type !== found.type) throw new Error(`Сценарій "${spec.name}", дія ${index + 1}: невірний тип.`);
      if (expected.type === 'voice' && expected.voiceKey !== found.voiceKey) {
        throw new Error(`Сценарій "${spec.name}", дія ${index + 1}: невірне голосове.`);
      }
      if (expected.type !== 'voice' && (!textMatchesTarget(found.target, expected.target) || clean(found.timeout) !== clean(expected.timeout))) {
        throw new Error(`Сценарій "${spec.name}", дія ${index + 1}: невірна ціль або таймаут.`);
      }
    });
  }

  async function applyScenarios() {
    const draft = loadDraft();
    const specs = getScenarioSpecs(draft);
    const flow = loadFlow() || {};
    const index = Number(flow.index || 0);

    if (!specs.length || index >= specs.length) {
      saveFlow({ stage: 'schedule', index: 0, scheduleIndex: 0, scheduleAction: '' });
      await runAutomaticFlow();
      return;
    }

    const spec = specs[index];
    const params = getParams();
    const isEdit = getModule() === CONFIG.routesModule && params.get('action') === 'edit';
    if (getModule() !== CONFIG.routesModule || (!isEdit && params.get('action'))) {
      window.location.href = buildPanelUrl(CONFIG.routesModule);
      return;
    }

    if (!isEdit) {
      const entry = getNamedLinkEntry(spec.name, 'edit', draft.projectId);
      if (entry.exactProjectCount > 1) {
        throw new Error(`Знайдено ${entry.exactProjectCount} сценаріїв "${spec.name}" у цільовому проєкті. Спочатку потрібно прибрати дублікати.`);
      }
      if (entry.exactProject) {
        saveFlow({ stage: 'scenarios', index, scenarioAction: 'verify' });
        window.location.href = entry.exactProject.url.toString();
        return;
      }
      if (flow.scenarioAction === 'verifyAfterCreate') {
        throw new Error(`Після створення сценарій "${spec.name}" не знайдено у списку. Повторне створення заборонене.`);
      }
      if (entry.any) throw new Error(`Сценарій "${spec.name}" уже є в іншому проєкті компанії.`);
      saveFlow({ stage: 'scenarios', index, scenarioAction: 'create' });
      window.location.href = buildPanelUrl(CONFIG.routesModule, 'edit');
      return;
    }

    if (flow.scenarioAction === 'verify') {
      assertScenarioFormMatches(spec);
      const routeIds = { ...(flow.routeIds || {}) };
      routeIds[spec.key] = clean(params.get('routeID'));
      log(`Сценарій "${spec.name}" повністю перевірено: ${spec.actions.length} дій.`, 'success');
      saveFlow({ stage: 'scenarios', index: index + 1, scenarioAction: '', routeIds });
      window.location.href = buildPanelUrl(CONFIG.routesModule);
      return;
    }

    if (flow.scenarioAction !== 'create') {
      window.location.href = buildPanelUrl(CONFIG.routesModule);
      return;
    }

    const nameField = getVisibleField('#routeName, input[name="name"]');
    const projectField = getVisibleField('select[name="projectID"]');
    const offHoursField = getVisibleField('select[name="isOffHours"]');
    if (!nameField || !projectField || !offHoursField) throw new Error('Форма сценарію неповна: не знайдено назву, проєкт або робочий час.');
    setFieldValue(nameField, spec.name);
    if (!setSelectValue(projectField, draft.projectId)) throw new Error(`Не зміг вибрати проєкт ${draft.projectId} у сценарії.`);
    if (!setSelectValue(offHoursField, spec.isOffHours)) throw new Error(`Не зміг вибрати робочий тип сценарію ${spec.name}.`);

    const feedbackField = getField('select[name="reviewStructureID"]');
    if (spec.feedbackName) {
      const feedbackSwitch = $('#feedbackSwitch');
      if (!feedbackSwitch || !feedbackField) throw new Error(`Сценарій "${spec.name}": не знайдено вкладку або поле Feedback.`);
      feedbackSwitch.click();
      if (!selectNamedOption(feedbackField, spec.feedbackName)) {
        throw new Error(`Сценарій "${spec.name}": у панелі не знайдено Feedback-об’єкт "${spec.feedbackName}".`);
      }
    } else if (feedbackField && !setSelectValue(feedbackField, '0')) {
      throw new Error(`Сценарій "${spec.name}": не вдалося вимкнути Feedback.`);
    }

    [...spec.actions].reverse().forEach(addScenarioActionToForm);
    assertScenarioFormMatches(spec);
    const form = nameField.closest('form');
    const submit = form && $('button[type="submit"].btn-success, button[type="submit"]', form);
    if (!submit) throw new Error(`Не знайшов кнопку збереження сценарію "${spec.name}".`);
    saveFlow({ stage: 'scenarios', index, scenarioAction: 'verifyAfterCreate' });
    log(`Зберігаю сценарій "${spec.name}" із ${spec.actions.length} діями.`, 'info');
    submit.click();
  }

  function getScheduleRuleKeys() {
    return $all('input[name^="rules["][name$="[rule]"]').map(field => ({
      key: field.name.slice(6, field.name.indexOf(']')),
      ruleField: field,
    }));
  }

  function removeScheduleRule(key) {
    const field = getRuleFieldByName(`rules[${key}][rule]`);
    let container = field;
    for (let depth = 0; depth < 8 && container; depth += 1, container = container.parentElement) {
      const deleteButton = $('.delExten', container);
      const routeField = getRuleFieldByName(`rules[${key}][routeID]`);
      if (deleteButton && routeField && container.contains(routeField)) {
        deleteButton.click();
        return true;
      }
    }
    return false;
  }

  function configureScheduleRule(key, rule, scenarioName) {
    const ruleField = getRuleFieldByName(`rules[${key}][rule]`);
    const routeField = getRuleFieldByName(`rules[${key}][routeID]`);
    if (!ruleField || !routeField) throw new Error(`Не знайдено поля правила графіка ${key}.`);
    setFieldValue(ruleField, rule);
    if (!selectNamedOption(routeField, scenarioName)) throw new Error(`У графіку не знайдено сценарій "${scenarioName}".`);
  }

  function assertScheduleFormMatches(spec) {
    const nameField = getVisibleField('#routeName, input[name="name"]');
    if (nameField && clean(nameField.value) !== clean(spec.name)) {
      throw new Error(`Перевірка графіка "${spec.name}": назва не збігається.`);
    }
    const keys = getScheduleRuleKeys();
    if (keys.length !== spec.rules.length) throw new Error(`Перевірка графіка "${spec.name}": очікується ${spec.rules.length} правил, знайдено ${keys.length}.`);
    const expected = spec.rules.map(item => ({ rule: clean(item.rule), route: clean(item.scenarioName) }));
    expected.forEach((item, index) => {
      const key = keys[index].key;
      const rule = clean(getRuleFieldByName(`rules[${key}][rule]`)?.value);
      const route = clean(getRuleFieldByName(`rules[${key}][routeID]`)?.selectedOptions?.[0]?.textContent);
      if (rule !== item.rule || !route.toLowerCase().includes(item.route.toLowerCase())) {
        throw new Error(`Перевірка графіка: правило ${index + 1} не відповідає ТЗ.`);
      }
    });
  }

  async function applySchedule() {
    const draft = loadDraft();
    const flow = loadFlow() || {};
    const specs = getScheduleSpecs(draft);
    const scheduleIndex = Number(flow.scheduleIndex || 0);
    if (!specs.length || scheduleIndex >= specs.length) {
      saveFlow({ stage: 'manualRouteGate', index: 0 });
      await runAutomaticFlow();
      return;
    }
    const spec = specs[scheduleIndex];
    const params = getParams();
    const isEdit = getModule() === CONFIG.routesModule && params.get('action') === 'editWithTime';
    if (getModule() !== CONFIG.routesModule || (!isEdit && params.get('action'))) {
      window.location.href = buildPanelUrl(CONFIG.routesModule);
      return;
    }
    if (!isEdit) {
      const entry = getNamedLinkEntry(spec.name, 'editWithTime', draft.projectId);
      if (entry.exactProjectCount > 1) {
        throw new Error(`Знайдено ${entry.exactProjectCount} графіків "${spec.name}" у цільовому проєкті.`);
      }
      if (entry.exactProject) {
        saveFlow({ stage: 'schedule', scheduleIndex, scheduleAction: 'verify' });
        window.location.href = entry.exactProject.url.toString();
        return;
      }
      if (flow.scheduleAction === 'verifyAfterCreate') {
        throw new Error(`Після створення графік "${spec.name}" не знайдено. Повторне створення заборонене.`);
      }
      if (entry.any) throw new Error(`Графік "${spec.name}" уже є в іншому проєкті.`);
      saveFlow({ stage: 'schedule', scheduleIndex, scheduleAction: 'create' });
      window.location.href = buildPanelUrl(CONFIG.routesModule, 'editWithTime');
      return;
    }
    if (flow.scheduleAction === 'verify') {
      assertScheduleFormMatches(spec);
      log(`Графік "${spec.name}" повністю перевірено.`, 'success');
      saveFlow({ stage: 'bindIncomingNumber', scheduleIndex, incomingIndex: 0, scheduleId: clean(params.get('routeID')), scheduleAction: '', numberBindAction: '' });
      window.location.href = buildPanelUrl(CONFIG.pbxNumbersModule);
      return;
    }
    if (flow.scheduleAction !== 'create') {
      window.location.href = buildPanelUrl(CONFIG.routesModule);
      return;
    }

    const nameField = getVisibleField('#routeName, input[name="name"]');
    const projectField = getVisibleField('select[name="projectID"]');
    if (!nameField || !projectField) throw new Error('Форма графіка неповна.');
    setFieldValue(nameField, spec.name);
    if (!setSelectValue(projectField, draft.projectId)) throw new Error(`Не зміг вибрати проєкт ${draft.projectId} у графіку.`);
    const keys = getScheduleRuleKeys();
    if (keys.length < spec.rules.length) throw new Error(`У формі графіка недостатньо правил: потрібно ${spec.rules.length}, доступно ${keys.length}.`);
    spec.rules.forEach((rule, index) => configureScheduleRule(keys[index].key, rule.rule, rule.scenarioName));
    keys.slice(spec.rules.length).reverse().forEach(item => {
      if (!removeScheduleRule(item.key)) throw new Error(`Не зміг видалити зайве правило графіка ${item.key}.`);
    });
    assertScheduleFormMatches(spec);
    const form = nameField.closest('form');
    const submit = form && $('button[type="submit"].btn-success, button[type="submit"]', form);
    if (!submit) throw new Error('Не знайшов кнопку збереження графіка.');
    saveFlow({ stage: 'schedule', scheduleIndex, scheduleAction: 'verifyAfterCreate' });
    log(`Зберігаю графік "${spec.name}".`, 'info');
    submit.click();
  }

  function findPbxNumberEntry(number, projectId) {
    const rows = $all('tr').filter(row => textMatchesTarget(row.textContent, number));
    const exact = rows.map(row => $all('a[href*="module=pbxNumbers"][href*="action=edit"]', row))
      .flat()
      .map(link => ({ link, url: new URL(link.href, location.href) }))
      .find(item => item.url.searchParams.get('showProjectID') === clean(projectId));
    return { exact: exact || null, existsElsewhere: rows.length > 0 && !exact };
  }

  async function bindIncomingNumber() {
    const draft = loadDraft();
    const flow = loadFlow() || {};
    const specs = getScheduleSpecs(draft);
    const scheduleIndex = Number(flow.scheduleIndex || 0);
    if (!specs.length || scheduleIndex >= specs.length) {
      saveFlow({ stage: 'manualRouteGate', index: 0 });
      await runAutomaticFlow();
      return;
    }
    const spec = specs[scheduleIndex];
    const incomingIndex = Number(flow.incomingIndex || 0);
    if (incomingIndex >= spec.incomingNumbers.length) {
      saveFlow({ stage: 'schedule', scheduleIndex: scheduleIndex + 1, incomingIndex: 0, scheduleAction: '', numberBindAction: '' });
      window.location.href = buildPanelUrl(CONFIG.routesModule);
      return;
    }
    const number = clean(spec.incomingNumbers[incomingIndex]);
    const params = getParams();
    const isEdit = getModule() === CONFIG.pbxNumbersModule && params.get('action') === 'edit';
    if (getModule() !== CONFIG.pbxNumbersModule) {
      window.location.href = buildPanelUrl(CONFIG.pbxNumbersModule);
      return;
    }
    if (!isEdit) {
      const entry = findPbxNumberEntry(number, draft.projectId);
      if (!entry.exact) {
        throw new Error(entry.existsElsewhere
          ? `Номер ${number} знайдено тільки в іншому проєкті.`
          : `Номер ${number} не знайдено для прив’язки графіка.`);
      }
      saveFlow({ stage: 'bindIncomingNumber', scheduleIndex, incomingIndex, numberBindAction: flow.numberBindAction === 'verifyAfterSave' ? 'verify' : 'edit' });
      window.location.href = entry.exact.url.toString();
      return;
    }
    const numberField = getVisibleField('input[name="number"]');
    const routeField = getVisibleField('select[name="route"]');
    if (!numberField || !routeField || !textMatchesTarget(numberField.value, number)) {
      throw new Error(`Форма номера ${number} не пройшла перевірку.`);
    }
    const selectedRoute = clean(routeField.selectedOptions?.[0]?.textContent);
    if (flow.numberBindAction === 'verify' || flow.numberBindAction === 'verifyAfterSave') {
      if (!selectedRoute.toLowerCase().includes(clean(spec.name).toLowerCase())) {
        throw new Error(`Номер ${number} не прив’язаний до графіка "${spec.name}".`);
      }
      log(`Номер ${number} прив’язано до графіка "${spec.name}" і перевірено.`, 'success');
      saveFlow({ stage: 'bindIncomingNumber', scheduleIndex, incomingIndex: incomingIndex + 1, numberBindAction: '' });
      window.location.href = buildPanelUrl(CONFIG.pbxNumbersModule);
      return;
    }
    if (!selectNamedOption(routeField, spec.name)) {
      throw new Error(`У номері ${number} не знайдено графік "${spec.name}".`);
    }
    const form = routeField.closest('form');
    const submit = form && $('button[type="submit"], input[type="submit"]', form);
    if (!submit) throw new Error(`Не знайшов кнопку збереження номера ${number}.`);
    saveFlow({ stage: 'bindIncomingNumber', scheduleIndex, incomingIndex, numberBindAction: 'verifyAfterSave' });
    log(`Прив’язую номер ${number} до графіка "${spec.name}".`, 'info');
    submit.click();
  }

  function stopAtVerifiedRouteGate() {
    const draft = loadDraft();
    const flow = loadFlow() || {};
    clearFlow();
    const accessTasks = (draft.endpointRows || []).filter(item => item.createAccess).map(item => `• Доступ MyBusiness: ${clean(item.accessName) || 'без імені'}, ${clean(item.email) || 'без email'}, ВЛ ${clean(item.number)}, телефон ${clean(item.mobilePhoneNumber) || 'не вказано'}.`);
    const accessNotes = (draft.endpointRows || []).filter(item => !item.createAccess && clean(item.accessNote)).map(item => `• ВЛ ${clean(item.number)} — доступ не створено: ${clean(item.accessNote)}.`);
    const failures = Object.entries(flow.failedBlocks || {}).map(([id, reason]) => `• ПОМИЛКА, блок ${TZ_BLOCKS.find(item => item.id === id)?.number || id}: ${reason}`);
    const skipped = (flow.skippedBlocks || []).map(item => `• ПРОПУЩЕНО, блок ${TZ_BLOCKS.find(block => block.id === item.id)?.number || item.id}: ${item.reason}`);
    const message = [
      'Автоматичні блоки завершено.',
      'ВИКОНАТИ ВРУЧНУ:',
      `• Вихідні маршрути: ${clean(draft.manualRouteInstructions) || 'перевірити блок 6 ТЗ та налаштувати маршрути вручну.'}`,
      ...accessTasks,
      ...accessNotes,
      ...(draft.block11Enabled && !getBlockState(draft, 'block11').ignored ? ['Блок 11 BinSMS поки також потрібно виконати вручну: автоматичний виконавець ще не підключений.'] : []),
      '• Блоки 9, 10 і 12 перевірити вручну.',
      ...failures,
      ...skipped,
    ].join('\n');
    log(message, 'warn');
    showCenterAlert(message, 'warn');
  }
  function getStageBlockId(stage) {
    if (stage === 'company') return 'company';
    if (stage === 'endpoints') return 'endpoints';
    if (stage === 'ringGroups') return 'ringGroups';
    if (['gsmNumbers', 'gsmTemporaryOpen', 'gsmTemporaryFind'].includes(stage)) return 'gsmNumbers';
    if (stage === 'departments') return 'departments';
    if (stage === 'voiceMessages') return 'voiceMessages';
    if (stage === 'feedback') return 'feedback';
    if (['scenarios', 'schedule', 'bindIncomingNumber'].includes(stage)) return 'scenarios';
    if (stage === 'manualRouteGate') return '';
    return '';
  }

  function getNextStageAfterBlock(blockId) {
    return {
      company: 'endpoints', endpoints: 'ringGroups', ringGroups: 'gsmNumbers',
      gsmNumbers: 'departments', departments: 'voiceMessages', voiceMessages: 'feedback',
      feedback: 'scenarios',
      scenarios: 'manualRouteGate',
    }[blockId] || 'complete';
  }

  function getBlockSkipReason(draft, flow, blockId) {
    if (!blockId) return '';
    if (getBlockState(draft, blockId).ignored) return 'інженер позначив блок «Ігнорувати»';
    const block = TZ_BLOCKS.find(item => item.id === blockId);
    const failed = flow.failedBlocks || {};
    const dependencies = [...(block?.dependsOn || [])];
    if (blockId === 'scenarios') {
      const actionTypes = new Set(getScenarioSpecs(draft).flatMap(item => item.actions.map(action => action.type)));
      if (actionTypes.has('endpoint')) dependencies.push('endpoints');
      if (actionTypes.has('ringGroup')) dependencies.push('ringGroups');
      if (actionTypes.has('voice')) dependencies.push('voiceMessages');
      if (getScenarioSpecs(draft).some(item => clean(item.feedbackName))) dependencies.push('feedback');
    }
    const dependency = [...new Set(dependencies)].find(id => getBlockState(draft, id).ignored || failed[id]);
    if (dependency) return `не виконана залежність «${TZ_BLOCKS.find(item => item.id === dependency)?.title || dependency}»`;
    return '';
  }

  function finishExecution(flow) {
    clearFlow();
    const failed = Object.entries(flow.failedBlocks || {});
    const skipped = flow.skippedBlocks || [];
    const lines = ['Виконання завершено.', failed.length ? 'Помилки:' : 'Помилок немає.'];
    failed.forEach(([id, message]) => lines.push(`• Блок ${TZ_BLOCKS.find(item => item.id === id)?.number || id}: ${message}`));
    if (skipped.length) {
      lines.push('Пропущено:');
      skipped.forEach(item => lines.push(`• Блок ${TZ_BLOCKS.find(block => block.id === item.id)?.number || item.id}: ${item.reason}`));
    }
    lines.push('Блоки 9, 10 і 12: перевіряє інженер вручну.');
    const message = lines.join('\n');
    log(message, failed.length ? 'warn' : 'success');
    showCenterAlert(message, failed.length ? 'warn' : 'success');
  }

  async function runAutomaticFlow() {
    if (stopRequested) {
      clearFlow();
      log('Виконання зупинено.', 'warn');
      return;
    }

    const draft = loadDraft();
    validateDraft(draft);
    const flow = saveFlow(loadFlow() || { stage: 'context', index: 0 });
    assertCurrentProjectContext(draft, flow);

    if (flow.stage === 'context') return ensurePanelContext(draft);
    if (flow.stage === 'externalDependencies') return verifyExternalDependencies();

    const blockId = getStageBlockId(flow.stage);
    const skipReason = getBlockSkipReason(draft, flow, blockId);
    if (skipReason) {
      const skippedBlocks = [...(flow.skippedBlocks || [])];
      if (!skippedBlocks.some(item => item.id === blockId)) skippedBlocks.push({ id: blockId, reason: skipReason });
      const nextStage = getNextStageAfterBlock(blockId);
      const nextFlow = saveFlow({ stage: nextStage, index: 0, skippedBlocks });
      log(`Блок ${TZ_BLOCKS.find(item => item.id === blockId)?.number}: пропущено — ${skipReason}.`, 'warn');
      if (nextStage === 'complete') return finishExecution(nextFlow);
      return runAutomaticFlow();
    }

    try {
      if (flow.stage === 'company') return await applyCompanyParams();
      if (flow.stage === 'endpoints') return await applyEndpoints();
      if (flow.stage === 'ringGroups') return await applyRingGroups();
      if (flow.stage === 'gsmNumbers') return await applyGsmNumbers();
      if (flow.stage === 'gsmTemporaryOpen') return await applyGsmTemporaryOpen();
      if (flow.stage === 'gsmTemporaryFind') return await applyGsmTemporaryFind();
      if (flow.stage === 'departments') return await applyDepartments();
      if (flow.stage === 'voiceMessages') return await applyStandardVoiceMessages();
      if (flow.stage === 'feedback') return await applyFeedback();
      if (flow.stage === 'scenarios') return await applyScenarios();
      if (flow.stage === 'schedule') return await applySchedule();
      if (flow.stage === 'bindIncomingNumber') return await bindIncomingNumber();
      if (flow.stage === 'manualRouteGate') return stopAtVerifiedRouteGate();
      return finishExecution(flow);
    } catch (error) {
      if (!blockId) throw error;
      const failedBlocks = { ...(flow.failedBlocks || {}), [blockId]: error.message || String(error) };
      const nextStage = getNextStageAfterBlock(blockId);
      const nextFlow = saveFlow({ stage: nextStage, index: 0, failedBlocks });
      log(`Блок ${TZ_BLOCKS.find(item => item.id === blockId)?.number} впав: ${failedBlocks[blockId]}. Переходжу до незалежних блоків.`, 'error');
      if (nextStage === 'complete') return finishExecution(nextFlow);
      return runAutomaticFlow();
    }
  }
  function loadDeleteFlow() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.deleteFlowStorageKey) || 'null');
    } catch (error) {
      return null;
    }
  }

  function saveDeleteFlow(value) {
    localStorage.setItem(CONFIG.deleteFlowStorageKey, JSON.stringify(value));
  }

  function clearDeleteFlow() {
    localStorage.removeItem(CONFIG.deleteFlowStorageKey);
  }

  function getSafeDeleteCandidate() {
    const params = getParams();
    const module = getModule();
    const companyId = getCompanyIdFromUrl();
    const projectId = getProjectIdFromUrl();
    const draft = loadDraft();
    const expectedCompanyId = clean(draft.contextCompanyId || draft.companyId);
    const expectedProjectId = clean(draft.contextProjectId || draft.projectId);

    const action = params.get('action');
    if (
      !['delete', 'deleteWithTime'].includes(action) ||
      !companyId ||
      companyId !== expectedCompanyId ||
      (!isProjectAgnosticModule(module) && (!projectId || (expectedProjectId && projectId !== expectedProjectId)))
    ) {
      return null;
    }

    const form = $all('form').find(item =>
      String(item.method || '').toLowerCase() === 'post' &&
      item.querySelector('#deleteCheck, button[name="delete"], input[name="delete"]')
    );
    if (!form) return null;

    const pageText = clean(document.body ? document.body.textContent : '');

    if (module === CONFIG.endpointsModule) {
      const entityId = clean(params.get('endpointID'));
      const number = clean(params.get('extNumber'));
      if (!/^\d+$/.test(entityId) || !/^\d+$/.test(number)) return null;
      if (!normalize(pageText).includes(normalize(`внутренний номер ${number}`))) return null;

      return {
        module,
        type: 'endpoint',
        entityId,
        number,
        label: `ВЛ ${number} / endpointID ${entityId}`,
        form,
      };
    }

    if (module === CONFIG.ringGroupsModule) {
      const entityId = clean(params.get('ringGroupID'));
      const name = clean(params.get('groupName'));
      if (!/^\d+$/.test(entityId) || !name) return null;
      if (!normalize(pageText).includes(normalize(name))) return null;

      return {
        module,
        type: 'ringGroup',
        entityId,
        name,
        label: `група ${name} / ringGroupID ${entityId}`,
        form,
      };
    }

    if (module === CONFIG.routesModule) {
      const entityId = clean(params.get('routeID'));
      const name = clean(params.get('routeName'));
      if (!/^\d+$/.test(entityId) || !name) return null;
      if (!normalize(pageText).includes(normalize(name))) return null;
      const type = action === 'deleteWithTime' || /временн|часов|графік|график/i.test(pageText)
        ? 'schedule'
        : 'scenario';
      return {
        module,
        type,
        entityId,
        name,
        label: `${type === 'schedule' ? 'графік' : 'сценарій'} ${name} / routeID ${entityId}`,
        form,
        requiresNativeConfirm: true,
        originalControl: form.querySelector('#deleteCheck, button[name="delete"], input[name="delete"]'),
      };
    }

    return null;
  }

  function makeDeleteFlowRecord(candidate) {
    return {
      active: true,
      module: candidate.module,
      type: candidate.type,
      entityId: candidate.entityId,
      number: candidate.number || '',
      name: candidate.name || '',
      label: candidate.label,
      companyId: getCompanyIdFromUrl(),
      projectId: getProjectIdFromUrl(),
      startedAt: new Date().toISOString(),
    };
  }

  function entityExistsOnCurrentList(flow) {
    const idParam = flow.type === 'endpoint'
      ? 'endpointID'
      : flow.type === 'ringGroup'
        ? 'ringGroupID'
        : 'routeID';
    return $all('a[href]').some(link => {
      try {
        const url = new URL(link.href, location.href);
        return url.searchParams.get(idParam) === flow.entityId;
      } catch (error) {
        return false;
      }
    });
  }

  function verifyPendingDeleteResult() {
    const flow = loadDeleteFlow();
    if (!flow || !flow.active) return;

    if (
      getCompanyIdFromUrl() !== clean(flow.companyId) ||
      (clean(flow.projectId) && getProjectIdFromUrl() !== clean(flow.projectId)) ||
      getModule() !== flow.module
    ) {
      return;
    }

    const params = getParams();
    if (['delete', 'deleteWithTime'].includes(params.get('action'))) return;

    if (params.get('status') !== 'deletedSuccess') {
      setStatus(`Не отримано deletedSuccess після видалення: ${flow.label}.`, 'warn');
      return;
    }

    if (entityExistsOnCurrentList(flow)) {
      setStatus(`Панель повернула deletedSuccess, але об’єкт ще знайдений: ${flow.label}.`, 'error');
      return;
    }

    clearDeleteFlow();
    log(`Видалено та перевірено: ${flow.label}.`, 'success');
  }

  function executeSafeDelete(candidate) {
    const current = getSafeDeleteCandidate();
    if (
      !current ||
      current.module !== candidate.module ||
      current.type !== candidate.type ||
      current.entityId !== candidate.entityId
    ) {
      throw new Error('Сторінка або об’єкт змінилися. Видалення зупинено.');
    }

    let submitMarker = $('input[data-bth-safe-delete="1"]', current.form);
    if (!submitMarker) {
      submitMarker = document.createElement('input');
      submitMarker.type = 'hidden';
      submitMarker.name = 'delete';
      submitMarker.value = '1';
      submitMarker.dataset.bthSafeDelete = '1';
      current.form.appendChild(submitMarker);
    }

    saveDeleteFlow(makeDeleteFlowRecord(current));
    log(`Відправляю безпечне видалення: ${current.label}.`, 'warn');
    if (current.requiresNativeConfirm) {
      if (!current.originalControl) throw new Error('Не знайшов штатну кнопку видалення для системного підтвердження.');
      log('Зараз панель покаже верхнє системне підтвердження — натисни OK.', 'warn');
      current.originalControl.click();
      return;
    }
    HTMLFormElement.prototype.submit.call(current.form);
  }

  function showSafeDeleteConfirm(candidate) {
    renderStyles();

    let alert = $(`#${CONFIG.alertId}`);
    if (!alert) {
      alert = document.createElement('div');
      alert.id = CONFIG.alertId;
      document.body.appendChild(alert);
    }

    alert.dataset.type = 'delete';
    alert.innerHTML = `
      <div class="bth-alert-card">
        <div class="bth-alert-title">Безпечне видалення</div>
        <div class="bth-alert-text">Буде видалено: ${escapeHtml(candidate.label)}\n\nКонтекст відкритої сторінки: companyID ${escapeHtml(getCompanyIdFromUrl())} / projectID ${escapeHtml(getProjectIdFromUrl() || 'без проєкту')}.</div>
        <div class="bth-alert-actions">
          <button class="bth-alert-cancel" type="button">Скасувати</button>
          <button class="bth-alert-delete" type="button">Видалити</button>
        </div>
      </div>
    `;

    $('.bth-alert-cancel', alert).addEventListener('click', () => {
      alert.classList.remove('open');
    });

    $('.bth-alert-delete', alert).addEventListener('click', () => {
      const button = $('.bth-alert-delete', alert);
      button.disabled = true;
      button.textContent = 'Видаляю…';
      try {
        executeSafeDelete(candidate);
      } catch (error) {
        alert.classList.remove('open');
        const message = error.message || String(error);
        log(message, 'error');
        showCenterAlert(message, 'error');
      }
    });

    alert.classList.add('open');
  }

  function makeDraggable(panel, handle) {
    let startX = 0;
    let startY = 0;
    let startRight = 0;
    let startTop = 0;

    handle.addEventListener('mousedown', event => {
      if (event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      startX = event.clientX;
      startY = event.clientY;
      startRight = window.innerWidth - rect.right;
      startTop = rect.top;

      const onMove = moveEvent => {
        panel.style.right = `${Math.max(0, startRight - (moveEvent.clientX - startX))}px`;
        panel.style.top = `${Math.max(0, startTop + (moveEvent.clientY - startY))}px`;
        panel.style.bottom = 'auto';
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const moved = panel.getBoundingClientRect();
        localStorage.setItem(CONFIG.positionStorageKey, JSON.stringify({
          right: Math.max(0, window.innerWidth - moved.right),
          top: Math.max(0, moved.top),
        }));
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function renderStyles() {
    if ($(`#${CONFIG.panelId}-styles`)) return;
    const style = document.createElement('style');
    style.id = `${CONFIG.panelId}-styles`;
    style.textContent = `
      #${CONFIG.panelId}{position:fixed;right:18px;bottom:18px;width:310px;z-index:2147483600;background:#fff;border:2px solid #0f766e;border-radius:12px;box-shadow:0 12px 35px #0004;font:14px/1.4 Arial,sans-serif;color:#172033}
      #${CONFIG.panelId}.collapsed .bth-body{display:none}
      #${CONFIG.panelId} .bth-head{display:flex;justify-content:space-between;align-items:center;background:#0f766e;color:#fff;padding:10px 12px;border-radius:9px 9px 0 0;font-weight:700;cursor:move}
      #${CONFIG.panelId} button{cursor:pointer}
      #${CONFIG.panelId} .bth-toggle{border:0;background:#fff;color:#0f766e;border-radius:5px;min-width:26px}
      #${CONFIG.panelId} .bth-body{padding:12px}
      #${CONFIG.panelId} .bth-main{width:100%;border:0;border-radius:7px;background:#0f766e;color:#fff;padding:10px;font-weight:700}
      #${CONFIG.panelId} .bth-safe-delete{display:none;width:100%;margin-top:8px;border:0;border-radius:7px;background:#b91c1c;color:#fff;padding:10px;font-weight:800}
      #${CONFIG.panelId} .bth-safe-delete.open{display:block}
      #${CONFIG.panelId} .bth-status{margin-top:9px;padding:8px;border-radius:6px;background:#ecfeff;font-size:12px;white-space:pre-wrap}
      #${CONFIG.panelId} .bth-status[data-type="warn"]{background:#fff7ed;color:#9a3412}
      #${CONFIG.panelId} .bth-status[data-type="error"]{background:#fef2f2;color:#991b1b}
      #${CONFIG.panelId} .bth-status[data-type="success"]{background:#ecfdf5;color:#166534}
      #${CONFIG.modalId}{display:none;position:fixed;inset:3vh 3vw;z-index:2147483601;background:#f8fafc;border:2px solid #0f766e;border-radius:14px;box-shadow:0 20px 80px #0007;font:14px/1.4 Arial,sans-serif;color:#172033;overflow:hidden}
      #${CONFIG.modalId}.open{display:flex;flex-direction:column}
      #${CONFIG.modalId} .bth-modal-head{display:flex;justify-content:space-between;align-items:center;background:#0f766e;color:#fff;padding:12px 16px}
      #${CONFIG.modalId} .bth-modal-head h2{margin:0;font-size:20px}
      #${CONFIG.modalId} .bth-close{border:0;background:#fff;color:#0f766e;border-radius:6px;font-size:22px;min-width:34px}
      #${CONFIG.modalId} .bth-content{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:14px;overflow:auto}
      #${CONFIG.modalId} .bth-card{background:#fff;border:1px solid #cbd5e1;border-radius:9px;padding:12px}
      #${CONFIG.modalId} .bth-wide{grid-column:1/-1}
      #${CONFIG.modalId} .bth-card h3{margin:0 0 10px;font-size:16px}
      #${CONFIG.modalId} .bth-block-head{display:flex;justify-content:space-between;gap:10px;align-items:center}
      #${CONFIG.modalId} .bth-block-head h3{margin:0}
      #${CONFIG.modalId} .bth-badge{border-radius:999px;padding:3px 8px;font-size:11px;font-weight:800;white-space:nowrap}
      #${CONFIG.modalId} .bth-badge.ready{background:#dcfce7;color:#166534}
      #${CONFIG.modalId} .bth-badge.issue{background:#ffedd5;color:#9a3412}
      #${CONFIG.modalId} .bth-badge.ignored{background:#e2e8f0;color:#475569}
      #${CONFIG.modalId} .bth-issue{margin:8px 0;padding:8px;border-radius:6px;background:#fff7ed;color:#9a3412}
      #${CONFIG.modalId} label{display:block;font-weight:700;margin:8px 0 4px}
      #${CONFIG.modalId} input:not([type="checkbox"]),#${CONFIG.modalId} select,#${CONFIG.modalId} textarea{box-sizing:border-box;width:100%;border:1px solid #94a3b8;border-radius:6px;padding:7px;background:#fff;color:#172033}
      #${CONFIG.modalId} textarea{min-height:108px;resize:vertical;font-family:Consolas,monospace}
      #${CONFIG.modalId} .bth-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      #${CONFIG.modalId} .bth-item{display:grid;grid-template-columns:minmax(0,1fr) 34px;gap:6px;align-items:center;margin:6px 0;padding:7px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px}
      #${CONFIG.modalId} .bth-item-2{grid-template-columns:1fr 1fr 34px}
      #${CONFIG.modalId} .bth-item-3{grid-template-columns:1fr 1fr 1fr 34px}
      #${CONFIG.modalId} .bth-scenario-action{grid-template-columns:150px minmax(180px,1fr) minmax(140px,1fr) minmax(140px,1fr) 72px 112px}
      #${CONFIG.modalId} .bth-item button,#${CONFIG.modalId} .bth-add{border:1px solid #94a3b8;border-radius:6px;background:#fff;padding:7px;cursor:pointer}
      #${CONFIG.modalId} .bth-item-buttons{display:flex;gap:3px}.bth-item-buttons button{padding:6px!important}
      #${CONFIG.modalId} .bth-object{margin:9px 0;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc}
      #${CONFIG.modalId} .bth-object-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}
      #${CONFIG.modalId} .bth-object-head button{border:1px solid #94a3b8;border-radius:6px;background:#fff;padding:5px 9px}
      #${CONFIG.modalId} .bth-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:end}
      #${CONFIG.modalId} .bth-fields-3{grid-template-columns:repeat(3,minmax(0,1fr))}
      #${CONFIG.modalId} .bth-access-fields{margin-top:8px;padding-top:8px;border-top:1px dashed #cbd5e1}
      #${CONFIG.modalId} .bth-inline-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}
      #${CONFIG.modalId} .bth-inline-actions button{border:0;border-radius:7px;padding:8px 12px;cursor:pointer}
      #${CONFIG.modalId} [data-block].is-ignored{opacity:.62}
      #${CONFIG.modalId} .bth-checkbox{font-weight:500;display:flex;gap:7px;align-items:center}
      #${CONFIG.modalId} .bth-note{margin-top:8px;padding:8px;border-radius:6px;background:#ecfeff;font-size:12px}
      #${CONFIG.modalId} .bth-log{max-height:250px;overflow:auto;font-family:Consolas,monospace;font-size:12px}
      #${CONFIG.modalId} .bth-log-line{padding:4px 0;border-bottom:1px solid #e2e8f0}
      #${CONFIG.modalId} .bth-actions{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;background:#e2e8f0}
      #${CONFIG.modalId} .bth-actions button{border:0;border-radius:7px;padding:9px 14px;cursor:pointer}
      #${CONFIG.modalId} .bth-green{background:#0f766e;color:#fff;font-weight:700}
      #${CONFIG.modalId} .bth-gray{background:#64748b;color:#fff}
      #${CONFIG.alertId}{display:none;position:fixed;inset:0;z-index:2147483646;background:#0009;align-items:center;justify-content:center;padding:24px}
      #${CONFIG.alertId}.open{display:flex}
      #${CONFIG.alertId} .bth-alert-card{max-width:900px;max-height:85vh;overflow:auto;background:#134e4a;color:#fff;border-radius:14px;padding:24px;box-shadow:0 28px 90px #0008}
      #${CONFIG.alertId} .bth-alert-title{font-size:25px;font-weight:900;margin-bottom:12px}
      #${CONFIG.alertId} .bth-alert-text{font-size:16px;line-height:1.45;white-space:pre-wrap}
      #${CONFIG.alertId} .bth-alert-ok{margin-top:18px;border:0;border-radius:7px;background:#fff;color:#134e4a;padding:9px 22px;cursor:pointer}
      #${CONFIG.alertId} .bth-alert-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}
      #${CONFIG.alertId} .bth-alert-actions button{border:0;border-radius:7px;padding:9px 18px;cursor:pointer;font-weight:800}
      #${CONFIG.alertId} .bth-alert-cancel{background:#e2e8f0;color:#172033}
      #${CONFIG.alertId} .bth-alert-delete{background:#dc2626;color:#fff}
      #${CONFIG.alertId} .bth-alert-delete:disabled{opacity:.65;cursor:wait}
      #${CONFIG.stopButtonId}{display:none;position:fixed;left:20px;bottom:20px;z-index:2147483647;border:0;border-radius:9px;background:#b91c1c;color:#fff;padding:13px 20px;font-weight:800}
      @media(max-width:850px){#${CONFIG.modalId} .bth-content{grid-template-columns:1fr}#${CONFIG.modalId} .bth-wide{grid-column:auto}#${CONFIG.modalId} .bth-item,#${CONFIG.modalId} .bth-item-2,#${CONFIG.modalId} .bth-item-3,#${CONFIG.modalId} .bth-scenario-action,#${CONFIG.modalId} .bth-fields,#${CONFIG.modalId} .bth-fields-3{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function renderPanel() {
    if (!isPanelPage()) return;
    rememberUrlContext();
    renderStyles();
    const currentCompanyId = getCompanyIdFromUrl();
    const currentProjectId = getProjectIdFromUrl();

    let panel = $(`#${CONFIG.panelId}`);
    if (panel) return;

    panel = document.createElement('div');
    panel.id = CONFIG.panelId;
    panel.innerHTML = `
      <div class="bth-head">
        <span>🧪 TZ helper SAFE ${SCRIPT_VERSION}</span>
        <button class="bth-toggle" type="button">−</button>
      </div>
      <div class="bth-body">
        <button class="bth-main bth-open-fast" type="button">Фаст ТЗ</button>
        <button class="bth-safe-delete" type="button"></button>
        <div class="bth-status">Відкрита сторінка: companyID ${escapeHtml(currentCompanyId || 'не визначено')} / projectID ${escapeHtml(currentProjectId || 'без проєкту')}.</div>
      </div>
    `;
    document.body.appendChild(panel);

    const savedPosition = JSON.parse(localStorage.getItem(CONFIG.positionStorageKey) || 'null');
    if (savedPosition) {
      panel.style.right = `${savedPosition.right}px`;
      panel.style.top = `${savedPosition.top}px`;
      panel.style.bottom = 'auto';
    }

    makeDraggable(panel, $('.bth-head', panel));
    $('.bth-toggle', panel).addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      $('.bth-toggle', panel).textContent = panel.classList.contains('collapsed') ? '+' : '−';
    });
    $('.bth-open-fast', panel).addEventListener('click', openModal);

    const deleteCandidate = getSafeDeleteCandidate();
    const deleteButton = $('.bth-safe-delete', panel);
    if (deleteCandidate) {
      deleteButton.textContent = `Безпечно видалити: ${deleteCandidate.label}`;
      deleteButton.classList.add('open');
      deleteButton.addEventListener('click', () => showSafeDeleteConfirm(deleteCandidate));
    }
  }

  function collectItemRows(modal, listName) {
    const list = $(`[data-list="${listName}"]`, modal);
    if (!list) return [];
    return $all(':scope > [data-item]', list).map(row => {
      const item = {};
      $all('[data-item-field]', row).forEach(field => { item[field.dataset.itemField] = field.type === 'checkbox' ? field.checked : field.value; });
      return item;
    });
  }

  function collectScenarioRows(modal, listName) {
    const list = $(`[data-list="${listName}"]`, modal);
    if (!list) return [];
    return $all(':scope > .bth-scenario-action', list).map(row => {
      const item = {};
      $all('[data-item-field]', row).forEach(field => { item[field.dataset.itemField] = field.value; });
      return item.type === 'voice'
        ? { type: 'voice', voiceKey: item.voiceKey }
        : { type: item.type, target: item.type === 'endpoint' ? item.endpointTarget : item.ringGroupTarget, timeout: item.timeout };
    });
  }

  function collectScenarioCards(modal) {
    return $all('[data-scenario-card]', modal).map((card, index) => {
      const fields = {};
      $all('[data-scenario-field]', card).forEach(field => { fields[field.dataset.scenarioField] = field.value; });
      const actions = $all(':scope [data-scenario-actions] > .bth-scenario-action', card).map(row => {
        const values = {};
        $all('[data-item-field]', row).forEach(field => { values[field.dataset.itemField] = field.value; });
        return values.type === 'voice' ? { type: 'voice', voiceKey: values.voiceKey } : { type: values.type, target: values.type === 'endpoint' ? values.endpointTarget : values.ringGroupTarget, timeout: values.timeout };
      });
      return { key: card.dataset.scenarioKey || `scenario-${index + 1}`, ...fields, actions };
    });
  }

  function makeScheduleRuleString(rule) {
    const days = normalizeLineList(rule.days).join(',');
    if (rule.allDay) return `*,${days || '*'},*,*`;
    return `${clean(rule.start)}-${clean(rule.end)},${days || '*'},*,*`;
  }

  function collectScheduleCards(modal) {
    return $all('[data-schedule-card]', modal).map(card => {
      const fields = {};
      $all('[data-schedule-field]', card).forEach(field => { fields[field.dataset.scheduleField] = field.value; });
      const rules = $all('[data-schedule-rule]', card).map(rule => {
        const values = {};
        $all('[data-rule-field]', rule).forEach(field => { values[field.dataset.ruleField] = field.value; });
        values.allDay = Boolean($('[data-rule-field="allDay"]', rule)?.checked);
        values.days = $all('[data-rule-day]:checked', rule).map(field => field.dataset.ruleDay);
        values.rule = makeScheduleRuleString(values);
        return values;
      });
      return { ...fields, rules, incomingNumbers: $all('[data-schedule-number]:checked', card).map(field => field.dataset.scheduleNumber) };
    });
  }

  function updateScenarioActionVisibility(row) {
    const type = $('[data-item-field="type"]', row)?.value || 'voice';
    const voice = $('.bth-action-voice-wrap', row);
    const endpoint = $('.bth-action-endpoint-wrap', row);
    const group = $('.bth-action-group-wrap', row);
    const timeout = $('.bth-action-timeout-wrap', row);
    if (voice) voice.style.display = type === 'voice' ? '' : 'none';
    if (endpoint) endpoint.style.display = type === 'endpoint' ? '' : 'none';
    if (group) group.style.display = type === 'ringGroup' ? '' : 'none';
    if (timeout) timeout.style.display = type === 'voice' ? 'none' : '';
  }

  function downloadJsonReport() {
    const payload = {
      generatedAt: new Date().toISOString(),
      draft: loadDraft(),
      logs: readStoredLogs(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `binotel-tz-report-${clean(payload.draft.companyId) || 'company'}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (char === ',' && !quoted) { row.push(cell); cell = ''; continue; }
      if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && text[index + 1] === '\n') index += 1;
        row.push(cell); rows.push(row); row = []; cell = ''; continue;
      }
      cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function getSheetIdentity(url) {
    const match = String(url || '').match(/\/spreadsheets\/d\/([^/]+)/);
    if (!match) throw new Error('Це не посилання на Google Таблицю.');
    const gid = String(url).match(/[?#&]gid=(\d+)/)?.[1] || '0';
    return { id: match[1], gid };
  }

  function getSameOriginSheetCsvUrl(url) {
    const sheet = getSheetIdentity(url);
    return `https://docs.google.com/spreadsheets/d/${sheet.id}/export?format=csv&gid=${sheet.gid}`;
  }

  function requestGoogleSheetCsv(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        anonymous: false,
        onload: response => {
          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`Google повернув HTTP ${response.status}.`));
            return;
          }
          resolve(response.responseText || '');
        },
        onerror: response => reject(new Error(`Не вдалося завантажити повний CSV${response?.status ? `: HTTP ${response.status}` : ''}.`)),
        ontimeout: () => reject(new Error('Google не відповів вчасно.')),
        timeout: 30000,
      });
    });
  }

  async function captureOpenGoogleSheet() {
    const button = document.querySelector('#binotel-tz-sheet-capture button');
    const status = document.querySelector('#binotel-tz-sheet-capture [data-status]');
    if (button) button.disabled = true;
    if (status) status.textContent = 'Зчитую відкритий лист…';
    try {
      const csv = await requestGoogleSheetCsv(getSameOriginSheetCsvUrl(location.href));
      if (/^\s*<!doctype html|^\s*<html/i.test(csv)) throw new Error('Google повернув сторінку входу замість даних листа.');
      const rows = parseCsv(csv).filter(row => row.some(cell => clean(cell)));
      if (!rows.length) throw new Error('Відкритий лист порожній або не прочитався.');
      const payload = {
        url: location.href,
        title: clean(document.title),
        sheetId: getSheetIdentity(location.href).id,
        gid: getSheetIdentity(location.href).gid,
        rows,
        capturedAt: new Date().toISOString(),
      };
      GM_setValue(CONFIG.tzCaptureStorageKey, JSON.stringify(payload));
      if (status) status.textContent = `Збережено: ${rows.length} непорожніх рядків. Тепер відкрий панель Binotel.`;
    } catch (error) {
      if (status) status.textContent = `Помилка: ${error.message || error}`;
    } finally {
      if (button) button.disabled = false;
    }
  }

  function renderGoogleSheetCapture() {
    if (!document.querySelector('#binotel-tz-sheet-capture-style')) {
      const style = GM_addStyle(`
        #binotel-tz-sheet-capture{position:fixed!important;right:18px!important;bottom:18px!important;z-index:2147483647!important;width:330px!important;box-sizing:border-box!important;padding:12px!important;border:2px solid #0f766e!important;border-radius:10px!important;background:#fff!important;color:#172033!important;font:14px/1.35 Arial,sans-serif!important;box-shadow:0 12px 38px #0005!important;display:block!important;visibility:visible!important;opacity:1!important}
        #binotel-tz-sheet-capture button{display:block!important;width:100%!important;margin:9px 0!important;padding:9px!important;border:0!important;border-radius:7px!important;background:#0f766e!important;color:#fff!important;font-weight:700!important;cursor:pointer!important}
        #binotel-tz-sheet-capture button:disabled{opacity:.65!important;cursor:wait!important}
      `);
      if (style) style.id = 'binotel-tz-sheet-capture-style';
    }
    if (document.querySelector('#binotel-tz-sheet-capture')) return;
    const panel = document.createElement('div');
    panel.id = 'binotel-tz-sheet-capture';
    const title = document.createElement('b');
    title.textContent = `Binotel TZ helper ${SCRIPT_VERSION}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Зчитати відкритий лист ТЗ';
    const status = document.createElement('div');
    status.dataset.status = 'true';
    status.textContent = 'Відкрий потрібний лист і натисни кнопку.';
    panel.append(title, button, status);
    document.documentElement.appendChild(panel);
    button.addEventListener('click', captureOpenGoogleSheet);
  }

  function tzRowText(row) {
    return normalize((row || []).join(' | '));
  }

  function findTzRow(rows, pattern, start = 0, end = rows.length) {
    for (let index = Math.max(0, start); index < Math.min(rows.length, end); index += 1) {
      if (pattern.test(tzRowText(rows[index]))) return index;
    }
    return -1;
  }

  function findTzCell(row, pattern) {
    return (row || []).findIndex(cell => pattern.test(normalize(cell)));
  }

  function nextTzValue(row, labelIndex) {
    return clean((row || []).slice(labelIndex + 1).find(cell => clean(cell)) || '');
  }

  function isTzPlaceholder(value) {
    return /^(ні|нет|no)$|укаж(е|ет) сама|вкаже сама|не потребує налаштування|не потрібн/i.test(normalize(value));
  }

  function normalizeTzPhone(value) {
    let digits = digitsOnly(value);
    if (digits.startsWith('0038')) digits = digits.slice(2);
    return digits.length >= 10 ? digits : '';
  }

  function extractTzPhones(value) {
    const matches = String(value || '').match(/(?:\+?38\d{10}|0\d{9})/g) || [];
    return [...new Set(matches.map(normalizeTzPhone).filter(Boolean))];
  }

  function expandTzNumbers(value) {
    const result = [];
    String(value || '').split(/[,;\n]+/).map(clean).filter(Boolean).forEach(part => {
      const range = part.match(/^(\d{3,})\s*[-–—]\s*(\d{3,})$/);
      if (range) {
        const first = Number(range[1]);
        const last = Number(range[2]);
        if (last >= first && last - first <= 100) {
          for (let number = first; number <= last; number += 1) result.push(String(number));
          return;
        }
      }
      const direct = part.match(/^\d{3,}$/);
      if (direct) result.push(direct[0]);
    });
    return [...new Set(result)];
  }

  function tzLanguageCode(value) {
    const text = normalize(value);
    if (/укра/.test(text)) return 'ua';
    if (/рус|рос/.test(text)) return 'ru';
    if (/англ|english/.test(text)) return 'en';
    if (/поль|polsk/.test(text)) return 'pl';
    if (/ісп|исп|espa/.test(text)) return 'es';
    if (/нім|нем|deutsch/.test(text)) return 'de';
    if (/груз|georg/.test(text)) return 'ge';
    return '';
  }

  function tzVoiceKey(value) {
    const text = normalize(value);
    if (!/голосове|повідомлення|робоч|неробоч|вихідн|вибачте|чекайте|feedback/.test(text)) return '';
    if (/вибачте/.test(text)) return 'ua_sorryvm';
    if (/чекайте|очікуван/.test(text)) return 'ua_waiting';
    if (/вихідн/.test(text)) return 'ua_weekend';
    if (/неробоч/.test(text)) return 'ua_off-hoursvm';
    if (/feedback|фідбек|заклик/.test(text) && !/без\s*(feedback|фідбек)/.test(text)) {
      const speaker = feedbackSpeakerFromText(text) || 'dslobodenyuk';
      return `${FEEDBACK_SPEAKERS[speaker].voicePrefix}_greeting-with-feedback-appeal-v1`;
    }
    if (/робоч/.test(text)) return 'ua_greeting';
    return '';
  }

  function feedbackSpeakerFromText(value) {
    const text = clean(value);
    return Object.entries(FEEDBACK_SPEAKERS).find(([, speaker]) => speaker.aliases.test(text))?.[0] || '';
  }

  function tzDays(value) {
    const text = normalize(value).replace(/\s+/g, '');
    const aliases = [
      { pattern: /^(пн|mon)/, day: 'mon' }, { pattern: /^(вт|tue)/, day: 'tue' },
      { pattern: /^(ср|wed)/, day: 'wed' }, { pattern: /^(чт|thu)/, day: 'thu' },
      { pattern: /^(пт|fri)/, day: 'fri' }, { pattern: /^(сб|sat)/, day: 'sat' },
      { pattern: /^(нд|неділя|вс|воскресенье|sun)/, day: 'sun' },
    ];
    const dayOrder = aliases.map(item => item.day);
    const range = text.split(/[-–—]/).filter(Boolean);
    if (range.length === 2) {
      const start = aliases.find(item => item.pattern.test(range[0]))?.day;
      const end = aliases.find(item => item.pattern.test(range[1]))?.day;
      const startIndex = dayOrder.indexOf(start);
      const endIndex = dayOrder.indexOf(end);
      if (startIndex >= 0 && endIndex >= startIndex) return dayOrder.slice(startIndex, endIndex + 1);
    }
    const tokenPatterns = [
      [/пн|mon/, 'mon'], [/вт|tue/, 'tue'], [/ср|wed/, 'wed'], [/чт|thu/, 'thu'],
      [/пт|fri/, 'fri'], [/сб|sat/, 'sat'], [/(нд|неділя|вс|воскресенье)|sun/, 'sun'],
    ];
    return tokenPatterns.filter(([pattern]) => pattern.test(text)).map(([, day]) => day);
  }

  function parseTzSnapshot(sourceRows, current) {
    const rows = (sourceRows || []).map(row => (row || []).map(clean));
    const section = {
      numbers: findTzRow(rows, /1\.\s*номери компанії/),
      endpoints: findTzRow(rows, /2\.\s*внутрішні лінії/),
      departments: findTzRow(rows, /3\.\s*відділи/),
      groups: findTzRow(rows, /4\.\s*групи співробітників/),
      scenarios: findTzRow(rows, /5\.\s*сценарії для вхідних/),
      backupNumbers: findTzRow(rows, /5\.1\.\s*запасні номери/),
      routes: findTzRow(rows, /6\.\s*маршрути для вихідних/),
      routesEnd: findTzRow(rows, /6\.1\s*автообробка/),
      access: findTzRow(rows, /7\.\s*e-mail для отримання/),
      voices: findTzRow(rows, /8\.\s*голосові повідомлення/),
      feedback: findTzRow(rows, /8\.1\.\s*голосові повідомлення\s*feedback/),
      voicesEnd: findTzRow(rows, /9\.\s*(сrm|crm)/),
      block11: findTzRow(rows, /11\.\s*тимчасове альфа ім['’]?я/),
      block12: findTzRow(rows, /12\.\s*getcall/),
    };
    const issues = {};
    const patch = {
      endpointRows: [], ringGroupItems: [], gsmNumberItems: [], departmentItems: [],
      scenarioItems: [], scheduleItems: [], feedbackItems: [], standardVoiceMessages: '', manualRouteInstructions: '',
    };

    const headEnd = section.numbers >= 0 ? section.numbers : Math.min(rows.length, 12);
    const headerRows = rows.slice(0, headEnd);
    const tariff = headerRows.flat().find(cell => TARIFFS.some(item => normalize(item) === normalize(cell)));
    const regionRow = findTzRow(rows, /^регіон$|\| регіон \|/, 0, headEnd);
    const languageRow = findTzRow(rows, /мова mybusiness/, 0, headEnd);
    const regionCell = regionRow >= 0 ? findTzCell(rows[regionRow], /^регіон$/) : -1;
    const languageCell = languageRow >= 0 ? findTzCell(rows[languageRow], /мова mybusiness/) : -1;
    const region = regionRow >= 0 ? nextTzValue(rows[regionRow], regionCell) : '';
    const language = languageRow >= 0 ? tzLanguageCode(nextTzValue(rows[languageRow], languageCell)) : '';
    if (tariff) patch.tariff = TARIFFS.find(item => normalize(item) === normalize(tariff)) || tariff;
    if (region) patch.region = region;
    if (language) patch.language = language;
    patch.skipCompanyParams = false;
    patch.regionNotImportant = false;
    const missingCompany = [!tariff && 'пакет', !region && 'регіон', !language && 'мова MyBusiness'].filter(Boolean);
    if (missingCompany.length) issues.company = `Не розпізнано: ${missingCompany.join(', ')}.`;

    const numberEnd = section.endpoints >= 0 ? section.endpoints : rows.length;
    const phoneRow = findTzRow(rows, /номери телефонів.*форматі/, section.numbers + 1, numberEnd);
    const phoneNameRow = findTzRow(rows, /підписати номер у лк як/, section.numbers + 1, numberEnd);
    if (phoneRow >= 0) {
      const phoneLabelColumn = findTzCell(rows[phoneRow], /номери телефонів.*форматі/);
      rows[phoneRow].forEach((cell, column) => {
        if (column <= phoneLabelColumn) return;
        extractTzPhones(cell).forEach(number => patch.gsmNumberItems.push({
          number,
          name: phoneNameRow >= 0 ? clean(rows[phoneNameRow][column]) : '',
          email: '',
          createTemporary: false,
          operatorDependency: true,
        }));
      });
    }
    if (section.numbers < 0) issues.gsmNumbers = 'Не знайдено розділ 1 з номерами компанії.';
    else if (!patch.gsmNumberItems.length) issues.gsmNumbers = 'Розділ номерів знайдено, але жодного номера не розпізнано.';

    const endpointEnd = section.departments >= 0 ? section.departments : rows.length;
    const endpointNumberRow = findTzRow(rows, /вкажіть нумерацію внутрішніх ліній/, section.endpoints + 1, endpointEnd);
    const endpointNameRow = findTzRow(rows, /ім['’]?я та прізвище співробітника/, section.endpoints + 1, endpointEnd);
    const endpointEmailRow = findTzRow(rows, /e-mail співробітника/, section.endpoints + 1, endpointEnd);
    const endpointPhoneRow = findTzRow(rows, /контактний номер телефону співробітника/, section.endpoints + 1, endpointEnd);
    if (endpointNumberRow >= 0) {
      rows[endpointNumberRow].forEach((cell, column) => {
        expandTzNumbers(cell).forEach(number => {
          const accessName = endpointNameRow >= 0 ? clean(rows[endpointNameRow][column]) : '';
          const email = endpointEmailRow >= 0 ? clean(rows[endpointEmailRow][column]) : '';
          const mobilePhoneNumber = endpointPhoneRow >= 0 ? normalizeTzPhone(rows[endpointPhoneRow][column]) : '';
          const createAccess = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !isTzPlaceholder(accessName);
          patch.endpointRows.push({
            number, createAccess, accessName: createAccess ? accessName : '', email: createAccess ? email : '',
            mobilePhoneNumber: createAccess ? mobilePhoneNumber : '', role: 'employee',
            accessNote: createAccess ? '' : [accessName, email].filter(Boolean).join('; ') || 'Дані доступу не вказані в ТЗ',
          });
        });
      });
    }

    if (section.access >= 0 && patch.endpointRows.length) {
      const accessEnd = section.voices >= 0 ? section.voices : rows.length;
      const accessHeaderRow = findTzRow(rows, /адреси ел\. пошти для/, section.access, accessEnd);
      const accessValuesRow = accessHeaderRow >= 0 ? accessHeaderRow + 1 : -1;
      const adminPhoneRow = findTzRow(rows, /зв['’]?язатися з адміністратором/, section.access, accessEnd);
      const accessNameRow = findTzRow(rows, /ім['’]?я користувача/, section.access, accessEnd);
      const accessRoleRow = findTzRow(rows, /^посада|\| посада/, section.access, accessEnd);
      const accessByEmail = new Map();
      if (accessHeaderRow >= 0 && accessValuesRow < rows.length) {
        rows[accessHeaderRow].forEach((heading, column) => {
          if (!/власник|директор|адміністративний доступ/.test(normalize(heading))) return;
          const email = clean(rows[accessValuesRow][column]);
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
          const candidate = accessByEmail.get(normalize(email)) || { email, name: '', phone: '', role: 'administrator' };
          const phone = adminPhoneRow >= 0 ? normalizeTzPhone(rows[adminPhoneRow][column]) : '';
          const name = accessNameRow >= 0 ? clean(rows[accessNameRow][column]) : '';
          if (phone) candidate.phone = phone;
          if (name && !isTzPlaceholder(name)) candidate.name = name;
          if (accessRoleRow >= 0 && /влас|влад|директор|адмін/.test(normalize(rows[accessRoleRow][column]))) candidate.role = 'administrator';
          accessByEmail.set(normalize(email), candidate);
        });
      }
      accessByEmail.forEach(access => {
        const endpoint = patch.endpointRows.find(item => normalize(item.email) === normalize(access.email));
        if (!endpoint) return;
        endpoint.createAccess = true;
        endpoint.accessName = access.name || endpoint.accessName;
        endpoint.mobilePhoneNumber = access.phone || endpoint.mobilePhoneNumber;
        endpoint.role = access.role;
        endpoint.accessNote = '';
      });
    }
    if (section.endpoints < 0) issues.endpoints = 'Не знайдено розділ 2 з внутрішніми лініями.';
    else if (!patch.endpointRows.length) issues.endpoints = 'Розділ ВЛ знайдено, але номери ліній не розпізнано.';

    const departmentEnd = section.groups >= 0 ? section.groups : rows.length;
    const departmentNumberRow = findTzRow(rows, /^номери(\s|\|)/, section.departments + 1, departmentEnd);
    const departmentLinesRow = findTzRow(rows, /^лінії(\s|\|)/, section.departments + 1, departmentEnd);
    const departmentNameRow = departmentNumberRow > section.departments ? departmentNumberRow - 1 : -1;
    if (departmentNameRow >= 0) {
      const width = Math.max(rows[departmentNameRow].length, rows[departmentNumberRow]?.length || 0, rows[departmentLinesRow]?.length || 0);
      for (let column = 1; column < width; column += 1) {
        const name = clean(rows[departmentNameRow][column]);
        if (!name || /^номери$|^лінії$/i.test(name)) continue;
        patch.departmentItems.push({
          name,
          phoneNumbers: departmentNumberRow >= 0 ? extractTzPhones(rows[departmentNumberRow][column]) : [],
          endpoints: departmentLinesRow >= 0 ? expandTzNumbers(rows[departmentLinesRow][column]) : [],
        });
      }
    }
    if (section.departments < 0) issues.departments = 'Не знайдено розділ 3 з відділами.';
    else if (!patch.departmentItems.length) issues.departments = 'Розділ відділів знайдено, але відділи не розпізнано.';

    const groupEnd = section.scenarios >= 0 ? section.scenarios : rows.length;
    const groupNumberRow = findTzRow(rows, /вкажіть номери груп/, section.groups + 1, groupEnd);
    const groupNameRow = findTzRow(rows, /вкажіть назву групи/, section.groups + 1, groupEnd);
    const groupLinesRow = findTzRow(rows, /внутрішні номери працівників/, section.groups + 1, groupEnd);
    if (groupNumberRow >= 0) {
      rows[groupNumberRow].forEach((cell, column) => {
        expandTzNumbers(cell).forEach(number => patch.ringGroupItems.push({
          number,
          name: groupNameRow >= 0 ? clean(rows[groupNameRow][column]) : '',
          endpoints: groupLinesRow >= 0 ? expandTzNumbers(rows[groupLinesRow][column]) : [],
        }));
      });
    }
    if (section.groups < 0) issues.ringGroups = 'Не знайдено розділ 4 з групами.';
    else if (!patch.ringGroupItems.length) issues.ringGroups = 'Розділ груп знайдено, але групи не розпізнано.';

    const voiceEnd = section.feedback >= 0 ? section.feedback : (section.voicesEnd >= 0 ? section.voicesEnd : rows.length);
    const voiceKeys = new Set();
    if (section.voices >= 0) {
      for (let index = section.voices + 1; index < voiceEnd; index += 1) {
        if (!/стандарт.*укра/.test(tzRowText(rows[index]))) continue;
        const key = tzVoiceKey(rows[index].join(' '));
        if (key && !/greeting-with-feedback-appeal/.test(key)) voiceKeys.add(key);
      }
    } else {
      issues.voiceMessages = 'Не знайдено розділ 8 з голосовими повідомленнями.';
    }

    if (section.feedback >= 0) {
      const feedbackEnd = section.voicesEnd >= 0 ? section.voicesEnd : rows.length;
      const beginningRow = findTzRow(rows, /feedback\s*початок/i, section.feedback + 1, feedbackEnd);
      const csatRow = findTzRow(rows, /питання\s*від\s*1\s*[-–—]\s*5|оцінк.*1\s*[-–—]\s*5/i, section.feedback + 1, feedbackEnd);
      const selectRow = findTzRow(rows, /вибір\s*зі\s*списку|що\s*слід\s*покращити/i, section.feedback + 1, feedbackEnd);
      const thanksRow = findTzRow(rows, /feedback\s*подяк|feedback\s*вдяч/i, section.feedback + 1, feedbackEnd);
      const nameSearchEnd = beginningRow >= 0 ? beginningRow : Math.min(section.feedback + 5, feedbackEnd);
      const feedbackNameRow = rows.findIndex((row, index) => index > section.feedback && index < nameSearchEnd && row.slice(1).some(cell => clean(cell) && !isTzPlaceholder(cell) && !feedbackSpeakerFromText(cell)));
      const width = Math.max(...rows.slice(section.feedback, feedbackEnd).map(row => row.length), 1);
      for (let column = 1; column < width; column += 1) {
        const name = clean(rows[feedbackNameRow]?.[column]);
        if (!name || isTzPlaceholder(name) || /вкажи\s*назву/i.test(name)) continue;
        const samples = [beginningRow, csatRow, selectRow, thanksRow]
          .filter(index => index >= 0)
          .map(index => clean(rows[index]?.[column]));
        const speaker = feedbackSpeakerFromText(samples.join(' '));
        const selectValue = selectRow >= 0 ? clean(rows[selectRow]?.[column]) : '';
        const includeSelect = Boolean(selectValue) && !isTzPlaceholder(selectValue) && !/не\s*потріб|не\s*нуж/i.test(normalize(selectValue));
        patch.feedbackItems.push({
          key: `feedback-${patch.feedbackItems.length + 1}`,
          name,
          speaker,
          includeSelect,
        });
        if (!speaker) issues.feedback = `Feedback "${name}": не розпізнано диктора.`;
        if (beginningRow < 0 || csatRow < 0 || thanksRow < 0) issues.feedback = `Feedback "${name}": не знайдено всі обов’язкові рядки початку, CSAT і подяки.`;
      }
      if (!patch.feedbackItems.length) issues.feedback = 'Розділ 8.1 знайдено, але Feedback-об’єкти не розпізнано.';
    }

    const scenarioEnd = section.backupNumbers >= 0 ? section.backupNumbers : (section.routes >= 0 ? section.routes : rows.length);
    const scenarioNameRow = findTzRow(rows, /робочий час|неробочий час/, section.scenarios + 1, scenarioEnd);
    const scenarioNumberRow = scenarioNameRow >= 0 ? scenarioNameRow + 1 : -1;
    if (scenarioNameRow >= 0) {
      for (let column = 1; column < rows[scenarioNameRow].length; column += 1) {
        const name = clean(rows[scenarioNameRow][column]);
        if (!name || /^сценарій\s*\d+/i.test(name)) continue;
        const actions = [];
        let pendingTargetIndex = -1;
        let pendingTargetType = '';
        for (let index = scenarioNumberRow + 1; index < scenarioEnd; index += 1) {
          const value = clean(rows[index][column]);
          if (!value) continue;
          const rowContext = `${clean(rows[index]?.[0])} ${value}`;
          const voiceKey = tzVoiceKey(rowContext);
          if (/голосове повідомлення|привітання|feedback|фідбек/i.test(rowContext) && voiceKey) {
            actions.push({ type: 'voice', voiceKey });
            if (!/greeting-with-feedback-appeal/.test(voiceKey)) voiceKeys.add(voiceKey);
            pendingTargetIndex = -1;
            pendingTargetType = '';
            continue;
          }
          const call = value.match(/(?:дзвінок|виклик)\D{0,15}(\d{3,})/i);
          if (call) {
            const target = call[1];
            const type = patch.ringGroupItems.some(item => clean(item.number) === target) ? 'ringGroup' : 'endpoint';
            actions.push({ type, target, timeout: '40' });
            pendingTargetIndex = actions.length - 1;
            pendingTargetType = '';
            continue;
          }
          if (/випадковий вибір із групи|дзвінок на групу|груповий виклик/i.test(value)) {
            pendingTargetType = 'ringGroup';
            pendingTargetIndex = -1;
            continue;
          }
          if (/дзвінок на внутрішню лінію|виклик внутрішньої лінії/i.test(value)) {
            pendingTargetType = 'endpoint';
            pendingTargetIndex = -1;
            continue;
          }
          if (pendingTargetType && /^\d{3,}$/.test(digitsOnly(value))) {
            actions.push({ type: pendingTargetType, target: digitsOnly(value), timeout: '40' });
            pendingTargetIndex = actions.length - 1;
            pendingTargetType = '';
            continue;
          }
          const seconds = value.match(/^(\d{1,3})\s*(?:сек|с\.?$)/i)?.[1];
          if (pendingTargetIndex >= 0 && seconds) {
            actions[pendingTargetIndex].timeout = seconds;
            pendingTargetIndex = -1;
          }
        }
        const incomingNumbers = scenarioNumberRow >= 0 ? extractTzPhones(rows[scenarioNumberRow][column]) : [];
        if (!actions.length && !incomingNumbers.length) continue;
        const usesFeedback = actions.some(action => action.type === 'voice' && /greeting-with-feedback-appeal/.test(action.voiceKey));
        const feedbackName = usesFeedback && patch.feedbackItems.length === 1 ? clean(patch.feedbackItems[0].name) : '';
        if (usesFeedback && patch.feedbackItems.length !== 1) {
          issues.scenarios = `Сценарій "${name}" використовує Feedback, але однозначний об’єкт з блока 8.1 не визначено.`;
        }
        patch.scenarioItems.push({
          key: `scenario-${patch.scenarioItems.length + 1}`,
          name,
          type: /неробоч/.test(normalize(name)) ? 'offHours' : 'working',
          feedbackName,
          actions,
          incomingNumbers,
        });
      }
    }

    const workScheduleRow = findTzRow(rows, /^графік роботи|графік роботи \|/, section.numbers + 1, section.endpoints >= 0 ? section.endpoints : rows.length);
    if (workScheduleRow >= 0 && patch.scenarioItems.length) {
      const working = patch.scenarioItems.find(item => item.type === 'working') || patch.scenarioItems[0];
      const offHours = patch.scenarioItems.find(item => item.type === 'offHours');
      const weekend = patch.scenarioItems.find(item => /вихідн|выходн/.test(normalize(item.name)));
      const rules = [];
      for (let index = workScheduleRow + 1; index < section.endpoints; index += 1) {
        rows[index].forEach((cell, column) => {
          const value = clean(cell);
          const header = rows[index - 1]?.[column] || rows[index]?.[column - 1] || '';
          const days = tzDays(header);
          const time = value.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
          if (time && days.length) {
            rules.push({ start: time[1].padStart(5, '0'), end: time[2].padStart(5, '0'), days, scenarioName: working.name });
            return;
          }
          if (/вихідн|выходн/.test(normalize(value)) && days.length && weekend) {
            rules.push({ start: '', end: '', allDay: true, days, scenarioName: weekend.name, rule: `*,${days.join(',')},*,*` });
          }
        });
      }
      const incomingNumbers = [...new Set(patch.scenarioItems.flatMap(item => item.incomingNumbers || []))];
      patch.scheduleItems.push({
        name: 'Графік роботи', mode: rules.length ? 'custom' : 'always', rules,
        fallbackScenarioName: offHours?.name || working.name, incomingNumbers,
      });
    }
    if (section.scenarios < 0) issues.scenarios = 'Не знайдено розділ 5 зі сценаріями.';
    else if (!patch.scenarioItems.length) issues.scenarios = 'Розділ сценаріїв знайдено, але сценарії не розпізнано.';
    else if (patch.scenarioItems.some(item => !item.actions.length)) issues.scenarios = `Без дій: ${patch.scenarioItems.filter(item => !item.actions.length).map(item => item.name).join(', ')}.`;
    patch.standardVoiceMessages = [...voiceKeys].join('\n');

    if (section.routes >= 0) {
      const routeEnd = section.routesEnd >= 0 ? section.routesEnd : rows.length;
      const routeNumberRow = findTzRow(rows, /виділити блакитним номери/, section.routes, routeEnd);
      const directionsRow = routeNumberRow >= 2 ? routeNumberRow - 2 : -1;
      if (routeNumberRow >= 0 && directionsRow >= 0) {
        const department = clean(rows[directionsRow][0]);
        const routes = [];
        for (let column = 1; column < rows[directionsRow].length; column += 1) {
          const direction = clean(rows[directionsRow][column]);
          const number = extractTzPhones(rows[routeNumberRow][column])[0];
          if (direction && number) routes.push(`${direction}: ${number}`);
        }
        patch.manualRouteInstructions = `${department ? `Відділ ${department}. ` : ''}${routes.join('; ')}`;
      } else {
        patch.manualRouteInstructions = 'Виконати вихідні маршрути вручну відповідно до блока 6 ТЗ.';
      }
    }

    if (section.block11 >= 0) {
      const useRow = findTzRow(rows, /чи буде клієнт використовувати альфа ім['’]?я binsms/, section.block11, section.block12 >= 0 ? section.block12 : rows.length);
      const labelCell = useRow >= 0 ? findTzCell(rows[useRow], /чи буде клієнт використовувати/) : -1;
      const value = useRow >= 0 ? nextTzValue(rows[useRow], labelCell) : '';
      patch.block11Enabled = /^(так|да|yes)$/i.test(normalize(value));
      patch.block11AlphaName = 'BinSMS';
      patch.block11Gateway = 'Binotel';
    } else {
      issues.block11 = 'Не знайдено розділ 11 з тимчасовим альфа-іменем.';
    }

    const blockStates = {};
    TZ_BLOCKS.forEach(block => {
      const previous = getBlockState(current, block.id);
      blockStates[block.id] = { ignored: previous.ignored, issue: previous.ignored ? '' : (issues[block.id] || '') };
    });
    return { patch, blockStates, issues };
  }

  async function readTzFromSheet() {
    const modal = $(`#${CONFIG.modalId}`);
    let captured;
    try {
      captured = JSON.parse(GM_getValue(CONFIG.tzCaptureStorageKey, '') || 'null');
    } catch (error) {
      captured = null;
    }
    if (!captured?.rows?.length) {
      throw new Error('Спочатку відкрий потрібний лист Google Таблиці та натисни там «Зчитати відкритий лист ТЗ».');
    }
    const nonEmpty = captured.rows;
    if (!nonEmpty.length) throw new Error('Таблиця прочитана, але вибраний лист порожній.');
    const current = collectModalDraft();
    const parsed = parseTzSnapshot(nonEmpty, current);
    const next = saveDraft(applyStructuredCompatibility({
      ...current,
      ...parsed.patch,
      tzUrl: captured.url,
      blockStates: parsed.blockStates,
      tzSnapshot: nonEmpty,
      tzReadIssues: Object.keys(parsed.issues),
      tzReadAt: new Date().toISOString(),
    }));
    const recognizedCount = TZ_BLOCKS.length - Object.keys(parsed.issues).length;
    log(`ТЗ розібрано: ${captured.title || 'ТЗ'}, розпізнано блоків ${recognizedCount}/${TZ_BLOCKS.length}.`, Object.keys(parsed.issues).length ? 'warn' : 'success');
    Object.entries(parsed.issues).forEach(([blockId, issue]) => log(`Блок ${TZ_BLOCKS.find(item => item.id === blockId)?.number || blockId}: ${issue}`, 'warn'));
    renderModal();
    $(`#${CONFIG.modalId}`).classList.add('open');
    return next;
  }
  function bindConstructorEvents(modal) {
    const refreshRunButton = () => {
      const unresolved = $all('[data-block]', modal).filter(block => {
        const ignored = $('[data-ignore-block]', block)?.checked;
        return !ignored && Boolean($('.bth-issue', block));
      });
      const button = $('.bth-main-run', modal);
      if (button) {
        button.disabled = unresolved.length > 0;
        button.title = unresolved.length ? `Перевір або ігноруй блоки: ${unresolved.map(block => TZ_BLOCKS.find(item => item.id === block.dataset.block)?.number).join(', ')}` : '';
      }
    };
    $all('.bth-scenario-action', modal).forEach(updateScenarioActionVisibility);
    const refreshAccessFields = row => {
      const enabled = $('[data-item-field="createAccess"]', row)?.checked;
      const fields = $('.bth-access-fields', row);
      if (fields) fields.style.display = enabled ? '' : 'none';
    };
    const refreshScheduleMode = card => {
      const always = $('[data-schedule-field="mode"]', card)?.value === 'always';
      const custom = $('[data-schedule-custom]', card);
      const label = $('[data-schedule-scenario-label]', card);
      if (custom) custom.style.display = always ? 'none' : '';
      if (label) label.textContent = always ? 'Сценарій 24/7' : 'Сценарій для решти часу';
    };
    const refreshScheduleRuleTime = rule => {
      if (!rule) return;
      const allDay = Boolean($('[data-rule-field="allDay"]', rule)?.checked);
      $all('[data-rule-time] input[type="time"]', rule).forEach(field => { field.disabled = allDay; });
    };
    const refreshScheduleReferences = () => {
      const scenarios = collectScenarioCards(modal);
      $all('[data-rule-field="scenarioName"], [data-schedule-field="fallbackScenarioName"]', modal).forEach(select => {
        const selected = select.value;
        select.innerHTML = scenarioOptions(scenarios, selected);
      });
      const numbers = collectItemRows(modal, 'gsm').filter(item => clean(item.number));
      $all('[data-schedule-numbers]', modal).forEach(container => {
        const selected = new Set($all('[data-schedule-number]:checked', container).map(field => field.dataset.scheduleNumber));
        container.innerHTML = numbers.map(number => `<label class="bth-checkbox"><input type="checkbox" data-schedule-number="${escapeHtml(number.number)}" ${selected.has(clean(number.number)) ? 'checked' : ''}>${escapeHtml([number.number, number.name].filter(Boolean).join(' — '))}</label>`).join('') || '<span>Спочатку додайте номери у блоці 4</span>';
      });
    };
    const refreshScenarioTargets = () => {
      const endpoints = collectItemRows(modal, 'endpoints').filter(item => clean(item.number));
      const groups = collectItemRows(modal, 'groups').filter(item => clean(item.number));
      $all('.bth-action-endpoint', modal).forEach(select => {
        const selected = select.value;
        select.innerHTML = targetOptions(endpoints, selected);
      });
      $all('.bth-action-group', modal).forEach(select => {
        const selected = select.value;
        select.innerHTML = targetOptions(groups, selected);
      });
    };
    const refreshFeedbackReferences = () => {
      const items = collectItemRows(modal, 'feedback').filter(item => clean(item.name));
      $all('[data-scenario-field="feedbackName"]', modal).forEach(select => {
        const selected = select.value;
        select.innerHTML = feedbackOptions(items, selected);
      });
    };
    $all('[data-item="endpoint"]', modal).forEach(refreshAccessFields);
    $all('[data-schedule-card]', modal).forEach(refreshScheduleMode);
    $all('[data-schedule-rule]', modal).forEach(refreshScheduleRuleTime);
    modal.addEventListener('input', event => {
      const block = event.target.closest('[data-block]');
      if (!block || event.target.matches('[data-ignore-block]')) return;
      block.dataset.userReviewed = 'true';
      $('.bth-issue', block)?.remove();
      const badge = $('.bth-badge', block);
      if (badge) { badge.className = 'bth-badge ready'; badge.textContent = 'Перевірено інженером'; }
      if (event.target.matches('[data-scenario-field="name"], [data-item="gsm"] [data-item-field="number"], [data-item="gsm"] [data-item-field="name"]')) refreshScheduleReferences();
      if (event.target.matches('[data-item="endpoint"] [data-item-field="number"], [data-item="group"] [data-item-field="number"], [data-item="group"] [data-item-field="name"]')) refreshScenarioTargets();
      if (event.target.matches('[data-item="feedback"] [data-item-field="name"]')) refreshFeedbackReferences();
      refreshRunButton();
    });
    modal.addEventListener('change', event => {
      if (event.target.matches('[data-item-field="type"]')) updateScenarioActionVisibility(event.target.closest('.bth-scenario-action'));
      if (event.target.matches('[data-item-field="createAccess"]')) refreshAccessFields(event.target.closest('[data-item="endpoint"]'));
      if (event.target.matches('[data-schedule-field="mode"]')) refreshScheduleMode(event.target.closest('[data-schedule-card]'));
      if (event.target.matches('[data-rule-field="allDay"]')) refreshScheduleRuleTime(event.target.closest('[data-schedule-rule]'));
      if (event.target.matches('[data-ignore-block]')) event.target.closest('[data-block]')?.classList.toggle('is-ignored', event.target.checked);
      refreshRunButton();
    });
    modal.addEventListener('click', async event => {
      if (event.target.closest('[data-add-scenario-action]')) {
        const card = event.target.closest('[data-scenario-card]');
        const context = {
          endpointRows: collectItemRows(modal, 'endpoints'),
          ringGroupItems: collectItemRows(modal, 'groups'),
        };
        const list = $('[data-scenario-actions]', card);
        list.insertAdjacentHTML('beforeend', renderScenarioActionRow({}, card.dataset.scenarioKey, context));
        updateScenarioActionVisibility(list.lastElementChild);
        return;
      }
      if (event.target.closest('[data-add-schedule-rule]')) {
        const card = event.target.closest('[data-schedule-card]');
        const scenarios = collectScenarioCards(modal);
        $('[data-schedule-rules]', card).insertAdjacentHTML('beforeend', renderScheduleRule({}, scenarios));
        refreshScheduleRuleTime($('[data-schedule-rules]', card).lastElementChild);
        return;
      }
      const add = event.target.closest('[data-add]');
      if (add) {
        const kind = add.dataset.add;
        if (kind === 'scenario-card') {
          const context = { endpointRows: collectItemRows(modal, 'endpoints'), ringGroupItems: collectItemRows(modal, 'groups'), feedbackItems: collectItemRows(modal, 'feedback') };
          $('[data-list="scenario-cards"]', modal).insertAdjacentHTML('beforeend', renderScenarioCard({}, context));
          return;
        }
        if (kind === 'schedule-card') {
          const context = { scenarioItems: collectScenarioCards(modal), gsmNumberItems: collectItemRows(modal, 'gsm') };
          const list = $('[data-list="schedule-cards"]', modal);
          list.insertAdjacentHTML('beforeend', renderScheduleCard({}, context));
          refreshScheduleMode(list.lastElementChild);
          return;
        }
        const targetName = kind === 'endpoint' ? 'endpoints' : kind === 'group' ? 'groups' : kind === 'gsm' ? 'gsm' : kind === 'feedback' ? 'feedback' : 'departments';
        const list = $(`[data-list="${targetName}"]`, modal);
        const html = kind === 'feedback' ? renderFeedbackItem() : renderSimpleItem(kind);
        list.insertAdjacentHTML('beforeend', html);
        if (kind === 'endpoint') refreshAccessFields(list.lastElementChild);
        return;
      }
      const remove = event.target.closest('[data-remove]');
      if (remove) { remove.closest('.bth-item,.bth-object,.bth-scenario-card,.bth-schedule-card')?.remove(); refreshScheduleReferences(); refreshScenarioTargets(); refreshFeedbackReferences(); return; }
      const move = event.target.closest('[data-move]');
      if (move) {
        const row = move.closest('.bth-item');
        if (move.dataset.move === 'up' && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
        if (move.dataset.move === 'down' && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
      }
    });
    $('.bth-read-tz', modal)?.addEventListener('click', () => runWithStop(readTzFromSheet));
    $('.bth-copy-log', modal)?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(readStoredLogs().map(item => `${item.time} — ${item.message}`).join('\n'));
      log('Лог скопійовано.', 'success');
    });
    $('.bth-download-report', modal)?.addEventListener('click', downloadJsonReport);
    refreshRunButton();
  }

  function renderModal() {
    renderStyles();
    const draft = loadDraft();
    const structured = getStructuredDraft(draft);
    let modal = $(`#${CONFIG.modalId}`);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = CONFIG.modalId;
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bth-modal-head"><h2>TZ helper — конструктор ${SCRIPT_VERSION}</h2><button class="bth-close" type="button">×</button></div>
      <div class="bth-content">
        <div class="bth-card bth-wide">
          <h3>Джерело та контекст</h3>
          <label>Panel ID / companyID — визначено з відкритої сторінки</label>
          <input data-field="companyId" value="${escapeHtml(draft.companyId || getCompanyIdFromUrl())}" readonly>
          <label>Project ID / showProjectID — визначено з відкритої сторінки, якщо є</label>
          <input data-field="projectId" value="${escapeHtml(draft.projectId || getProjectIdFromUrl())}" readonly>
          <label>Посилання на ТЗ *</label>
          <input data-field="tzUrl" value="${escapeHtml(draft.tzUrl)}" placeholder="https://docs.google.com/spreadsheets/d/...">
          <div class="bth-inline-actions"><button class="bth-green bth-read-tz" type="button">Завантажити зчитане ТЗ</button></div>
          <div class="bth-note">Спочатку відкрий потрібний лист Google Таблиці й натисни там «Зчитати відкритий лист ТЗ». Потім повернись у панель і завантаж дані. Нерозпізнаний блок скрипт не заповнює навмання.</div>
        </div>
        <div class="bth-card" data-block="company">
          ${blockCardHeader(draft, 'company', '1', 'Параметри компанії')}
          <label class="bth-checkbox"><input type="checkbox" data-field="skipCompanyParams" ${draft.skipCompanyParams ? 'checked' : ''}>Не змінювати параметри компанії</label>
          <div class="bth-note">Буде пропущено: пакет, регіон, мову MyBusiness, часовий пояс і посилання на ТЗ. Назву компанії скрипт не змінює.</div>
          <div class="bth-row">
            <div><label>Пакет</label><select data-field="tariff">${optionList(TARIFFS, draft.tariff)}</select></div>
            <div><label>Регіон</label><select data-field="region">${optionList(REGIONS, draft.region)}</select></div>
          </div>
          <label class="bth-checkbox"><input type="checkbox" data-field="regionNotImportant" ${draft.regionNotImportant ? 'checked' : ''}>Регіон не важливий</label>
          <div class="bth-row">
            <div><label>Мова MyBusiness</label><select data-field="language">${optionList(LANGUAGES, draft.language)}</select></div>
            <div><label>Часовий пояс</label><select data-field="timezone">${optionList(TIMEZONES, draft.timezone)}</select></div>
          </div>
        </div>
        <div class="bth-card" data-block="endpoints">
          ${blockCardHeader(draft, 'endpoints', '2', 'Внутрішні лінії')}
          <div data-list="endpoints">${structured.endpointRows.map(item => renderSimpleItem('endpoint', item)).join('')}</div>
          <button class="bth-add" type="button" data-add="endpoint">+ Додати внутрішню лінію</button>
          <div class="bth-note">Назва не записується прямо у ВЛ. Ім'я додається тільки через доступ MyBusiness; цей підблок буде виконуватися окремою дією.</div>
        </div>
        <div class="bth-card" data-block="ringGroups">
          ${blockCardHeader(draft, 'ringGroups', '3', 'Групи виклику')}
          <div data-list="groups">${structured.ringGroupItems.map(item => renderSimpleItem('group', item)).join('')}</div>
          <button class="bth-add" type="button" data-add="group">+ Додати групу</button>
        </div>
        <div class="bth-card" data-block="gsmNumbers">
          ${blockCardHeader(draft, 'gsmNumbers', '4', 'GSM і тимчасові номери')}
          <div data-list="gsm">${structured.gsmNumberItems.map(item => renderSimpleItem('gsm', item)).join('')}</div>
          <button class="bth-add" type="button" data-add="gsm">+ Додати GSM номер</button>
          <div class="bth-note">Email, тимчасовий номер і очікування від оператора задаються окремо для кожного номера.</div>
        </div>
        <div class="bth-card" data-block="departments">
          ${blockCardHeader(draft, 'departments', '5', 'Відділи')}
          <div data-list="departments">${structured.departmentItems.map(item => renderSimpleItem('department', item)).join('')}</div>
          <button class="bth-add" type="button" data-add="department">+ Додати відділ</button>
        </div>
        <div class="bth-card" data-block="voiceMessages">
          ${blockCardHeader(draft, 'voiceMessages', '6', 'Голосові повідомлення')}
          ${Object.entries(STANDARD_UA_VOICE).map(([key, item]) => `<label class="bth-checkbox"><input type="checkbox" data-voice-key="${key}" ${normalizeLineList(draft.standardVoiceMessages).includes(key) ? 'checked' : ''}>${escapeHtml(item.label)}</label>`).join('')}
          <div class="bth-note">Додаються готові українські файли з бібліотеки панелі. Завантаження з ПК не використовується.</div>
        </div>
        <div class="bth-card bth-wide" data-block="scenarios">
          ${blockCardHeader(draft, 'scenarios', '7', 'Сценарії та графіки')}
          <h4>Сценарії</h4><div data-list="scenario-cards">${structured.scenarioItems.map(item => renderScenarioCard(item, structured)).join('')}</div><button class="bth-add" type="button" data-add="scenario-card">+ Додати сценарій</button>
          <h4>Графіки</h4><div data-list="schedule-cards">${structured.scheduleItems.map(item => renderScheduleCard(item, structured)).join('')}</div><button class="bth-add" type="button" data-add="schedule-card">+ Додати графік</button>
          <div class="bth-note">Назви сценаріїв, ВЛ, групи, голосові та вхідні номери вибираються зі створених об’єктів. Технічне правило графіка скрипт формує сам.</div>
        </div>
        <div class="bth-card bth-wide" data-block="feedback">
          ${blockCardHeader(draft, 'feedback', '8.1', 'Feedback')}
          <div data-list="feedback">${structured.feedbackItems.map(item => renderFeedbackItem(item)).join('')}</div>
          <button class="bth-add" type="button" data-add="feedback">+ Додати Feedback-об’єкт</button>
          <div class="bth-note">Скрипт увімкне Feedback у параметрах компанії, додасть набір диктора, створить опитування та прив’яже його до вибраних сценаріїв.</div>
        </div>
        <div class="bth-card"><h3>Виконати вручну після скрипта</h3><p>Вихідні маршрути скрипт не змінює.</p><label>Зчитано з блока 6 ТЗ</label><textarea data-field="manualRouteInstructions" readonly placeholder="У ТЗ не знайдено опис вихідних маршрутів">${escapeHtml(draft.manualRouteInstructions || '')}</textarea><div class="bth-note">Цей список формує скрипт. Інженер перевіряє його за ТЗ і виконує маршрут вручну.</div></div>
        <div class="bth-card" data-block="block11">
          ${blockCardHeader(draft, 'block11', '11', 'BinSMS')}
          <label class="bth-checkbox"><input type="checkbox" data-field="block11Enabled" ${draft.block11Enabled ? 'checked' : ''}>У ТЗ в блоці 11 стоїть «Так»</label>
          <div class="bth-row"><div><label>Альфа-ім'я</label><input data-field="block11AlphaName" value="${escapeHtml(draft.block11AlphaName || 'BinSMS')}"></div><div><label>Шлюз</label><input data-field="block11Gateway" value="${escapeHtml(draft.block11Gateway || 'Binotel')}"></div></div>
          <div class="bth-note">Блоки 9, 10 і 12 скрипт не змінює — їх перевіряє інженер.</div>
        </div>
        <div class="bth-card bth-wide"><h3>Лог і підсумок</h3><div class="bth-log"></div><div class="bth-inline-actions"><button class="bth-gray bth-copy-log" type="button">Скопіювати лог</button><button class="bth-gray bth-download-report" type="button">Завантажити JSON-звіт</button></div></div>
      </div>
      <div class="bth-actions">
        <label class="bth-checkbox"><input type="checkbox" data-field="dryRun" ${draft.dryRun !== false ? 'checked' : ''}>Тільки план, без змін</label>
        <button class="bth-green bth-main-run" type="button">Виконати все</button>
        <button class="bth-gray bth-save" type="button">Зберегти чернетку</button>
        <button class="bth-gray bth-close-bottom" type="button">Закрити</button>
      </div>
    `;

    renderStoredLogs($('.bth-log', modal));
    $('.bth-close', modal).addEventListener('click', closeModal);
    $('.bth-close-bottom', modal).addEventListener('click', closeModal);
    bindConstructorEvents(modal);
    $('.bth-save', modal).addEventListener('click', () => {
      collectModalDraft();
      log('Введені дані збережено.', 'success');
    });
    $('.bth-main-run', modal).addEventListener('click', async () => {
      const nextDraft = collectModalDraft();
      if (nextDraft.dryRun !== false) {
        await runWithStop(async () => previewExecutionPlan(nextDraft));
        return;
      }
      clearFlow();
      saveFlow({
        stage: 'context',
        index: 0,
        companyId: clean(nextDraft.companyId || getCompanyIdFromUrl()),
        projectId: clean(nextDraft.projectId || getProjectIdFromUrl()),
      });
      await runWithStop(runAutomaticFlow);
    });
  }

  function collectModalDraft() {
    const modal = $(`#${CONFIG.modalId}`);
    if (!modal) return loadDraft();
    const patch = {};
    $all('[data-field]', modal).forEach(field => {
      patch[field.dataset.field] = field.type === 'checkbox' ? field.checked : field.value;
    });
    patch.blockStates = {};
    $all('[data-ignore-block]', modal).forEach(field => {
      const previous = getBlockState(loadDraft(), field.dataset.ignoreBlock);
      const reviewed = field.closest('[data-block]')?.dataset.userReviewed === 'true';
      patch.blockStates[field.dataset.ignoreBlock] = { ...previous, ignored: field.checked, issue: reviewed ? '' : previous.issue };
    });
    patch.endpointRows = collectItemRows(modal, 'endpoints');
    patch.ringGroupItems = collectItemRows(modal, 'groups').map(item => ({ ...item, endpoints: normalizeLineList(item.endpoints) }));
    patch.gsmNumberItems = collectItemRows(modal, 'gsm');
    patch.departmentItems = collectItemRows(modal, 'departments').map(item => ({ ...item, phoneNumbers: normalizeLineList(item.phoneNumbers), endpoints: normalizeLineList(item.endpoints) }));
    patch.feedbackItems = collectItemRows(modal, 'feedback');
    patch.scenarioItems = collectScenarioCards(modal);
    patch.scheduleItems = collectScheduleCards(modal);
    patch.createTemporaryNumbers = patch.gsmNumberItems.some(item => item.createTemporary);
    patch.gsmEmail = '';
    patch.externallyProvisionedNumbers = patch.gsmNumberItems.filter(item => item.operatorDependency).map(item => item.number).join(', ');
    patch.standardVoiceMessages = $all('[data-voice-key]:checked', modal).map(field => field.dataset.voiceKey).join('\n');
    patch.companyId = clean(patch.companyId || getCompanyIdFromUrl());
    patch.projectId = clean(patch.projectId || getProjectIdFromUrl());
    patch.contextCompanyId = patch.companyId;
    patch.contextProjectId = patch.projectId;
    return saveDraft(applyStructuredCompatibility(patch));
  }

  function openModal() {
    renderModal();
    $(`#${CONFIG.modalId}`).classList.add('open');
  }

  function closeModal() {
    const modal = $(`#${CONFIG.modalId}`);
    if (modal) modal.classList.remove('open');
  }

  async function runWithStop(task) {
    stopRequested = false;
    showStopButton();
    try {
      await task();
    } catch (error) {
      const message = error.message || String(error);
      clearFlow();
      log(message, 'error');
      showCenterAlert(message, 'error');
    } finally {
      await sleep(250);
      hideStopButton();
    }
  }
  function boot() {
    if (location.hostname === 'docs.google.com' && location.pathname.includes('/spreadsheets/')) {
      renderGoogleSheetCapture();
      window.setInterval(renderGoogleSheetCapture, 2000);
      return;
    }
    if (!isPanelPage()) return;
    renderPanel();
    verifyPendingDeleteResult();

    const flow = loadFlow();
    if (!flow || !flow.active) return;

    const currentCompany = getCompanyIdFromUrl();
    const currentProject = getProjectIdFromUrl();
    const expectedCompany = clean(flow.companyId || loadDraft().companyId);
    const expectedProject = clean(flow.projectId || loadDraft().projectId);

    if (
      expectedCompany &&
      currentCompany &&
      (currentCompany !== expectedCompany || (expectedProject && !isProjectAgnosticModule() && currentProject !== expectedProject))
    ) {
      clearFlow();
      setStatus('Автозапуск зупинено: відкрита інша компанія або проєкт.', 'warn');
      return;
    }

    setTimeout(() => runWithStop(runAutomaticFlow), 500);
  }

  if (globalThis.__BINOTEL_TZ_HELPER_TEST__) {
    globalThis.__BINOTEL_TZ_HELPER_TEST_API__ = {
      parseTzSnapshot,
      tzVoiceKey,
      getFeedbackSpecs,
      feedbackVoicePath,
      getScenarioSpecs,
      validateDraft,
      isValidEndpointNumber,
      makeScheduleRuleString,
      buildExecutionPlan,
    };
  } else {
    boot();
  }
})();
