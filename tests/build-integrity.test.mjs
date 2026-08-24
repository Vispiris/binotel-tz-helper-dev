import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const files = [
  'metadata.txt', '00-core.js', 'modules/company.js', 'modules/endpoints.js',
  'modules/ring-groups.js', 'modules/gsm-numbers.js', 'modules/departments.js',
  'modules/voice-messages.js', 'modules/feedback.js', 'modules/routes.js',
  '20-flow.js', '30-safe-delete.js', '40-ui.js', '50-parser.js',
  '60-constructor.js', '99-boot.js',
];
const expected = files.map(file => fs.readFileSync(path.join(root, 'src', file), 'utf8').replace(/\r\n/g, '\n')).join('');
const output = fs.readFileSync(path.join(root, 'tampermonkey', 'binotel-tz-helper-safe-dev.user.js'), 'utf8').replace(/\r\n/g, '\n');

assert.equal(output, expected, 'userscript must be the exact concatenation of source modules');
assert.equal((output.match(/==UserScript==/g) || []).length, 1);
assert.match(output, /@version\s+0\.15\.2-dev/);
assert.match(output, /async function applyFeedback\(\)/);
assert.match(output, /stage: 'feedback'/);
assert.doesNotMatch(output, /(?:companyID|showProjectID)\s*[:=]\s*['"](?:10689|101982)['"]/);

const body = output.slice(output.indexOf('(function () {'));
new vm.Script(body, { filename: 'binotel-tz-helper-safe-dev.user.js' });
console.log('Build integrity tests passed.');
