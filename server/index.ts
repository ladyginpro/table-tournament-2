import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { createSeedDocument } from './seed.ts';
import { backupWorkbook, projectRoot, readWorkbook, workbookExists, writeWorkbook } from './excel.ts';
import { normalizeScoreboard, validateScoreboard, type ScoreboardDocument, type ScoreboardResponse } from '../src/shared/model/scoreboard.ts';

const app = express();
const port = Number(process.env.PORT ?? 3000);
let lastSuccessful: ScoreboardResponse | null = null;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

async function loadScoreboard() {
  const response = normalizeScoreboard(await readWorkbook());
  lastSuccessful = response;
  return response;
}

app.get('/api/scoreboard', async (_request, response) => {
  try {
    response.json(await loadScoreboard());
  } catch (error) {
    console.error('Не удалось прочитать Excel:', error);
    if (lastSuccessful) response.json(lastSuccessful);
    else response.status(500).json({ error: 'Не удалось прочитать data/scoreboard.xlsx.' });
  }
});

app.post('/api/scoreboard', async (request, response) => {
  try {
    const document = request.body as ScoreboardDocument;
    const errors = validateScoreboard(document);
    if (errors.length) return response.status(400).json({ error: errors.join(' ') });
    if (await workbookExists()) await backupWorkbook();
    await writeWorkbook(document);
    return response.json(await loadScoreboard());
  } catch (error) {
    console.error('Не удалось сохранить Excel:', error);
    return response.status(500).json({ error: 'Не удалось сохранить Excel. Закройте файл в Excel и повторите попытку.' });
  }
});

app.post('/api/scoreboard/reload', async (_request, response) => {
  try { response.json(await loadScoreboard()); }
  catch (error) {
    console.error('Не удалось перечитать Excel:', error);
    response.status(500).json({ error: 'Не удалось перечитать Excel.' });
  }
});

const distPath = path.join(projectRoot, 'dist');
app.use(express.static(distPath));
app.get(/^(?!\/api).*/, (_request, response) => response.sendFile(path.join(distPath, 'index.html')));

async function start() {
  if (!(await workbookExists())) await writeWorkbook(createSeedDocument());
  await loadScoreboard();
  app.listen(port, () => console.log(`Hoof Scoreboard: http://localhost:${port}`));
}

start().catch((error) => {
  console.error('Ошибка запуска:', error);
  process.exitCode = 1;
});
