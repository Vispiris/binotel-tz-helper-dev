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
