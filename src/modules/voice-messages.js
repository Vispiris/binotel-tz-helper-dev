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
