import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { aiChat, AiHelpResult } from '../../services/ai';

export interface ChatTurn {
  id: number;
  question: string;
  result?: AiHelpResult;
}

// Conversation stays in memory; a different session must never inherit it.
export function useAiChat(userId: string | undefined, token: string | null) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<{ controller: AbortController; turn: ChatTurn } | null>(null);
  const nextId = useRef(0);

  function cancel() {
    const request = pending.current;
    if (!request) return;
    pending.current = null;
    request.controller.abort();
    setTurns(previous => previous.filter(turn => turn.id !== request.turn.id));
    setDraft(request.turn.question);
    setBusy(false);
  }

  useEffect(() => {
    pending.current?.controller.abort();
    pending.current = null;
    setTurns([]);
    setDraft('');
    setError('');
    setBusy(false);
    return () => {
      pending.current?.controller.abort();
      pending.current = null;
    };
  }, [userId, token]);

  async function send(text = draft) {
    const question = text.trim();
    if (pending.current || question.length < 2 || question.length > 800) return;
    const turn: ChatTurn = { id: ++nextId.current, question };
    const controller = new AbortController();
    const request = { controller, turn };
    pending.current = request;
    setBusy(true);
    setError('');
    setDraft('');
    setTurns(previous => [...previous.slice(-9), turn]);
    try {
      const sources = turns[turns.length - 1]?.result?.sourceRefs;
      const listingId = sources?.length === 1 && sources[0].type === 'listing' ? sources[0].id : undefined;
      const searchContext = turns[turns.length - 1]?.result?.searchContext;
      const result = await aiChat(question, listingId, controller.signal, searchContext);
      if (pending.current !== request || controller.signal.aborted) return;
      if (!result || typeof result.answer !== 'string' || !result.answer.trim()
        || !['ai', 'fallback', 'data'].includes(result.mode)
        || !Array.isArray(result.sourceRefs)
        || (result.searchContext !== undefined && (!result.searchContext || typeof result.searchContext !== 'object' || Array.isArray(result.searchContext)))
        || result.sourceRefs.some(source => !source || !['article', 'booking', 'listing'].includes(source.type)
          || typeof source.id !== 'string' || !source.id || typeof source.title !== 'string')) {
        throw new Error('Invalid help response');
      }
      setTurns(previous => previous.map(item => item.id === turn.id ? { ...item, result } : item));
    } catch (cause) {
      if (pending.current !== request || controller.signal.aborted) return;
      setTurns(previous => previous.filter(item => item.id !== turn.id));
      setDraft(question);
      setError(axios.isAxiosError(cause) && cause.response?.status === 429
        ? 'Bạn đã gửi quá nhiều yêu cầu. Hãy chờ một lát rồi thử lại.'
        : 'Chưa kết nối được với trợ lý. Câu hỏi đã được giữ lại, bạn có thể gửi lại.');
    } finally {
      if (pending.current === request) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  return { turns, draft, setDraft, busy, error, send, cancel };
}
