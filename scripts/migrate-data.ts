import { migrateScoreboard } from '../src/shared/model/scoreboard.ts';
import { backupData, dataExists, readData, writeData } from '../server/storage.ts';

if (await dataExists()) await backupData();
await writeData(migrateScoreboard(await readData()));
console.log('Данные scoreboard.json переведены в актуальный формат.');
