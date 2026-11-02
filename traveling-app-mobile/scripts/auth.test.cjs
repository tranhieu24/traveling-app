const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(relative, stubs = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = (name) => (Object.hasOwn(stubs, name) ? stubs[name] : original(name));
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );
  return mod.exports;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
const config = load('src/config/auth.ts', {
  'expo-constants': {
    __esModule: true,
    default: {
      expoConfig: { scheme: 'travelingapp' },
      appOwnership: 'standalone',
    },
  },
  'react-native': { Platform: { OS: 'android' } },
});
const session = (token = 'first', email = 'fixture@example.test') => ({
  access_token: token,
  refresh_token: 'fixture-refresh',
  user: { id: 'fixture-user', email },
});
const profile = {
  id: 'fixture-user',
  email: 'fixture@example.test',
  full_name: 'Fixture',
  role: 'guest',
};
function fixture(fetchProfile) {
  const values = new Map(),
    states = [],
    calls = [];
  const storage = {
    getItem: async (key) => values.get(key) || null,
    setItem: async (key, value) => {
      calls.push('store:' + value);
      values.set(key, value);
    },
    removeItem: async (key) => {
      calls.push('remove');
      values.delete(key);
    },
  };
  const tokenModule = load('src/utils/authToken.ts', {
    './storage': { storage },
    '../config/auth': config,
  });
  const bridgeModule = load('src/services/authSession.ts', {
    '../config/auth': config,
    '../utils/authToken': tokenModule,
  });
  const bridge = bridgeModule.createSessionBridge({
    storage,
    publish: (token, user) => states.push({ token, user }),
    clearCache: () => calls.push('clearCache'),
    fetchProfile: async () => {
      const token = await tokenModule.readAuthToken();
      calls.push('profile:' + token);
      return fetchProfile ? fetchProfile(token) : profile;
    },
  });
  return { bridge, storage, values, states, calls, tokenModule };
}

