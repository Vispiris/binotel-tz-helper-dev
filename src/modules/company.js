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

