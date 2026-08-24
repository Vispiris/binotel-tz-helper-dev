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

