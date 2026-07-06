import { useScoreboard } from "../../features/scoreboard-refresh/useScoreboard";
import { CompetitionHeader } from "../../shared/ui/CompetitionHeader";
import { LoadingStage, StageLayout } from "../../shared/ui/StageLayout";
import { PlaceBadge, TeamIdentity } from "../../entities/team/TeamIdentity";

export function TheoryPage() {
  const { data, error } = useScoreboard();
  if (!data) return <LoadingStage error={error} />;
  const teams = new Map(data.teams.map((team) => [team.teamId, team]));
  return (
    <StageLayout background="/assets/backgrounds/theory-bg.png" data={data}>
      <CompetitionHeader title="Результаты теоретического этапа" />
      <div className="stage-cap blue">
        Теория - сумма баллов всех участников команды
      </div>
      <div className="score-table theory-table">
        <div className="score-head">
          <span>Место</span>
          <span>Команда</span>
          <span>Баллы</span>
        </div>
        {data.stageResults.theory.map((result) => {
          const team = teams.get(result.teamId)!;
          return (
            <div className="score-row" key={result.teamId}>
              <PlaceBadge place={result.place} />
              <TeamIdentity team={team} settings={data.settings} />
              <strong>{result.theoryTotal}</strong>
            </div>
          );
        })}
      </div>
      <div className="stage-note">
        ⓘ Результаты теоретического этапа публикуются перед началом
        практического этапа
      </div>
      <div className="stage-maximum">
        🏆{" "}
        <span>
          Максимум участника
          <br />
          <b>60</b> баллов
        </span>
      </div>
    </StageLayout>
  );
}
