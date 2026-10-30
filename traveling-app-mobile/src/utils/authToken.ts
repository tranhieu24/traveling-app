import { storage } from './storage';
import { AUTH_TOKEN_KEY } from '../config/auth';

let tokenWrite: Promise<unknown> = Promise.resolve();
export function trackAuthTokenWrite(write: Promise<unknown>) {
  tokenWrite = write;
  // Callers still receive failures; do not produce unhandled rejections.
  void write.catch(() => {});
}
export async function readAuthToken() {
  // A rotation/logout may enqueue another write while this one is finishing.
  let observed: Promise<unknown>;
  do {
    observed = tokenWrite;
    await observed;
  } while (observed !== tokenWrite);
  return storage.getItem(AUTH_TOKEN_KEY);
}