test('session writes precede API profile requests; duplicate SIGNED_IN shares one profile request', async () => {
  const f = fixture(),
    gate = deferred(),
    original = f.storage.setItem;
  f.storage.setItem = async (...args) => {
    await gate.promise;
    return original(...args);
  };
  const a = f.bridge.sync(session()),
    b = f.bridge.sync(session());
  assert.equal(a, b);
  await tick();
  assert.equal(
    f.calls.some((x) => x.startsWith('profile:')),
    false
  );
  let read = false;
  const reading = f.tokenModule.readAuthToken().then((v) => {
    read = true;
    return v;
  });
  await tick();
  assert.equal(read, false);
  gate.resolve();
  assert.deepEqual(await a, profile);
  assert.equal(await reading, 'first');
  assert.deepEqual(
    f.calls.filter((x) => x.startsWith('profile:')),
    ['profile:first']
  );
  assert.equal(f.states.at(-1).user, profile);
});
test('TOKEN_REFRESHED replaces stored/API token and preserves verified account while refreshing', async () => {
  const f = fixture();
  await f.bridge.sync(session());
  await f.bridge.sync(session('rotated'));
  assert.equal(await f.tokenModule.readAuthToken(), 'rotated');
  assert.equal(f.states.at(-1).token, 'rotated');
  assert.deepEqual(
    f.calls.filter((x) => x.startsWith('profile:')),
    ['profile:first', 'profile:rotated']
  );
});
test('logout invalidates a delayed profile and clears token, user and query cache', async () => {
  const gate = deferred(),
    f = fixture(() => gate.promise);
  const pending = f.bridge.sync(session());
  await tick();
  await f.bridge.clear();
  gate.resolve(profile);
  await assert.rejects(pending, /session changed/);
  assert.equal(await f.tokenModule.readAuthToken(), null);
  assert.deepEqual(f.states.at(-1), { token: null, user: null });
  assert.ok(f.calls.includes('clearCache'));
});
test('missing email and failed backend profile never fabricate an authenticated user', async () => {
  const f = fixture();
  await assert.rejects(f.bridge.sync(session('x', '')), /email address/);
  assert.equal(
    f.calls.some((x) => x.startsWith('profile:')),
    false
  );
  const broken = fixture(() => {
    throw new config.FriendlyAuthError('Profile not provisioned');
  });
  await assert.rejects(broken.bridge.sync(session()), /not provisioned/);
  assert.equal(await broken.tokenModule.readAuthToken(), null);
  assert.equal(broken.states.at(-1).user, null);
});
test('latest session wins when storage/profile responses overlap', async () => {
  const first = deferred(),
    f = fixture((token) => (token === 'first' ? first.promise : profile));
  const old = f.bridge.sync(session());
  await tick();
  await f.bridge.sync(session('new'));
  first.resolve(profile);
  await assert.rejects(old, /session changed/);
  assert.equal(await f.tokenModule.readAuthToken(), 'new');
  assert.equal(f.states.at(-1).token, 'new');
});
test('SecureStore chunks large Unicode sessions, restores legacy values and removes all chunks', async () => {
  const { createSecureChunks } = load('src/utils/secureChunks.ts');
  const map = new Map(),
    store = createSecureChunks({
      getItemAsync: async (k) => map.get(k) || null,
      setItemAsync: async (k, v) => {
        assert.ok(Buffer.byteLength(v) <= 2000);
        map.set(k, v);
      },
      deleteItemAsync: async (k) => map.delete(k),
    });
  const value = JSON.stringify({
    refresh_token: 'fixture'.repeat(1000),
    name: 'Ti?ng Vi?t ???',
  });
  await store.setItem('session', value);
  assert.ok(map.size > 2);
  assert.equal(await store.getItem('session'), value);
  await store.setItem('session', 'legacy-token');
  assert.equal(map.size, 1);
  assert.equal(await store.getItem('session'), 'legacy-token');
  await store.setItem('session', value);
  await store.removeItem('session');
  assert.equal(map.size, 0);
});
test('failed chunk write preserves previous committed session and removes incomplete new chunks', async () => {
  const { createSecureChunks } = load('src/utils/secureChunks.ts');
  const map = new Map([['session', 'old-session']]);
  let count = 0;
  const store = createSecureChunks({
    getItemAsync: async (k) => map.get(k) || null,
    setItemAsync: async (k, v) => {
      if (++count === 2) throw Error('Disk failure');
      map.set(k, v);
    },
    deleteItemAsync: async (k) => map.delete(k),
  });
  await assert.rejects(store.setItem('session', 'long-session'.repeat(1000)), /Disk failure/);
  assert.equal(await store.getItem('session'), 'old-session');
  assert.equal(map.size, 1);
});
function oauthFixture({
  result = {
    type: 'success',
    url: 'travelingapp://auth/callback?code=fixture-code&sb_flow_id=fixture-flow',
  },
  noEmail = false,
  denied = false,
} = {}) {
  const calls = [];
  let exchanges = 0;
  let backendFail = false;
  const auth = {
    signInWithOAuth: async (args) => {
      calls.push(args);
      return { data: { url: 'https://fixture.test/consent' }, error: null };
    },
    exchangeCodeForSession: async (code, opts) => {
      exchanges++;
      assert.equal(code, 'fixture-code');
      assert.deepEqual(opts, { flowId: 'fixture-flow' });
      return {
        data: {
          session: session('first', noEmail ? '' : 'fixture@example.test'),
        },
        error: denied ? Error('sensitive provider detail') : null,
      };
    },
    signOut: async () => {
      calls.push('signOut');
      return { error: null };
    },
    getSession: async () => ({ data: { session: session() }, error: null }),
    setSession: async (args) => {
      calls.push(args);
      return { data: { session: session() }, error: null };
    },
  };
  const module = load('src/services/socialAuth.ts', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-web-browser': { openAuthSessionAsync: async () => result },
    './supabase': { supabase: { auth } },
    './authCrypto': { requireSecurePKCE: () => {} },
    '../config/auth': config,
  });
  const social = module.createSocialAuth(async (s) => {
    calls.push('profile');
    if (backendFail) throw Error('offline');
    assert.ok(s.refresh_token);
    return profile;
  });
  return {
    social,
    calls,
    auth,
    setFail: (v) => (backendFail = v),
    exchanges: () => exchanges,
    module,
  };
}
for (const provider of ['google', 'facebook']) {
  test(
    provider + ' uses the real Supabase OAuth API, allowed callback and email scope',
    async () => {
      const f = oauthFixture();
      assert.equal(await f.social.start(provider), profile);
      assert.equal(f.calls[0].provider, provider);
      assert.equal(f.calls[0].options.redirectTo, 'travelingapp://auth/callback');
      assert.equal(f.calls[0].options.skipBrowserRedirect, true);
      if (provider === 'facebook') assert.equal(f.calls[0].options.scopes, 'email');
      assert.equal(f.exchanges(), 1);
    }
  );
  test(provider + ' cancellation leaves no session or profile request', async () => {
    const f = oauthFixture({ result: { type: 'cancel' } });
    assert.equal(await f.social.start(provider), null);
    assert.equal(f.exchanges(), 0);
    assert.equal(f.calls.includes('profile'), false);
  });
}
test('PKCE callback is exchanged once, including profile retry after network failure', async () => {
  const f = oauthFixture(),
    url = 'travelingapp://auth/callback?code=fixture-code&sb_flow_id=fixture-flow';
  f.setFail(true);
  await assert.rejects(f.social.finish(url), /offline/);
  f.setFail(false);
  assert.equal(await f.social.finish(url), profile);
  assert.equal(f.exchanges(), 1);
});
test('Facebook missing email signs out SDK session and never calls the backend', async () => {
  const f = oauthFixture({ noEmail: true });
  await assert.rejects(f.social.start('facebook'), /did not provide an email/);
  assert.ok(f.calls.includes('signOut'));
  assert.equal(f.calls.includes('profile'), false);
});
test('provider errors are sanitized and wrong callback destinations are rejected', async () => {
  const f = oauthFixture({ denied: true });
  await assert.rejects(f.social.start('google'), (e) => !e.message.includes('sensitive'));
  await assert.rejects(
    f.social.finish('https://attacker.test/auth/callback?code=x'),
    /Invalid sign-in callback/
  );
  const g = oauthFixture();
  await assert.rejects(
    g.social.finish('travelingapp://auth/callback?error=access_denied&error_description=private'),
    /cancelled/
  );
});
test('double OAuth clicks are rejected before a second authorization request is made', async () => {
  const f = oauthFixture(),
    gate = deferred(),
    original = f.auth.signInWithOAuth;
  f.auth.signInWithOAuth = async (args) => {
    await gate.promise;
    return original(args);
  };
  const first = f.social.start('google');
  assert.equal(await f.social.start('facebook'), null);
  gate.resolve();
  await first;
  assert.equal(f.calls.filter((c) => c?.provider).length, 1);
});
test('legacy implicit callbacks pass both tokens to Supabase setSession', async () => {
  const f = oauthFixture();
  await f.social.finish(
    'travelingapp://auth/callback#access_token=fixture-access&refresh_token=fixture-refresh'
  );
  assert.deepEqual(f.calls[0], {
    access_token: 'fixture-access',
    refresh_token: 'fixture-refresh',
  });
});
test('Expo Go is rejected clearly without starting OAuth', () => {
  const go = load('src/config/auth.ts', {
    'expo-constants': { __esModule: true, default: { appOwnership: 'expo' } },
    'react-native': { Platform: { OS: 'ios' } },
  });
  assert.throws(go.getAuthRedirectUri, /development build/);
});
test('native PKCE uses secure Expo random bytes and SHA256 (no plain fallback)', async () => {
  const cryptoNode = require('node:crypto');
  // Exercise the shim in an isolated global to avoid modifying Node WebCrypto.
  const source = fs.readFileSync(path.resolve(__dirname, '../src/services/authCrypto.ts'), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const sandbox = {
    globalThis: {},
    exports: {},
    require: (name) => {
      if (name === 'react-native') return { Platform: { OS: 'ios' } };
      if (name === 'expo-crypto')
        return {
          getRandomValues: (a) => cryptoNode.randomFillSync(a),
          CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
          digest: async (a, b) =>
            new Uint8Array(cryptoNode.createHash('sha256').update(Buffer.from(b)).digest()).buffer,
        };
      return {};
    },
    TextEncoder,
    Error,
    Object,
    Promise,
  };
  require('node:vm').runInNewContext(code, sandbox);
  sandbox.exports.requireSecurePKCE();
  const array = new Uint32Array(56);
  sandbox.globalThis.crypto.getRandomValues(array);
  assert.ok(array.some((x) => x !== 0));
  const actual = await sandbox.globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('abc')
  );
  assert.equal(
    Buffer.from(actual).toString('hex'),
    cryptoNode.createHash('sha256').update('abc').digest('hex')
  );
});
test('errors never echo an arbitrary provider error/token into the UI', () => {
  assert.equal(
    config.safeAuthError(Error('access_token=private')).message.includes('private'),
    false
  );
});

