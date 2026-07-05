# Табло соревнования копытчиков

Локальное приложение для эфира 1920×1080. Работает без интернета; данные хранятся в `data/scoreboard.xlsx`.

## Запуск для оператора

1. Закройте `scoreboard.xlsx`, если он открыт в Excel.
2. Дважды щёлкните `start.bat`.
3. Если браузер не открылся автоматически, откройте `http://localhost:3000/theory`.
4. Для ввода результатов используйте `http://localhost:3000/admin`.
5. После изменений нажмите **Сохранить**. До нажатия эфирные данные не изменятся.

Страницы эфира:

- `/theory` — теоретический этап;
- `/practice` — практический этап;
- `/final` — финал и итог;
- `/protocol` — полный служебный протокол;
- `/admin` — управление данными.

Перед каждым сохранением создаётся файл `data/backups/scoreboard-YYYY-MM-DD-HH-mm-ss.xlsx`. Если Excel открыт и блокирует файл, приложение покажет ошибку и оставит предыдущие данные на экране.

## Разработка

Требуется Node.js 22 или новее.

```powershell
npm.cmd install
npm.cmd run dev
```

Vite работает на `http://localhost:5173`, API — на `http://localhost:3000`.

Проверка и production-сборка:

```powershell
npm.cmd run check
npm.cmd run build
```

Офлайн-комплект со сборкой, Excel и установленными зависимостями:

```powershell
npm.cmd run release
```

Результат появится в папке `release`. Её можно целиком перенести на Windows-компьютер с установленным Node.js.

## Excel

Файл содержит листы `settings`, `teams`, `participants`, `theory_scores`, `practice_scores`, `final_scores_participant`, `final_scores_team`. Его можно править вручную, после чего в админке нужно нажать **Перечитать Excel**.
