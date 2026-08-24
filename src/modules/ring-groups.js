  function findRingGroupEditButton(groupNumber) {
    const rows = $all('tr');
    const target = clean(groupNumber);

    for (const row of rows) {
      if (!clean(row.textContent).includes(target)) continue;
      const edit =
        row.querySelector('a[href*="action=edit"], a[href*="edit"], .glyphicon-wrench, .icon-edit, button, a');
      if (edit) return edit;
    }

    return null;
  }

  function findEditButtonByRowText(targetText) {
    const target = clean(targetText);
    if (!target) return null;

    const rows = $all('tr');
    for (const row of rows) {
      if (!clean(row.textContent).includes(target)) continue;
      const edit =
        row.querySelector('a[href*="action=edit"], a[href*="edit"], .glyphicon-wrench, .icon-edit, button, a');
      if (edit) return edit;
    }

    return null;
  }

  function visibleRowExistsByTarget(targetText) {
    return $all('tr, label')
      .filter(visibleElement)
      .some(item => textMatchesTarget(item.textContent, targetText));
  }

  function visibleRowExistsByName(targetText) {
    const target = clean(targetText).toLowerCase();
    if (!target) return false;

    return $all('tr')
      .filter(visibleElement)
      .some(item => clean(item.textContent).toLowerCase().includes(target));
  }

  async function waitForVisibleRows(timeoutMs = 4000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if ($all('tr').filter(visibleElement).length > 1) return true;
      await sleep(250);
    }
    return false;
  }

  function textMatchesTarget(text, targetText) {
    const target = clean(targetText);
    if (!target) return false;

    const source = clean(text);
    if (!source) return false;

    const targetDigits = digitsOnly(target);
    const sourceDigits = digitsOnly(source);

    if (/^\d+$/.test(target)) {
      const exactNumber = new RegExp(`(^|\\D)${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\D|$)`);
      if (exactNumber.test(source)) return true;

      // Для телефонних номерів панель часто ставить пробіли: 0670000000 -> 067 000 00 00.
      return targetDigits.length >= 7 && sourceDigits.includes(targetDigits);
    }

    return source.toLowerCase().includes(target.toLowerCase());
  }

  function ringGroupExists(groupNumber, groupName) {
    const number = clean(groupNumber);
    const name = clean(groupName).toLowerCase();

    return $all('tr')
      .filter(visibleElement)
      .some(row => {
        const text = clean(row.textContent);
        const lower = text.toLowerCase();
        return (
          (number && textMatchesTarget(text, number)) ||
          (name && lower.includes(name))
        );
      });
  }

  function findCheckboxByTarget(targetText) {
    const candidates = [
      ...$all('label'),
      ...$all('tr'),
      ...$all('li'),
      ...$all('div'),
    ]
      .filter(visibleElement)
      .map(element => ({
        element,
        checkbox: element.querySelector('input[type="checkbox"]'),
        text: clean(element.textContent),
      }))
      .filter(item => item.checkbox && visibleElement(item.checkbox) && textMatchesTarget(item.text, targetText))
      .sort((a, b) => a.text.length - b.text.length);

    return candidates[0] ? candidates[0].checkbox : null;
  }

  function setCheckboxByExactText(targetText, checked = true) {
    const checkbox = findCheckboxByTarget(targetText);
    if (!checkbox) return false;

    if (checkbox.checked !== checked) checkbox.click();
    return true;
  }

  function setEndpointCheckboxByLine(lineNumber, checked = true) {
    const checkbox = findCheckboxByTarget(lineNumber);
    if (!checkbox) return false;

    if (checkbox.checked !== checked) {
      checkbox.click();
    }

    return true;
  }

  function selectOptionByTextOrValue(targetText) {
    const target = clean(targetText);
    if (!target) return false;

    for (const select of $all('select')) {
      if (!visibleField(select) || select.disabled) continue;

      const options = Array.from(select.options || []);
      const option = options.find(item =>
        textMatchesTarget(item.textContent, target) ||
        textMatchesTarget(item.value, target)
      );

      if (!option) continue;

      if (select.multiple) {
        option.selected = true;
      } else {
        select.value = option.value;
      }

      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    return false;
  }

  function selectTargetOnPage(targetText) {
    return setCheckboxByExactText(targetText, true) || selectOptionByTextOrValue(targetText);
  }

  async function applyRingGroups() {
    const draft = loadDraft();
    const rows = getRingGroupItems(draft.ringGroupsRows);
    const flow = loadFlow() || {};
    const index = Number(flow.index || 0);

    if (!rows.length || index >= rows.length) {
      saveFlow({ stage: 'gsmNumbers', index: 0, ringGroupAction: '' });
      await runAutomaticFlow();
      return;
    }

    const row = rows[index];
    const groupNumber = clean(row.number);
    const groupName = clean(row.name);
    const lines = normalizeLineList(row.endpointLines);

    if (!groupNumber || !groupName) {
      throw new Error('Формат групи має бути: номер, назва, лінії. Нова група відділяється пустим рядком.');
    }

    const params = getParams();
    const isEditPage = getModule() === CONFIG.ringGroupsModule && params.get('action') === 'edit';

    if (getModule() !== CONFIG.ringGroupsModule) {
      log('Відкриваю групи виклику.', 'info');
      window.location.href = buildPanelUrl(CONFIG.ringGroupsModule);
      return;
    }

    if (isEditPage && flow.ringGroupAction !== 'create') {
      log(`Сторінка додавання групи відкрита без перевірки списку. Повертаюсь до списку, щоб не створити дубль групи ${groupNumber}.`, 'warn');
      window.location.href = buildPanelUrl(CONFIG.ringGroupsModule);
      return;
    }

    if (!isEditPage) {
      await waitForVisibleRows(5000);

      const existence = getRingGroupExistence(groupNumber, groupName, draft.projectId);
      if (existence.inTargetProject) {
        log(`Група ${groupNumber} / "${groupName}" вже існує у потрібному проєкті — пропускаю створення.`, 'success');
        saveFlow({ stage: 'ringGroups', index: index + 1, ringGroupAction: '' });
        await runAutomaticFlow();
        return;
      }

      if (existence.exists) {
        throw new Error(`Номер або назва групи ${groupNumber} / "${groupName}" уже зайняті в іншому проєкті. Потрібен інший номер; автоматична заміна заборонена.`);
      }

      log(`Створюю нову групу ${groupNumber}.`, 'info');
      saveFlow({ stage: 'ringGroups', index, ringGroupAction: 'create' });
      window.location.href = buildPanelUrl(CONFIG.ringGroupsModule, 'edit');
      return;
    }

    setFieldValue(getField('input[name="number"], #ringGroupNumber'), groupNumber);
    setFieldValue(getField('input[name="name"]'), groupName);
    const projectField = getVisibleField('select[name="projectID"]');
    if (projectField && !setSelectValue(projectField, clean(draft.projectId))) {
      throw new Error(`Не зміг вибрати проєкт ${draft.projectId} для групи ${groupNumber}.`);
    }

    const missing = [];
    const selected = [];
    lines.forEach(line => {
      if (setEndpointCheckboxByLine(line, true)) {
        selected.push(line);
      } else {
        missing.push(line);
      }
    });

    if (selected.length) {
      log(`Для групи ${groupNumber} вибрано ВЛ: ${selected.join(', ')}`, 'success');
    }

    if (missing.length) {
      log(`Не знайшов ВЛ для групи ${groupNumber}: ${missing.join(', ')}`, 'warn');
    }

    const clicked = clickButtonByText(['Сохранить', 'Зберегти', 'Добавить', 'Додати']);
    if (!clicked) throw new Error('Не знайшов кнопку збереження/додавання групи.');

    saveFlow({ stage: 'ringGroups', index: index + 1, ringGroupAction: '' });
    log(`Група ${groupNumber} збережена.`, 'success');
    await sleep(1200);
    await continueAfterRingGroupSave_();
  }

  async function continueAfterRingGroupSave_() {
    await runAutomaticFlow();
  }