function contextFixture({ initial = null, signupSession = null, profileCode = null } = {}) {
  const effects = [],
    states = [],
    listeners = [],
    calls = [],
    cleanups = [];
  const f = fixture();
  const React = {
    createContext: () => ({ Provider: 'AuthContext.Provider' }),
    createElement: (type, props) => ({ type, props }),
    useState: (value) => {
      const i = states.length;
      states.push(value);
      return [
        value,
        (v) => {
          states[i] = typeof v === 'function' ? v(states[i]) : v;
        },
      ];
    },
    useRef: (current) => ({ current }),
    useContext: () => null,
    useEffect: (fn) => effects.push(fn),
  };
  const auth = {
    onAuthStateChange: (listener) => {
      listeners.push(listener);
      return {
        data: {
          subscription: { unsubscribe: () => calls.push('unsubscribe') },
        },
      };
    },
    getSession: async () => ({ data: { session: initial }, error: null }),
    signInWithPassword: async (args) => {
      calls.push(['password', args]);
      listeners[0]('SIGNED_IN', session());
      return {
        data: { session: session(), user: session().user },
        error: null,
      };
    },
    signUp: async (args) => {
      calls.push(['signup', args]);
      if (signupSession) listeners[0]('SIGNED_IN', signupSession);
      return { data: { session: signupSession }, error: null };
    },
    signOut: async (args) => {
      calls.push(['signOut', args]);
      listeners[0]('SIGNED_OUT', null);
      return { error: null };
    },
    startAutoRefresh: () => calls.push('startRefresh'),
    stopAutoRefresh: () => calls.push('stopRefresh'),
    updateUser: async () => ({ error: null }),
  };
  const bridgeModule = load('src/services/authSession.ts', {
    '../config/auth': config,
    '../utils/authToken': f.tokenModule,
  });
  const context = load('src/context/AuthContext.tsx', {
    react: { __esModule: true, default: React, ...React },
    'react-native': {
      Platform: { OS: 'android' },
      AppState: {
        currentState: 'active',
        addEventListener: () => ({
          remove: () => calls.push('removeAppState'),
        }),
      },
    },
    'expo-linking': { getInitialURL: async () => null },
    '@tanstack/react-query': {
      useQueryClient: () => ({ clear: () => calls.push('clearCache') }),
    },
    '../services/apiClient': {
      apiClient: {
        get: async (url) => {
          assert.equal(url, '/auth/me');
          calls.push(['profile', await f.tokenModule.readAuthToken()]);
          if (profileCode)
            throw {
              isAxiosError: true,
              response: { status: 403, data: { error: { code: profileCode } } },
            };
          return { data: { success: true, data: profile } };
        },
      },
    },
    axios: {
      __esModule: true,
      default: { isAxiosError: (e) => e?.isAxiosError },
    },
    '../services/supabase': { supabase: { auth } },
    '../services/authSession': bridgeModule,
    '../services/socialAuth': {
      createSocialAuth: () => ({
        start: async () => null,
        finish: async () => profile,
      }),
    },
    '../config/auth': config,
    '../utils/storage': { storage: f.storage },
  });
  const value = context.AuthProvider({ children: null }).props.value;
  effects.forEach((fn) => {
    const cleanup = fn();
    if (cleanup) cleanups.push(cleanup);
  });
  return {
    value,
    states,
    calls,
    f,
    auth,
    emit: (e, s) => listeners[0](e, s),
    cleanup: () => cleanups.forEach((fn) => fn()),
  };
}
test('AuthContext integrates password login, refresh, SIGNED_OUT, cache cleanup and unsubscribe', async () => {
  const c = contextFixture();
  await tick();
  assert.equal(await c.value.signIn('fixture@example.test', 'fixture-password'), profile);
  assert.equal(c.calls.filter((x) => Array.isArray(x) && x[0] === 'profile').length, 1);
  c.emit('TOKEN_REFRESHED', session('rotated'));
  await tick();
  assert.equal(await c.f.tokenModule.readAuthToken(), 'rotated');
  assert.equal(c.states[1], 'rotated');
  assert.equal(c.states[0], profile);
  await c.value.signOut();
  assert.equal(await c.f.tokenModule.readAuthToken(), null);
  assert.equal(c.states[0], null);
  assert.equal(c.states[1], null);
  assert.ok(c.calls.some((x) => Array.isArray(x) && x[0] === 'signOut'));
  c.cleanup();
  assert.ok(c.calls.includes('unsubscribe'));
  assert.ok(c.calls.includes('removeAppState'));
});
test('AuthContext restores SDK session instead of trusting a standalone stale access token', async () => {
  const c = contextFixture({ initial: session('restored') });
  await tick();
  assert.equal(c.states[1], 'restored');
  assert.equal(c.states[0], profile);
  c.cleanup();
  const guest = contextFixture();
  guest.f.values.set(config.AUTH_TOKEN_KEY, 'stale-standalone-token');
  await tick();
  assert.equal(await guest.f.tokenModule.readAuthToken(), null);
  assert.equal(guest.states[0], null);
  guest.cleanup();
});
test('email registration preserves both confirmation-required and immediate session flows', async () => {
  const pending = contextFixture();
  await tick();
  assert.deepEqual(await pending.value.signUp('fixture@example.test', 'password', 'Fixture'), {
    requiresEmailConfirmation: true,
  });
  assert.equal(
    pending.calls.some((x) => Array.isArray(x) && x[0] === 'profile'),
    false
  );
  pending.cleanup();
  const immediate = contextFixture({ signupSession: session() });
  await tick();
  assert.deepEqual(await immediate.value.signUp('fixture@example.test', 'password', 'Fixture'), {
    requiresEmailConfirmation: false,
  });
  assert.equal(immediate.states[0], profile);
  immediate.cleanup();
});
test('PROFILE_NOT_FOUND from the real /auth/me shape is clear and never sets a user', async () => {
  const c = contextFixture({ profileCode: 'PROFILE_NOT_FOUND' });
  await tick();
  await assert.rejects(
    c.value.signIn('fixture@example.test', 'password'),
    /profile has not been created/
  );
  assert.equal(c.states[0], null);
  assert.equal(await c.f.tokenModule.readAuthToken(), null);
  c.cleanup();
});
test('React Navigation strips OAuth credentials and suppresses duplicate navigation during native auth', async () => {
  let urlHandler,
    active = true,
    removed = false;
  const links = load('src/navigation/linking.ts', {
    '@react-navigation/native': { getStateFromPath: (path) => path },
    'expo-linking': {
      createURL: () => 'travelingapp://',
      getInitialURL: async () => 'travelingapp://auth/callback?code=private',
      addEventListener: (_, fn) => {
        urlHandler = fn;
        return {
          remove: () => {
            removed = true;
          },
        };
      },
    },
    '../config/auth': config,
    '../services/socialAuth': { isSocialAuthInProgress: () => active },
  });
  assert.equal(
    links.linking.getStateFromPath('/auth/callback?code=private#access_token=private', {}),
    'auth/callback'
  );
  const navigations = [];
  const cleanup = links.linking.subscribe((u) => navigations.push(u));
  urlHandler({ url: 'travelingapp://auth/callback?code=private' });
  assert.equal(navigations.length, 0);
  active = false;
  urlHandler({ url: 'travelingapp://auth/callback?code=private' });
  assert.equal(navigations.length, 1);
  assert.equal(config.getCapturedAuthCallback(), 'travelingapp://auth/callback?code=private');
  cleanup();
  assert.equal(removed, true);
});

