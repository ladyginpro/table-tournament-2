import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScoreboardResponse } from '../../shared/model/scoreboard';
import { scoreboardApi } from '../../shared/api/scoreboardApi';

export function useScoreboard(poll = true) {
  const [data, setData] = useState<ScoreboardResponse | null>(null);
  const [error, setError] = useState('');
  const timeoutRef = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const next = await scoreboardApi.get();
      setData(next);
      setError('');
      return next;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить данные.');
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      const next = await load();
      if (!active) return;
      if (next && poll) {
        timeoutRef.current = window.setTimeout(tick, next.settings.refreshIntervalMs);
      } else if (!next) {
        // В dev-режиме Vite иногда стартует раньше API. Повторяем запрос и на
        // непериодических страницах (админка), пока сервер не станет доступен.
        timeoutRef.current = window.setTimeout(tick, 750);
      }
    };
    void tick();
    return () => { active = false; window.clearTimeout(timeoutRef.current); };
  }, [load, poll]);

  return { data, setData, error, load };
}
