const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
function load(file, stubs = {}) {
  const filename = path.resolve(__dirname, '..', file), mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod); mod.require = name => Object.hasOwn(stubs, name) ? stubs[name] : original(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
}
const { createPreferenceStore, PREFERENCES_KEY } = load('src/preferences/model.ts');
const translations = load('src/preferences/translations.ts');
const fixture = (initial, system = 'light') => {
  const writes = [], storage = { getItem: async () => initial, setItem: async (key, value) => { writes.push([key, value]); } };
  return { writes, store: createPreferenceStore(storage, () => system) };
};
test('first launch defaults to Vietnamese and follows the device without requiring authentication', async () => {
  const { store } = fixture(null, 'dark');
  assert.equal(store.getSnapshot().language, 'vi'); assert.equal(store.getSnapshot().isDark, true);
  await store.hydrate(); assert.equal(store.getSnapshot().hydrated, true);
});
test('preferences survive restart independently of account storage', async () => {
  const { store, writes } = fixture(null); await store.hydrate(); store.setLanguage('en'); store.setThemeMode('dark'); await store.flush();
  assert.ok(writes.every(([key]) => key === PREFERENCES_KEY));
  const restored = fixture(writes.at(-1)[1]).store; await restored.hydrate();
  assert.equal(restored.getSnapshot().language, 'en'); assert.equal(restored.getSnapshot().themeMode, 'dark'); assert.equal(restored.getSnapshot().isDark, true);
});
test('rapid choices persist in order and the last choice wins', async () => {
  const { store, writes } = fixture(null); await store.hydrate();
  store.setThemeMode('dark'); store.setThemeMode('light'); store.setLanguage('en'); store.setLanguage('vi'); await store.flush();
  assert.deepEqual(JSON.parse(writes.at(-1)[1]), { language: 'vi', themeMode: 'light' });
});
test('a choice made during hydration is not overwritten by older stored preferences', async () => {
  let finish; const writes = [];
  const store = createPreferenceStore({ getItem: () => new Promise(resolve => { finish = resolve; }), setItem: async (_, value) => writes.push(value) }, () => 'light');
  const ready = store.hydrate(); store.setThemeMode('dark');
  finish(JSON.stringify({ language: 'en', themeMode: 'light' })); await ready; await store.flush();
  assert.equal(store.getSnapshot().language, 'en'); assert.equal(store.getSnapshot().isDark, true);
  assert.equal(JSON.parse(writes.at(-1)).themeMode, 'dark');
});
test('system changes update automatic mode, while manual modes keep their selection', async () => {
  const { store } = fixture(null); await store.hydrate(); store.updateSystemTheme('dark'); assert.equal(store.getSnapshot().isDark, true);
  store.setThemeMode('light'); store.updateSystemTheme('dark'); assert.equal(store.getSnapshot().isDark, false);
  store.setThemeMode('system'); store.updateSystemTheme('dark'); assert.equal(store.getSnapshot().isDark, true);
});
test('corrupt or unsupported saved choices fall back safely, without blocking the app', async () => {
  for (const saved of ['bad json', 'null', '[]', JSON.stringify({ language: 'unknown', themeMode: 'unknown' })]) {
    const { store } = fixture(saved); await store.hydrate();
    assert.equal(store.getSnapshot().language, 'vi'); assert.equal(store.getSnapshot().themeMode, 'system');
  }
});
test('storage failure is reported and a later successful selection recovers', async () => {
  let fail = true;
  const store = createPreferenceStore({ getItem: async () => null, setItem: async () => { if (fail) throw new Error('storage unavailable'); } }, () => 'light');
  await store.hydrate(); store.setLanguage('en'); await store.flush(); assert.equal(store.getSnapshot().error, true);
  fail = false; store.setThemeMode('dark'); await store.flush(); assert.equal(store.getSnapshot().error, false);
});
test('subscribers are notified without remounting or clearing unrelated application state', async () => {
  const { store } = fixture(null); await store.hydrate(); let changes = 0;
  const remove = store.subscribe(() => changes++); store.setLanguage('en'); assert.equal(changes, 1);
  remove(); store.setThemeMode('dark'); assert.equal(changes, 1);
});
test('UI translation handles both source languages, dynamic counters and unknown user content', () => {
  assert.equal(translations.translate('Cài đặt và thông báo', 'en'), 'Settings & notifications');
  assert.equal(translations.translate('Create an account', 'vi'), 'Tạo tài khoản');
  assert.equal(translations.translate('Bạn có 2 thông báo chưa đọc', 'en'), 'You have 2 unread notifications');
  assert.equal(translations.translate('Unread private room name', 'vi'), 'Unread private room name');
  assert.equal(translations.translate('Balian Treehouse', 'en'), 'Balian Treehouse');
});
test('dark palettes adapt surfaces and text but preserve button foregrounds and media values', () => {
  const state = { isDark: true, language: 'en' };
  const ui = load('src/preferences/ui.ts', { './store': { preferences: { getSnapshot: () => state } }, './translations': translations, 'react-native': { StyleSheet: { flatten: value => value } } });
  const original = { backgroundColor: '#FFFFFF', color: '#292C30', borderColor: '#E5E7EB', opacity: 0.8 };
  const dark = ui.uiStyle(original);
  assert.equal(dark.backgroundColor, '#172630'); assert.equal(dark.color, '#EDF3F7'); assert.equal(dark.borderColor, '#304451');
  assert.equal(original.backgroundColor, '#FFFFFF'); assert.equal(dark.opacity, 0.8);
  assert.equal(ui.uiColor('#FFFFFF'), '#FFFFFF'); assert.equal(ui.uiColor('https://example.test/photo.jpg'), 'https://example.test/photo.jpg');
  assert.equal(ui.uiTextStyle({ color: '#FFFFFF' })[1].color, '#FFFFFF');
  assert.match(ui.uiClasses('bg-white text-gray-900'), /dark:bg-\[#172630\]/);
  assert.equal(ui.uiStyle(({ pressed }) => ({ backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF' }))({ pressed: true }).backgroundColor, '#111F29');
  state.isDark = false; assert.equal(ui.uiStyle(original), original);
});
