import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const userscript = fs.readFileSync(path.join(root, 'tampermonkey', 'binotel-tz-helper-safe-dev.user.js'), 'utf8');
const source = userscript.slice(userscript.indexOf('(function () {'));
const context = {
  __BINOTEL_TZ_HELPER_TEST__: true,
  console,
  URL,
  URLSearchParams,
  setTimeout,
  clearTimeout,
};
context.location = { hostname: 'panel.binotel.com', pathname: '/', search: '?module=pbxScheme&companyID=10689&showProjectID=101982' };
context.window = { location: context.location };
context.globalThis = context;
vm.runInNewContext(source, context, { filename: 'binotel-tz-helper-safe-dev.user.js' });

const api = context.__BINOTEL_TZ_HELPER_TEST_API__;
assert.ok(api, 'test API should be exposed');

const rows = [
  ['Pro +'],
  ['Регіон', 'Україна'],
  ['Мова MyBusiness', 'Українська'],
  ['1. Номери компанії, які підключаємо до ВАТС'],
  ['Номери телефонів (у форматі 0931112233)', '0959999999'],
  ['Дані для підключення номера', 'Підключення картки, яка буде встановлена пізніше'],
  ['Графік роботи'],
  ['', 'Пн-Сб:', 'Неділя:', 'Решта часу неробочий?'],
  ['', '10:00 - 20:00', 'вихідний', 'так'],
  ['2. Внутрішні лінії для працівників'],
  ['Вкажіть нумерацію внутрішніх ліній', '901000', '902000'],
  ['3. Відділи'],
  ['', 'Відділ продажів'],
  ['Номери', '0959999999'],
  ['Лінії', '901000, 902000'],
  ['4. Групи співробітників'],
  ['Вкажіть номери груп', '801'],
  ['Вкажіть назву групи', 'Продажі'],
  ['Внутрішні номери працівників', '901000, 902000'],
  ['5. Сценарії для вхідних дзвінків'],
  ['', 'Робочий час з Feedback', 'Неробочий час', 'Вихідний день'],
  ['', '0959999999', '0959999999', '0959999999'],
  ['Голосове повідомлення "Робочий час З Feedback" Назва Об’єкта: Загальна', 'Стандартне українською', '', ''],
  ['Вказати час дозвону', 'Випадковий вибір із групи', '', ''],
  ['Вибрати потрібне правило сценарію', '801', '', ''],
  ['Вказати назву групи', '30 секунд', '', ''],
  ['Голосове повідомлення "Чекайте"', 'Стандартне українською', '', ''],
  ['', 'Дзвінок на внутрішню лінію', '', ''],
  ['', '901000', '', ''],
  ['', '35 секунд', '', ''],
  ['Голосове повідомлення "Вибачте"', 'Стандартне українською', '', ''],
  ['Голосове повідомлення "Неробочий час"', '', 'Стандартне повідомлення', ''],
  ['Голосове повідомлення "Вихідний день"', '', '', 'Стандартне повідомлення'],
  ['5.1. Запасні номери'],
  ['6. Маршрути для вихідних дзвінків'],
  ['7. E-mail для отримання'],
  ['8. Голосові повідомлення'],
  ['8.1. Голосові повідомлення Feedback'],
  ['', 'Загальна'],
  ['Голосове повідомлення "Feedback початок"', 'Стандартне Соловйова УКР'],
  ['Питання від 1-5', 'Стандартне Соловйова УКР'],
  ['Запитання Вибір зі списку', 'Не потрібно'],
  ['Голосове повідомлення "Feedback подяка"', 'Стандартне Соловйова УКР'],
  ['9. CRM для інтеграції'],
];

