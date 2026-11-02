type ApiLocation = {
  platform: string;
  development: boolean;
  override?: string;
  configuredUrl?: string;
  hostUri?: string;
  webHostname?: string;
};
const normalize = (url: string) => url.replace(/\/+$/, '');
export function resolveApiBaseUrl(options: ApiLocation): string {
  if (options.override?.trim()) return normalize(options.override.trim());
  if (options.platform === 'web') {
    return `http://${options.webHostname || 'localhost'}:5000/api/v1`;
  }
  if (options.development && options.hostUri) {
    try {
      const host = new URL(options.hostUri.includes('://') ? options.hostUri : `http://${options.hostUri}`).hostname;
      // Expo tunnel only forwards Metro, not backend port 5000.
      if (host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) {
        return `http://${host}:5000/api/v1`;
      }
    } catch { /* Fall back to the configured backend. */ }
  }
  return normalize(options.configuredUrl || 'http://localhost:5000/api/v1');
}
