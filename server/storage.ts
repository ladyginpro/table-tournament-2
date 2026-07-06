import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ScoreboardDocument } from '../src/shared/model/scoreboard.ts';

export const projectRoot = path.resolve(import.meta.dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const dataPath = path.join(dataDir, 'scoreboard.json');
const backupDir = path.join(dataDir, 'backups');

export async function readData(): Promise<ScoreboardDocument> {
  return JSON.parse(await readFile(dataPath, 'utf8')) as ScoreboardDocument;
}

export async function writeData(document: ScoreboardDocument): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const temporaryPath = `${dataPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  try {
    await copyFile(temporaryPath, dataPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function dataExists(): Promise<boolean> {
  try { await readFile(dataPath); return true; }
  catch { return false; }
}

export async function backupData(): Promise<void> {
  await mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
  await copyFile(dataPath, path.join(backupDir, `scoreboard-${stamp}.json`));
}
