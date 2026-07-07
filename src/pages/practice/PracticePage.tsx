import type { CSSProperties } from "react";
import { useScoreboard } from "../../features/scoreboard-refresh/useScoreboard";
import { PlaceBadge, TeamIdentity } from "../../entities/team/TeamIdentity";
import { LoadingStage, StageLayout } from "../../shared/ui/StageLayout";
import {
  QUALIFYING_MAX,
  scoreBreakdownTotal,
  THEORY_STAGE_MAX,
} from "../../shared/model/scoreboard";

type PerformanceStatus = "done" | "preparing" | "not_started";

const statusLabels: Record<PerformanceStatus, string> = {
  done: "Выступил",
  preparing: "Готовится",
  not_started: "Не начал",
};

export function PracticePage() {
  const { data, error } = useScoreboard();
  if (!data) return <LoadingStage error={error} />;

  const teams = new Map(data.teams.map((team) => [team.teamId, team]));
  const practiceScores = new Map(
    data.practiceScores.map((score) => [score.participantId, score]),
  );
  const participantsByTeam = new Map<string, typeof data.participants>();

  for (const participant of data.participants) {
    if (!participant.isPracticeParticipant) continue;
    participantsByTeam.set(participant.teamId, [
      ...(participantsByTeam.get(participant.teamId) ?? []),
      participant,
    ]);
  }

  return (
    <StageLayout background="/assets/backgrounds/practice-bg.webp" data={data}>
      <div
        className="score-table practice-table"
        style={
          {
            "--practice-row-height": `${Math.min(40.5, 610 / Math.max(data.stageResults.practice.length, 1))}px`,
          } as CSSProperties
        }
      >
        <div className="score-head">
          <span>Место</span>
          <span>Команда</span>
          <span>
            Теория<small>макс. {THEORY_STAGE_MAX}</small>
          </span>
          <span>
            Сумма
            <small>
              теория + практика
              <br />
              макс. {QUALIFYING_MAX}
            </small>
          </span>
          <span>Выступление</span>
          <span>
            Баллы
            <br />
            этапа
          </span>
          <span>
            Отставание
            <br />
            от лидера
          </span>
        </div>
        {data.stageResults.practice.map((result) => {
          const participants = [
            ...(participantsByTeam.get(result.teamId) ?? []),
          ].sort(
            (a, b) =>
              (a.practiceSlot ?? Number.MAX_SAFE_INTEGER) -
              (b.practiceSlot ?? Number.MAX_SAFE_INTEGER),
          );
          const completed = participants.map(
            (participant) =>
              scoreBreakdownTotal(
                practiceScores.get(participant.participantId),
              ) > 0,
          );
          const nextParticipant = completed.findIndex((isDone) => !isDone);
          const statuses: PerformanceStatus[] = completed.map(
            (isDone, index) =>
              isDone
                ? "done"
                : index === nextParticipant
                  ? "preparing"
                  : "not_started",
          );
          const completedCount = completed.filter(Boolean).length;

          return (
            <div className="score-row" key={result.teamId}>
              <PlaceBadge place={result.place} />
              <TeamIdentity
                team={teams.get(result.teamId)!}
                settings={data.settings}
                compact
              />
              <strong>{result.theoryTotal}</strong>
              <strong>{result.qualifyingTotal}</strong>
              <div className="performance-cell">
                <small>
                  {completedCount} из {participants.length}
                </small>
                <div className="status-list">
                  {statuses.map((status, index) => (
                    <span
                      className={`status-dot ${status}`}
                      aria-label={`${statusLabels[status]}: ${participants[index].fullName}`}
                      title={`${statusLabels[status]}: ${participants[index].fullName}`}
                      key={participants[index].participantId}
                    >
                      {status === "done"
                        ? "✓"
                        : status === "not_started"
                          ? "-"
                          : ""}
                    </span>
                  ))}
                </div>
              </div>
              <strong className="red-score">{result.practiceTotal}</strong>
              <strong>{result.leaderGap || "-"}</strong>
            </div>
          );
        })}
      </div>
    </StageLayout>
  );
}
