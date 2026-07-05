import { useScoreboard } from '../../features/scoreboard-refresh/useScoreboard';

export function ProtocolPage() {
  const { data, error } = useScoreboard();
  if (!data) return <main className="service-page"><h1>Протокол соревнования</h1><p>{error || 'Загрузка Excel…'}</p></main>;
  const theory = new Map(data.theoryScores.map((item) => [item.participantId, item.score]));
  const practice = new Map(data.practiceScores.map((item) => [item.participantId, item.score]));
  const finalScores = new Map(data.participantFinalScores.map((item) => [item.participantId, item.leg1 + item.leg2]));
  const results = new Map(data.stageResults.practice.map((item) => [item.teamId, item]));
  const finalResults = new Map(data.stageResults.final.map((item) => [item.teamId, item]));
  return <main className="service-page protocol-page">
    <h1>Сводный протокол</h1><p>Все команды и участники. Обновлено: {new Date(data.updatedAt).toLocaleString('ru-RU')}</p>
    <div className="protocol-grid">{data.teams.map((team) => {
      const members = data.participants.filter((item) => item.teamId === team.teamId);
      const result = results.get(team.teamId);
      const final = finalResults.get(team.teamId);
      return <section className={`protocol-card ${!team.isActive ? 'inactive' : ''}`} key={team.teamId}>
        <header><img src={`/assets/logos/teams/${team.logoFile}`} alt="" /><div><h2>{team.fullName}</h2><span>{team.country === 'by' ? 'Беларусь' : 'Россия'} · {team.isFinalist ? 'финалист' : 'не финалист'} · {team.isActive ? 'активна' : 'неактивна'}</span></div></header>
        <table><thead><tr><th>Участник</th><th>Теория</th><th>Практика</th><th>Финал</th></tr></thead><tbody>{members.map((member) => <tr key={member.participantId}><td>{member.fullName}</td><td>{theory.get(member.participantId) ?? '—'}</td><td>{member.isPracticeParticipant ? practice.get(member.participantId) ?? 0 : '—'}</td><td>{member.isFinalParticipant && team.isFinalist ? finalScores.get(member.participantId) ?? 0 : '—'}</td></tr>)}</tbody></table>
        <footer><span>Теория <b>{result?.theoryTotal ?? 0}</b></span><span>Практика <b>{result?.practiceTotal ?? 0}</b></span><span>Финал <b>{final?.finalTotal ?? 0}</b></span><span>Итого <b>{final?.total ?? result?.qualifyingTotal ?? 0}</b></span></footer>
      </section>;
    })}</div>
  </main>;
}
