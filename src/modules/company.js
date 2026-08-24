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
    if (!tzUrlField || !setFieldValue(tzUrlField, draft.tzUrl)) throw new Error('Не вдалося заповнити посилання на ТЗ у параметрах компанії.');

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
      if (!changed) throw new Error(`Не знайшов пакет у списку: ${draft.tariff}.`);
      log(`Пакет встановлено: ${draft.tariff}.`, 'success');
    } else {
      throw new Error('Не знайшов поле "Пакет/Тариф".');
    }

    const languageField =
      findInputByLabel('Язык в MyBusiness') ||
      findInputByLabel('Мова в MyBusiness') ||
      getField('select[name*="language" i], select[name*="lang" i]');
    if (!languageField || languageField.tagName !== 'SELECT' || !setSelectValue(languageField, draft.language)) {
      throw new Error(`Не вдалося встановити мову MyBusiness: ${draft.language}.`);
    }

    const timezoneField =
      findInputByLabel('Часовой пояс') ||
      findInputByLabel('Часовий пояс') ||
      getField('select[name*="timezone" i], select[name*="timeZone" i]');
    if (!timezoneField || timezoneField.tagName !== 'SELECT' || !setSelectValue(timezoneField, draft.timezone)) {
      throw new Error(`Не вдалося встановити часовий пояс: ${draft.timezone}.`);
    }

    await clickSubmitAndContinue('Параметри компанії збережено.', 'endpoints', 0);
  }