test('web redirect keeps OAuth locked until navigation or browser Back', async () => {
  let resume,
    opened,
    calls = 0;
  const oldWindow = global.window;
  global.window = {
    location: {
      assign: (url) => {
        opened = url;
      },
    },
    addEventListener: (_, fn) => {
      resume = fn;
    },
    removeEventListener: () => {},
  };
  try {
    const mod = load('src/services/socialAuth.ts', {
      'react-native': { Platform: { OS: 'web' } },
      'expo-web-browser': {},
      './supabase': {
        supabase: {
          auth: {
            signInWithOAuth: async () => {
              calls++;
              return { data: { url: 'https://fixture.test/consent' }, error: null };
            },
          },
        },
      },
      './authCrypto': { requireSecurePKCE: () => {} },
      '../config/auth': { ...config, getAuthRedirectUri: () => 'http://localhost/auth/callback' },
    });
    const social = mod.createSocialAuth(async () => profile);
    const first = social.start('google');
    await tick();
    assert.equal(mod.isSocialAuthInProgress(), true);
    assert.equal(opened, 'https://fixture.test/consent');
    assert.equal(await social.start('facebook'), null);
    assert.equal(calls, 1);
    resume({ persisted: true });
    assert.equal(await first, null);
    assert.equal(mod.isSocialAuthInProgress(), false);
  } finally {
    if (oldWindow === undefined) delete global.window;
    else global.window = oldWindow;
  }
});

