const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const reactJsx = require('react/jsx-runtime');

// Exercise the installed NativeWind native runtime, not its web renderer.
const previousNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'test';
const nativeStyles = [];
let pressed = false;
const flatten = (value) =>
  Array.isArray(value) ? Object.assign({}, ...value.filter(Boolean).map(flatten)) : value || {};
function host({ children }) {
  return React.createElement(React.Fragment, null, children);
}
function NativePressable({ style, children, disabled, accessibilityLabel }) {
  const state = { pressed: !disabled && pressed };
  nativeStyles.push({
    label: accessibilityLabel,
    disabled: !!disabled,
    style: flatten(typeof style === 'function' ? style(state) : style),
    text: React.Children.toArray(children)
      .filter((v) => v?.type === NativeText)
      .map((v) => v.props.children)
      .join(''),
  });
  return React.createElement(
    React.Fragment,
    null,
    typeof children === 'function' ? children(state) : children
  );
}
const NativeText = host;
const subscription = () => ({ remove() {} });
const rn = {
  View: host,
  Text: NativeText,
  Pressable: NativePressable,
  ScrollView: host,
  KeyboardAvoidingView: host,
  TextInput: () => null,
  ActivityIndicator: () => null,
  Modal: ({ visible, children }) => (visible ? React.createElement(host, null, children) : null),
  Keyboard: { dismiss() {} },
  StyleSheet: { create: (v) => v, flatten, hairlineWidth: 1, absoluteFill: {} },
  Platform: {
    OS: 'ios',
    constants: { reactNativeVersion: { minor: 88 } },
    select: (v) => v.ios ?? v.native ?? v.default,
  },
  Appearance: { getColorScheme: () => 'light', addChangeListener: subscription },
  AppState: { currentState: 'active', addEventListener: subscription },
  Dimensions: {
    get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
    addEventListener: subscription,
  },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise.resolve(false),
    addEventListener: subscription,
  },
  PixelRatio: { get: () => 3, getFontScale: () => 1, roundToNearestPixel: (v) => v },
  I18nManager: { isRTL: false },
};
const auth = { isLoading: false, signInWithSocialProvider: async () => null };
const navigation = { navigate() {}, replace() {}, reset() {}, canGoBack: () => false };
const originalLoad = Module._load;
let jsx;
const root = path.resolve(__dirname, '..');
function load(relative) {
  const filename = path.join(root, relative);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        jsxImportSource: 'react-native-css-interop',
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );
  return mod.exports;
}
Module._load = function (request, parent, isMain) {
  if (request === 'react-native') return rn;
  if (request === 'react-native-safe-area-context') return { SafeAreaView: host };
  if (request === 'react-native-css-interop/jsx-runtime') return jsx;
  if (request === '@react-navigation/native') return { useNavigation: () => navigation };
  if (request.endsWith('/context/AuthContext')) return { useAuth: () => auth };
  if (request === 'lucide-react-native') return new Proxy({}, { get: () => () => null });
  if (request === '@expo/vector-icons/FontAwesome')
    return { __esModule: true, default: () => null };
  if (request.endsWith('/SocialSignInButtons')) return { SocialSignInButtons: SocialButtons };
  // Node otherwise chooses api.js (web); Metro chooses api.native.js on iOS.
  if (request === './api' && parent?.filename.endsWith(path.join('runtime', 'wrap-jsx.js'))) {
    return originalLoad.call(this, './native/api', parent, isMain);
  }
  return originalLoad.call(this, request, parent, isMain);
};
let SocialButtons, CreateAccount, Login;
try {
  const native = require('react-native-css-interop/dist/runtime/native/api');
  const wrapJsx = require('react-native-css-interop/dist/runtime/wrap-jsx').default;
  native.cssInterop(NativePressable, { className: 'style' });
  jsx = { ...reactJsx, jsx: wrapJsx(reactJsx.jsx), jsxs: wrapJsx(reactJsx.jsxs) };
  SocialButtons = load('src/components/common/SocialSignInButtons.tsx').SocialSignInButtons;
  CreateAccount = load('src/screens/CreateAccountScreen.tsx').CreateAccountScreen;
  Login = load('src/screens/LoginScreen.tsx').LoginScreen;
} catch (error) {
  Module._load = originalLoad;
  throw error;
}
function render(Component, down = false) {
  nativeStyles.length = 0;
  pressed = down;
  renderToStaticMarkup(React.createElement(Component));
  return nativeStyles.slice();
}
test('iOS Google and Facebook retain their border, size and horizontal layout through NativeWind', () => {
  for (const label of ['Continue with Google', 'Continue with Facebook']) {
    const button = render(SocialButtons).find((v) => v.label === label);
    assert.ok(button);
    assert.equal(button.style.flexDirection, 'row');
    assert.equal(button.style.borderWidth, 1);
    assert.equal(button.style.minHeight, 52);
    assert.equal(button.style.alignItems, 'center');
  }
});
test('iOS pressed feedback retains social button layout and provider border', () => {
  const button = render(SocialButtons, true).find((v) => v.label === 'Continue with Google');
  assert.equal(button.style.opacity, 0.65);
  assert.equal(button.style.borderColor, '#D94B55');
  assert.equal(button.style.flexDirection, 'row');
});
test('iOS create-account country, email and disabled phone buttons retain their styles', () => {
  const buttons = render(CreateAccount);
  const country = buttons.find((v) => v.label?.startsWith('Country code:'));
  assert.equal(country.style.flexDirection, 'row');
  assert.ok(country.style.width >= 80);
  const email = buttons.find((v) => v.text === 'Continue with email');
  assert.equal(email.style.borderWidth, 1);
  assert.equal(email.style.flexDirection, 'row');
  const phone = buttons.find((v) => v.text === 'Phone sign-up - Coming soon');
  assert.equal(phone.disabled, true);
  assert.equal(phone.style.backgroundColor, '#00B8CE');
  assert.equal(phone.style.opacity, 0.5);
});
test('iOS login retains a visible primary button and back-button touch target', () => {
  const buttons = render(Login);
  const login = buttons.find((v) => v.label === 'Log in');
  assert.equal(login.style.backgroundColor, '#00B8CE');
  assert.ok(login.style.minHeight >= 48);
  const back = buttons.find((v) => v.label === 'Go back');
  assert.equal(back.style.width, 44);
  assert.equal(back.style.height, 44);
});

after(() => {
  Module._load = originalLoad;
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
});
