const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
function load(file, deps) {
  const filename = path.resolve(__dirname, '..', file), exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, AbortController, document: undefined, require: name => deps(name) }, { filename });
  return exports;
}
const clientCalls = [];
const service = load('src/services/notifications.ts', name => name.endsWith('/preferences/store') ? { preferences: { getSnapshot: () => ({ language: 'vi' }) } } : ({ apiClient: {
  get: async (...args) => { clientCalls.push(['get', ...args]); return { data: { success: true, serverTime: '2026-11-05T10:00:00Z', data: { items: [], unreadCount: 2 }, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } }; },
  patch: async (...args) => { clientCalls.push(['patch', ...args]); return { data: { success: true, data: { unreadCount: 0 } } }; },
} }));
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function fixture(hook = 'useNotificationActions', overrides = {}) {
  const slots = [], effects = [], updates = [], invalidations = [], listeners = [];
  let cursor = 0, dirty = false, current, queryOptions, poll = false;
  const auth = { user: { id: 'account-a' }, token: 'token-a', isLoading: false };
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; dirty = true; }]; },
    useRef(value) { const i = cursor++; return slots[i] ?? (slots[i] = { current: value }); },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((v, j) => !Object.is(v, old.deps[j]))) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const appState = { currentState: 'active', addEventListener(_, fn) { listeners.push(fn); return { remove() { listeners.splice(listeners.indexOf(fn), 1); } }; } };
  const services = { ...service, readNotification: async () => ({ unreadCount: 0 }), readAllNotifications: async () => ({ unreadCount: 0 }), ...overrides };
  const hooks = load('src/hooks/useNotifications.ts', name => {
    if (name === 'react') return react;
    if (name === 'react-native') return { AppState: appState, Platform: { OS: 'ios' } };
    if (name === '../context/AuthContext') return { useAuth: () => auth };
    if (name === '../services/notifications') return services;
    if (name === '@tanstack/react-query') return {
      useQuery: options => { queryOptions = options; return { isFetching: false, refetch: async () => {} }; },
      useQueryClient: () => ({ setQueryData: (...args) => updates.push(args), invalidateQueries: async options => invalidations.push(options) }),
    };
    throw new Error(name);
  });
  function render() { do { dirty = false; cursor = 0; current = hooks[hook](poll); while (effects.length) effects.shift()(); } while (dirty); return current; }
  render();
  return { auth, updates, invalidations, appState, listeners, render,
    get actions() { return render(); }, get query() { render(); return queryOptions; },
    poll(value) { poll = value; render(); }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}

test('notification grouping uses local calendar days across midnight and month boundaries', () => {
  const now = new Date(2026, 10, 1, 0, 15), make = (id, date) => ({ id, createdAt: date.toISOString() });
  const groups = service.groupNotifications([make('today', new Date(2026, 10, 1, 0, 2)), make('yesterday', new Date(2026, 9, 31, 23, 59)), make('older', new Date(2026, 9, 30, 12))], now);
  assert.deepEqual(JSON.parse(JSON.stringify(groups.map(group => [group.title, group.data[0].id]))), [['Hôm nay', 'today'], ['Hôm qua', 'yesterday'], ['Trước đó', 'older']]);
});
test('notification requests use authenticated endpoints, encoded IDs and only a server snapshot for read-all', async () => {
  clientCalls.length = 0; const controller = new AbortController();
  await service.fetchNotifications(2, true, controller.signal); await service.readNotification('id/with spaces', controller.signal);
  await service.readAllNotifications('2026-11-05T10:00:00Z', controller.signal);
  assert.equal(clientCalls[0][2].params.unreadOnly, 'true'); assert.equal(clientCalls[0][2].params.page, 2);
  assert.equal(clientCalls[1][1], '/notifications/id%2Fwith%20spaces/read'); assert.equal(Object.keys(clientCalls[1][2]).length, 0);
  assert.equal(clientCalls[2][2].before, '2026-11-05T10:00:00Z'); assert.equal(clientCalls[2][3].signal, controller.signal);
});
test('guests do not query private data and polling pauses when the app goes to background', () => {
  const h = fixture('useUnreadNotifications'); h.auth.user = null; h.poll(true); assert.equal(h.query.enabled, false);
  h.auth.user = { id: 'account-a' }; h.render(); assert.equal(h.query.enabled, true); assert.equal(h.query.refetchInterval, 30000);
  h.appState.currentState = 'background'; h.listeners.forEach(fn => fn()); assert.equal(h.query.enabled, false); assert.equal(h.query.refetchInterval, false);
  h.appState.currentState = 'active'; h.listeners.forEach(fn => fn()); assert.equal(h.query.enabled, true);
});
test('rapid taps send one update, then refresh only the matching account cache after server confirmation', async () => {
  const work = deferred(); let calls = 0;
  const h = fixture('useNotificationActions', { readNotification: async () => { calls++; return work.promise; } });
  const first = h.actions.markRead('notification-a'), duplicate = h.actions.markRead('notification-a');
  assert.equal(calls, 1); assert.equal(h.updates.length, 0);
  work.resolve({ unreadCount: 2 }); assert.equal(await first, true); assert.equal(await duplicate, false);
  assert.equal(h.updates[0][0][1], 'account-a'); assert.equal(h.updates[0][1], 2); assert.equal(h.invalidations.length, 2);
});
test('a failed update keeps unread state and allows retry', async () => {
  let calls = 0;
  const h = fixture('useNotificationActions', { readNotification: async () => { if (++calls === 1) throw new Error('offline'); return { unreadCount: 0 }; } });
  assert.equal(await h.actions.markRead('notification-a'), false); assert.ok(h.actions.error); assert.equal(h.updates.length, 0);
  assert.equal(await h.actions.markRead('notification-a'), true); assert.equal(h.actions.error, '');
});
test('account changes abort in-flight reads and prevent stale cache updates or navigation', async () => {
  const work = deferred(); let signal;
  const h = fixture('useNotificationActions', { readNotification: async (_, value) => { signal = value; return work.promise; } });
  const pending = h.actions.markRead('notification-a');
  h.auth.user = { id: 'account-b' }; h.auth.token = 'token-b'; h.render();
  assert.equal(signal.aborted, true); work.resolve({ unreadCount: 0 });
  assert.equal(await pending, false); assert.equal(h.updates.length, 0); assert.equal(h.actions.busy, null);
});
