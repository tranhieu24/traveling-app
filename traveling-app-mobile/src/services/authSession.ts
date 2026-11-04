import { trackAuthTokenWrite } from '../utils/authToken';
import type { Session } from '@supabase/supabase-js';
import { AUTH_TOKEN_KEY, FriendlyAuthError } from '../config/auth';
import type { User } from '../types';

type Dependencies = {
  storage: {
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
  fetchProfile(): Promise<User>;
  publish(token: string | null, user: User | null): void;
  clearCache(): void;
};

// Serializes storage writes, shares duplicate auth events, and rejects delayed
// profile responses from a session that has already changed or signed out.
export function createSessionBridge(deps: Dependencies) {
  let revision = 0;
  let accessToken: string | null = null;
  let profile: User | null = null;
  let pending: Promise<User> | null = null;
  let writes: Promise<unknown> = Promise.resolve();
  function write(fn: () => Promise<void>) {
    const next = writes.then(fn, fn);
    writes = next.catch(() => {});
    trackAuthTokenWrite(next);
    return next;
  }
  function clear() {
    revision++;
    accessToken = null;
    profile = null;
    pending = null;
    deps.publish(null, null);
    deps.clearCache();
    return write(() => deps.storage.removeItem(AUTH_TOKEN_KEY));
  }
  function sync(session: Session, force = false): Promise<User> {
    if (!session.user.email?.trim()) {
      return clear().then(() => {
        throw new FriendlyAuthError(
          'Tài khoản không cung cấp địa chỉ email. Hãy cho phép Google/Facebook chia sẻ email hoặc tiếp tục bằng email.'
        );
      });
    }
    if (accessToken === session.access_token) {
      if (pending) return pending;
      if (profile && !force) return Promise.resolve(profile);
    }
    const mine = ++revision;
    const previousProfile = profile;
    accessToken = session.access_token;
    // Hide stale account data while validating the new profile.
    profile = null;
    const task = (async () => {
      try {
        await write(async () => {
          if (mine !== revision) return;
          await deps.storage.setItem(AUTH_TOKEN_KEY, session.access_token);
          if (mine === revision)
            deps.publish(
              session.access_token,
              previousProfile?.id === session.user.id ? previousProfile : null
            );
        });
        if (mine !== revision)
          throw new FriendlyAuthError('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');
        const verified = await deps.fetchProfile();
        if (mine !== revision)
          throw new FriendlyAuthError('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');
        if (verified.id !== session.user.id || !verified.email)
          throw new FriendlyAuthError(
            'Không thể xác minh hồ sơ tài khoản. Vui lòng liên hệ hỗ trợ.'
          );
        if (previousProfile?.id !== verified.id) deps.clearCache();
        profile = verified;
        deps.publish(session.access_token, verified);
        return verified;
      } catch (error) {
        if (mine === revision) await clear();
        throw error;
      }
    })();
    pending = task;
    void task
      .finally(() => {
        if (mine === revision) pending = null;
      })
      .catch(() => {});
    return task;
  }
  return { sync, clear };
}
