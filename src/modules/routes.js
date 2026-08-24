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
