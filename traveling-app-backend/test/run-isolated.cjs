const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

// Run the existing integration suite outside the project, without developer secrets.
const backend = path.resolve(__dirname, '..');
const root = path.resolve(backend, '..');
const dependencies = path.join(backend, 'node_modules');
const envFile = path.join(backend, '.env');
const envHash = () => fs.existsSync(envFile)
  ? crypto.createHash('sha256').update(fs.readFileSync(envFile)).digest('hex') : null;
const before = envHash();
let tempRoot;

try {
  if (!fs.existsSync(dependencies)) throw new Error('Run npm ci in the main backend first.');
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'traveling-backend-test-'));
  const tempBackend = path.join(tempRoot, 'traveling-app-backend');
  fs.mkdirSync(tempBackend);
  for (const item of ['src', 'test', 'package.json', 'package-lock.json', 'tsconfig.json']) {
    fs.cpSync(path.join(backend, item), path.join(tempBackend, item), { recursive: true });
  }
  fs.cpSync(path.join(root, 'database'), path.join(tempRoot, 'database'), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, 'docs'));
  for (const item of ['openapi.json', 'postman.collection.json', 'postman.environment.json']) {
    fs.copyFileSync(path.join(root, 'docs', item), path.join(tempRoot, 'docs', item));
  }
  fs.symlinkSync(dependencies, path.join(tempBackend, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const childEnv = { ...process.env };
  for (const key of Object.keys(childEnv)) {
    if (/^(DATABASE_|SUPABASE_|STRIPE_|MOCK_|PAYMENT_|TAX_RATE$|RECEIPT_FONT$|CONFIRM_EXPIRY_JOB$|PG)/i.test(key)) delete childEnv[key];
  }
  childEnv.NODE_ENV = 'test';
  const started = Date.now();
  console.log('Isolated test folder: ' + tempRoot);
  const result = spawnSync(process.execPath, ['test/run.cjs'], {
    cwd: tempBackend, env: childEnv, stdio: 'inherit', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Integration runner failed with exit code ' + result.status);
  const evidencePath = path.join(tempRoot, 'docs', 'test-results.json');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  if (!(Date.parse(evidence.startedAt) >= started - 1000) || evidence.failed !== 0 || evidence.passed < 29) {
    throw new Error('Missing successful, fresh test evidence.');
  }
  if (envHash() !== before) throw new Error('Main .env changed while tests were running.');
  fs.copyFileSync(evidencePath, path.join(root, 'docs', 'test-results.json'));
  console.log('Fresh passing evidence saved to docs/test-results.json; main .env preserved.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (envHash() !== before) {
    console.error('Main .env integrity check failed.');
    process.exitCode = 1;
  }
  if (tempRoot) console.log('Test fixtures retained outside the project: ' + tempRoot);
}
