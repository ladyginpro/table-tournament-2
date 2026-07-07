import { useScoreboard } from "../../features/scoreboard-refresh/useScoreboard";
import {
  CountryFlag,
  PlaceBadge,
  TeamIdentity,
} from "../../entities/team/TeamIdentity";
import {
  FINAL_STAGE_MAX,
  FINAL_TOTAL_MAX,
  PRACTICE_STAGE_MAX,
  QUALIFYING_MAX,
  THEORY_STAGE_MAX,
  type ScoreboardResponse,
  type TeamResult,
} from "../../shared/model/scoreboard";
import { LoadingStage, StageLayout } from "../../shared/ui/StageLayout";

function scoreUnit(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return "балл";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "балла";
  }
  return "баллов";
}

function FinalPlaceCard({
  result,
  data,
  place,
}: {
  result?: TeamResult;
  data: ScoreboardResponse;
  place: number;
}) {
  if (!result) return null;
  const team = data.teams.find((item) => item.teamId === result.teamId)!;
  const nameLengthClass =
    team.fullName.length > 85
      ? "is-name-long"
      : team.fullName.length > 55
        ? "is-name-medium"
        : "";

  return (
    <div className={`final-place-card final-place-${place} ${nameLengthClass}`}>
      <strong title={team.fullName}>{team.fullName}</strong>
      <div className="final-place-identity">
        <CountryFlag country={team.country} />
        {team.logoFile ? (
          <img src={`/assets/logos/teams/${team.logoFile}`} alt="" />
        ) : (
          <b className="team-monogram">
            {team.shortName.slice(0, 2).toUpperCase()}
          </b>
        )}
      </div>
      <b>{result.total}</b>
      <small>{scoreUnit(result.total)}</small>
    </div>
  );
}

export function FinalPage() {
  const { data, error } = useScoreboard();
  if (!data) return <LoadingStage error={error} />;

  const finalistsCount = Math.min(
    5,
    Math.max(0, data.settings.finalistsCount || 5),
  );
  const results = data.stageResults.final.slice(0, finalistsCount);
  const rows = Array.from({ length: finalistsCount }, (_, index) => ({
    place: index + 1,
    result: results[index],
  }));
  const teams = new Map(data.teams.map((team) => [team.teamId, team]));

  return (
    <StageLayout background="/assets/backgrounds/final-bg.webp" data={data}>
      {rows.map(({ place, result }) => (
        <FinalPlaceCard
          key={`place-card-${place}`}
          result={result}
          data={data}
          place={place}
        />
      ))}
      <div className="score-table final-table">
        <div className="score-head">
          <span>Место</span>
          <span>Команда</span>
          <span>
            Теория<small>макс. {THEORY_STAGE_MAX}</small>
          </span>
          <span>
            Практика<small>макс. {PRACTICE_STAGE_MAX}</small>
          </span>
          <span>
            Сумма<small>теория + практика, макс. {QUALIFYING_MAX}</small>
          </span>
          <span>
            Финал<small>макс. {FINAL_STAGE_MAX}</small>
          </span>
          <span>
            Итого<small>макс. {FINAL_TOTAL_MAX}</small>
          </span>
        </div>
        {rows.map(({ place, result }) => (
          <div className="score-row" key={result?.teamId ?? `empty-${place}`}>
            <PlaceBadge place={place} />
            {result ? (
              <TeamIdentity
                team={teams.get(result.teamId)!}
                settings={data.settings}
                compact
              />
            ) : (
              <span className="final-team-placeholder">-</span>
            )}
            <strong>{result?.theoryTotal ?? "-"}</strong>
            <strong>{result?.practiceTotal ?? "-"}</strong>
            <strong>{result?.qualifyingTotal ?? "-"}</strong>
            <strong>{result?.finalTotal ?? "-"}</strong>
            <strong className="red-score">{result?.total ?? "-"}</strong>
          </div>
        ))}
      </div>
    </StageLayout>
  );
}
