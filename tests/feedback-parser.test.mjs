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
context.globalThis = context;
vm.runInNewContext(source, context, { filename: 'binotel-tz-helper-safe-dev.user.js' });

const api = context.__BINOTEL_TZ_HELPER_TEST_API__;
assert.ok(api, 'test API should be exposed');

const rows = [
  ['Pro'],
  ['Регіон', 'Україна'],
  ['Мова MyBusiness', 'Українська'],
  ['1. Номери компанії, які підключаємо до ВАТС'],
  ['Номери телефонів (у форматі 0931112233)', '0959999999'],
  ['2. Внутрішні лінії для працівників'],
  ['Вкажіть нумерацію внутрішніх ліній', '901'],
  ['3. Відділи'],
  ['', 'Відділ продажів'],
  ['Номери', '0959999999'],
  ['Лінії', '901'],
  ['4. Групи співробітників'],
  ['Вкажіть номери груп', '801'],
  ['Вкажіть назву групи', 'Продажі'],
  ['Внутрішні номери працівників', '901'],
  ['5. Сценарії для вхідних дзвінків'],
  ['', 'Робочий час з Feedback'],
  ['', '0959999999'],
  ['Голосове повідомлення "Привітання із Feedback закликом" Для ОТП: Версія 1', 'Стандартне Соловйова УКР'],
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
assert.equal(parsed.feedbackItems.length, 1);
assert.deepEqual(JSON.parse(JSON.stringify(parsed.feedbackItems[0])), {
  key: 'feedback-1',
  name: 'Загальна',
  speaker: 'usolovyova',
  includeSelect: false,
});
assert.equal(parsed.scenarioItems.length, 1);
assert.equal(parsed.scenarioItems[0].feedbackName, 'Загальна');
assert.equal(parsed.scenarioItems[0].actions[0].voiceKey, 'ua_usolovyova_greeting-with-feedback-appeal-v1');
assert.equal(api.feedbackVoicePath(parsed.feedbackItems[0], 'beginning'), 'vOffice/base/production/voice/ua_usolovyova_feedback-beginning-v1');
assert.equal(api.feedbackVoicePath(parsed.feedbackItems[0], 'csat'), 'vOffice/base/production/voice/ua_usolovyova_feedback-csat-v1');
assert.equal(api.feedbackVoicePath(parsed.feedbackItems[0], 'thanks'), 'vOffice/base/production/voice/ua_usolovyova_feedback-thanks-v1');

const withSelect = rows.map(row => [...row]);
withSelect[27][1] = 'Стандартне Соловйова УКР';
const parsedWithSelect = api.parseTzSnapshot(withSelect, {}).patch;
assert.equal(parsedWithSelect.feedbackItems[0].includeSelect, true);
assert.equal(api.feedbackVoicePath(parsedWithSelect.feedbackItems[0], 'select'), 'vOffice/base/production/voice/ua_usolovyova_feedback-select-v1');

console.log('Feedback parser tests passed.');
