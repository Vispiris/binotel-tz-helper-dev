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

