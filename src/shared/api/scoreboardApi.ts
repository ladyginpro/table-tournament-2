import type { ScoreboardDocument, ScoreboardResponse } from '../model/scoreboard';

async function parse(response: Response): Promise<ScoreboardResponse> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'Ошибка запроса к серверу.');
  return body as ScoreboardResponse;
}

export const scoreboardApi = {
  get: () => fetch('/api/scoreboard', { cache: 'no-store' }).then(parse),
  save: (document: ScoreboardDocument) => fetch('/api/scoreboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document),
  }).then(parse),
};
