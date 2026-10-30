const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/utils/apiUrl.ts');
const mod = new Module(filename, module);
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { resolveApiBaseUrl } = mod.exports;
test('iPhone development API follows the Metro LAN host instead of old configured Wi-Fi IP', () => {
  assert.equal(resolveApiBaseUrl({ platform:'ios',development:true,hostUri:'192.168.1.251:8081',configuredUrl:'http://192.168.1.166:5000/api/v1' }), 'http://192.168.1.251:5000/api/v1');
});
test('explicit public API URL overrides Metro, and production uses configured backend', () => {
  assert.equal(resolveApiBaseUrl({ platform:'ios',development:true,hostUri:'192.168.1.251:8081',override:'https://api.example.test/api/v1/' }), 'https://api.example.test/api/v1');
  assert.equal(resolveApiBaseUrl({ platform:'ios',development:false,hostUri:'192.168.1.251:8081',configuredUrl:'https://api.example.test/api/v1/' }), 'https://api.example.test/api/v1');
});
test('web opened from a phone uses that computer hostname rather than phone localhost', () => {
  assert.equal(resolveApiBaseUrl({ platform:'web',development:true,webHostname:'192.168.1.251' }), 'http://192.168.1.251:5000/api/v1');
  assert.equal(resolveApiBaseUrl({ platform:'web',development:true,webHostname:'localhost' }), 'http://localhost:5000/api/v1');
});
test('Metro tunnels do not masquerade as a backend tunnel', () => {
  assert.equal(resolveApiBaseUrl({ platform:'ios',development:true,hostUri:'project.exp.direct',configuredUrl:'https://api.example.test/api/v1' }), 'https://api.example.test/api/v1');
});

const vm = require('node:vm');
function importApiClient(platform, browserWindow) {
  const file = path.resolve(__dirname, '../src/services/apiClient.ts');
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const sandbox = {
    exports, __DEV__: true, process: { env: {} },
    require(name) {
      if (name === 'react-native-url-polyfill/auto') return {};
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === 'expo-constants') return { __esModule:true, default: { expoConfig: { hostUri:'192.168.1.251:8081', extra:{apiUrl:'http://192.168.1.166:5000/api/v1'} } } };
      if (name === '../utils/apiUrl') return { resolveApiBaseUrl };
      if (name === '../utils/authToken') return { readAuthToken: async () => null };
      if (name === 'axios') return { __esModule:true, default: { create: () => ({ interceptors: { request:{ use() {} }, response:{ use() {} } } }) } };
      throw new Error('Unexpected dependency: '+name);
    },
  };
  if (browserWindow !== undefined) sandbox.window = browserWindow;
  vm.runInNewContext(output, sandbox);
  return exports;
}
for (const platform of ['ios', 'android']) {
  test(platform+' API client initializes without reading native window.location', () => {
    const nativeWindow = Object.defineProperty({}, 'location', { get() { throw new Error('Browser location is unavailable on native'); } });
    assert.equal(importApiClient(platform, nativeWindow).API_BASE_URL, 'http://192.168.1.251:5000/api/v1');
  });
}
test('web API client initializes with and without browser window', () => {
  assert.equal(importApiClient('web', { location: { hostname: '192.168.1.251' } }).API_BASE_URL, 'http://192.168.1.251:5000/api/v1');
  assert.equal(importApiClient('web', undefined).API_BASE_URL, 'http://localhost:5000/api/v1');
});
