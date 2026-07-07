export type CountryCode = 'ru' | 'by';
export type TeamNameMode = 'full' | 'short';
export type FinalInputMode = 'participant' | 'team';

export const THEORY_PARTICIPANT_MAX = 60;
export const PRACTICE_PARTICIPANT_MAX = 100;
export const FINAL_LEG_MAX = 100;
export const FINAL_PARTICIPANT_MAX = 200;
export const THEORY_STAGE_MAX = 300;
export const PRACTICE_STAGE_MAX = 300;
export const FINAL_STAGE_MAX = 400;
export const QUALIFYING_MAX = THEORY_STAGE_MAX + PRACTICE_STAGE_MAX;
export const FINAL_TOTAL_MAX = QUALIFYING_MAX + FINAL_STAGE_MAX;
export const PRACTICE_PARTICIPANTS_MAX = 3;
export const FINAL_PARTICIPANTS_MAX = 2;

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
export interface ParticipantFinalScore {
  participantId: string;
  leg1: ScoreBreakdown;
  leg2: ScoreBreakdown;
}

export const emptyParticipantFinalScore = (participantId: string): ParticipantFinalScore => ({
  participantId,
  leg1: emptyScoreBreakdown(),
  leg2: emptyScoreBreakdown(),
});

export const participantFinalTotal = (score?: ParticipantFinalScore) =>
  scoreBreakdownTotal(score?.leg1) + scoreBreakdownTotal(score?.leg2);

