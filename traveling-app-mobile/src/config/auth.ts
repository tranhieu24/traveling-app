import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const AUTH_TOKEN_KEY = 'traveling_auth_token';
export const AUTH_CALLBACK_PATH = 'auth/callback';
export const RECOVERY_CALLBACK_PATH = 'auth/reset-password';
const configuredScheme = Constants.expoConfig?.scheme;
export const AUTH_SCHEME = Array.isArray(configuredScheme)
  ? configuredScheme[0]
  : configuredScheme || 'travelingapp';
export const NATIVE_AUTH_REDIRECT_URI = `${AUTH_SCHEME}://${AUTH_CALLBACK_PATH}`;

export function getAuthRedirectUri(): string {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') throw new Error('Hãy mở ứng dụng trong trình duyệt để đăng nhập.');
    if (window.self !== window.top) throw new FriendlyAuthError('Hãy mở app trực tiếp trong Chrome, Edge hoặc Safari để đăng nhập Google/Facebook. Trình xem nhúng có thể chặn xác thực.');
    return `${window.location.origin}/${AUTH_CALLBACK_PATH}`;
  }
  if (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient') {
    throw new Error(
      'Đăng nhập Google và Facebook cần bản ứng dụng đã cài đặt. Vui lòng dùng bản development build thay vì Expo Go.'
    );
  }
  return NATIVE_AUTH_REDIRECT_URI;
}

export function isAuthCallback(url: string): boolean {
  try {
    const actual = new URL(url);
    const native = new URL(NATIVE_AUTH_REDIRECT_URI);
    if (actual.protocol === native.protocol)
      return actual.host === native.host && actual.pathname === native.pathname;
    return (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      actual.origin === window.location.origin &&
      actual.pathname === `/${AUTH_CALLBACK_PATH}`
    );
  } catch {
    return false;
  }
}

export function safeAuthError(error: unknown): Error {
  if (error instanceof FriendlyAuthError) return error;
  const code = (error as { code?: string })?.code;
  if (['flow_state_not_found','flow_state_expired','bad_code_verifier'].includes(code||'')) return new FriendlyAuthError('Phiên đăng nhập đã hết hạn hoặc không khớp trình duyệt. Hãy mở lại app và đăng nhập trong cùng trình duyệt.');
  if (code === 'invalid_credentials')
    return new FriendlyAuthError('Email hoặc mật khẩu không đúng.');
  if (code === 'email_not_confirmed')
    return new FriendlyAuthError('Vui lòng xác nhận email trước khi đăng nhập.');
  if (code === 'user_already_exists')
    return new FriendlyAuthError('Đã có tài khoản sử dụng email này. Vui lòng đăng nhập.');
  if (code === 'weak_password') return new FriendlyAuthError('Vui lòng chọn mật khẩu mạnh hơn.');
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit')
    return new FriendlyAuthError('Bạn đã thử quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.');
  return new FriendlyAuthError(
    'Không thể đăng nhập. Hãy kiểm tra kết nối hoặc thử đăng nhập bằng email.'
  );
}
export class FriendlyAuthError extends Error {}

let callbackUrl: string | null = null;
export function captureAuthCallback(url: string) {
  callbackUrl = url;
}
export function getCapturedAuthCallback() {
  return callbackUrl;
}

let recoveryUrl:string|null=null;
export const captureRecoveryCallback=(url:string)=>{recoveryUrl=url;};
export const getCapturedRecoveryCallback=()=>recoveryUrl;
export const clearRecoveryCallback=()=>{recoveryUrl=null;};
export const getRecoveryRedirectUri=()=>getAuthRedirectUri().replace(AUTH_CALLBACK_PATH,RECOVERY_CALLBACK_PATH);
export function isRecoveryCallback(url:string):boolean {
  try {
    const actual=new URL(url);
    if(Platform.OS==='web'&&typeof window!=='undefined')return actual.origin===window.location.origin&&actual.pathname==='/'+RECOVERY_CALLBACK_PATH;
    const expected=new URL(`${AUTH_SCHEME}://${RECOVERY_CALLBACK_PATH}`);
    return actual.protocol===expected.protocol&&actual.host===expected.host&&actual.pathname===expected.pathname;
  }catch{return false;}
}
