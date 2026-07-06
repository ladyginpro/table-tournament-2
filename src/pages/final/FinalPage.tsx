import { useScoreboard } from "../../features/scoreboard-refresh/useScoreboard";
import { CompetitionHeader } from "../../shared/ui/CompetitionHeader";
import { LoadingStage, StageLayout } from "../../shared/ui/StageLayout";
import {
  CountryFlag,
  PlaceBadge,
  TeamIdentity,
} from "../../entities/team/TeamIdentity";
import {
  FINAL_STAGE_MAX,
  scoreBreakdownTotal,
  type ScoreboardResponse,
  type TeamResult,
} from "../../shared/model/scoreboard";

function PodiumCard({
  result,
  data,
  className = "",
}: {
  result?: TeamResult;
  data: ScoreboardResponse;
  className?: string;
}) {
  if (!result) return null;
  const team = data.teams.find((item) => item.teamId === result.teamId)!;
  return (
    <div className={`podium-card ${className}`}>
      <strong>
        {data.settings.teamNameMode === "short"
          ? team.shortName
          : team.fullName}
      </strong>
      <div>
        <CountryFlag country={team.country} />
        {team.logoFile ? (
          <img src={`/assets/logos/teams/${team.logoFile}`} alt="" />
        ) : (
          <b className="team-monogram">
            {team.shortName.slice(0, 2).toUpperCase()}
          </b>
        )}
      </div>
      <b>{result.finalTotal}</b>
      <small>баллов</small>
    </div>
  );
}

export function FinalPage() {
  const { data, error } = useScoreboard();
  if (!data) return <LoadingStage error={error} />;
  const results = data.stageResults.final;
  const teams = new Map(data.teams.map((team) => [team.teamId, team]));
  const finalScores = new Map(
    data.participantFinalScores.map((score) => [score.participantId, score]),
  );
  const finalistsByTeam = new Map<string, typeof data.participants>();
  for (const participant of data.participants) {
    if (!participant.isFinalParticipant) continue;
    finalistsByTeam.set(participant.teamId, [
      ...(finalistsByTeam.get(participant.teamId) ?? []),
      participant,
    ]);
  }
  return (
    <StageLayout background="/assets/backgrounds/final-bg.png" data={data}>
      <CompetitionHeader title="Результаты финального этапа" accent="red" />
      <div className="final-caps">
        <span>2 участника × 2 ноги по 100 баллов</span>
        <span>Максимум за финал - {FINAL_STAGE_MAX} баллов</span>
      </div>
      <PodiumCard result={results[1]} data={data} className="podium-second" />
      <PodiumCard result={results[0]} data={data} className="podium-first" />
      <PodiumCard result={results[2]} data={data} className="podium-third" />
      <PodiumCard result={results[3]} data={data} className="podium-fourth" />
      <PodiumCard result={results[4]} data={data} className="podium-fifth" />
      <div className="score-table final-table">
        <div className="score-head">
          <span>Место</span>
          <span>Команда</span>
          <span>
            Участник 1<small>нога 1 + нога 2</small>
          </span>
          <span>
            Участник 2<small>нога 1 + нога 2</small>
          </span>
          <span>
            Баллы финала<small>макс. {FINAL_STAGE_MAX}</small>
          </span>
        </div>
        {results.map((result) => {
          const finalists = [
            ...(finalistsByTeam.get(result.teamId) ?? []),
          ].sort((a, b) => (a.finalSlot ?? 99) - (b.finalSlot ?? 99));
          return (
            <div className="score-row" key={result.teamId}>
              <PlaceBadge place={result.place} />
              <TeamIdentity
                team={teams.get(result.teamId)!}
                settings={data.settings}
                compact
              />
              {[0, 1].map((index) => {
                const participant = finalists[index];
                const score = participant
                  ? finalScores.get(participant.participantId)
                  : undefined;
                return (
                  <strong
                    className="finalist-legs"
                    key={participant?.participantId ?? index}
                    title={participant?.fullName}
                  >
                    {score ? (
                      <>
                        <span>{scoreBreakdownTotal(score.leg1)}</span>
                        <i>+</i>
                        <span>{scoreBreakdownTotal(score.leg2)}</span>
                      </>
                    ) : (
                      "-"
                    )}
                  </strong>
                );
              })}
              <strong className="red-score">{result.finalTotal}</strong>
            </div>
          );
        })}
      </div>
    </StageLayout>
  );
}