export interface ScoreboardDocument {
  settings: ScoreboardSettings;
  teams: Team[];
  participants: Participant[];
  theoryScores: TheoryScore[];
  practiceScores: PracticeScore[];
  participantFinalScores: ParticipantFinalScore[];
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
      .reduce((sum, member) => sum + (theory.get(member.participantId)?.score ?? 0), 0);
    const practiceTotal = members
      .filter((member) => member.isPracticeParticipant)
      .reduce((sum, member) => sum + scoreBreakdownTotal(practice.get(member.participantId)), 0);
    const finalTotal = members
      .filter((member) => member.isFinalParticipant)
      .reduce((sum, member) => sum + participantFinalTotal(participantFinal.get(member.participantId)), 0);

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
        ? item.qualifyingTotal
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

const normalizeBreakdown = (value: unknown): ScoreBreakdown => {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(scoreFieldKeys.map((key) => [key, Number(source[key]) || 0])) as unknown as ScoreBreakdown;
};

type LegacyFinalScore = { participantId: string } & Partial<ScoreBreakdown> & {
  leg1?: Partial<ScoreBreakdown>;
  leg2?: Partial<ScoreBreakdown>;
};

export function migrateScoreboard(input: ScoreboardDocument | (Omit<ScoreboardDocument, 'participantFinalScores'> & {
  participantFinalScores: LegacyFinalScore[];
})): ScoreboardDocument {
  const participants = input.participants.map((participant) => ({
    ...participant,
    isTheoryParticipant: true,
  }));

  const selectedPracticeByTeam = new Map<string, number>();
  for (const participant of participants) {
    if (participant.isPracticeParticipant) {
      selectedPracticeByTeam.set(participant.teamId, (selectedPracticeByTeam.get(participant.teamId) ?? 0) + 1);
    }
  }
  // Старые seed-данные отмечали всю команду. Такой выбор неоднозначен,
  // поэтому команды с превышенным лимитом начинают с пустого ручного выбора.
  for (const participant of participants) {
    if ((selectedPracticeByTeam.get(participant.teamId) ?? 0) > PRACTICE_PARTICIPANTS_MAX) {
      participant.isPracticeParticipant = false;
      participant.practiceSlot = null;
    }
  }

  const finalScores = new Map(input.participantFinalScores.map((score) => [score.participantId, score as LegacyFinalScore]));
  return {
    settings: { ...input.settings, finalInputMode: 'participant' },
    teams: input.teams.map((team) => ({
      ...team,
      isFinalist: participants.some((participant) => participant.teamId === team.teamId && participant.isFinalParticipant),
    })),
    participants,
    theoryScores: input.theoryScores.map((score) => ({ ...score, score: Number(score.score) || 0 })),
    practiceScores: input.practiceScores.map((score) => ({
      participantId: score.participantId,
      ...normalizeBreakdown(score),
    })),
    participantFinalScores: participants.map((participant) => {
      const legacy = finalScores.get(participant.participantId);
      if (!legacy) return emptyParticipantFinalScore(participant.participantId);
      const hasLegs = legacy.leg1 || legacy.leg2;
      return {
        participantId: participant.participantId,
        leg1: normalizeBreakdown(hasLegs ? legacy.leg1 : legacy),
        leg2: normalizeBreakdown(legacy.leg2),
      };
    }),
  };
}

export function normalizeScoreboard(document: ScoreboardDocument): ScoreboardResponse {
  return { ...document, stageResults: calculateStageResults(document), updatedAt: new Date().toISOString() };
}

export function validateScoreboard(document: ScoreboardDocument): string[] {
  const errors: string[] = [];
  const hasBrokenEncoding = (value: string) => value.includes('\uFFFD') || /\?{2,}/.test(value);
  const teamIds = new Set(document.teams.map((team) => team.teamId));
  const participantIds = new Set(document.participants.map((participant) => participant.participantId));
  if (teamIds.size !== document.teams.length) errors.push('Идентификаторы организаций должны быть уникальными.');
  if (participantIds.size !== document.participants.length) errors.push('Идентификаторы участников должны быть уникальными.');
  if (document.teams.some((team) => !team.fullName.trim() || !team.shortName.trim())) errors.push('У каждой организации должны быть заполнены полное и короткое названия.');
  if (document.participants.some((participant) => !participant.fullName.trim() || !teamIds.has(participant.teamId))) errors.push('У каждого участника должны быть заполнены имя и организация.');
  if (document.teams.some((team) => hasBrokenEncoding(team.fullName) || hasBrokenEncoding(team.shortName))
    || document.participants.some((participant) => hasBrokenEncoding(participant.fullName))) {
    errors.push('В названиях или ФИО обнаружена повреждённая кодировка. Сохранение отменено.');
  }

  for (const team of document.teams) {
    const members = document.participants.filter((participant) => participant.teamId === team.teamId);
    const practiceCount = members.filter((participant) => participant.isPracticeParticipant).length;
    const finalCount = members.filter((participant) => participant.isFinalParticipant).length;
    if (practiceCount > PRACTICE_PARTICIPANTS_MAX) errors.push(`${team.shortName}: в практике можно выбрать не более ${PRACTICE_PARTICIPANTS_MAX} участников.`);
    if (finalCount > FINAL_PARTICIPANTS_MAX) errors.push(`${team.shortName}: в финале можно выбрать не более ${FINAL_PARTICIPANTS_MAX} участников.`);
  }

  for (const item of document.theoryScores) {
    if (!participantIds.has(item.participantId)) errors.push(`Теория: неизвестный участник ${item.participantId}.`);
    if (!Number.isFinite(item.score) || item.score < 0 || item.score > THEORY_PARTICIPANT_MAX) errors.push(`Теория: оценка ${item.participantId} должна быть от 0 до ${THEORY_PARTICIPANT_MAX}.`);
  }
  for (const item of document.practiceScores) {
    if (scoreFieldKeys.some((key) => !Number.isFinite(item[key]) || item[key] < 0)) {
      errors.push(`Практика: все баллы участника ${item.participantId} должны быть неотрицательными числами.`);
    }
    if (scoreBreakdownTotal(item) > PRACTICE_PARTICIPANT_MAX) {
      errors.push(`Практика: сумма баллов участника ${item.participantId} не должна превышать ${PRACTICE_PARTICIPANT_MAX}.`);
    }
  }
  for (const item of document.participantFinalScores) {
    for (const [legName, leg] of [['нога 1', item.leg1], ['нога 2', item.leg2]] as const) {
      if (scoreFieldKeys.some((key) => !Number.isFinite(leg[key]) || leg[key] < 0)) {
        errors.push(`Финал, ${legName}: все баллы участника ${item.participantId} должны быть неотрицательными числами.`);
      }
      if (scoreBreakdownTotal(leg) > FINAL_LEG_MAX) {
        errors.push(`Финал, ${legName}: сумма баллов участника ${item.participantId} не должна превышать ${FINAL_LEG_MAX}.`);
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
  for (const result of results.final) {
    if (result.finalTotal > FINAL_STAGE_MAX) errors.push(`Финал: сумма баллов команды ${result.teamId} не должна превышать ${FINAL_STAGE_MAX}.`);
  }
  return errors;
}
