import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { fetchNotificationCount, notificationKeys, readAllNotifications, readNotification } from '../services/notifications';

export function useNotificationForeground() {
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  useEffect(() => {
    const update = () => setActive(AppState.currentState !== 'background' && AppState.currentState !== 'inactive'
      && !(Platform.OS === 'web' && typeof document !== 'undefined' && document.hidden));
    const subscription = AppState.addEventListener('change', update);
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', update);
    update();
    return () => {
      subscription.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return active;
}

export function useUnreadNotifications(poll = false) {
  const { user, isLoading } = useAuth();
  const active = useNotificationForeground();
  const query = useQuery({ queryKey: notificationKeys.count(user?.id), enabled: !!user && !isLoading && active,
    queryFn: ({ signal }) => fetchNotificationCount(signal), staleTime: 15000,
    refetchInterval: poll && active ? 30000 : false, refetchIntervalInBackground: false });
  useEffect(() => {
    if (poll && active && user && !isLoading && !query.isFetching) void query.refetch();
  }, [poll, active, user?.id, isLoading]);
  return query;
}

export function useNotificationActions() {
  const { user, token } = useAuth();
  const cache = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const identity = useRef(user?.id); identity.current = user?.id;
  useEffect(() => {
    pending.current?.abort(); pending.current = null; setBusy(null); setError('');
    return () => { pending.current?.abort(); pending.current = null; };
  }, [user?.id, token]);

  async function run(id: string, before?: string) {
    if (!user || pending.current) return false;
    const userId = user.id, controller = new AbortController();
    pending.current = controller; setBusy(id); setError('');
    try {
      const result = id === 'all' ? await readAllNotifications(before, controller.signal) : await readNotification(id, controller.signal);
      if (controller.signal.aborted || identity.current !== userId) return false;
      cache.setQueryData(notificationKeys.count(userId), result.unreadCount);
      await Promise.all([
        cache.invalidateQueries({ queryKey: notificationKeys.list(userId) }),
        cache.invalidateQueries({ queryKey: notificationKeys.count(userId) }),
      ]);
      return !controller.signal.aborted && identity.current === userId;
    } catch {
      if (!controller.signal.aborted && identity.current === userId) setError('Chưa cập nhật được thông báo. Vui lòng thử lại.');
      return false;
    } finally {
      if (pending.current === controller) { pending.current = null; setBusy(null); }
    }
  }
  return { busy, error, markRead: (id: string) => run(id), markAllRead: (before?: string) => run('all', before) };
}
