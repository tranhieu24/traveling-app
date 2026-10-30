// SecureStore on older iOS runtimes limits a single value to around 2 KB.
// Supabase owns its full session/refresh token; split encrypted storage values
// without introducing another refresh-token key or plaintext native storage.
const PREFIX = '__traveling_secure_chunks__:';
const SIZE = 1500;
type Store = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};
export function createSecureChunks(store: Store) {
  const metadata = (value: string | null) => {
    if (!value?.startsWith(PREFIX)) return null;
    const [id, count] = value.slice(PREFIX.length).split(':');
    const n = Number(count);
    if (!/^[a-z0-9]+$/.test(id) || !Number.isInteger(n) || n < 1 || n > 1000)
      throw new Error('Saved sign-in storage is invalid.');
    return { id, n };
  };
  const keyFor = (key: string, id: string, i: number) => `${key}.chunk.${id}.${i}`;
  const cleanup = async (key: string, m: ReturnType<typeof metadata>) => {
    if (m)
      await Promise.all(
        Array.from({ length: m.n }, (_, i) => store.deleteItemAsync(keyFor(key, m.id, i)))
      );
  };
  return {
    async getItem(key: string) {
      const value = await store.getItemAsync(key);
      const m = metadata(value);
      if (!m) return value;
      const chunks = await Promise.all(
        Array.from({ length: m.n }, (_, i) => store.getItemAsync(keyFor(key, m.id, i)))
      );
      if (chunks.some((part) => part === null))
        throw new Error('Saved sign-in is incomplete. Please log in again.');
      return JSON.parse(chunks.join('')) as string;
    },
    async setItem(key: string, value: string) {
      const old = metadata(await store.getItemAsync(key));
      // ASCII-encode JSON/session Unicode so every SecureStore chunk stays small.
      const encoded = JSON.stringify(value).replace(
        /[^\x00-\x7F]/g,
        (char) => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
      );
      if (encoded.length <= SIZE && !value.startsWith(PREFIX)) {
        await store.setItemAsync(key, value);
      } else {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        const n = Math.ceil(encoded.length / SIZE);
        try {
          for (let i = 0; i < n; i++)
            await store.setItemAsync(keyFor(key, id, i), encoded.slice(i * SIZE, (i + 1) * SIZE));
          await store.setItemAsync(key, `${PREFIX}${id}:${n}`);
        } catch (e) {
          await cleanup(key, { id, n }).catch(() => {});
          throw e;
        }
      }
      await cleanup(key, old);
    },
    async removeItem(key: string) {
      const old = metadata(await store.getItemAsync(key));
      await store.deleteItemAsync(key);
      await cleanup(key, old);
    },
  };
}
