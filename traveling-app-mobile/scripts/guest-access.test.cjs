const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, deps, globals = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, ...globals, require: (name) => deps(name) }, { filename });
  return exports;
}
const json = (value) => JSON.parse(JSON.stringify(value));
function fixture(platform = 'ios', values = new Map()) {
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const api = load('src/navigation/authReturn.ts', () => ({ Platform: { OS: platform } }), {
    window: { sessionStorage: storage },
  });
  const calls = [];
  const navigation = { navigate: (...args) => calls.push(args), reset: (state) => calls.push(json(state)) };
  return { api, calls, navigation, values };
}

test('app starts at public browsing, and a bare launch never waits for auth or health', () => {
  const effects = [], calls = [];
  const react = {
    createElement: (type, props) => ({ type, props }),
    useEffect: (effect) => effects.push(effect),
  };
  const deps = (name) => {
    if (name.endsWith('/preferences/ui')) return { useUiPreferences() {}, uiStyle: value => value, uiTextStyle: value => value, uiColor: value => value, uiText: value => value, uiClasses: value => value };
    if (name === 'react') return react;
    if (name === '@react-navigation/native-stack') return { createNativeStackNavigator: () => ({ Navigator: 'Navigator', Screen: 'Screen' }) };
    if (name === '@react-navigation/native') return { useNavigation: () => ({ replace: (...args) => calls.push(args) }) };
    if (name === 'react-native') return { StyleSheet: { create: (styles) => styles }, View: 'View' };
    if (name.startsWith('../screens/') || name === './TabNavigator') return new Proxy({}, { get: () => () => null });
    throw Error('Startup unexpectedly requires ' + name);
  };
  const { AppNavigator } = load('src/navigation/AppNavigator.tsx', deps);
  assert.equal(AppNavigator().props.initialRouteName, 'MainTabs');
  const { SplashScreen } = load('src/screens/SplashScreen.tsx', deps);
  SplashScreen();
  effects.forEach((effect) => effect());
  assert.deepEqual(json(calls), [['MainTabs', { screen: 'SearchTab' }]]);
});

for (const target of [
  { name: 'ListingDetail', params: { listingId: 'room-1', openBooking: true, trip: { checkInDate: '2026-12-01', checkOutDate: '2026-12-03', adults: 2, children: 0 } } },
  { name: 'Payment', params: { bookingId: 'booking-1', plan: 'balance' } },
  { name: 'WriteReview', params: { listingId: 'room-1', listingTitle: 'A stay' } },
]) {
  test(target.name + ' requests login and resumes with a public back destination', () => {
    const f = fixture();
    f.api.requestLogin(f.navigation, target);
    assert.deepEqual(f.calls, [['Login']]);
    f.api.finishAuthNavigation(f.navigation, 'customer');
    assert.deepEqual(f.calls[1], {
      index: 1, routes: [{ name: 'MainTabs', params: { screen: 'SearchTab' } }, target],
    });
    f.api.finishAuthNavigation(f.navigation, 'customer');
    assert.deepEqual(f.calls[2], { index: 0, routes: [{ name: 'MainTabs' }] });
  });
}

test('web OAuth reload restores only the requested destination, without credentials', () => {
  const before = fixture('web');
  const target = { name: 'Payment', params: { bookingId: 'booking-1', plan: 'full' } };
  before.api.requestLogin(before.navigation, target);
  const after = fixture('web', before.values);
  after.api.finishAuthNavigation(after.navigation, 'customer');
  assert.deepEqual(after.calls[0].routes[1], target);
  assert.equal(before.values.size, 0);
});

test('cancelled sign-in clears the pending action; ordinary admin login still opens admin', () => {
  const f = fixture();
  f.api.requestLogin(f.navigation, { name: 'WriteReview', params: { listingId: 'room-1' } });
  f.api.clearAuthReturn();
  f.api.finishAuthNavigation(f.navigation, 'admin');
  assert.deepEqual(f.calls[1], { index: 0, routes: [{ name: 'AdminPortal' }] });
});

test('malformed, expired or disallowed browser destinations fall back to browsing', () => {
  for (const stored of [
    'invalid JSON',
    JSON.stringify({ target: { name: 'AdminPortal', params: {} }, createdAt: Date.now() }),
    JSON.stringify({ target: { name: 'Payment', params: { bookingId: '../../outside' } }, createdAt: Date.now() }),
    JSON.stringify({ target: { name: 'WriteReview', params: { listingId: 'room-1' } }, createdAt: 1 }),
  ]) {
    const f = fixture('web', new Map([['traveling_auth_return', stored]]));
    f.api.finishAuthNavigation(f.navigation, 'customer');
    assert.deepEqual(f.calls[0], { index: 0, routes: [{ name: 'MainTabs' }] });
    assert.equal(f.values.size, 0);
  }
});
