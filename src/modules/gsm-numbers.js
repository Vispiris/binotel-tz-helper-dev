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
        if (flow.gsmAction === 'verifyAfterCreate') log(`GSM номер ${item.number} створено та перевірено.`, 'success');
        log(`GSM номер ${item.number} вже існує — повторно не створюю.`, 'success');
        if (item.createTemporary && !getTemporaryMap()[item.number]) {
          saveFlow({ stage: 'gsmTemporaryOpen', index, pendingRealNumber: item.number, gsmAction: '' });
        } else {
          saveFlow({ stage: 'gsmNumbers', index: index + 1, gsmAction: '' });
        }
        await runAutomaticFlow();
        return;
      }

      if (flow.gsmAction === 'verifyAfterCreate') {
        throw new Error(`Після збереження GSM номер ${item.number} не знайдено. Повторне створення заборонене.`);
      }

      saveFlow({ stage: 'gsmNumbers', index, gsmAction: 'create' });
      if (!clickButtonByText(['Додати', 'Добавить'])) {
        throw new Error('Не знайшов кнопку додавання GSM номера.');
      }

      log(`Відкриваю форму додавання GSM номера ${item.number}.`, 'info');
      return;
    }

    if (flow.gsmAction !== 'create') {
      window.location.href = buildPanelUrl(CONFIG.gsmPortsModule);
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
      if (!nameField || !setFieldValue(nameField, item.name)) throw new Error(`Не вдалося заповнити назву GSM номера ${item.number}.`);
    }
    if (!emailField || !setFieldValue(emailField, clean(item.email) || 'noemail')) throw new Error(`Не вдалося заповнити email GSM номера ${item.number}.`);

    if (serverField && serverField.tagName === 'SELECT') {
      const serverChanged = setSelectValue(serverField, 'rgsm0');
      if (!serverChanged) throw new Error('Не знайшов rgsm0 у списку GSM серверів. Номер не збережено.');
      log('GSM сервер встановлено: rgsm0.', 'success');
    } else {
      log('Не знайшов поле GSM сервера. Перевір, чи rgsm0 виставився автоматично.', 'warn');
    }

    saveFlow({
      stage: 'gsmNumbers',
      index,
      gsmAction: 'verifyAfterCreate',
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
      saveFlow({ stage: 'gsmNumbers', index: Number(flow.index || 0) + 1, gsmAction: '', pendingRealNumber: '' });
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
      throw new Error(`Не знайшов кнопку створення тимчасового номера для ${realNumber}.`);
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
      throw new Error(`Тимчасовий номер для ${realNumber} не знайдено після створення.`);
    }

    saveFlow({
      stage: 'gsmNumbers',
      index: Number(flow.index || 0) + 1,
      gsmAction: '',
      pendingRealNumber: '',
      temporaryBefore: [],
    });
    await runAutomaticFlow();
  }
