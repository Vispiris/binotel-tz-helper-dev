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
    return `${clean(rule.start)}-${clean(rule.end)},${days || '*'},*,*`;
  }

  function collectScheduleCards(modal) {
    return $all('[data-schedule-card]', modal).map(card => {
      const fields = {};
      $all('[data-schedule-field]', card).forEach(field => { fields[field.dataset.scheduleField] = field.value; });
      const rules = $all('[data-schedule-rule]', card).map(rule => {
        const values = {};
        $all('[data-rule-field]', rule).forEach(field => { values[field.dataset.ruleField] = field.value; });
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

