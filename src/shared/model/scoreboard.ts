export type CountryCode = 'ru' | 'by';
export type TeamNameMode = 'full' | 'short';
export type FinalInputMode = 'participant' | 'team';

export const THEORY_PARTICIPANT_MAX = 60;
export const PRACTICE_PARTICIPANT_MAX = 60;
export const THEORY_STAGE_MAX = 300;
export const PRACTICE_STAGE_MAX = 300;
export const QUALIFYING_MAX = THEORY_STAGE_MAX + PRACTICE_STAGE_MAX;

export const scoreFieldKeys = [
  'time', 'safety', 'model', 'mp', 'angle',
  'length', 'width', 'c1', 'c2',
  'shape', 'edge', 'sole', 'thickness',
] as const;

export type ScoreFieldKey = typeof scoreFieldKeys[number];

export interface ScoreBreakdown {
  time: number;
  safety: number;
  model: number;
  mp: number;
  angle: number;
  length: number;
  width: number;
  c1: number;
  c2: number;
  shape: number;
  edge: number;
  sole: number;
  thickness: number;
}

export const emptyScoreBreakdown = (): ScoreBreakdown => ({
  time: 0,
  safety: 0,
  model: 0,
  mp: 0,
  angle: 0,
  length: 0,
  width: 0,
  c1: 0,
  c2: 0,
  shape: 0,
  edge: 0,
  sole: 0,
  thickness: 0,
});

export const scoreBreakdownTotal = (score?: Partial<ScoreBreakdown>) => scoreFieldKeys
  .reduce((sum, key) => sum + (Number(score?.[key]) || 0), 0);

export interface ScoreboardSettings {
  refreshIntervalMs: number;
  finalistsCount: number;
  teamNameMode: TeamNameMode;
  finalInputMode: FinalInputMode;
  transparentBackground: boolean;
}

export interface Team {
  teamId: string;
  fullName: string;
  shortName: string;
  country: CountryCode;
  logoFile: string;
  isTheoryActive: boolean;
  isPracticeActive: boolean;
  isFinalist: boolean;
  displayOrder: number;
  manualRankTheory: number | null;
  manualRankPractice: number | null;
  manualRankFinal: number | null;
}

export interface Participant {
  participantId: string;
  teamId: string;
  fullName: string;
  isTheoryParticipant: boolean;
  isPracticeParticipant: boolean;
  isFinalParticipant: boolean;
  practiceSlot: number | null;
  finalSlot: number | null;
}

export interface TheoryScore { participantId: string; score: number }
export interface PracticeScore extends ScoreBreakdown { participantId: string }
export interface ParticipantFinalScore extends ScoreBreakdown { participantId: string }
export interface TeamFinalScore { teamId: string; leg1: number; leg2: number }

export interface ScoreboardDocument {
  settings: ScoreboardSettings;
  teams: Team[];
  participants: Participant[];
  theoryScores: TheoryScore[];
  practiceScores: PracticeScore[];
  participantFinalScores: ParticipantFinalScore[];
  teamFinalScores: TeamFinalScore[];
}

export interface TeamResult {
  teamId: string;
  place: number;
  theoryTotal: number;
  practiceTotal: number;
  qualifyingTotal: number;
  finalTotal: number;
  total: number;
  leaderGap: number;
  finalStatus: 'done' | 'not_finalist' | 'not_participating';
}

export interface ScoreboardResponse extends ScoreboardDocument {
  stageResults: {
    theory: TeamResult[];
    practice: TeamResult[];
    final: TeamResult[];
  };
  updatedAt: string;
}

const byId = <T extends { participantId: string }>(items: T[]) =>
  new Map(items.map((item) => [item.participantId, item]));

const tieRank = (team: Team, stage: 'theory' | 'practice' | 'final') => {
  const value = stage === 'theory'
    ? team.manualRankTheory
    : stage === 'practice'
      ? team.manualRankPractice
      : team.manualRankFinal;
  return value ?? Number.MAX_SAFE_INTEGER;
};