const parsed = api.parseTzSnapshot(rows, {}).patch;
assert.deepEqual(JSON.parse(JSON.stringify(parsed.endpointRows.map(item => item.number))), ['901000', '902000']);
assert.equal(parsed.tariff, 'Pro+');
assert.equal(parsed.gsmNumberItems[0].operatorDependency, false);
assert.equal(parsed.gsmNumberItems[0].createTemporary, true);
assert.equal(parsed.externallyProvisionedNumbers, '');
assert.equal(parsed.feedbackItems.length, 1);
assert.deepEqual(JSON.parse(JSON.stringify(parsed.feedbackItems[0])), {
  key: 'feedback-1',
  name: 'Загальна',
  speaker: 'usolovyova',
  includeSelect: false,
});
assert.equal(parsed.scenarioItems.length, 3);
assert.equal(parsed.scenarioItems[0].feedbackName, 'Загальна');
assert.equal(parsed.scenarioItems[0].actions[0].voiceKey, 'ua_usolovyova_greeting-with-feedback-appeal-v1');
assert.deepEqual(JSON.parse(JSON.stringify(parsed.scenarioItems[0].actions.slice(1))), [
  { type: 'ringGroup', target: '801', timeout: '30' },
  { type: 'voice', voiceKey: 'ua_waiting' },
  { type: 'endpoint', target: '901000', timeout: '35' },
  { type: 'voice', voiceKey: 'ua_sorryvm' },
]);
assert.equal(parsed.scenarioItems.find(item => item.name === 'Вихідний день').type, 'offHours');
assert.equal(api.feedbackVoicePath(parsed.feedbackItems[0], 'beginning'), 'vOffice/base/production/voice/ua_usolovyova_feedback-beginning-v1');
assert.equal(api.feedbackVoicePath(parsed.feedbackItems[0], 'csat'), 'vOffice/base/production/voice/ua_usolovyova_feedback-csat-v1');
assert.equal(api.feedbackVoicePath(parsed.feedbackItems[0], 'thanks'), 'vOffice/base/production/voice/ua_usolovyova_feedback-thanks-v1');

assert.equal(parsed.scheduleItems.length, 1);
assert.equal(api.makeScheduleRuleString(parsed.scheduleItems[0].rules[0]), '10:00-20:00,mon,tue,wed,thu,fri,sat,*,*');
assert.equal(parsed.scheduleItems[0].rules[1].rule, '*,sun,*,*');
assert.equal(parsed.scheduleItems[0].rules[1].allDay, true);
assert.equal(api.makeScheduleRuleString({ allDay: true, days: ['sun'] }), '*,sun,*,*');
assert.equal(api.isValidEndpointNumber('100'), true);
assert.equal(api.isValidEndpointNumber('901000'), true);
assert.equal(api.isValidEndpointNumber('902000'), true);
assert.equal(api.isValidEndpointNumber('99'), false);
assert.equal(api.isValidEndpointNumber('001'), false);
assert.equal(api.isValidEndpointNumber('10A'), false);
const validationDraft = api.applyStructuredCompatibility({
  ...JSON.parse(JSON.stringify(parsed)),
  companyId: '10689', projectId: '101982', tzUrl: 'https://docs.google.com/test',
  skipCompanyParams: true, blockStates: {},
});
assert.doesNotThrow(() => api.validateDraft(validationDraft));
const withoutIncoming = JSON.parse(JSON.stringify(validationDraft));
withoutIncoming.scheduleItems[0].incomingNumbers = [];
assert.throws(() => api.validateDraft(withoutIncoming), /не вибрано жодного вхідного номера/);
const withUnknownEndpoint = JSON.parse(JSON.stringify(validationDraft));
withUnknownEndpoint.scenarioItems[0].actions.push({ type: 'endpoint', target: '999999', timeout: '30' });
assert.throws(() => api.validateDraft(withUnknownEndpoint), /ВЛ 999999 відсутня у блоці 2/);
const endpointPlan = api.buildExecutionPlan({
  companyId: '10689', projectId: '101982', tzUrl: 'https://docs.google.com/test',
  blockStates: {}, endpointRows: [{ number: '901000' }, { number: '902000' }],
  ringGroupsRows: '', gsmNumberItems: [], departmentsRows: '', standardVoiceMessages: '',
  scenarioItems: [], scheduleItems: [], externallyProvisionedNumbers: '', feedbackItems: [],
}).join('\n');
assert.match(endpointPlan, /2\. Внутрішні лінії[\s\S]*• ВЛ 901000[\s\S]*• ВЛ 902000/);
assert.doesNotMatch(endpointPlan, /2\. Внутрішні лінії\s*\n• Пропустити/);

const withSelect = rows.map(row => [...row]);
const selectRow = withSelect.findIndex(row => /Запитання Вибір зі списку/.test(row[0]));
withSelect[selectRow][1] = 'Стандартне Соловйова УКР';
const parsedWithSelect = api.parseTzSnapshot(withSelect, {}).patch;
assert.equal(parsedWithSelect.feedbackItems[0].includeSelect, true);
assert.equal(api.feedbackVoicePath(parsedWithSelect.feedbackItems[0], 'select'), 'vOffice/base/production/voice/ua_usolovyova_feedback-select-v1');

console.log('Feedback parser tests passed.');
