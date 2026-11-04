import 'react-native-url-polyfill/auto';
import 'fast-text-encoding';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

// Hermes needs secure randomness and SHA-256 for Supabase's S256 PKCE.
// Do not replace the browser's WebCrypto implementation.
if (Platform.OS !== 'web') {
  const nativeCrypto = globalThis.crypto || ({} as typeof globalThis.crypto);
  if (!nativeCrypto.getRandomValues)
    nativeCrypto.getRandomValues = Crypto.getRandomValues as typeof nativeCrypto.getRandomValues;
  if (!nativeCrypto.subtle) {
    Object.defineProperty(nativeCrypto, 'subtle', {
      configurable: true,
      value: {
        digest: async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
          const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
          if (name.toUpperCase() !== 'SHA-256') throw new Error('Thuật toán băm không được hỗ trợ.');
          return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
        },
      } as SubtleCrypto,
    });
  }
  if (!globalThis.crypto) globalThis.crypto = nativeCrypto;
}

export function requireSecurePKCE() {
  if (
    !globalThis.crypto?.getRandomValues ||
    !globalThis.crypto?.subtle ||
    typeof TextEncoder === 'undefined'
  ) {
    throw new Error(
      'Đăng nhập bảo mật không khả dụng tại đây. Hãy mở ứng dụng web qua localhost hoặc HTTPS, hoặc dùng bản mobile đã cài đặt.'
    );
  }
}
