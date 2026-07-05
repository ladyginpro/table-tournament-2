import { useEffect, useState, type ReactNode } from 'react';
import { useScoreboard } from '../../features/scoreboard-refresh/useScoreboard';
import { scoreboardApi } from '../../shared/api/scoreboardApi';
import type { Participant, ScoreboardDocument, Team } from '../../shared/model/scoreboard';

type Tab = 'settings' | 'teams' | 'participants' | 'scores' | 'final';
const tabNames: Record<Tab, string> = {
  settings: 'Настройки', teams: 'Команды', participants: 'Участники', scores: 'Теория и практика', final: 'Финал',
};

const toDocument = (data: NonNullable<ReturnType<typeof useScoreboard>['data']>): ScoreboardDocument => ({
  settings: structuredClone(data.settings), teams: structuredClone(data.teams), participants: structuredClone(data.participants),
  theoryScores: structuredClone(data.theoryScores), practiceScores: structuredClone(data.practiceScores),
  participantFinalScores: structuredClone(data.participantFinalScores), teamFinalScores: structuredClone(data.teamFinalScores),
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="admin-field"><span>{label}</span>{children}</label>;
}

function NumberInput({ value, max, onChange }: { value: number | null; max?: number; onChange: (value: number | null) => void }) {
  return <input type="number" min="0" max={max} value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))} />;
}

