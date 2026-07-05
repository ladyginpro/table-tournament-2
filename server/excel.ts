import ExcelJS from 'exceljs';
import { copyFile, mkdir, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import type {
  FinalInputMode,
  PracticeStatus,
  ScoreboardDocument,
  TeamNameMode,
} from '../src/shared/model/scoreboard.ts';

export const projectRoot = path.resolve(import.meta.dirname, '..');
export const dataDir = path.join(projectRoot, 'data');
export const workbookPath = path.join(dataDir, 'scoreboard.xlsx');
export const backupsDir = path.join(dataDir, 'backups');

const bool = (value: ExcelJS.CellValue | undefined) => value === true || value === 1 || String(value).toLowerCase() === 'true';
const num = (value: ExcelJS.CellValue | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const nullableNum = (value: ExcelJS.CellValue | undefined) => value === null || value === undefined || value === '' ? null : num(value);
const text = (value: ExcelJS.CellValue | undefined) => String(value ?? '').trim();

type RowObject = Record<string, ExcelJS.CellValue>;

function rows(sheet: ExcelJS.Worksheet): RowObject[] {
  const headers = (sheet.getRow(1).values as ExcelJS.CellValue[]).slice(1).map(text);
  const result: RowObject[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item: RowObject = {};
    headers.forEach((header, index) => { item[header] = row.getCell(index + 1).value; });
    if (Object.values(item).some((value) => value !== null && value !== '')) result.push(item);
  });
  return result;
}

function requiredSheet(workbook: ExcelJS.Workbook, name: string) {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) throw new Error(`В Excel отсутствует обязательный лист «${name}».`);
  return sheet;
}

export async function readWorkbook(): Promise<ScoreboardDocument> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const settingsMap = new Map(rows(requiredSheet(workbook, 'settings')).map((item) => [text(item.key), item.value]));

  return {
    settings: {
      refreshIntervalMs: num(settingsMap.get('refreshIntervalMs'), 2000),
      finalistsCount: num(settingsMap.get('finalistsCount'), 5),
      teamNameMode: (text(settingsMap.get('teamNameMode')) || 'full') as TeamNameMode,
      finalInputMode: (text(settingsMap.get('finalInputMode')) || 'participant') as FinalInputMode,
      transparentBackground: bool(settingsMap.get('transparentBackground')),
    },
    teams: rows(requiredSheet(workbook, 'teams')).map((item) => ({
      teamId: text(item.teamId),
      fullName: text(item.fullName),
      shortName: text(item.shortName),
      country: text(item.country) === 'by' ? 'by' : 'ru',
      logoFile: text(item.logoFile),
      isActive: bool(item.isActive),
      isFinalist: bool(item.isFinalist),
      displayOrder: num(item.displayOrder),
      manualRankTheory: nullableNum(item.manualRankTheory),
      manualRankPractice: nullableNum(item.manualRankPractice),
      manualRankFinal: nullableNum(item.manualRankFinal),
    })),
    participants: rows(requiredSheet(workbook, 'participants')).map((item) => ({
      participantId: text(item.participantId),
      teamId: text(item.teamId),
      fullName: text(item.fullName),
      isTheoryParticipant: bool(item.isTheoryParticipant),
      isPracticeParticipant: bool(item.isPracticeParticipant),
      isFinalParticipant: bool(item.isFinalParticipant),
      practiceSlot: nullableNum(item.practiceSlot),
      finalSlot: nullableNum(item.finalSlot),
    })),
    theoryScores: rows(requiredSheet(workbook, 'theory_scores')).map((item) => ({
      participantId: text(item.participantId), score: num(item.score),
    })),
    practiceScores: rows(requiredSheet(workbook, 'practice_scores')).map((item) => ({
      participantId: text(item.participantId),
      score: num(item.score),
      status: (text(item.status) || 'not_started') as PracticeStatus,
    })),
    participantFinalScores: rows(requiredSheet(workbook, 'final_scores_participant')).map((item) => ({
      participantId: text(item.participantId), leg1: num(item.leg1), leg2: num(item.leg2),
    })),
    teamFinalScores: rows(requiredSheet(workbook, 'final_scores_team')).map((item) => ({
      teamId: text(item.teamId), leg1: num(item.leg1), leg2: num(item.leg2),
    })),
  };
}

const columns = {
  settings: ['key', 'value'],
  teams: ['teamId', 'fullName', 'shortName', 'country', 'logoFile', 'isActive', 'isFinalist', 'displayOrder', 'manualRankTheory', 'manualRankPractice', 'manualRankFinal'],
  participants: ['participantId', 'teamId', 'fullName', 'isTheoryParticipant', 'isPracticeParticipant', 'isFinalParticipant', 'practiceSlot', 'finalSlot'],
  theory_scores: ['participantId', 'score'],
  practice_scores: ['participantId', 'score', 'status'],
  final_scores_participant: ['participantId', 'leg1', 'leg2'],
  final_scores_team: ['teamId', 'leg1', 'leg2'],
} as const;

function addSheet(workbook: ExcelJS.Workbook, name: keyof typeof columns, data: object[]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns[name].map((key) => ({ header: key, key, width: Math.max(14, key.length + 2) }));
  sheet.addRows(data);
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A2C70' } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns[name].length } };
  sheet.eachRow((row) => { row.alignment = { vertical: 'middle' }; });
  return sheet;
}

export async function writeWorkbook(document: ScoreboardDocument): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hoof Scoreboard';
  workbook.created = new Date();
  addSheet(workbook, 'settings', Object.entries(document.settings).map(([key, value]) => ({ key, value })));
  addSheet(workbook, 'teams', document.teams);
  addSheet(workbook, 'participants', document.participants);
  addSheet(workbook, 'theory_scores', document.theoryScores);
  addSheet(workbook, 'practice_scores', document.practiceScores);
  addSheet(workbook, 'final_scores_participant', document.participantFinalScores);
  addSheet(workbook, 'final_scores_team', document.teamFinalScores);

  const temporaryPath = path.join(dataDir, 'scoreboard.tmp.xlsx');
  await workbook.xlsx.writeFile(temporaryPath);
  try {
    await unlink(workbookPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await rename(temporaryPath, workbookPath);
}

export async function workbookExists() {
  try { await stat(workbookPath); return true; } catch { return false; }
}

export async function backupWorkbook(): Promise<string> {
  await mkdir(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/T/, '-').replace(/:/g, '-').replace(/\..+/, '');
  const destination = path.join(backupsDir, `scoreboard-${stamp}.xlsx`);
  await copyFile(workbookPath, destination);
  return destination;
}
