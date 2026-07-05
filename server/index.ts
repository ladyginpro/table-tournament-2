import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { createSeedDocument } from './seed.ts';
import { backupData, dataExists, projectRoot, readData, writeData } from './storage.ts';
import { normalizeScoreboard, validateScoreboard, type ScoreboardDocument, type ScoreboardResponse } from '../src/shared/model/scoreboard.ts';

const app = express();
const port = Number(process.env.PORT ?? 3000);
let lastSuccessful: ScoreboardResponse | null = null;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

async function loadScoreboard() {
  const response = normalizeScoreboard(await readData());
  lastSuccessful = response;
  return response;
}

app.get('/api/scoreboard', async (_request, response) => {
  try {
    response.json(await loadScoreboard());
  } catch (error) {
    console.error('Не удалось прочитать данные:', error);
    if (lastSuccessful) response.json(lastSuccessful);
    else response.status(500).json({ error: 'Не удалось прочитать data/scoreboard.json.' });
  }
});

app.post('/api/scoreboard', async (request, response) => {
  try {
    const body = request.body as ScoreboardDocument;
    const document: ScoreboardDocument = {
      settings: body.settings,
      teams: body.teams,
      participants: body.participants,
      theoryScores: body.theoryScores,
      practiceScores: body.practiceScores,
      participantFinalScores: body.participantFinalScores,
      teamFinalScores: body.teamFinalScores,
    };
    const errors = validateScoreboard(document);
    if (errors.length) return response.status(400).json({ error: errors.join(' ') });
    if (await dataExists()) await backupData();
    await writeData(document);
    return response.json(await loadScoreboard());
  } catch (error) {
    console.error('Не удалось сохранить данные:', error);
    return response.status(500).json({ error: 'Не удалось сохранить данные.' });
  }
});

const distPath = path.join(projectRoot, 'dist');
app.use(express.static(distPath));
app.get(/^(?!\/api).*/, (_request, response) => response.sendFile(path.join(distPath, 'index.html')));

async function start() {
  if (!(await dataExists())) await writeData(createSeedDocument());
  await loadScoreboard();
  app.listen(port, () => console.log(`Hoof Scoreboard: http://localhost:${port}`));
}

start().catch((error) => {
  console.error('Ошибка запуска:', error);
  process.exitCode = 1;
});
