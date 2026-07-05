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
      if (active && poll) timeoutRef.current = window.setTimeout(tick, next?.settings.refreshIntervalMs ?? 2000);
    };
    void tick();
    return () => { active = false; window.clearTimeout(timeoutRef.current); };
  }, [load, poll]);

  return { data, setData, error, load };
}