export function AdminPage() {
  const { data, error: loadError } = useScoreboard(false);
  const [draft, setDraft] = useState<ScoreboardDocument | null>(null);
  const [tab, setTab] = useState<Tab>('settings');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data && !draft) setDraft(toDocument(data)); }, [data, draft]);
  if (!draft) return <main className="service-page"><h1>Админка</h1><p>{loadError || 'Загрузка Excel…'}</p></main>;

  const patchTeam = (teamId: string, patch: Partial<Team>) => setDraft((current) => current && ({
    ...current, teams: current.teams.map((team) => team.teamId === teamId ? { ...team, ...patch } : team),
  }));
  const patchParticipant = (participantId: string, patch: Partial<Participant>) => setDraft((current) => current && ({
    ...current, participants: current.participants.map((item) => item.participantId === participantId ? { ...item, ...patch } : item),
  }));
  const patchTheory = (participantId: string, score: number) => setDraft((current) => current && ({
    ...current, theoryScores: current.theoryScores.map((item) => item.participantId === participantId ? { ...item, score } : item),
  }));
  const patchPractice = (participantId: string, patch: { score?: number; status?: 'done' | 'preparing' | 'not_started' }) => setDraft((current) => current && ({
    ...current, practiceScores: current.practiceScores.map((item) => item.participantId === participantId ? { ...item, ...patch } : item),
  }));

  const save = async () => {
    setSaving(true); setMessage('');
    try { const response = await scoreboardApi.save(draft); setDraft(toDocument(response)); setMessage('Сохранено в data/scoreboard.xlsx. Резервная копия создана.'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Ошибка сохранения.'); }
    finally { setSaving(false); }
  };
  const reload = async () => {
    setSaving(true); setMessage('');
    try { const response = await scoreboardApi.reload(); setDraft(toDocument(response)); setMessage('Данные перечитаны из Excel.'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Ошибка чтения Excel.'); }
    finally { setSaving(false); }
  };

  const participantName = new Map(draft.participants.map((item) => [item.participantId, item.fullName]));
  return <main className="service-page admin-page">
    <div className="admin-title"><div><h1>Управление соревнованием</h1><p>Изменения попадут в эфир только после сохранения в Excel.</p></div>
      <div className="admin-actions"><button className="button secondary" onClick={reload} disabled={saving}>Перечитать Excel</button><button className="button primary" onClick={save} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</button></div>
    </div>
    {message && <div className={`admin-message ${message.startsWith('Сохранено') || message.startsWith('Данные') ? 'success' : 'error'}`}>{message}</div>}
    <div className="admin-tabs">{(Object.keys(tabNames) as Tab[]).map((key) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{tabNames[key]}</button>)}</div>

    {tab === 'settings' && <section className="admin-card settings-grid">
      <Field label="Интервал обновления, мс"><NumberInput value={draft.settings.refreshIntervalMs} onChange={(value) => setDraft({ ...draft, settings: { ...draft.settings, refreshIntervalMs: value ?? 2000 } })} /></Field>
      <Field label="Количество финалистов"><NumberInput value={draft.settings.finalistsCount} max={15} onChange={(value) => setDraft({ ...draft, settings: { ...draft.settings, finalistsCount: value ?? 5 } })} /></Field>
      <Field label="Название в эфире"><select value={draft.settings.teamNameMode} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, teamNameMode: event.target.value as 'full' | 'short' } })}><option value="full">Полное</option><option value="short">Короткое</option></select></Field>
      <Field label="Ввод финала"><select value={draft.settings.finalInputMode} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, finalInputMode: event.target.value as 'participant' | 'team' } })}><option value="participant">По участникам</option><option value="team">По команде</option></select></Field>
      <label className="check-field"><input type="checkbox" checked={draft.settings.transparentBackground} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, transparentBackground: event.target.checked } })} /> Прозрачный фон для OBS</label>
    </section>}

    {tab === 'teams' && <section className="admin-card table-scroll"><table className="admin-table team-editor"><thead><tr><th>Команда</th><th>Полное название</th><th>Короткое</th><th>Страна</th><th>Активна</th><th>Финалист</th><th>Порядок</th><th>Место: теория</th><th>Место: практика</th><th>Место: финал</th></tr></thead><tbody>
      {draft.teams.map((team) => <tr key={team.teamId}><td className="team-cell"><img src={`/assets/logos/teams/${team.logoFile}`} alt="" />{team.teamId}</td>
        <td><input value={team.fullName} onChange={(event) => patchTeam(team.teamId, { fullName: event.target.value })} /></td><td><input value={team.shortName} onChange={(event) => patchTeam(team.teamId, { shortName: event.target.value })} /></td>
        <td><select value={team.country} onChange={(event) => patchTeam(team.teamId, { country: event.target.value as 'ru' | 'by' })}><option value="ru">Россия</option><option value="by">Беларусь</option></select></td>
        <td><input type="checkbox" checked={team.isActive} onChange={(event) => patchTeam(team.teamId, { isActive: event.target.checked })} /></td><td><input type="checkbox" checked={team.isFinalist} onChange={(event) => patchTeam(team.teamId, { isFinalist: event.target.checked })} /></td>
        <td><NumberInput value={team.displayOrder} onChange={(value) => patchTeam(team.teamId, { displayOrder: value ?? 0 })} /></td><td><NumberInput value={team.manualRankTheory} onChange={(value) => patchTeam(team.teamId, { manualRankTheory: value })} /></td><td><NumberInput value={team.manualRankPractice} onChange={(value) => patchTeam(team.teamId, { manualRankPractice: value })} /></td><td><NumberInput value={team.manualRankFinal} onChange={(value) => patchTeam(team.teamId, { manualRankFinal: value })} /></td>
      </tr>)}</tbody></table></section>}

    {tab === 'participants' && <section className="admin-card table-scroll"><table className="admin-table"><thead><tr><th>Команда</th><th>Участник</th><th>Теория</th><th>Практика</th><th>Слот практики</th><th>Финал</th><th>Слот финала</th></tr></thead><tbody>
      {draft.participants.map((participant) => <tr key={participant.participantId}><td>{draft.teams.find((team) => team.teamId === participant.teamId)?.shortName}</td><td><input value={participant.fullName} onChange={(event) => patchParticipant(participant.participantId, { fullName: event.target.value })} /></td>
        <td><input type="checkbox" checked={participant.isTheoryParticipant} onChange={(event) => patchParticipant(participant.participantId, { isTheoryParticipant: event.target.checked })} /></td><td><input type="checkbox" checked={participant.isPracticeParticipant} onChange={(event) => patchParticipant(participant.participantId, { isPracticeParticipant: event.target.checked })} /></td><td><NumberInput value={participant.practiceSlot} max={3} onChange={(value) => patchParticipant(participant.participantId, { practiceSlot: value })} /></td>
        <td><input type="checkbox" checked={participant.isFinalParticipant} onChange={(event) => patchParticipant(participant.participantId, { isFinalParticipant: event.target.checked })} /></td><td><NumberInput value={participant.finalSlot} max={2} onChange={(value) => patchParticipant(participant.participantId, { finalSlot: value })} /></td></tr>)}</tbody></table></section>}

    {tab === 'scores' && <section className="admin-card table-scroll"><table className="admin-table"><thead><tr><th>Команда</th><th>Участник</th><th>Теория (0–60)</th><th>Практика (0–100)</th><th>Статус практики</th></tr></thead><tbody>
      {draft.participants.map((participant) => { const theory = draft.theoryScores.find((item) => item.participantId === participant.participantId); const practice = draft.practiceScores.find((item) => item.participantId === participant.participantId); return <tr key={participant.participantId}><td>{draft.teams.find((team) => team.teamId === participant.teamId)?.shortName}</td><td>{participant.fullName}</td><td>{theory ? <NumberInput value={theory.score} max={60} onChange={(value) => patchTheory(participant.participantId, value ?? 0)} /> : '—'}</td><td>{practice ? <NumberInput value={practice.score} max={100} onChange={(value) => patchPractice(participant.participantId, { score: value ?? 0 })} /> : '—'}</td><td>{practice ? <select value={practice.status} onChange={(event) => patchPractice(participant.participantId, { status: event.target.value as 'done' | 'preparing' | 'not_started' })}><option value="not_started">Не начал</option><option value="preparing">Готовится</option><option value="done">Выступил</option></select> : '—'}</td></tr>; })}
    </tbody></table></section>}

    {tab === 'final' && <section className="admin-card table-scroll">
      <div className="mode-note">Режим ввода: <b>{draft.settings.finalInputMode === 'participant' ? 'по участникам — каждая нога до 100' : 'по команде — каждая нога до 200'}</b></div>
      {draft.settings.finalInputMode === 'participant' ? <table className="admin-table"><thead><tr><th>Команда</th><th>Участник</th><th>Нога 1</th><th>Нога 2</th><th>Сумма</th></tr></thead><tbody>{draft.participantFinalScores.filter((score) => draft.teams.find((team) => team.teamId === draft.participants.find((participant) => participant.participantId === score.participantId)?.teamId)?.isFinalist).map((score) => { const participant = draft.participants.find((item) => item.participantId === score.participantId)!; const patchScore = (patch: Partial<typeof score>) => setDraft({ ...draft, participantFinalScores: draft.participantFinalScores.map((item) => item.participantId === score.participantId ? { ...item, ...patch } : item) }); return <tr key={score.participantId}><td>{draft.teams.find((team) => team.teamId === participant.teamId)?.shortName}</td><td>{participantName.get(score.participantId)}</td><td><NumberInput value={score.leg1} max={100} onChange={(value) => patchScore({ leg1: value ?? 0 })} /></td><td><NumberInput value={score.leg2} max={100} onChange={(value) => patchScore({ leg2: value ?? 0 })} /></td><td><b>{score.leg1 + score.leg2}</b></td></tr>; })}</tbody></table>
      : <table className="admin-table"><thead><tr><th>Команда</th><th>Нога 1</th><th>Нога 2</th><th>Сумма</th></tr></thead><tbody>{draft.teamFinalScores.filter((score) => draft.teams.find((team) => team.teamId === score.teamId)?.isFinalist).map((score) => { const patchScore = (patch: Partial<typeof score>) => setDraft({ ...draft, teamFinalScores: draft.teamFinalScores.map((item) => item.teamId === score.teamId ? { ...item, ...patch } : item) }); return <tr key={score.teamId}><td>{draft.teams.find((team) => team.teamId === score.teamId)?.fullName}</td><td><NumberInput value={score.leg1} max={200} onChange={(value) => patchScore({ leg1: value ?? 0 })} /></td><td><NumberInput value={score.leg2} max={200} onChange={(value) => patchScore({ leg2: value ?? 0 })} /></td><td><b>{score.leg1 + score.leg2}</b></td></tr>; })}</tbody></table>}
    </section>}
  </main>;
}
