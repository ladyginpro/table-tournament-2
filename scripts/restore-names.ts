import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { backupData, projectRoot, readData, writeData } from '../server/storage.ts';
import type { ScoreboardDocument } from '../src/shared/model/scoreboard.ts';

const backupDirectory = path.join(projectRoot, 'data', 'backups');
const suspiciousText = (value: string) => value.includes('\uFFFD') || /\?{2,}/.test(value);
const hasCyrillic = (value: string) => /[А-Яа-яЁё]/.test(value);

const backupFiles = (await readdir(backupDirectory))
  .filter((file) => file.startsWith('scoreboard-') && file.endsWith('.json'))
  .sort((a, b) => b.localeCompare(a));

let source: ScoreboardDocument | null = null;
let sourceFile = '';
for (const file of backupFiles) {
  const candidate = JSON.parse(await readFile(path.join(backupDirectory, file), 'utf8')) as ScoreboardDocument;
  const names = [
    ...candidate.teams.flatMap((team) => [team.fullName, team.shortName]),
    ...candidate.participants.map((participant) => participant.fullName),
  ];
  if (names.every((name) => hasCyrillic(name) && !suspiciousText(name))) {
    source = candidate;
    sourceFile = file;
    break;
  }
}

if (!source) throw new Error('Не найдена резервная копия с неповреждёнными русскими именами.');

const current = await readData();
const sourceTeams = new Map(source.teams.map((team) => [team.teamId, team]));
const sourceParticipants = new Map(source.participants.map((participant) => [participant.participantId, participant]));

for (const team of current.teams) {
  const original = sourceTeams.get(team.teamId);
  if (!original) throw new Error(`В резервной копии отсутствует команда ${team.teamId}.`);
  team.fullName = original.fullName;
  team.shortName = original.shortName;
}
for (const participant of current.participants) {
  const original = sourceParticipants.get(participant.participantId);
  if (!original) throw new Error(`В резервной копии отсутствует участник ${participant.participantId}.`);
  participant.fullName = original.fullName;
}

await backupData();
await writeData(current);
console.log(`Русские названия и ФИО восстановлены из ${sourceFile}.`);
