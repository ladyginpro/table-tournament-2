import { useScoreboard } from '../../features/scoreboard-refresh/useScoreboard';
import { CompetitionHeader } from '../../shared/ui/CompetitionHeader';
import { LoadingStage, StageLayout } from '../../shared/ui/StageLayout';
import { CountryFlag, PlaceBadge, TeamIdentity } from '../../entities/team/TeamIdentity';
import type { ScoreboardResponse, TeamResult } from '../../shared/model/scoreboard';

function PodiumCard({ result, data, className = '' }: { result?: TeamResult; data: ScoreboardResponse; className?: string }) {
  if (!result) return null;
  const team = data.teams.find((item) => item.teamId === result.teamId)!;
  return <div className={`podium-card ${className}`}>
    <strong>{data.settings.teamNameMode === 'short' ? team.shortName : team.fullName}</strong>
    <div><CountryFlag country={team.country} />{team.logoFile ? <img src={`/assets/logos/teams/${team.logoFile}`} alt="" /> : <b className="team-monogram">{team.shortName.slice(0, 2).toUpperCase()}</b>}</div>
    <b>{result.total}</b><small>баллов</small>
  </div>;
}

export function FinalPage() {
  const { data, error } = useScoreboard();
  if (!data) return <LoadingStage error={error} />;
  const results = data.stageResults.final;
  const teams = new Map(data.teams.map((team) => [team.teamId, team]));
  return <StageLayout background="/assets/backgrounds/final-bg.png" data={data}>
    <CompetitionHeader title="Итоговые результаты" accent="red" />
    <div className="final-caps"><span>Финал — сумма критериев выбранных участников</span><span>Итого: теория + практика + финал</span></div>
    <PodiumCard result={results[1]} data={data} className="podium-second" />
    <PodiumCard result={results[0]} data={data} className="podium-first" />
    <PodiumCard result={results[2]} data={data} className="podium-third" />
    <PodiumCard result={results[3]} data={data} className="podium-fourth" />
    <PodiumCard result={results[4]} data={data} className="podium-fifth" />
    <div className="score-table final-table">
      <div className="score-head"><span>Место</span><span>Команда</span><span>Теория</span><span>Практика</span><span>Сумма</span><span>Финал</span><span>Итого</span></div>
      {results.map((result) => <div className="score-row" key={result.teamId}>
        <PlaceBadge place={result.place} /><TeamIdentity team={teams.get(result.teamId)!} settings={data.settings} compact />
        <strong>{result.theoryTotal}</strong><strong>{result.practiceTotal}</strong><strong>{result.qualifyingTotal}</strong>
        <strong className="red-score">{result.finalTotal}</strong><strong>{result.total}</strong>
      </div>)}
    </div>
  </StageLayout>;
}