export function calculateStageResults(document: ScoreboardDocument): ScoreboardResponse['stageResults'] {
  const theory = byId(document.theoryScores);
  const practice = byId(document.practiceScores);
  const participantFinal = byId(document.participantFinalScores);
  const participantsByTeam = new Map<string, Participant[]>();

  for (const participant of document.participants) {
    const list = participantsByTeam.get(participant.teamId) ?? [];
    list.push(participant);
    participantsByTeam.set(participant.teamId, list);
  }

  const base = document.teams.map((team) => {
    const members = participantsByTeam.get(team.teamId) ?? [];
    const theoryTotal = members
      .filter((member) => member.isTheoryParticipant)
      .reduce((sum, member) => sum + (theory.get(member.participantId)?.score ?? 0), 0);
    const practiceTotal = members
      .filter((member) => member.isPracticeParticipant)
      .reduce((sum, member) => sum + scoreBreakdownTotal(practice.get(member.participantId)), 0);
    const finalTotal = members
      .filter((member) => member.isFinalParticipant)
      .reduce((sum, member) => sum + scoreBreakdownTotal(participantFinal.get(member.participantId)), 0);

    return {
      teamId: team.teamId,
      place: 0,
      theoryTotal,
      practiceTotal,
      qualifyingTotal: theoryTotal + practiceTotal,
      finalTotal,
      total: theoryTotal + practiceTotal + finalTotal,
      leaderGap: 0,
      finalStatus: team.isFinalist
        ? (finalTotal > 0 ? 'done' as const : 'not_participating' as const)
        : 'not_finalist' as const,
    };
  });

  const teamMap = new Map(document.teams.map((team) => [team.teamId, team]));
  const sortStage = (stage: 'theory' | 'practice' | 'final') => {
    const score = (item: TeamResult) => stage === 'theory'
      ? item.theoryTotal
      : stage === 'practice'
        ? item.practiceTotal
        : item.total;
    const rows = base
      .filter((item) => {
        const team = teamMap.get(item.teamId);
        if (stage === 'theory') return team?.isTheoryActive;
        if (stage === 'practice') return team?.isPracticeActive;
        return team?.isFinalist;
      })
      .sort((a, b) => {
        const scoreDifference = score(b) - score(a);
        if (scoreDifference !== 0) return scoreDifference;
        const aTeam = teamMap.get(a.teamId)!;
        const bTeam = teamMap.get(b.teamId)!;
        return tieRank(aTeam, stage) - tieRank(bTeam, stage)
          || aTeam.displayOrder - bTeam.displayOrder
          || aTeam.fullName.localeCompare(bTeam.fullName, 'ru');
      });
    const leader = rows.length ? score(rows[0]) : 0;
    return rows.map((item, index) => ({ ...item, place: index + 1, leaderGap: score(item) - leader }));
  };

  return {
    theory: sortStage('theory'),
    practice: sortStage('practice'),
    final: sortStage('final'),
  };
}

export function normalizeScoreboard(document: ScoreboardDocument): ScoreboardResponse {
  return { ...document, stageResults: calculateStageResults(document), updatedAt: new Date().toISOString() };
}

export function validateScoreboard(document: ScoreboardDocument): string[] {
  const errors: string[] = [];
  const teamIds = new Set(document.teams.map((team) => team.teamId));
  const participantIds = new Set(document.participants.map((participant) => participant.participantId));
  if (teamIds.size !== document.teams.length) errors.push('Идентификаторы организаций должны быть уникальными.');
  if (participantIds.size !== document.participants.length) errors.push('Идентификаторы участников должны быть уникальными.');
  if (document.teams.some((team) => !team.fullName.trim() || !team.shortName.trim())) errors.push('У каждой организации должны быть заполнены полное и короткое названия.');
  if (document.participants.some((participant) => !participant.fullName.trim() || !teamIds.has(participant.teamId))) errors.push('У каждого участника должны быть заполнены имя и организация.');
  for (const item of document.theoryScores) {
    if (!Number.isFinite(item.score) || item.score < 0 || item.score > THEORY_PARTICIPANT_MAX) errors.push(`Теория: оценка ${item.participantId} должна быть от 0 до ${THEORY_PARTICIPANT_MAX}.`);
  }
  for (const [stage, items] of [['Практика', document.practiceScores], ['Финал', document.participantFinalScores]] as const) {
    for (const item of items) {
      if (scoreFieldKeys.some((key) => !Number.isFinite(item[key]) || item[key] < 0)) {
        errors.push(`${stage}: все баллы участника ${item.participantId} должны быть неотрицательными числами.`);
      }
      if (stage === 'Практика' && scoreBreakdownTotal(item) > PRACTICE_PARTICIPANT_MAX) {
        errors.push(`Практика: сумма баллов участника ${item.participantId} не должна превышать ${PRACTICE_PARTICIPANT_MAX}.`);
      }
    }
  }
  const results = calculateStageResults(document);
  for (const result of results.theory) {
    if (result.theoryTotal > THEORY_STAGE_MAX) errors.push(`Теория: сумма баллов команды ${result.teamId} не должна превышать ${THEORY_STAGE_MAX}.`);
  }
  for (const result of results.practice) {
    if (result.practiceTotal > PRACTICE_STAGE_MAX) errors.push(`Практика: сумма баллов команды ${result.teamId} не должна превышать ${PRACTICE_STAGE_MAX}.`);
  }
  return errors;
}