function webFixture({ setup, assign = () => {}, timeout = 15 } = {}) {
  const handlers = new Map();
  const oldWindow = global.window;
  global.window = {
    location: { assign },
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: (name) => handlers.delete(name),
  };
  const mod = load('src/services/socialAuth.ts', {
    'react-native': { Platform: { OS: 'web' } },
    'expo-web-browser': {},
    './supabase': {
      supabase: {
        auth: {
          signInWithOAuth:
            setup || (async () => ({ data: { url: 'https://fixture.test/consent' }, error: null })),
        },
      },
    },
    './authCrypto': { requireSecurePKCE: () => {} },
    '../config/auth': { ...config, getAuthRedirectUri: () => 'http://localhost/auth/callback' },
  });
  const social = mod.createSocialAuth(async () => profile, { startTimeoutMs: timeout });
  return {
    social,
    mod,
    handlers,
    restore: () => {
      if (oldWindow === undefined) delete global.window;
      else global.window = oldWindow;
    },
  };
}
test('blocked web navigation times out, removes listeners and unlocks Google/Facebook retry', async () => {
  const f = webFixture();
  try {
    await assert.rejects(f.social.start('google'), /Could not open Google/);
    assert.equal(f.mod.isSocialAuthInProgress(), false);
    assert.equal(f.handlers.size, 0);
    await assert.rejects(f.social.start('facebook'), /Could not open Facebook/);
    assert.equal(f.mod.isSocialAuthInProgress(), false);
    assert.equal(f.handlers.size, 0);
  } finally {
    f.restore();
  }
});
test('stalled SDK startup releases the lock and cannot navigate after a late result', async () => {
  const gate = deferred();
  let navigations = 0;
  const f = webFixture({
    setup: () => gate.promise,
    assign: () => {
      navigations++;
    },
  });
  try {
    await assert.rejects(f.social.start('google'), /Could not start Google/);
    assert.equal(f.mod.isSocialAuthInProgress(), false);
    gate.resolve({ data: { url: 'https://fixture.test/late' }, error: null });
    await tick();
    assert.equal(navigations, 0);
    assert.equal(f.handlers.size, 0);
  } finally {
    f.restore();
  }
});
test('leaving for provider suspends redirect timeout; Back restores buttons even without persisted flag', async () => {
  const f = webFixture({ timeout: 20 });
  try {
    const request = f.social.start('google');
    await tick();
    f.handlers.get('pagehide')();
    await new Promise((resolve) => setTimeout(resolve, 35));
    assert.equal(f.mod.isSocialAuthInProgress(), true);
    f.handlers.get('pageshow')({ persisted: false });
    assert.equal(await request, null);
    assert.equal(f.mod.isSocialAuthInProgress(), false);
    assert.equal(f.handlers.size, 0);
  } finally {
    f.restore();
  }
});
test('browser navigation exception cleans listeners and returns a safe retryable error', async () => {
  const f = webFixture({
    assign: () => {
      throw Error('private browser internals');
    },
  });
  try {
    await assert.rejects(
      f.social.start('google'),
      (e) => /Could not open Google/.test(e.message) && !e.message.includes('private')
    );
    assert.equal(f.mod.isSocialAuthInProgress(), false);
    assert.equal(f.handlers.size, 0);
  } finally {
    f.restore();
  }
});
