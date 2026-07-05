import { useScoreboard } from '../../features/scoreboard-refresh/useScoreboard';
import { PlaceBadge, TeamIdentity } from '../../entities/team/TeamIdentity';
import { CompetitionHeader } from '../../shared/ui/CompetitionHeader';
import { LoadingStage, StageLayout } from '../../shared/ui/StageLayout';
import type { PracticeStatus } from '../../shared/model/scoreboard';

function StatusDot({ status }: { status: PracticeStatus }) {
  return <span className={`status-dot ${status}`} title={status === 'done' ? 'Выступил' : status === 'preparing' ? 'Готовится' : 'Не начал'}>
    {status === 'done' ? '✓' : status === 'not_started' ? '−' : ''}
  </span>;
}

export function PracticePage() {
  const { data, error } = useScoreboard();
  if (!data) return <LoadingStage error={error} />;
  const teams = new Map(data.teams.map((team) => [team.teamId, team]));
  return <StageLayout background="/assets/backgrounds/practice-bg.png" data={data}>
    <CompetitionHeader title="Результаты практического этапа" accent="red" />
    <div className="stage-cap red">Максимум за этап — 300 баллов</div>
    <div className="score-table practice-table">
      <div className="score-head">
        <span>Место</span><span>Команда</span><span>Теория<small>макс. 300</small></span><span>Практика<small>макс. 300</small></span>
        <span>Сумма<small>макс. 600</small></span><span>Выступление</span><span>Баллы этапа</span><span>Отставание</span>
      </div>
      {data.stageResults.practice.map((result) => <div className="score-row" key={result.teamId}>
        <PlaceBadge place={result.place} />
        <TeamIdentity team={teams.get(result.teamId)!} settings={data.settings} compact />
        <strong>{result.theoryTotal}</strong><strong>{result.practiceTotal}</strong><strong>{result.qualifyingTotal}</strong>
        <span className="status-list">{result.practiceStatuses.map((item) => <StatusDot key={item.participantId} status={item.status} />)}</span>
        <strong className="red-score">{result.practiceTotal}</strong><strong>{result.leaderGap || '—'}</strong>
      </div>)}
    </div>
    <div className="legend"><b>Условные обозначения:</b><span><StatusDot status="done" /> выступил</span><span><StatusDot status="preparing" /> готовится</span><span><StatusDot status="not_started" /> не начал</span></div>
    <div className="stage-maximum wide">🏆 <span><b>300</b> баллов</span><span>Далее: финальный этап<br /><em>Максимум — 400 баллов</em></span></div>
  </StageLayout>;
}
