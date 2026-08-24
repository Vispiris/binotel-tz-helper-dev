import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const files = [
  'metadata.txt',
  '00-core.js',
  'modules/company.js',
  'modules/endpoints.js',
  'modules/ring-groups.js',
  'modules/gsm-numbers.js',
  'modules/departments.js',
  'modules/voice-messages.js',
  'modules/feedback.js',
  'modules/routes.js',
  '20-flow.js',
  '30-safe-delete.js',
  '40-ui.js',
  '50-parser.js',
  '60-constructor.js',
  '99-boot.js',
];

const parts = files.map(file => {
  const target = path.join(root, 'src', file);
  if (!fs.existsSync(target)) throw new Error(`Missing source module: ${file}`);
  return fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
});

const output = parts.join('');
const outputPath = path.join(root, 'tampermonkey', 'binotel-tz-helper-safe-dev.user.js');
fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Built ${outputPath} from ${files.length} modules.`);
