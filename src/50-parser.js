  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (char === ',' && !quoted) { row.push(cell); cell = ''; continue; }
      if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && text[index + 1] === '\n') index += 1;
        row.push(cell); rows.push(row); row = []; cell = ''; continue;
      }
      cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function getSheetIdentity(url) {
    const match = String(url || '').match(/\/spreadsheets\/d\/([^/]+)/);
    if (!match) throw new Error('Це не посилання на Google Таблицю.');
    const gid = String(url).match(/[?#&]gid=(\d+)/)?.[1] || '0';
    return { id: match[1], gid };
  }

  function getSameOriginSheetCsvUrl(url) {
    const sheet = getSheetIdentity(url);
    return `https://docs.google.com/spreadsheets/d/${sheet.id}/export?format=csv&gid=${sheet.gid}`;
  }

  function requestGoogleSheetCsv(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        anonymous: false,
        onload: response => {
          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`Google повернув HTTP ${response.status}.`));
            return;
          }
          resolve(response.responseText || '');
        },
        onerror: response => reject(new Error(`Не вдалося завантажити повний CSV${response?.status ? `: HTTP ${response.status}` : ''}.`)),
        ontimeout: () => reject(new Error('Google не відповів вчасно.')),
        timeout: 30000,
      });
    });
  }

  async function captureOpenGoogleSheet() {
    const button = document.querySelector('#binotel-tz-sheet-capture button');
    const status = document.querySelector('#binotel-tz-sheet-capture [data-status]');
    if (button) button.disabled = true;
    if (status) status.textContent = 'Зчитую відкритий лист…';
    try {
      const csv = await requestGoogleSheetCsv(getSameOriginSheetCsvUrl(location.href));
      if (/^\s*<!doctype html|^\s*<html/i.test(csv)) throw new Error('Google повернув сторінку входу замість даних листа.');
      const rows = parseCsv(csv).filter(row => row.some(cell => clean(cell)));
      if (!rows.length) throw new Error('Відкритий лист порожній або не прочитався.');
      const payload = {
        url: location.href,
        title: clean(document.title),
        sheetId: getSheetIdentity(location.href).id,
        gid: getSheetIdentity(location.href).gid,
        rows,
        capturedAt: new Date().toISOString(),
      };
      GM_setValue(CONFIG.tzCaptureStorageKey, JSON.stringify(payload));
      if (status) status.textContent = `Збережено: ${rows.length} непорожніх рядків. Тепер відкрий панель Binotel.`;
    } catch (error) {
      if (status) status.textContent = `Помилка: ${error.message || error}`;
    } finally {
      if (button) button.disabled = false;
    }
  }

  function renderGoogleSheetCapture() {
    if (!document.querySelector('#binotel-tz-sheet-capture-style')) {
      const style = GM_addStyle(`
        #binotel-tz-sheet-capture{position:fixed!important;right:18px!important;bottom:18px!important;z-index:2147483647!important;width:330px!important;box-sizing:border-box!important;padding:12px!important;border:2px solid #0f766e!important;border-radius:10px!important;background:#fff!important;color:#172033!important;font:14px/1.35 Arial,sans-serif!important;box-shadow:0 12px 38px #0005!important;display:block!important;visibility:visible!important;opacity:1!important}
        #binotel-tz-sheet-capture button{display:block!important;width:100%!important;margin:9px 0!important;padding:9px!important;border:0!important;border-radius:7px!important;background:#0f766e!important;color:#fff!important;font-weight:700!important;cursor:pointer!important}
        #binotel-tz-sheet-capture button:disabled{opacity:.65!important;cursor:wait!important}
      `);
      if (style) style.id = 'binotel-tz-sheet-capture-style';
    }
    if (document.querySelector('#binotel-tz-sheet-capture')) return;
    const panel = document.createElement('div');
    panel.id = 'binotel-tz-sheet-capture';
    const title = document.createElement('b');
    title.textContent = `Binotel TZ helper ${SCRIPT_VERSION}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Зчитати відкритий лист ТЗ';
    const status = document.createElement('div');
    status.dataset.status = 'true';
    status.textContent = 'Відкрий потрібний лист і натисни кнопку.';
    panel.append(title, button, status);
    document.documentElement.appendChild(panel);
    button.addEventListener('click', captureOpenGoogleSheet);
  }

  function tzRowText(row) {
    return normalize((row || []).join(' | '));
  }

  function findTzRow(rows, pattern, start = 0, end = rows.length) {
    for (let index = Math.max(0, start); index < Math.min(rows.length, end); index += 1) {
      if (pattern.test(tzRowText(rows[index]))) return index;
    }
    return -1;
  }

  function findTzCell(row, pattern) {
    return (row || []).findIndex(cell => pattern.test(normalize(cell)));
  }

  function nextTzValue(row, labelIndex) {
    return clean((row || []).slice(labelIndex + 1).find(cell => clean(cell)) || '');
  }

  function isTzPlaceholder(value) {
    return /^(ні|нет|no)$|укаж(е|ет) сама|вкаже сама|не потребує налаштування|не потрібн/i.test(normalize(value));
  }

  function normalizeTzPhone(value) {
    let digits = digitsOnly(value);
    if (digits.startsWith('0038')) digits = digits.slice(2);
    return digits.length >= 10 ? digits : '';
  }

  function extractTzPhones(value) {
    const matches = String(value || '').match(/(?:\+?38\d{10}|0\d{9})/g) || [];
    return [...new Set(matches.map(normalizeTzPhone).filter(Boolean))];
  }

  function expandTzNumbers(value) {
    const result = [];
    String(value || '').split(/[,;\n]+/).map(clean).filter(Boolean).forEach(part => {
      const range = part.match(/^(\d{3,})\s*[-–—]\s*(\d{3,})$/);
      if (range) {
        const first = Number(range[1]);
        const last = Number(range[2]);
        if (last >= first && last - first <= 100) {
          for (let number = first; number <= last; number += 1) result.push(String(number));
          return;
        }
      }
      const direct = part.match(/^\d{3,}$/);
      if (direct) result.push(direct[0]);
    });
    return [...new Set(result)];
  }

  function tzLanguageCode(value) {
    const text = normalize(value);
    if (/укра/.test(text)) return 'ua';
    if (/рус|рос/.test(text)) return 'ru';
    if (/англ|english/.test(text)) return 'en';
    if (/поль|polsk/.test(text)) return 'pl';
    if (/ісп|исп|espa/.test(text)) return 'es';
    if (/нім|нем|deutsch/.test(text)) return 'de';
    if (/груз|georg/.test(text)) return 'ge';
    return '';
  }

  function tzVoiceKey(value) {
    const text = normalize(value);
    if (!/голосове|повідомлення|робоч|неробоч|вихідн|вибачте|чекайте|feedback/.test(text)) return '';
    if (/вибачте/.test(text)) return 'ua_sorryvm';
    if (/чекайте|очікуван/.test(text)) return 'ua_waiting';
    if (/вихідн/.test(text)) return 'ua_weekend';
    if (/неробоч/.test(text)) return 'ua_off-hoursvm';
    if (/feedback|фідбек|заклик/.test(text) && !/без\s*(feedback|фідбек)/.test(text)) {
      const speaker = feedbackSpeakerFromText(text) || 'dslobodenyuk';
      return `${FEEDBACK_SPEAKERS[speaker].voicePrefix}_greeting-with-feedback-appeal-v1`;
    }
    if (/робоч/.test(text)) return 'ua_greeting';
    return '';
  }

  function feedbackSpeakerFromText(value) {
    const text = clean(value);
    return Object.entries(FEEDBACK_SPEAKERS).find(([, speaker]) => speaker.aliases.test(text))?.[0] || '';
  }

  function tzDays(value) {
    const text = normalize(value).replace(/\s+/g, '');
    const aliases = [
      { pattern: /^(пн|mon)/, day: 'mon' }, { pattern: /^(вт|tue)/, day: 'tue' },
      { pattern: /^(ср|wed)/, day: 'wed' }, { pattern: /^(чт|thu)/, day: 'thu' },
      { pattern: /^(пт|fri)/, day: 'fri' }, { pattern: /^(сб|sat)/, day: 'sat' },
      { pattern: /^(нд|неділя|вс|воскресенье|sun)/, day: 'sun' },
    ];
    const dayOrder = aliases.map(item => item.day);
    const range = text.split(/[-–—]/).filter(Boolean);
    if (range.length === 2) {
      const start = aliases.find(item => item.pattern.test(range[0]))?.day;
      const end = aliases.find(item => item.pattern.test(range[1]))?.day;
      const startIndex = dayOrder.indexOf(start);
      const endIndex = dayOrder.indexOf(end);
      if (startIndex >= 0 && endIndex >= startIndex) return dayOrder.slice(startIndex, endIndex + 1);
    }
    const tokenPatterns = [
      [/пн|mon/, 'mon'], [/вт|tue/, 'tue'], [/ср|wed/, 'wed'], [/чт|thu/, 'thu'],
      [/пт|fri/, 'fri'], [/сб|sat/, 'sat'], [/(нд|неділя|вс|воскресенье)|sun/, 'sun'],
    ];
    return tokenPatterns.filter(([pattern]) => pattern.test(text)).map(([, day]) => day);
  }

  function parseTzSnapshot(sourceRows, current) {
    const rows = (sourceRows || []).map(row => (row || []).map(clean));
    const section = {
      numbers: findTzRow(rows, /1\.\s*номери компанії/),
      endpoints: findTzRow(rows, /2\.\s*внутрішні лінії/),
      departments: findTzRow(rows, /3\.\s*відділи/),
      groups: findTzRow(rows, /4\.\s*групи співробітників/),
      scenarios: findTzRow(rows, /5\.\s*сценарії для вхідних/),
      backupNumbers: findTzRow(rows, /5\.1\.\s*запасні номери/),
      routes: findTzRow(rows, /6\.\s*маршрути для вихідних/),
      routesEnd: findTzRow(rows, /6\.1\s*автообробка/),
      access: findTzRow(rows, /7\.\s*e-mail для отримання/),
      voices: findTzRow(rows, /8\.\s*голосові повідомлення/),
      feedback: findTzRow(rows, /8\.1\.\s*голосові повідомлення\s*feedback/),
      voicesEnd: findTzRow(rows, /9\.\s*(сrm|crm)/),
      block11: findTzRow(rows, /11\.\s*тимчасове альфа ім['’]?я/),
      block12: findTzRow(rows, /12\.\s*getcall/),
    };
    const issues = {};
    const patch = {
      endpointRows: [], ringGroupItems: [], gsmNumberItems: [], departmentItems: [],
      scenarioItems: [], scheduleItems: [], feedbackItems: [], standardVoiceMessages: '', manualRouteInstructions: '',
    };

    const headEnd = section.numbers >= 0 ? section.numbers : Math.min(rows.length, 12);
    const headerRows = rows.slice(0, headEnd);
    const tariff = headerRows.flat().find(cell => TARIFFS.some(item => normalize(item) === normalize(cell)));
    const regionRow = findTzRow(rows, /^регіон$|\| регіон \|/, 0, headEnd);
    const languageRow = findTzRow(rows, /мова mybusiness/, 0, headEnd);
    const regionCell = regionRow >= 0 ? findTzCell(rows[regionRow], /^регіон$/) : -1;
    const languageCell = languageRow >= 0 ? findTzCell(rows[languageRow], /мова mybusiness/) : -1;
    const region = regionRow >= 0 ? nextTzValue(rows[regionRow], regionCell) : '';
    const language = languageRow >= 0 ? tzLanguageCode(nextTzValue(rows[languageRow], languageCell)) : '';
    if (tariff) patch.tariff = TARIFFS.find(item => normalize(item) === normalize(tariff)) || tariff;
    if (region) patch.region = region;
    if (language) patch.language = language;
    patch.skipCompanyParams = false;
    patch.regionNotImportant = false;
    const missingCompany = [!tariff && 'пакет', !region && 'регіон', !language && 'мова MyBusiness'].filter(Boolean);
    if (missingCompany.length) issues.company = `Не розпізнано: ${missingCompany.join(', ')}.`;

    const numberEnd = section.endpoints >= 0 ? section.endpoints : rows.length;
    const phoneRow = findTzRow(rows, /номери телефонів.*форматі/, section.numbers + 1, numberEnd);
    const phoneNameRow = findTzRow(rows, /підписати номер у лк як/, section.numbers + 1, numberEnd);
    if (phoneRow >= 0) {
      const phoneLabelColumn = findTzCell(rows[phoneRow], /номери телефонів.*форматі/);
      rows[phoneRow].forEach((cell, column) => {
        if (column <= phoneLabelColumn) return;
        extractTzPhones(cell).forEach(number => patch.gsmNumberItems.push({
          number,
          name: phoneNameRow >= 0 ? clean(rows[phoneNameRow][column]) : '',
          email: '',
          createTemporary: false,
          operatorDependency: true,
        }));
      });
    }
    if (section.numbers < 0) issues.gsmNumbers = 'Не знайдено розділ 1 з номерами компанії.';
    else if (!patch.gsmNumberItems.length) issues.gsmNumbers = 'Розділ номерів знайдено, але жодного номера не розпізнано.';

    const endpointEnd = section.departments >= 0 ? section.departments : rows.length;
    const endpointNumberRow = findTzRow(rows, /вкажіть нумерацію внутрішніх ліній/, section.endpoints + 1, endpointEnd);
    const endpointNameRow = findTzRow(rows, /ім['’]?я та прізвище співробітника/, section.endpoints + 1, endpointEnd);
    const endpointEmailRow = findTzRow(rows, /e-mail співробітника/, section.endpoints + 1, endpointEnd);
    const endpointPhoneRow = findTzRow(rows, /контактний номер телефону співробітника/, section.endpoints + 1, endpointEnd);
    if (endpointNumberRow >= 0) {
      rows[endpointNumberRow].forEach((cell, column) => {
        expandTzNumbers(cell).forEach(number => {
          const accessName = endpointNameRow >= 0 ? clean(rows[endpointNameRow][column]) : '';
          const email = endpointEmailRow >= 0 ? clean(rows[endpointEmailRow][column]) : '';
          const mobilePhoneNumber = endpointPhoneRow >= 0 ? normalizeTzPhone(rows[endpointPhoneRow][column]) : '';
          const createAccess = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !isTzPlaceholder(accessName);
          patch.endpointRows.push({
            number, createAccess, accessName: createAccess ? accessName : '', email: createAccess ? email : '',
            mobilePhoneNumber: createAccess ? mobilePhoneNumber : '', role: 'employee',
            accessNote: createAccess ? '' : [accessName, email].filter(Boolean).join('; ') || 'Дані доступу не вказані в ТЗ',
          });
        });
      });
    }

    if (section.access >= 0 && patch.endpointRows.length) {
      const accessEnd = section.voices >= 0 ? section.voices : rows.length;
      const accessHeaderRow = findTzRow(rows, /адреси ел\. пошти для/, section.access, accessEnd);
      const accessValuesRow = accessHeaderRow >= 0 ? accessHeaderRow + 1 : -1;
      const adminPhoneRow = findTzRow(rows, /зв['’]?язатися з адміністратором/, section.access, accessEnd);
      const accessNameRow = findTzRow(rows, /ім['’]?я користувача/, section.access, accessEnd);
      const accessRoleRow = findTzRow(rows, /^посада|\| посада/, section.access, accessEnd);
      const accessByEmail = new Map();
      if (accessHeaderRow >= 0 && accessValuesRow < rows.length) {
        rows[accessHeaderRow].forEach((heading, column) => {
          if (!/власник|директор|адміністративний доступ/.test(normalize(heading))) return;
          const email = clean(rows[accessValuesRow][column]);
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
          const candidate = accessByEmail.get(normalize(email)) || { email, name: '', phone: '', role: 'administrator' };
          const phone = adminPhoneRow >= 0 ? normalizeTzPhone(rows[adminPhoneRow][column]) : '';
          const name = accessNameRow >= 0 ? clean(rows[accessNameRow][column]) : '';
          if (phone) candidate.phone = phone;
          if (name && !isTzPlaceholder(name)) candidate.name = name;
          if (accessRoleRow >= 0 && /влас|влад|директор|адмін/.test(normalize(rows[accessRoleRow][column]))) candidate.role = 'administrator';
          accessByEmail.set(normalize(email), candidate);
        });
      }
      accessByEmail.forEach(access => {
        const endpoint = patch.endpointRows.find(item => normalize(item.email) === normalize(access.email));
        if (!endpoint) return;
        endpoint.createAccess = true;
        endpoint.accessName = access.name || endpoint.accessName;
        endpoint.mobilePhoneNumber = access.phone || endpoint.mobilePhoneNumber;
        endpoint.role = access.role;
        endpoint.accessNote = '';
      });
    }
    if (section.endpoints < 0) issues.endpoints = 'Не знайдено розділ 2 з внутрішніми лініями.';
    else if (!patch.endpointRows.length) issues.endpoints = 'Розділ ВЛ знайдено, але номери ліній не розпізнано.';

    const departmentEnd = section.groups >= 0 ? section.groups : rows.length;
    const departmentNumberRow = findTzRow(rows, /^номери(\s|\|)/, section.departments + 1, departmentEnd);
    const departmentLinesRow = findTzRow(rows, /^лінії(\s|\|)/, section.departments + 1, departmentEnd);
    const departmentNameRow = departmentNumberRow > section.departments ? departmentNumberRow - 1 : -1;
    if (departmentNameRow >= 0) {
      const width = Math.max(rows[departmentNameRow].length, rows[departmentNumberRow]?.length || 0, rows[departmentLinesRow]?.length || 0);
      for (let column = 1; column < width; column += 1) {
        const name = clean(rows[departmentNameRow][column]);
        if (!name || /^номери$|^лінії$/i.test(name)) continue;
        patch.departmentItems.push({
          name,
          phoneNumbers: departmentNumberRow >= 0 ? extractTzPhones(rows[departmentNumberRow][column]) : [],
          endpoints: departmentLinesRow >= 0 ? expandTzNumbers(rows[departmentLinesRow][column]) : [],
        });
      }
    }
    if (section.departments < 0) issues.departments = 'Не знайдено розділ 3 з відділами.';
    else if (!patch.departmentItems.length) issues.departments = 'Розділ відділів знайдено, але відділи не розпізнано.';

    const groupEnd = section.scenarios >= 0 ? section.scenarios : rows.length;
    const groupNumberRow = findTzRow(rows, /вкажіть номери груп/, section.groups + 1, groupEnd);
    const groupNameRow = findTzRow(rows, /вкажіть назву групи/, section.groups + 1, groupEnd);
    const groupLinesRow = findTzRow(rows, /внутрішні номери працівників/, section.groups + 1, groupEnd);
    if (groupNumberRow >= 0) {
      rows[groupNumberRow].forEach((cell, column) => {
        expandTzNumbers(cell).forEach(number => patch.ringGroupItems.push({
          number,
          name: groupNameRow >= 0 ? clean(rows[groupNameRow][column]) : '',
          endpoints: groupLinesRow >= 0 ? expandTzNumbers(rows[groupLinesRow][column]) : [],
        }));
      });
    }
    if (section.groups < 0) issues.ringGroups = 'Не знайдено розділ 4 з групами.';
    else if (!patch.ringGroupItems.length) issues.ringGroups = 'Розділ груп знайдено, але групи не розпізнано.';

    const voiceEnd = section.feedback >= 0 ? section.feedback : (section.voicesEnd >= 0 ? section.voicesEnd : rows.length);
    const voiceKeys = new Set();
    if (section.voices >= 0) {
      for (let index = section.voices + 1; index < voiceEnd; index += 1) {
        if (!/стандарт.*укра/.test(tzRowText(rows[index]))) continue;
        const key = tzVoiceKey(rows[index].join(' '));
        if (key && !/greeting-with-feedback-appeal/.test(key)) voiceKeys.add(key);
      }
    } else {
      issues.voiceMessages = 'Не знайдено розділ 8 з голосовими повідомленнями.';
    }

    if (section.feedback >= 0) {
      const feedbackEnd = section.voicesEnd >= 0 ? section.voicesEnd : rows.length;
      const beginningRow = findTzRow(rows, /feedback\s*початок/i, section.feedback + 1, feedbackEnd);
      const csatRow = findTzRow(rows, /питання\s*від\s*1\s*[-–—]\s*5|оцінк.*1\s*[-–—]\s*5/i, section.feedback + 1, feedbackEnd);
      const selectRow = findTzRow(rows, /вибір\s*зі\s*списку|що\s*слід\s*покращити/i, section.feedback + 1, feedbackEnd);
      const thanksRow = findTzRow(rows, /feedback\s*подяк|feedback\s*вдяч/i, section.feedback + 1, feedbackEnd);
      const nameSearchEnd = beginningRow >= 0 ? beginningRow : Math.min(section.feedback + 5, feedbackEnd);
      const feedbackNameRow = rows.findIndex((row, index) => index > section.feedback && index < nameSearchEnd && row.slice(1).some(cell => clean(cell) && !isTzPlaceholder(cell) && !feedbackSpeakerFromText(cell)));
      const width = Math.max(...rows.slice(section.feedback, feedbackEnd).map(row => row.length), 1);
      for (let column = 1; column < width; column += 1) {
        const name = clean(rows[feedbackNameRow]?.[column]);
        if (!name || isTzPlaceholder(name) || /вкажи\s*назву/i.test(name)) continue;
        const samples = [beginningRow, csatRow, selectRow, thanksRow]
          .filter(index => index >= 0)
          .map(index => clean(rows[index]?.[column]));
        const speaker = feedbackSpeakerFromText(samples.join(' '));
        const selectValue = selectRow >= 0 ? clean(rows[selectRow]?.[column]) : '';
        const includeSelect = Boolean(selectValue) && !isTzPlaceholder(selectValue) && !/не\s*потріб|не\s*нуж/i.test(normalize(selectValue));
        patch.feedbackItems.push({
          key: `feedback-${patch.feedbackItems.length + 1}`,
          name,
          speaker,
          includeSelect,
        });
        if (!speaker) issues.feedback = `Feedback "${name}": не розпізнано диктора.`;
        if (beginningRow < 0 || csatRow < 0 || thanksRow < 0) issues.feedback = `Feedback "${name}": не знайдено всі обов’язкові рядки початку, CSAT і подяки.`;
      }
      if (!patch.feedbackItems.length) issues.feedback = 'Розділ 8.1 знайдено, але Feedback-об’єкти не розпізнано.';
    }

    const scenarioEnd = section.backupNumbers >= 0 ? section.backupNumbers : (section.routes >= 0 ? section.routes : rows.length);
    const scenarioNameRow = findTzRow(rows, /робочий час|неробочий час/, section.scenarios + 1, scenarioEnd);
    const scenarioNumberRow = scenarioNameRow >= 0 ? scenarioNameRow + 1 : -1;
    if (scenarioNameRow >= 0) {
      for (let column = 1; column < rows[scenarioNameRow].length; column += 1) {
        const name = clean(rows[scenarioNameRow][column]);
        if (!name || /^сценарій\s*\d+/i.test(name)) continue;
        const actions = [];
        let pendingTargetIndex = -1;
        let pendingTargetType = '';
        for (let index = scenarioNumberRow + 1; index < scenarioEnd; index += 1) {
          const value = clean(rows[index][column]);
          if (!value) continue;
          const rowContext = `${clean(rows[index]?.[0])} ${value}`;
          const voiceKey = tzVoiceKey(rowContext);
          if (/голосове повідомлення|привітання|feedback|фідбек/i.test(rowContext) && voiceKey) {
            actions.push({ type: 'voice', voiceKey });
            if (!/greeting-with-feedback-appeal/.test(voiceKey)) voiceKeys.add(voiceKey);
            pendingTargetIndex = -1;
            pendingTargetType = '';
            continue;
          }
          const call = value.match(/(?:дзвінок|виклик)\D{0,15}(\d{3,})/i);
          if (call) {
            const target = call[1];
            const type = patch.ringGroupItems.some(item => clean(item.number) === target) ? 'ringGroup' : 'endpoint';
            actions.push({ type, target, timeout: '40' });
            pendingTargetIndex = actions.length - 1;
            pendingTargetType = '';
            continue;
          }
          if (/випадковий вибір із групи|дзвінок на групу|груповий виклик/i.test(value)) {
            pendingTargetType = 'ringGroup';
            pendingTargetIndex = -1;
            continue;
          }
          if (/дзвінок на внутрішню лінію|виклик внутрішньої лінії/i.test(value)) {
            pendingTargetType = 'endpoint';
            pendingTargetIndex = -1;
            continue;
          }
          if (pendingTargetType && /^\d{3,}$/.test(digitsOnly(value))) {
            actions.push({ type: pendingTargetType, target: digitsOnly(value), timeout: '40' });
            pendingTargetIndex = actions.length - 1;
            pendingTargetType = '';
            continue;
          }
          const seconds = value.match(/^(\d{1,3})\s*(?:сек|с\.?$)/i)?.[1];
          if (pendingTargetIndex >= 0 && seconds) {
            actions[pendingTargetIndex].timeout = seconds;
            pendingTargetIndex = -1;
          }
        }
        const incomingNumbers = scenarioNumberRow >= 0 ? extractTzPhones(rows[scenarioNumberRow][column]) : [];
        if (!actions.length && !incomingNumbers.length) continue;
        const usesFeedback = actions.some(action => action.type === 'voice' && /greeting-with-feedback-appeal/.test(action.voiceKey));
        const feedbackName = usesFeedback && patch.feedbackItems.length === 1 ? clean(patch.feedbackItems[0].name) : '';
        if (usesFeedback && patch.feedbackItems.length !== 1) {
          issues.scenarios = `Сценарій "${name}" використовує Feedback, але однозначний об’єкт з блока 8.1 не визначено.`;
        }
        patch.scenarioItems.push({
          key: `scenario-${patch.scenarioItems.length + 1}`,
          name,
          type: /неробоч/.test(normalize(name)) ? 'offHours' : 'working',
          feedbackName,
          actions,
          incomingNumbers,
        });
      }
    }

    const workScheduleRow = findTzRow(rows, /^графік роботи|графік роботи \|/, section.numbers + 1, section.endpoints >= 0 ? section.endpoints : rows.length);
    if (workScheduleRow >= 0 && patch.scenarioItems.length) {
      const working = patch.scenarioItems.find(item => item.type === 'working') || patch.scenarioItems[0];
      const offHours = patch.scenarioItems.find(item => item.type === 'offHours');
      const weekend = patch.scenarioItems.find(item => /вихідн|выходн/.test(normalize(item.name)));
      const rules = [];
      for (let index = workScheduleRow + 1; index < section.endpoints; index += 1) {
        rows[index].forEach((cell, column) => {
          const value = clean(cell);
          const header = rows[index - 1]?.[column] || rows[index]?.[column - 1] || '';
          const days = tzDays(header);
          const time = value.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
          if (time && days.length) {
            rules.push({ start: time[1].padStart(5, '0'), end: time[2].padStart(5, '0'), days, scenarioName: working.name });
            return;
          }
          if (/вихідн|выходн/.test(normalize(value)) && days.length && weekend) {
            rules.push({ start: '', end: '', allDay: true, days, scenarioName: weekend.name, rule: `*,${days.join(',')},*,*` });
          }
        });
      }
      const incomingNumbers = [...new Set(patch.scenarioItems.flatMap(item => item.incomingNumbers || []))];
      patch.scheduleItems.push({
        name: 'Графік роботи', mode: rules.length ? 'custom' : 'always', rules,
        fallbackScenarioName: offHours?.name || working.name, incomingNumbers,
      });
    }
    if (section.scenarios < 0) issues.scenarios = 'Не знайдено розділ 5 зі сценаріями.';
    else if (!patch.scenarioItems.length) issues.scenarios = 'Розділ сценаріїв знайдено, але сценарії не розпізнано.';
    else if (patch.scenarioItems.some(item => !item.actions.length)) issues.scenarios = `Без дій: ${patch.scenarioItems.filter(item => !item.actions.length).map(item => item.name).join(', ')}.`;
    patch.standardVoiceMessages = [...voiceKeys].join('\n');

    if (section.routes >= 0) {
      const routeEnd = section.routesEnd >= 0 ? section.routesEnd : rows.length;
      const routeNumberRow = findTzRow(rows, /виділити блакитним номери/, section.routes, routeEnd);
      const directionsRow = routeNumberRow >= 2 ? routeNumberRow - 2 : -1;
      if (routeNumberRow >= 0 && directionsRow >= 0) {
        const department = clean(rows[directionsRow][0]);
        const routes = [];
        for (let column = 1; column < rows[directionsRow].length; column += 1) {
          const direction = clean(rows[directionsRow][column]);
          const number = extractTzPhones(rows[routeNumberRow][column])[0];
          if (direction && number) routes.push(`${direction}: ${number}`);
        }
        patch.manualRouteInstructions = `${department ? `Відділ ${department}. ` : ''}${routes.join('; ')}`;
      } else {
        patch.manualRouteInstructions = 'Виконати вихідні маршрути вручну відповідно до блока 6 ТЗ.';
      }
    }

    if (section.block11 >= 0) {
      const useRow = findTzRow(rows, /чи буде клієнт використовувати альфа ім['’]?я binsms/, section.block11, section.block12 >= 0 ? section.block12 : rows.length);
      const labelCell = useRow >= 0 ? findTzCell(rows[useRow], /чи буде клієнт використовувати/) : -1;
      const value = useRow >= 0 ? nextTzValue(rows[useRow], labelCell) : '';
      patch.block11Enabled = /^(так|да|yes)$/i.test(normalize(value));
      patch.block11AlphaName = 'BinSMS';
      patch.block11Gateway = 'Binotel';
    } else {
      issues.block11 = 'Не знайдено розділ 11 з тимчасовим альфа-іменем.';
    }

    const blockStates = {};
    TZ_BLOCKS.forEach(block => {
      const previous = getBlockState(current, block.id);
      blockStates[block.id] = { ignored: previous.ignored, issue: previous.ignored ? '' : (issues[block.id] || '') };
    });
    return { patch, blockStates, issues };
  }

  async function readTzFromSheet() {
    const modal = $(`#${CONFIG.modalId}`);
    let captured;
    try {
      captured = JSON.parse(GM_getValue(CONFIG.tzCaptureStorageKey, '') || 'null');
    } catch (error) {
      captured = null;
    }
    if (!captured?.rows?.length) {
      throw new Error('Спочатку відкрий потрібний лист Google Таблиці та натисни там «Зчитати відкритий лист ТЗ».');
    }
    const nonEmpty = captured.rows;
    if (!nonEmpty.length) throw new Error('Таблиця прочитана, але вибраний лист порожній.');
    const current = collectModalDraft();
    const parsed = parseTzSnapshot(nonEmpty, current);
    const next = saveDraft(applyStructuredCompatibility({
      ...current,
      ...parsed.patch,
      tzUrl: captured.url,
      blockStates: parsed.blockStates,
      tzSnapshot: nonEmpty,
      tzReadIssues: Object.keys(parsed.issues),
      tzReadAt: new Date().toISOString(),
    }));
    const recognizedCount = TZ_BLOCKS.length - Object.keys(parsed.issues).length;
    log(`ТЗ розібрано: ${captured.title || 'ТЗ'}, розпізнано блоків ${recognizedCount}/${TZ_BLOCKS.length}.`, Object.keys(parsed.issues).length ? 'warn' : 'success');
    Object.entries(parsed.issues).forEach(([blockId, issue]) => log(`Блок ${TZ_BLOCKS.find(item => item.id === blockId)?.number || blockId}: ${issue}`, 'warn'));
    renderModal();
    $(`#${CONFIG.modalId}`).classList.add('open');
    return next;
  }
