import { useScoreboard } from "../../features/scoreboard-refresh/useScoreboard";
import { PlaceBadge, TeamIdentity } from "../../entities/team/TeamIdentity";
import { LoadingStage, StageLayout } from "../../shared/ui/StageLayout";

export function TheoryPage() {
  const { data, error } = useScoreboard();
  if (!data) return <LoadingStage error={error} />;

  const teams = new Map(data.teams.map((team) => [team.teamId, team]));

  return (
    <StageLayout background="/assets/backgrounds/theory-bg.webp" data={data}>
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
    </StageLayout>
  );
}
