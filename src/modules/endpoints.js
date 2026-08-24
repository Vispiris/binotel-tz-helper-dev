  async function applyEndpoints() {
    const draft = loadDraft();
    const firstLine = clean(draft.endpointsFirstLine);
    const countLines = clean(draft.endpointsCount);
    const flow = loadFlow() || {};
    const index = Number(flow.index || 0);

    if (!firstLine && !countLines) {
      saveFlow({ stage: 'ringGroups', index: 0 });
      await runAutomaticFlow();
      return;
    }

    if (!firstLine || !countLines) {
      throw new Error('Для ліній потрібно вказати стартову ВЛ і кількість.');
    }

    const firstLineNumber = Number(firstLine);
    const countLinesNumber = Number(countLines);
    if (!Number.isInteger(firstLineNumber) || !Number.isInteger(countLinesNumber) || countLinesNumber < 1) {
      throw new Error('Стартова ВЛ і кількість мають бути додатними цілими числами.');
    }

    const requestedLines = Array.from({ length: countLinesNumber }, (_, offset) => String(firstLineNumber + offset));
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

